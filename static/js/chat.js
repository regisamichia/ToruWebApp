import { makeApiCall } from "./api.js";

export async function sendMessage() {
  console.log("sendMessage function called");
  const userInput = document.getElementById("userInput");
  const chatMessages = document.getElementById("chatMessages");

  if (userInput.value.trim() === "") return;

  console.log("Sending message:", userInput.value);

  // Add user message
  const userMessage = document.createElement("div");
  userMessage.className = "message user-message";
  userMessage.textContent = userInput.value;
  chatMessages.appendChild(userMessage);

  // Store the message text before clearing the input
  const messageText = userInput.value;

  // Clear input
  userInput.value = "";

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Prepare chat history
  const messages = Array.from(chatMessages.children).map((msg) => ({
    content: msg.textContent,
    is_user: msg.classList.contains("user-message"),
  }));

  console.log("Chat history:", messages);

  // Send message to backend
  try {
    console.log("Sending request to backend");
    const response = await makeApiCall(
      "http://localhost:8001/api/chat",
      "POST",
      {
        messages: messages,
        new_message: messageText,
      },
    );

    console.log("Response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("Response data:", data);
      const botMessage = document.createElement("div");
      botMessage.className = "message bot-message";
      botMessage.textContent = data.response;
      chatMessages.appendChild(botMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
      console.error("Failed to send message");
      const errorData = await response.json();
      console.error("Error details:", errorData);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
