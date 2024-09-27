import { isAudioEnabled, sessionId, userId } from "./main.js";
import {
  addMessageToChat,
  addLoadingAnimation,
  renderContent,
  displayTextWithDynamicDelay,
} from "./chatUI.js";
import { streamAudio } from "./audioHandling.js";
import { storeConversation } from "./conversationStorage.js";
import { pauseAudioRecording, resumeAudioRecording } from "./audioRecording.js";

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
  console.log("sendMessage called with:", { messageText, sessionId, userId });

  if (messageText.trim() === "") {
    console.log("Empty message, returning");
    return;
  }

  const loadingAnimation = addLoadingAnimation();

  try {
    pauseAudioRecording();

    console.log("Preparing to send message to math_chat");
    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("message", messageText);
    formData.append("user_id", userId);

    console.log("Sending request to math_chat");
    const response = await fetch("http://localhost:8001/api/math_chat", {
      method: "POST",
      body: formData,
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    if (response.ok) {
      console.log("Received OK response from math_chat");
      loadingAnimation.remove(); // Remove loading animation here

      const botMessageElement = addMessageToChat("", "bot-message");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);

        const sentences = buffer.match(/[^.!?]+[.!?]+/g) || [];

        for (const sentence of sentences) {
          accumulatedText += sentence;
          if (isAudioEnabled) {
            await streamAudio(sentence);
          }
          await displayTextWithDynamicDelay(sentence, botMessageElement);
        }

        buffer = buffer.substring(sentences.join("").length);
      }

      // Process any remaining text in the buffer
      if (buffer) {
        accumulatedText += buffer;
        if (isAudioEnabled) {
          await streamAudio(buffer);
        }
        await displayTextWithDynamicDelay(buffer, botMessageElement);
      }

      // Final render with MathJax
      if (botMessageElement) {
        botMessageElement.innerHTML = renderContent(accumulatedText);
        MathJax.typesetPromise([botMessageElement])
          .then(() => {
            console.log("MathJax rendering complete");
          })
          .catch((err) => console.log("MathJax processing failed:", err));
      }

      console.log("Storing conversation");
      await storeConversation(userId, sessionId, messageText, accumulatedText);
    } else {
      loadingAnimation.remove(); // Remove loading animation in case of error
      if (response.status === 401) {
        console.log("Unauthorized, redirecting to login");
        redirectToLogin();
        return;
      }
      console.error("Failed to send message:", await response.text());
      addMessageToChat("An error occurred. Please try again.", "error-message");
    }
  } catch (error) {
    loadingAnimation.remove(); // Remove loading animation in case of error
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

    const response = await fetch("http://localhost:8000/ws/manual_audio", {
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
