import getUrls from "./config.js";

let apiBaseUrl;

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

async function initializeChatHistory() {
  await initializeUrls();
  try {
    const response = await fetch(`${apiBaseUrl}/api/user_info`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userData = await response.json();
    console.log("User data fetched:", userData);

    await displayChatHistory(userData.user_id);
  } catch (error) {
    console.error("Error fetching user info:", error);
    document.getElementById("chatHistory").innerHTML =
      "<p>Error loading user information. Please try again later.</p>";
  }
}

async function displayChatHistory(userId) {
  console.log("Displaying chat history for user:", userId);

  try {
    const response = await fetch(
      `${apiBaseUrl}/api/get_chat_history/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch chat history: ${response.status}`);
    }

    const chatHistory = await response.json();
    console.log("Chat history received:", chatHistory);

    const chatHistoryElement = document.getElementById("chatHistory");
    chatHistoryElement.innerHTML = "";

    if (chatHistory.length === 0) {
      chatHistoryElement.innerHTML = "<p>No chat history found.</p>";
    } else {
      chatHistory.forEach((entry) => {
        const messageElement = document.createElement("div");
        messageElement.className = "chat-entry";
        messageElement.innerHTML = `
                    <p><strong>User:</strong> ${entry.userMessage}</p>
                    <p><strong>Bot:</strong> ${entry.botMessage}</p>
                    <p><small>${new Date(entry.timestamp).toLocaleString()}</small></p>
                `;
        chatHistoryElement.appendChild(messageElement);
      });
    }
  } catch (error) {
    console.error("Error fetching chat history:", error);
    document.getElementById("chatHistory").innerHTML =
      "<p>Error loading chat history. Please try again later.</p>";
  }
}

document.addEventListener("DOMContentLoaded", initializeChatHistory);
