import { isAudioEnabled, sessionId, userId } from "./main.js";
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

async function initializeUrls() {
  try {
    const urls = await getUrls();
    if (!urls) {
      throw new Error("getUrls() returned undefined");
    }
    console.log("Received URLs:", urls);
    return urls;
  } catch (error) {
    console.error("Error in initializeUrls:", error);
    throw error;
  }
}

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
    console.log("MessageHandling initialized with URLs:", {
      chatUrl,
      apiBaseUrl,
    });
  } catch (error) {
    console.error("Failed to initialize MessageHandling:", error);
    throw error;
  }
}

export function handleUserInput() {
  const userInput = document.getElementById("userInput");
  const messageText = userInput.value.trim();
  if (messageText !== "") {
    addMessageToChat(messageText, "user-message");
    sendMessage(messageText, sessionId, userId);
    userInput.value = "";
  } else if (getAudioMode() === "manual") {
    handleMicrophoneClick();
  }
}

export async function sendMessage(messageText, sessionId, userId) {
  if (messageText.trim() === "") return;

  const loadingAnimation = addLoadingAnimation();

  try {
    pauseAudioRecording();

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("message", messageText);
    formData.append("user_id", userId);

    const response = await fetch(`${chatUrl}/api/math_chat`, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      loadingAnimation.remove();

      const { element: botMessageElement, id: messageId } = addMessageToChat("", "bot-message");
      const messageContent = botMessageElement.querySelector('.message-content');

      if (!messageContent) {
        console.error("Message content element not found");
        return;
      }

      let accumulatedText = "";
      let audioBuffers = [];
      let audioSegmentIds = []; // Initialize as an empty array

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
            const audioBuffer = await streamAudio(sentence, `${messageId}_${audioSegmentIds.length}`);
            if (audioBuffer) {
              audioBuffers.push(audioBuffer);
              audioSegmentIds.push(`${messageId}_${audioSegmentIds.length}`); // Store each segment ID
            }
          }

          await displayTextWithDynamicDelay(sentence, messageContent, 50, 1);
        }

        buffer = buffer.substring(sentences.join("").length);
      }

      // Display full message and add play button
      const { html } = renderContent(accumulatedText);
      messageContent.innerHTML = html;
      botMessageElement.dataset.plainText = accumulatedText;
      addPlayButtonToMessage(botMessageElement, messageId, audioBuffers);

      // Pass the array of audio segment IDs to storeConversation
      await storeConversation(sessionId, messageText, accumulatedText, `user_${Date.now()}`, audioSegmentIds);
    } else {
      loadingAnimation.remove();
      if (response.status === 401) {
        console.log("Unauthorized, redirecting to login");
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

      // Add the transcription to the chat as a user message
      addMessageToChat(transcription, "user-message");

      // Send the transcription to the chat route
      await sendMessage(transcription, sessionId, userId);
    } else {
      console.error("Failed to transcribe audio");
      const errorText = await response.text();
      console.error("Error details:", errorText);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
