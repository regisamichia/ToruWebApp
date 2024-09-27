export async function storeConversation(
  userId,
  sessionId,
  userMessage,
  botMessage,
) {
  const conversation = {
    userId,
    sessionId,
    userMessage,
    botMessage,
    timestamp: new Date().toISOString(),
  };

  console.log("Attempting to save conversation:", conversation);

  try {
    const response = await fetch(
      "http://localhost:8000/api/save_chat_history",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(conversation),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server response:", errorText);
      console.error("Response status:", response.status);
      console.error("Response headers:", response.headers);
      throw new Error(
        `Failed to save chat history: ${response.status} ${response.statusText}`,
      );
    }

    const responseData = await response.json();
    console.log("Chat history saved successfully:", responseData);
  } catch (error) {
    console.error("Error saving chat history:", error);
    console.error("Conversation data:", conversation);
  }
}
