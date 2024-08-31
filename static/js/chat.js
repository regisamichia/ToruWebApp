import { makeApiCall } from "./api.js";

export async function sendMessage() {
  const userInput = document.getElementById("userInput");
  const chatMessages = document.getElementById("chatMessages");

  if (userInput.value.trim() === "") return;

  // Add user message
  const userMessage = document.createElement("div");
  userMessage.className = "message user-message";
  userMessage.textContent = userInput.value;
  chatMessages.appendChild(userMessage);

  // Clear input
  const messageText = userInput.value;
  userInput.value = "";

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Send message to backend
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
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to allow rendering
      }
    } else {
      console.error("Failed to send message");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
