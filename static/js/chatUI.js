import { handleUserInput } from "./messageHandling.js";
import { getAudioMode } from "./main.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";
import { replayAudioFromS3 } from "./audioHandling.js";

// Create audioContext at the top level
let audioContext;

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
  if (!chatMessages) {
    console.error("Chat messages container not found");
    return null;
  }

  const messageElement = document.createElement("div");
  const messageId = generateUniqueId();
  messageElement.id = messageId;
  messageElement.className = `message ${className}`;

  const messageContent = document.createElement("div");
  messageContent.className = "message-content";
  messageElement.appendChild(messageContent);

  if (message) {
    const { html, text } = renderContent(message);
    messageContent.innerHTML = html;
    messageElement.dataset.plainText = text;
  }

  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return { element: messageElement, id: messageId };
}

// New function to add play button
export function addPlayButtonToMessage(messageElement, messageId, audioBuffers) {
  const playButton = document.createElement("button");
  playButton.innerHTML = "▶️";
  playButton.className = "replay-button";
  playButton.onclick = () => replayAudioBuffers(audioBuffers);

  // Create a wrapper div for the message and play button
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper";

  // Move the message content into the wrapper
  wrapper.appendChild(messageElement.querySelector('.message-content'));
  
  // Add the play button to the wrapper
  wrapper.appendChild(playButton);

  // Replace the message content with the wrapper
  messageElement.innerHTML = '';
  messageElement.appendChild(wrapper);
}

function replayAudioBuffers(audioBuffers) {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  let currentIndex = 0;

  function playNextBuffer() {
    if (currentIndex >= audioBuffers.length) {
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[currentIndex];
    source.connect(audioContext.destination);
    source.onended = () => {
      currentIndex++;
      playNextBuffer();
    };
    source.start();
  }

  playNextBuffer();
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
  const latexPattern = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  const parts = text.split(latexPattern);

  let renderedHtml = "";
  let plainText = "";

  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      // Non-LaTeX part
      const markdownHtml = marked.parse(escapeSpecialChars(parts[i]));
      renderedHtml += markdownHtml;
      plainText += parts[i];
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
          plainText += isDisplayMode
            ? `\\[${latexContent}\\]`
            : `\\(${latexContent}\\)`;
        } catch (e) {
          console.error("KaTeX rendering error:", e);
          renderedHtml += `<span class="katex-error" title="KaTeX error: ${e.message}">${isDisplayMode ? "\\[" : "\\("}${latexContent}${isDisplayMode ? "\\]" : "\\)"}</span>`;
          plainText += isDisplayMode
            ? `\\[${latexContent}\\]`
            : `\\(${latexContent}\\)`;
        }
      }
    }
  }

  return {
    html: renderedHtml,
    text: latexToReadableText(plainText.trim()),
  };
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
  const words = text.split(" ");
  let chunk = [];
  let displayedText = element.innerText; // Start with existing content

  for (let i = 0; i < words.length; i++) {
    chunk.push(words[i]);

    if (chunk.length === wordsPerChunk || i === words.length - 1) {
      displayedText += chunk.join(" ") + " ";
      element.innerText = displayedText;
      element.scrollIntoView({ behavior: "smooth", block: "end" });

      const chunkLength = chunk.join(" ").length;
      const delay = baseDelay + chunkLength * 30;
      await new Promise((resolve) => setTimeout(resolve, delay));

      chunk = [];
    }
  }
}

function getAllTextNodes(node) {
  const textNodes = [];
  if (node.nodeType === Node.TEXT_NODE) {
    textNodes.push(node);
  } else {
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      textNodes.push(...getAllTextNodes(children[i]));
    }
  }
  return textNodes;
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

// Add this function to chatUI.js
export function latexToReadableText(text) {
  // Replace both display and inline math mode
  text = text.replace(
    /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g,
    (match, p1, p2) => {
      return processLatexContent(p1 || p2);
    },
  );

  return text.trim();
}

function processLatexContent(latexContent) {
  // Replace common LaTeX commands with readable text
  const latexCommands = {
    "\\frac": "fraction",
    "\\sqrt": "racine carrée de",
    "\\sum": "somme de",
    "\\int": "l'intégrale de",
    "\\infty": "l'infini",
    "\\pi": "pi",
    "\\alpha": "alpha",
    "\\beta": "beta",
    "\\gamma": "gamma",
    "\\div": "divisé par",
    "\\times": "fois",
    "\\cdot": "fois",
    "\\le": "plus petit ou égal à",
    "\\ge": "plus grand ou égal à",
    "\\neq": "n'est pas égal à",
    "\\approx": "approximativement égal à",
    "\\equiv": "équivalent à",
    "\\pm": "plus ou moins",
    // Add more LaTeX commands as needed
  };

  for (const [command, replacement] of Object.entries(latexCommands)) {
    latexContent = latexContent.replace(
      new RegExp("\\" + command, "g"),
      replacement,
    );
  }

  // Handle fractions
  latexContent = latexContent.replace(
    /fraction\{([^}]+)\}\{([^}]+)\}/g,
    "$1 divisé par $2",
  );

  // Handle superscripts (exponents)
  latexContent = latexContent.replace(
    /\^(\{[^}]+\}|\d+)/g,
    (match, p1) => ` à la puissance ${p1.replace(/[{}]/g, "")}`,
  );

  // Handle subscripts
  latexContent = latexContent.replace(
    /_(\{[^}]+\}|\d+)/g,
    (match, p1) => ` indice ${p1.replace(/[{}]/g, "")}`,
  );

  // Handle basic arithmetic operations
  latexContent = latexContent
    .replace(/\+/g, " plus ")
    .replace(/\-/g, " moins ")
    .replace(/\*/g, " fois ")
    .replace(/\//g, " divisé par ");

  // Remove remaining LaTeX commands
  latexContent = latexContent.replace(/\\[a-zA-Z]+/g, "");

  // Clean up any remaining LaTeX artifacts
  latexContent = latexContent.replace(/[{}]/g, "");

  // Replace multiple spaces with a single space
  latexContent = latexContent.replace(/\s+/g, " ");

  return latexContent.trim();
}

function generateUniqueId() {
  return "id-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
}
