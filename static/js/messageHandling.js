import { isAudioEnabled, getSessionId, getUserId } from "./main.js";
import {
  addMessageToChat,
  addLoadingAnimation,
  renderContent,
  displayTextWithDynamicDelay,
  latexToReadableText,
} from "./chatUI.js";
import { streamAudio } from "./audioHandling.js";
import { storeConversation } from "./conversationStorage.js";
import { pauseAudioRecording, resumeAudioRecording } from "./audioRecording.js";
import getUrls from "./config.js";
import { addPlayButtonToMessage } from "./chatUI.js";

let chatUrl, apiBaseUrl;

/**
 * Initializes URLs from the config file.
 * @returns {Promise<Object>} An object containing the chat and API base URLs.
 * @throws {Error} If getUrls() returns undefined or if there's an error fetching URLs.
 */
async function initializeUrls() {
  try {
    const urls = await getUrls();
    if (!urls) {
      throw new Error("getUrls() returned undefined");
    }
    return urls;
  } catch (error) {
    console.error("Error in initializeUrls:", error);
    throw error;
  }
}

/**
 * Initializes message handling by setting up URLs.
 * @throws {Error} If URLs are invalid or undefined.
 */
export async function initializeMessageHandling() {
  try {
    const urls = await initializeUrls();
    if (!urls || typeof urls !== "object") {
      throw new Error("Invalid URLs object received");
    }
    chatUrl = urls.chatUrl;
    apiBaseUrl = urls.apiBaseUrl;
    if (!chatUrl || !apiBaseUrl) {
      throw new Error("chatUrl or apiBaseUrl is undefined");
    }
  } catch (error) {
    console.error("Failed to initialize MessageHandling:", error);
    throw error;
  }
}

/**
 * Handles user input from the chat interface.
 * If there's text input, it sends the message.
 * If input is empty and audio mode is manual, it triggers the microphone.
 */
export function handleUserInput() {
  const userInput = document.getElementById("userInput");
  const messageText = userInput.value.trim();
  if (messageText !== "") {
    addMessageToChat(messageText, "user-message");
    sendMessage(messageText, getSessionId(), getUserId());
    userInput.value = "";
  } else if (getAudioMode() === "manual") {
    handleMicrophoneClick();
  }
}

/**
 * Sends a message to the server and handles the response.
 * @param {string} messageText - The message to send.
 * @param {string} sessionId - The current session ID.
 * @param {string} userId - The current user ID.
 */
export async function sendMessage(messageText) {
  if (messageText.trim() === "") return;

  const loadingAnimation = addLoadingAnimation();

  try {
    pauseAudioRecording();

    const formData = new FormData();
    formData.append("session_id", getSessionId());
    formData.append("message", messageText);
    formData.append("user_id", getUserId());

    const response = await fetch(`${chatUrl}/api/math_chat`, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      loadingAnimation.remove();

      const { element: botMessageElement, id: messageId } = addMessageToChat(
        "",
        "bot-message",
      );
      const messageContent =
        botMessageElement.querySelector(".message-content");

      if (!messageContent) {
        console.error("Message content element not found");
        return;
      }

      let accumulatedText = "";
      let audioBuffers = [];
      let audioSegmentIds = [];

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const sentences = buffer.match(/[^.!?]+[.!?]+/g) || [];

        for (const sentence of sentences) {
          accumulatedText += sentence;

          if (isAudioEnabled) {
            console.log("text sent to speech:", sentence);
            const audioBuffer = await streamAudio(
              sentence,
              `${messageId}_${audioSegmentIds.length}`,
            );
            if (audioBuffer) {
              audioBuffers.push(audioBuffer);
              audioSegmentIds.push(`${messageId}_${audioSegmentIds.length}`);
            }
          }

          await displayTextWithDynamicDelay(sentence, messageContent, 50, 1);
        }

        buffer = buffer.substring(sentences.join("").length);
      }

      const { html } = renderContent(accumulatedText);
      messageContent.innerHTML = html;
      botMessageElement.dataset.plainText = accumulatedText;
      addPlayButtonToMessage(botMessageElement, messageId, audioBuffers);

      await storeConversation(
        messageText,
        accumulatedText,
        `user_${Date.now()}`,
        audioSegmentIds,
      );
    } else {
      loadingAnimation.remove();
      if (response.status === 401) {
        redirectToLogin();
        return;
      }
      console.error("Failed to send message:", await response.text());
      addMessageToChat("An error occurred. Please try again.", "error-message");
    }
  } catch (error) {
    console.error("Error in sendMessage:", error);
    addMessageToChat("An error occurred. Please try again.", "error-message");
  } finally {
    resumeAudioRecording();
  }
}

/**
 * Sends an audio message for transcription and processing.
 * @param {Blob} audioBlob - The audio blob to send for transcription.
 */
export async function sendAudioMessage(audioBlob) {
  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");

    const response = await fetch(`${apiBaseUrl}/ws/manual_audio`, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      const transcription = data.transcription;

      addMessageToChat(transcription, "user-message");

      await sendMessage(transcription, getSessionId(), getUserId());
    } else {
      console.error("Failed to transcribe audio");
      const errorText = await response.text();
      console.error("Error details:", errorText);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
