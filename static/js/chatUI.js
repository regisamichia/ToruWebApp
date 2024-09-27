import { handleUserInput } from "./messageHandling.js";
import { getAudioMode } from "./main.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

export function initializeChatUI() {
  const userInput = document.getElementById("userInput");
  if (userInput) {
    userInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        handleUserInput();
      }
    });
  }
  updateMicrophoneButtonState();
}

export function addMessageToChat(message, className) {
  const chatMessages = document.getElementById("chatMessages");
  const messageElement = document.createElement("div");
  messageElement.className = `message ${className}`;
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return messageElement;
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

function updateMicrophoneButtonState() {
  const micButton = document.getElementById("microphoneButton");
  const currentMode = getAudioMode();

  if (currentMode === "manual") {
    micButton.style.display = "inline-block";
  } else {
    micButton.style.display = "none";
  }
}
