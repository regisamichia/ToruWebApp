import getUrls from "./config.js";
import { renderContent } from "./chatUI.js";
import { initializeAudioHandling, replayAudioFromS3 } from "./audioHandling.js";

let apiBaseUrl;
let userFirstName = "User"; // Default value
let userId;

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

async function getUserInfo() {
  try {
    const response = await fetch(`${apiBaseUrl}/api/user_info`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const userData = await response.json();
    userFirstName = userData.first_name || "User";
    userId = userData.user_id;
  } catch (error) {
    console.error("Error fetching user info:", error);
  }
}

/**
 * Initializes the chat history functionality.
 * Sets up event listeners and loads initial chat history.
 */
async function initializeChatHistory() {
  try {
    await initializeUrls();
    await getUserInfo();
    await initializeAudioHandling();
    await displayChatHistory();

    // Add event listeners for date filter
    const filterDateInput = document.getElementById("filterDate");
    const filterButton = document.getElementById("filterButton");

    filterButton.addEventListener("click", () => {
      const selectedDate = filterDateInput.value;
      displayChatHistory(selectedDate);
    });
  } catch (error) {
    console.error("Error initializing chat history:", error);
  }
}

/**
 * Displays the chat history, optionally filtered by date.
 * @param {string|null} filterDate - The date to filter messages by (optional).
 */
async function displayChatHistory(filterDate = null) {
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
      let hasMessagesForSelectedDate = false;

      chatHistory.forEach((session) => {
        const sessionElement = document.createElement("div");
        sessionElement.className = "chat-session";

        if (Array.isArray(session.messages)) {
          session.messages.forEach(async (message) => {
            const messageDate = new Date(message.timestamp)
              .toISOString()
              .split("T")[0];

            if (filterDate && messageDate !== filterDate) {
              return; // Skip messages that don't match the filter date
            }

            hasMessagesForSelectedDate = true;

            console.log(
              "Processing message:",
              JSON.stringify(message, null, 2),
            );

            const messageElement = document.createElement("div");
            messageElement.className = `message ${message.role}-message`;

            const messageWrapper = document.createElement("div");
            messageWrapper.className = "message-wrapper";

            // Handle image display for user messages
            if (message.role === "user" && message.imageId) {
              try {
                // Use 'images' as the type and messageId (which is the same as imageId) to retrieve the image
                const imageUrl = await getPresignedUrl(message.messageId, 'images');
                const img = document.createElement("img");
                img.src = imageUrl;
                img.style.maxWidth = "100%";
                img.style.maxHeight = "200px";
                messageWrapper.appendChild(img);
              } catch (error) {
                console.error("Error fetching image URL:", error);
              }
            }

            const messageContent = document.createElement("div");
            messageContent.className = "message-content";
            const { html } = renderContent(message.content);
            messageContent.innerHTML = html;

            messageWrapper.appendChild(messageContent);

            if (message.role === "bot") {
              const messageIds =
                message.messageIds ||
                (message.messageId ? [message.messageId] : null);
              if (
                messageIds &&
                messageIds.length > 0 &&
                messageIds[0] !== null
              ) {
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
        }

        if (sessionElement.children.length > 0) {
          chatHistoryElement.appendChild(sessionElement);
        }
      });

      if (filterDate && !hasMessagesForSelectedDate) {
        chatHistoryElement.innerHTML =
          "<p>No messages for the selected day.</p>";
      }
    }
  } catch (error) {
    console.error("Error fetching chat history:", error);
    chatHistoryElement.innerHTML =
      "<p>Error loading chat history. Please try again later.</p>";
  }
}

async function getPresignedUrl(messageId, type) {
  const response = await fetch(`${apiBaseUrl}/api/get_presigned_urls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      user_id: userId,
      message_id: messageId,
      type: type
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch presigned URL: ${response.status}`);
  }

  const data = await response.json();
  return data.urls[0]; // Assuming the first URL is the one we want
}

// Only initialize if we're on the chat history page
if (document.getElementById("chatHistory")) {
  document.addEventListener("DOMContentLoaded", initializeChatHistory);
}
