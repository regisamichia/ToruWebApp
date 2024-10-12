import { renderContent } from "./messageRendering.js";
import { replayAudioBuffers } from "./chatUI.js";

/**
 * Adds a message to the chat UI.
 * @param {string} message - The message content.
 * @param {string} className - The CSS class for the message.
 * @param {string} sessionId - The session ID.
 * @returns {Object} An object containing the message element and its ID.
 */
export function addMessageToChat(message, className, sessionId) {
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

  // Show the lesson button after bot messages
  if (className === "bot-message") {
    const lessonButton = document.getElementById("lessonButton");
    if (lessonButton) {
      lessonButton.style.display = "block";
    }
  }

  chatMessages.scrollTop = chatMessages.scrollHeight;
  return { element: messageElement, id: messageId };
}

/**
 * Adds a loading animation to the chat UI.
 * @returns {HTMLElement} The loading animation element.
 */
export function addLoadingAnimation() {
  const chatMessages = document.getElementById("chatMessages");
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "message bot-message";

  const loadingAnimation = document.createElement("div");
  loadingAnimation.className = "loading-animation";
  loadingAnimation.innerHTML =
    '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

  loadingDiv.appendChild(loadingAnimation);
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return loadingDiv;
}

export function addUserLoadingAnimation() {
  const chatMessages = document.getElementById("chatMessages");
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "message user-message user-loading-animation";

  const loadingAnimation = document.createElement("div");
  loadingAnimation.className = "loading-animation";
  loadingAnimation.innerHTML =
    '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';

  loadingDiv.appendChild(loadingAnimation);
  chatMessages.appendChild(loadingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return loadingDiv;
}

/**
 * Adds a play button to a message for audio replay.
 * @param {HTMLElement} messageElement - The message element.
 * @param {string} messageId - The ID of the message.
 * @param {AudioBuffer[]} audioBuffers - The audio buffers to replay.
 */
export function addPlayButtonToMessage(
  messageElement,
  messageId,
  audioBuffers,
) {
  const playButton = document.createElement("div");
  playButton.className = "replay-button";
  playButton.innerHTML = '<i class="fas fa-play"></i>';
  playButton.onclick = () => replayAudioBuffers(audioBuffers);

  // Create a wrapper div for the message and play button
  const wrapper = document.createElement("div");
  wrapper.className = "message-wrapper";

  // Move the message content into the wrapper
  wrapper.appendChild(messageElement.querySelector(".message-content"));

  // Add the play button to the wrapper
  wrapper.appendChild(playButton);

  // Replace the message content with the wrapper
  messageElement.innerHTML = "";
  messageElement.appendChild(wrapper);
}

function generateUniqueId() {
  return "id-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);
}
