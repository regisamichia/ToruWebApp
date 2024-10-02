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
  messageElement.innerHTML = renderContent(message);
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
  // Regex to identify LaTeX parts (both inline and display), including newlines
  const latexPattern = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;

  // Split response into LaTeX and non-LaTeX parts
  const parts = text.split(latexPattern);

  let renderedHtml = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      // Non-LaTeX part
      const markdownHtml = marked.parse(escapeSpecialChars(parts[i]));
      renderedHtml += markdownHtml;
    } else {
      // LaTeX part
      const isDisplayMode = i % 3 === 1;
      const latexContent = parts[i];
      if (latexContent) {
        try {
          const latexHtml = katex.renderToString(latexContent.trim(), {
            displayMode: isDisplayMode,
            throwOnError: false,
            strict: false,
          });
          renderedHtml += latexHtml;
        } catch (e) {
          console.error("KaTeX rendering error:", e);
          renderedHtml += `<span class="katex-error" title="KaTeX error: ${e.message}">${isDisplayMode ? "\\[" : "\\("}${latexContent}${isDisplayMode ? "\\]" : "\\)"}</span>`;
        }
      }
    }
  }

  return renderedHtml;
}

// Escape special characters in regular text
function escapeSpecialChars(text) {
  return text
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/%/g, "\\%") // Escape percentages
    .replace(/_/g, "\\_"); // Escape underscores
}

export async function displayTextWithDynamicDelay(
  text,
  element,
  baseDelay = 100,
  wordsPerChunk = 1,
) {
  // Regex to identify LaTeX parts (both inline and display), including newlines
  const latexPattern = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;

  // Split text into LaTeX and non-LaTeX parts
  const parts = text.split(latexPattern);

  let displayedText = "";

  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      // Non-LaTeX part
      const words = parts[i].split(" ");
      let chunk = [];

      for (let j = 0; j < words.length; j++) {
        chunk.push(words[j]);

        if (chunk.length === wordsPerChunk || j === words.length - 1) {
          displayedText += chunk.join(" ") + " ";
          element.innerHTML = renderContent(displayedText);
          element.scrollIntoView({ behavior: "smooth", block: "end" });

          const chunkLength = chunk.join(" ").length;
          const delay = baseDelay + chunkLength * 20;
          await new Promise((resolve) => setTimeout(resolve, delay));

          chunk = [];
        }
      }
    } else {
      // LaTeX part
      displayedText +=
        (i % 3 === 1 ? "\\[" : "\\(") +
        parts[i] +
        (i % 3 === 1 ? "\\]" : "\\)");
      element.innerHTML = renderContent(displayedText);
      element.scrollIntoView({ behavior: "smooth", block: "end" });

      // Add a delay for LaTeX rendering
      await new Promise((resolve) => setTimeout(resolve, baseDelay * 5));
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
