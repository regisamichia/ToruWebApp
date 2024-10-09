import { isAudioEnabled, getTtsProvider, getUserId, getSessionId } from "./main.js";
import { startRecording, stopRecording } from "./audioRecording.js";
import { sendAudioMessage } from "./messageHandling.js";
import { getAudioMode } from "./main.js";
import getUrls from "./config.js";

let apiBaseUrl;

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

let audioContext;
let audioQueue = [];
let isPlaying = false;

/**
 * Initializes the audio handling functionality.
 * Sets up event listeners and initializes necessary components.
 */
export async function initializeAudioHandling() {
  await initializeUrls();
  const micButton = document.getElementById("microphoneButton");
  if (micButton) {
    micButton.addEventListener("click", handleMicrophoneClick);
  }
  updateMicrophoneButtonState();
}

export function updateMicrophoneButtonState() {
  const micButton = document.getElementById("microphoneButton");
  const currentMode = getAudioMode();
  // Update button state based on currentMode...
}

/**
 * Handles the click event on the microphone button.
 * Toggles between starting and stopping recording based on the current state.
 */
export async function handleMicrophoneClick() {
  const micButton = document.getElementById("microphoneButton");
  const micIcon = micButton.querySelector(".material-icons");
  const currentMode = getAudioMode();

  console.log("Microphone button clicked. Current mode:", currentMode);

  if (currentMode === "manual") {
    if (micButton.classList.contains("recording")) {
      console.log("Stopping recording");
      const audioBlob = await stopRecording();
      micButton.classList.remove("recording");
      micIcon.textContent = "mic";
      await sendAudioMessage(audioBlob, getSessionId());
    } else {
      console.log("Starting recording");
      startRecording();
      micButton.classList.add("recording");
      micIcon.textContent = "stop";
    }
  } else {
    console.log("Continuous mode is active. Manual recording is disabled.");
  }
}

/**
 * Streams audio for the given text.
 * @param {string} text - The text to be converted to audio.
 * @param {string} messageId - The ID of the message associated with the audio.
 * @returns {AudioBuffer|null} The audio buffer if successful, null otherwise.
 */
export async function streamAudio(text, messageId) {
  if (!isAudioEnabled) return null;

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    const currentProvider = getTtsProvider();
    let endpoint =
      currentProvider === "openai"
        ? `${apiBaseUrl}/api/synthesize_audio_openai`
        : `${apiBaseUrl}/api/synthesize_audio`;

    console.log(`Using TTS provider: ${currentProvider}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, user_id: getUserId(), message_id: messageId }),
    });

    if (!response.ok) throw new Error("Failed to synthesize audio");

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    audioQueue.push(audioBuffer);
    if (!isPlaying) {
      playNextAudio();
    }

    return audioBuffer;
  } catch (error) {
    console.error("Error streaming audio:", error);
    return null;
  }
}

async function playNextAudio() {
  if (audioQueue.length === 0) {
    isPlaying = false;
    return;
  }

  isPlaying = true;
  const audioBuffer = audioQueue.shift();
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.onended = playNextAudio;
  source.start();
}

/**
 * Replays audio from S3 for the given message IDs.
 * @param {string|string[]} messageIds - The ID(s) of the message(s) to replay.
 */
export async function replayAudioFromS3(messageIds) {
  if (!Array.isArray(messageIds)) {
    messageIds = [messageIds]; // Ensure backwards compatibility
  }

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    const audioBuffers = [];
    for (const messageId of messageIds) {
      const response = await fetch(`${apiBaseUrl}/api/get_presigned_urls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: getUserId(),
          message_id: messageId,
          region: "eu-west-3",
          type: "audio",
        }),
      });

      if (!response.ok) throw new Error("Failed to get audio URLs");

      const { audioUrls } = await response.json();

      const segmentBuffers = await Promise.all(
        audioUrls.map(async (url) => {
          const audioResponse = await fetch(url);
          if (!audioResponse.ok) throw new Error("Failed to fetch audio file");
          const arrayBuffer = await audioResponse.arrayBuffer();
          return await audioContext.decodeAudioData(arrayBuffer);
        }),
      );

      audioBuffers.push(...segmentBuffers);
    }

    playAudioBuffers(audioBuffers);
  } catch (error) {
    console.error("Error replaying audio:", error);
  }
}

function playAudioBuffers(buffers) {
  audioQueue = buffers;
  if (!isPlaying) {
    playNextAudio();
  }
}