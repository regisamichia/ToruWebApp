import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

/**
 * Renders content with Markdown and LaTeX support.
 * @param {string} text - The text to render.
 * @returns {Object} An object containing the rendered HTML and plain text.
 */
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

/**
 * Displays text with a dynamic delay for a typewriter effect.
 * @param {string} text - The text to display.
 * @param {HTMLElement} element - The element to display the text in.
 * @param {number} baseDelay - The base delay between words.
 * @param {number} wordsPerChunk - The number of words to display per chunk.
 */
export async function displayTextWithDynamicDelay(
  text,
  element,
  baseDelay = 100,
  wordsPerChunk = 1,
) {
  const words = text.split(" ");
  let chunk = [];
  let displayedText = element.innerText || ""; // Start with existing content or empty string

  for (let i = 0; i < words.length; i++) {
    chunk.push(words[i]);

    if (chunk.length === wordsPerChunk || i === words.length - 1) {
      displayedText += chunk.join(" ") + " ";
      element.innerText = displayedText;

      // Scroll the parent element (message container) into view
      const messageContainer = element.closest(".message");
      if (messageContainer) {
        messageContainer.scrollIntoView({ behavior: "smooth", block: "end" });
      }

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

/**
 * Converts LaTeX content to readable text.
 * @param {string} text - The text containing LaTeX.
 * @returns {string} The readable text version.
 */
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
    (match, p1) => `  la puissance ${p1.replace(/[{}]/g, "")}`,
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