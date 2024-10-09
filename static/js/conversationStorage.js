import { getSessionId, getUserId } from "./main.js";
import getUrls from "./config.js";

let apiBaseUrl;

/**
 * Initializes the URLs for the API.
 * Retrieves the base URL from the config file.
 */
async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

/**
 * Retrieves the user ID from the API.
 * @returns {string} The user ID.
 */
// async function getUserId() {
//   const response = await fetch(`${apiBaseUrl}/api/user_info`, {
//     headers: {
//       Authorization: `Bearer ${localStorage.getItem("token")}`,
//     },
//   });

//   if (!response.ok) {
//     throw new Error("Failed to fetch user info");
//   }

//   const userData = await response.json();
//   return userData.user_id;
// }

/**
 * Stores a conversation in the database.
 * @param {string} sessionId - The ID of the conversation session.
 * @param {string} userMessage - The message from the user.
 * @param {string} botMessage - The response from the bot.
 * @param {string} userMessageId - The ID of the user's message.
 * @param {string[]} botMessageIds - The IDs of the bot's message(s).
 */
export async function storeConversation(
  userMessage,
  botMessage,
  userMessageId,
  botMessageIds,
  imageId = null,
) {
  await initializeUrls();
  const currentSessionId = getSessionId();
  const currentUserId = getUserId();

  console.log("storeConversation called");
  console.log("Current sessionId:", currentSessionId);
  console.log("Current userId:", currentUserId);

  if (!currentSessionId || typeof currentSessionId !== 'string') {
    console.error("No valid sessionId available. Cannot store conversation.");
    // You might want to add some user-facing error handling here
    return;
  }

  const conversation = {
    userId: currentUserId,
    sessionId: currentSessionId,
    messages: [
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
        messageId: userMessageId,
        ...(imageId && { imageId }),
      },
      {
        role: "bot",
        content: botMessage,
        timestamp: new Date().toISOString(),
        messageIds: botMessageIds,
      },
    ],
  };

  console.log("Conversation object:", JSON.stringify(conversation, null, 2));

  try {
    const response = await fetch(`${apiBaseUrl}/api/save_chat_history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(conversation),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server response:", errorText);
      throw new Error(
        `Failed to save chat history: ${response.status} ${response.statusText}`,
      );
    }

    const responseData = await response.json();
    console.log("Chat history saved successfully:", responseData);

    // Store conversation in localStorage as well
    storeConversationLocally(
      getUserId(),
      getSessionId(),
      userMessage,
      botMessage,
      userMessageId,
      botMessageIds,
      imageId,
    );
  } catch (error) {
    console.error("Error saving chat history:", error);
    console.error("Conversation data:", JSON.stringify(conversation, null, 2));
  }
}

function storeConversationLocally(
  userId,
  sessionId,
  userMessage,
  botMessage,
  userMessageId,
  botMessageIds,
  imageId = null,
) {
  const conversation =
    JSON.parse(
      localStorage.getItem(`conversation_${getUserId()}_${getSessionId()}`),
    ) || [];

  const userMessageObject = {
    content: userMessage,
    timestamp: new Date().toISOString(),
    id: userMessageId,
  };

  if (imageId) {
    userMessageObject.imageId = imageId;
  }

  conversation.push({
    userMessage: userMessageObject,
    botMessage: {
      content: botMessage,
      timestamp: new Date().toISOString(),
      ids: botMessageIds,
    },
  });

  localStorage.setItem(
    `conversation_${getUserId()}_${getSessionId()}`,
    JSON.stringify(conversation),
  );
}
