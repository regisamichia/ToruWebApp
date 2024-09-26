import {
  pauseAudioRecording,
  resumeAudioRecording,
  isAudioEnabled,
  getTtsProvider,
  sessionId,
  userId
} from "./main.js";
import { checkAuthAndRedirect } from "./auth.js";
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

// Define audioContext and audioQueue as global variables
let audioContext;
let audioQueue = [];
let isPlaying = false;

// Make sure these functions are exported
export function addMessageToChat(message, className) {
  const chatMessages = document.getElementById("chatMessages");
  const messageElement = document.createElement("div");
  messageElement.className = `message ${className}`;
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return messageElement; // Make sure to return the created element
}

export function addLoadingAnimation() {
  const chatMessages = document.getElementById("chatMessages");
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "message bot-message loading-animation";
  loadingDiv.innerHTML =
    '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return loadingDiv;
}

export function renderContent(text) {
  // Replace LaTeX delimiters before Markdown parsing
  text = text.replace(/\\\(/g, "$");
  text = text.replace(/\\\)/g, "$");

  // Parse Markdown
  const htmlContent = marked.parse(text);

  // Create a temporary div to hold the content
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;

  // Process LaTeX after Markdown parsing
  MathJax.typesetPromise([tempDiv])
    .then(() => {
      console.log("MathJax rendering complete");
    })
    .catch((err) => console.log("MathJax processing failed:", err));

  return tempDiv.innerHTML;
}

export async function displayTextWithDynamicDelay(
  text,
  element,
  baseDelay = 100, // Increased from 50
  wordsPerChunk = 1, // Reduced from 2
) {
  const words = text.split(" ");
  let displayedText = "";
  let chunk = [];

  for (let i = 0; i < words.length; i++) {
    chunk.push(words[i]);

    if (chunk.length === wordsPerChunk || i === words.length - 1) {
      displayedText += chunk.join(" ") + " ";
      element.innerHTML = renderContent(displayedText);
      element.scrollIntoView({ behavior: "smooth", block: "end" });

      const chunkLength = chunk.join(" ").length;
      const delay = baseDelay + chunkLength * 20; // Increased from 10
      await new Promise((resolve) => setTimeout(resolve, delay));

      chunk = [];
    }
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

// Add this function to handle user input from the text field
export function handleUserInput() {
  const userInput = document.getElementById("userInput");
  const messageText = userInput.value.trim();
  if (messageText !== "") {
    addMessageToChat(messageText, "user-message");
    sendMessage(messageText, sessionId, userId); // Pass userId here
    userInput.value = "";
  }
}

export async function sendMessage(messageText) {
  if (!checkAuthAndRedirect()) return;

  if (messageText.trim() === "") return;

  const loadingAnimation = addLoadingAnimation();

  try {
    pauseAudioRecording();

    console.log("SessionId:", sessionId);
    console.log("UserId:", userId);

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("message", messageText);
    formData.append("user_id", userId);

    const response = await fetch("http://localhost:8001/api/math_chat", {
      method: "POST",
      body: formData,
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    if (response.ok) {
      loadingAnimation.remove();
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

      // Store the conversation in local storage
      console.log("Storing conversation in sendMessage");
      storeConversation(userId, sessionId, messageText, accumulatedText);
    } else {
      if (response.status === 401) {
        redirectToLogin();
        return;
      }
      console.error("Failed to send message:", await response.text());
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    loadingAnimation.remove();
    resumeAudioRecording();
  }
}

async function storeConversation(userId, sessionId, userMessage, botMessage) {
  const conversation = {
    userId, // Ensure userId is included
    sessionId,
    userMessage,
    botMessage,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(
      "http://localhost:8000/api/save_chat_history",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(conversation),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to save chat history");
    }

    console.log("Chat history saved successfully");
  } catch (error) {
    console.error("Error saving chat history:", error);
  }
}

// At the end of the file, add this export
export { storeConversation };
