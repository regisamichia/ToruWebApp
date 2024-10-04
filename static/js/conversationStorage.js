import getUrls from "./config.js";

let apiBaseUrl;

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

async function getUserId() {
  const response = await fetch(`${apiBaseUrl}/api/user_info`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user info");
  }

  const userData = await response.json();
  return userData.user_id;
}

export async function storeConversation(
  sessionId,
  userMessage,
  botMessage,
  userMessageId,
  botMessageIds,
) {
  await initializeUrls();
  const userId = await getUserId();
  const conversation = {
    userId,
    sessionId,
    messages: [
      {
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
        messageId: userMessageId,
      },
      {
        role: "bot",
        content: botMessage,
        timestamp: new Date().toISOString(),
        messageIds: botMessageIds, // Store as messageIds (array) instead of messageId
      },
    ],
  };

  console.log("Attempting to save conversation:", JSON.stringify(conversation, null, 2));

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
      throw new Error(
        `Failed to save chat history: ${response.status} ${response.statusText}`,
      );
    }

    const responseData = await response.json();
    console.log("Chat history saved successfully:", responseData);
  } catch (error) {
    console.error("Error saving chat history:", error);
    console.error("Conversation data:", JSON.stringify(conversation, null, 2));
  }
}
