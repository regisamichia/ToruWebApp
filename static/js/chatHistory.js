import getUrls from "./config.js";
import { renderContent } from "./chatUI.js";
import { initializeAudioHandling, replayAudioFromS3 } from "./audioHandling.js";

let apiBaseUrl;
let userFirstName = "User"; // Default value

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

async function getUserInfo() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/user_info`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const userData = await response.json();
    console.log("User data received:", userData); // Add this line
    userFirstName = userData.first_name || "User";
    console.log("User first name set to:", userFirstName); // Add this line
  } catch (error) {
    console.error("Error fetching user info:", error);
  }
}

async function initializeChatHistory() {
  try {
    await initializeUrls();
    await getUserInfo();
    await initializeAudioHandling();
    await displayChatHistory();
  } catch (error) {
    console.error("Error initializing chat history:", error);
  }
}

async function displayChatHistory() {
  console.log("Displaying chat history");

  const chatHistoryElement = document.getElementById("chatHistory");
  if (!chatHistoryElement) {
    console.error("Chat history element not found");
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/get_chat_history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to fetch chat history: ${response.status} - ${errorData.detail}`,
      );
    }

    const chatHistory = await response.json();
    console.log("Chat history received:", chatHistory);

    chatHistoryElement.innerHTML = "";

    if (chatHistory.length === 0) {
      chatHistoryElement.innerHTML = "<p>No chat history found.</p>";
    } else {
      chatHistory.forEach((session) => {
        const sessionElement = document.createElement("div");
        sessionElement.className = "chat-session";
        sessionElement.innerHTML = `<h3>Session: ${session.sessionId}</h3>`;

        if (Array.isArray(session.messages)) {
          session.messages.forEach((message) => {
            console.log("Processing message:", JSON.stringify(message, null, 2));
            
            const messageElement = document.createElement("div");
            messageElement.className = `message ${message.role}-message`;
            const { html } = renderContent(message.content);
            
            const messageWrapper = document.createElement("div");
            messageWrapper.className = "message-wrapper";
            
            const messageContent = document.createElement("div");
            messageContent.className = "message-content";
            messageContent.innerHTML = html;
            
            messageWrapper.appendChild(messageContent);
            
            if (message.role === 'bot') {
              const messageIds = message.messageIds || (message.messageId ? [message.messageId] : null);
              if (messageIds && messageIds.length > 0 && messageIds[0] !== null) {
                const playButton = document.createElement("div");
                playButton.className = "replay-button";
                playButton.innerHTML = '<i class="fas fa-play"></i>';
                playButton.onclick = () => replayAudioFromS3(messageIds);
                messageWrapper.appendChild(playButton);
              } else {
                console.warn("Bot message without valid messageIds:", message);
              }
            }
            
            messageElement.appendChild(messageWrapper);
            
            const timestamp = document.createElement("p");
            timestamp.className = "message-timestamp";
            timestamp.innerHTML = `<small>${new Date(message.timestamp).toLocaleString()}</small>`;
            messageElement.appendChild(timestamp);
            
            sessionElement.appendChild(messageElement);
          });
        } else {
          // Handle the case where messages might not be an array (as before)
        }

        chatHistoryElement.appendChild(sessionElement);
      });
    }
  } catch (error) {
    console.error("Error fetching chat history:", error);
    chatHistoryElement.innerHTML = "<p>Error loading chat history. Please try again later.</p>";
  }
}

// Only initialize if we're on the chat history page
if (document.getElementById("chatHistory")) {
  document.addEventListener("DOMContentLoaded", initializeChatHistory);
}
