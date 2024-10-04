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
            messageElement.className = `chat-entry ${message.role}-message`;
            const { html } = renderContent(message.content);
            
            let replayButton = '';
            if (message.role === 'bot') {
              const messageIds = message.messageIds || (message.messageId ? [message.messageId] : null);
              if (messageIds && messageIds.length > 0 && messageIds[0] !== null) {
                replayButton = `<button class="replay-button" data-message-ids="${messageIds.join(',')}">
                  <i class="fas fa-play"></i> Replay
                </button>`;
              } else {
                console.warn("Bot message without valid messageIds:", message);
              }
            }
            
            messageElement.innerHTML = `
              <p><strong>${message.role === "user" ? userFirstName : "Toru"}:</strong></p>
              <div class="message-content">${html}</div>
              ${replayButton}
              <p><small>${new Date(message.timestamp).toLocaleString()}</small></p>
            `;
            
            if (replayButton) {
              const button = messageElement.querySelector('.replay-button');
              if (button) {
                button.addEventListener('click', () => {
                  const messageIds = button.dataset.messageIds.split(',');
                  console.log("Replaying audio for messageIds:", messageIds);
                  replayAudioFromS3(messageIds);
                });
              } else {
                console.error("Replay button not found for message:", message);
              }
            }
            
            sessionElement.appendChild(messageElement);
          });
        } else {
          // Handle the case where messages might not be an array
          const userMessageElement = document.createElement("div");
          userMessageElement.className = "chat-entry user-message";
          userMessageElement.innerHTML = `
            <p><strong>${userFirstName}:</strong></p>
            <div>${session.userMessage}</div>
            <p><small>${new Date(session.timestamp).toLocaleString()}</small></p>
          `;
          sessionElement.appendChild(userMessageElement);

          const botMessageElement = document.createElement("div");
          botMessageElement.className = "chat-entry bot-message";
          botMessageElement.innerHTML = `
            <p><strong>Bot:</strong></p>
            <div>${session.botMessage}</div>
            <p><small>${new Date(session.timestamp).toLocaleString()}</small></p>
          `;
          sessionElement.appendChild(botMessageElement);
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
