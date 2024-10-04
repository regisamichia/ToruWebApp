import getUrls from "./config.js";
import { renderContent } from "./chatUI.js";

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
  await initializeUrls();
  await getUserInfo();
  await displayChatHistory();
}

async function displayChatHistory() {
  console.log("Displaying chat history");

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

    const chatHistoryElement = document.getElementById("chatHistory");
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
            const messageElement = document.createElement("div");
            messageElement.className = `chat-entry ${message.role}-message`;
            const { html } = renderContent(message.content);
            messageElement.innerHTML = `
              <p><strong>${message.role === "user" ? userFirstName : "Toru"}:</strong></p>
              <div>${html}</div>
              <p><small>${new Date(message.timestamp).toLocaleString()}</small></p>
            `;
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
    document.getElementById("chatHistory").innerHTML =
      "<p>Error loading chat history. Please try again later.</p>";
  }
}

document.addEventListener("DOMContentLoaded", initializeChatHistory);
