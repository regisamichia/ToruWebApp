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
  const { html, text } = renderContent(message);
  messageElement.innerHTML = html;
  messageElement.dataset.plainText = text;
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
          plainText += isDisplayMode ? `\\[${latexContent}\\]` : `\\(${latexContent}\\)`;
        } catch (e) {
          console.error("KaTeX rendering error:", e);
          renderedHtml += `<span class="katex-error" title="KaTeX error: ${e.message}">${isDisplayMode ? "\\[" : "\\("}${latexContent}${isDisplayMode ? "\\]" : "\\)"}</span>`;
          plainText += isDisplayMode ? `\\[${latexContent}\\]` : `\\(${latexContent}\\)`;
        }
      }
    }
  }

  return { 
    html: renderedHtml, 
    text: latexToReadableText(plainText.trim())
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
        if (words[j] !== undefined) {  // Add this check
          chunk.push(words[j]);
        }

        if (chunk.length === wordsPerChunk || j === words.length - 1) {
          displayedText += chunk.join(" ") + " ";
          const { html } = renderContent(displayedText);
          if (html !== undefined) {  // Add this check
            element.innerHTML = html;
            element.scrollIntoView({ behavior: "smooth", block: "end" });
          }

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
      const { html } = renderContent(displayedText);
      element.innerHTML = html;
      element.scrollIntoView({ behavior: "smooth", block: "end" });

      // Add a delay for LaTeX rendering
      await new Promise((resolve) => setTimeout(resolve, baseDelay * 5));
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
    latexContent = latexContent.replace(new RegExp("\\" + command, "g"), replacement);
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
