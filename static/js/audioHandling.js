import { isAudioEnabled, getTtsProvider } from "./main.js";
import { startRecording, stopRecording } from "./audioRecording.js";
import { sendAudioMessage } from "./messageHandling.js";
import { getAudioMode } from "./main.js";

let audioContext;
let audioQueue = [];
let isPlaying = false;

export function initializeAudioHandling() {
  const micButton = document.getElementById("microphoneButton");
  if (micButton) {
    micButton.addEventListener("click", handleMicrophoneClick);
  }
  updateMicrophoneButtonState();
}

function updateMicrophoneButtonState() {
  const micButton = document.getElementById("microphoneButton");
  const currentMode = getAudioMode();
  // Update button state based on currentMode...
}

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
      await sendAudioMessage(audioBlob);
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

export async function streamAudio(text) {
  if (!isAudioEnabled) return;

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    const currentProvider = getTtsProvider();
    let endpoint;

    if (currentProvider === "openai") {
      endpoint = "http://localhost:8000/api/synthesize_audio_openai";
    } else if (currentProvider === "elevenlabs") {
      endpoint = "http://localhost:8000/api/synthesize_audio";
    } else {
      console.error(`Unknown TTS provider: ${currentProvider}`);
      return;
    }

    console.log(`Using TTS provider: ${currentProvider}`);
    console.log(`Endpoint: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("Failed to synthesize audio");
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    audioQueue.push(audioBuffer);
    if (!isPlaying) {
      playNextAudio();
    }
  } catch (error) {
    console.error("Error streaming audio:", error);
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
