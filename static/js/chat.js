import { makeApiCall } from "./api.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { pauseAudioRecording, resumeAudioRecording, isAudioEnabled } from "./main.js";

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

function renderContent(text) {
  // Parse Markdown
  const htmlContent = marked.parse(text);

  // Create a temporary div to hold the content
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = htmlContent;

  // Process LaTeX after Markdown parsing
  MathJax.typesetPromise([tempDiv])
    .then(() => {
      // MathJax processing is complete
      console.log("MathJax rendering complete");
    })
    .catch((err) => console.log("MathJax processing failed:", err));

  return tempDiv.innerHTML;
}

let audioContext;
let audioQueue = [];
let isPlaying = false;

async function streamAudio(text) {
  if (!isAudioEnabled) return; // Skip audio synthesis if audio is disabled

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    const response = await fetch("http://localhost:8000/api/synthesize_audio", {
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

async function displayTextWithDynamicDelay(
  text,
  element,
  baseDelay = 100,  // Increased from 50
  wordsPerChunk = 1  // Reduced from 2
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

export async function sendMessage(messageText, sessionId) {
  if (messageText.trim() === "") return;

  const loadingAnimation = addLoadingAnimation();

  try {
    pauseAudioRecording();

    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("message", messageText);

    const response = await makeApiCall(
      "http://localhost:8001/api/argentic_chat",
      "POST",
      formData,
    );

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
            await streamAudio(sentence); // Wait for audio to be queued before displaying text
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

      // Remove this block to prevent playing audio twice
      // if (isAudioEnabled) {
      //   await streamAudio(accumulatedText);
      // }
    } else {
      console.error("Failed to send message");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    loadingAnimation.remove();
    resumeAudioRecording();
  }
}

// Add this function to handle user input from the text field
export function handleUserInput() {
  const userInput = document.getElementById("userInput");
  const messageText = userInput.value.trim();
  if (messageText !== "") {
    addMessageToChat(messageText, "user-message");
    sendMessage(messageText, sessionId);
    userInput.value = "";
  }
}
