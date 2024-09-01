import { makeApiCall } from "./api.js";

export function addMessageToChat(message, className) {
  const chatMessages = document.getElementById("chatMessages");
  const messageElement = document.createElement("div");
  messageElement.className = `message ${className}`;
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

export async function sendMessage() {
  const userInput = document.getElementById("userInput");
  const chatMessages = document.getElementById("chatMessages");

  const messageText = userInput.value.trim();
  if (messageText === "") return;
  userInput.value = "";

  addMessageToChat(messageText, "user-message");

  try {
    const response = await makeApiCall(
      "http://localhost:8001/api/chat",
      "POST",
      { new_message: messageText },
      "application/json",
    );

    if (response.ok) {
      const botMessage = document.createElement("div");
      botMessage.className = "message bot-message";
      chatMessages.appendChild(botMessage);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        botMessage.textContent += chunk;
        chatMessages.scrollTop = chatMessages.scrollHeight;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } else {
      console.error("Failed to send message");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
