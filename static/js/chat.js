import { makeApiCall } from "./api.js";

// Import marked at the top of the file
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

export function addMessageToChat(message, className) {
  const chatMessages = document.getElementById("chatMessages");
  const messageElement = document.createElement("div");
  messageElement.className = `message ${className}`;
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
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
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Process LaTeX after Markdown parsing
  MathJax.typesetPromise([tempDiv]).then(() => {
    // MathJax processing is complete
    console.log('MathJax rendering complete');
  }).catch((err) => console.log('MathJax processing failed:', err));

  return tempDiv.innerHTML;
}

export async function sendMessage(messageText, sessionId) {
  if (messageText.trim() === "") return;

  const loadingAnimation = addLoadingAnimation();

  try {
    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("message", messageText);

    const response = await makeApiCall(
      "http://localhost:8001/api/argentic_chat",
      "POST",
      formData,
    );

    if (response.ok) {
      const botMessage = document.createElement("div");
      botMessage.className = "message bot-message";
      document.getElementById("chatMessages").appendChild(botMessage);

      const data = await response.json();
      
      // Render content (Markdown + LaTeX)
      botMessage.innerHTML = renderContent(data.response);

      document.getElementById("chatMessages").scrollTop =
        document.getElementById("chatMessages").scrollHeight;
    } else {
      console.error("Failed to send message");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    loadingAnimation.remove();
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
