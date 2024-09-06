import { makeApiCall } from "./api.js";
import { getToken, handleLogout } from "./login.js";
import { sendMessage, addMessageToChat } from "./chat.js";

// Declare sessionId at the top level of the module
let sessionId = null;

let mediaRecorder;
let audioChunks = [];
let stream;

function initializeAudioRecording() {
  const recordButton = document.getElementById("recordButton");
  const recordingStatus = document.getElementById("recordingStatus");

  if (recordButton) {
    recordButton.addEventListener("click", toggleRecording);
  }

  async function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      recordButton.textContent = "Record Audio";
      recordingStatus.textContent = "Recording stopped.";

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    } else {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        mediaRecorder.start();
        recordButton.textContent = "Stop Recording";
        recordingStatus.textContent = "Recording...";

        mediaRecorder.addEventListener("dataavailable", (event) => {
          audioChunks.push(event.data);
        });

        mediaRecorder.addEventListener("stop", () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          audioChunks = [];
          sendAudioMessage(audioBlob);

          stream.getTracks().forEach((track) => track.stop());
        });
      } catch (error) {
        console.error("Error accessing microphone:", error);
        alert(
          "Unable to access the microphone. Please ensure you have granted the necessary permissions.",
        );
      }
    }
  }
}

async function sendAudioMessage(audioBlob) {
  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio/webm");

    const response = await makeApiCall(
      "http://localhost:8002/transcribe",
      "POST",
      formData,
      "multipart/form-data",
    );

    if (response.ok) {
      const data = await response.json();
      const transcription = data.transcription;

      // Add the transcription to the chat as a user message
      addMessageToChat(transcription, "user-message");

      // Send the transcription to the chat route
      await sendChatMessage(transcription);
    } else {
      console.error("Failed to transcribe audio");
      const errorText = await response.text();
      console.error("Error details:", errorText);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

async function initializeSession() {
  try {
    const response = await makeApiCall(
      "http://localhost:8001/new_session",
      "POST",
    );
    if (response.ok) {
      const data = await response.json();
      sessionId = data.session_id; // Assign to the module-scoped sessionId
      console.log("New session created:", sessionId);
    } else {
      console.error("Failed to create new session");
    }
  } catch (error) {
    console.error("Error creating new session:", error);
  }
}

async function sendChatMessage(message) {
  if (!sessionId) {
    console.error("No active session");
    return;
  }

  try {
    const response = await makeApiCall(
      "http://localhost:8001/api/argentic_chat",
      "POST",
      {
        session_id: sessionId,
        message: message,
      },
      "application/json",
    );

    if (response.ok) {
      const data = await response.json();
      const botMessage = document.createElement("div");
      botMessage.className = "message bot-message";
      botMessage.textContent = data.response;
      document.getElementById("chatMessages").appendChild(botMessage);
      document.getElementById("chatMessages").scrollTop =
        document.getElementById("chatMessages").scrollHeight;
    } else {
      console.error("Failed to send message to chat");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// async function sendChatMessage(message) {
//   try {
//     const response = await makeApiCall(
//       "http://localhost:8001/api/chat",
//       "POST",
//       { new_message: message },
//       "application/json",
//     );

//     if (response.ok) {
//       const botMessage = document.createElement("div");
//       botMessage.className = "message bot-message";
//       document.getElementById("chatMessages").appendChild(botMessage);

//       const reader = response.body.getReader();
//       const decoder = new TextDecoder();

//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;
//         const chunk = decoder.decode(value);
//         botMessage.textContent += chunk;
//         document.getElementById("chatMessages").scrollTop =
//           document.getElementById("chatMessages").scrollHeight;
//         await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay to allow rendering
//       }
//     } else {
//       console.error("Failed to send message to chat");
//     }
//   } catch (error) {
//     console.error("Error:", error);
//   }
// }

export async function sendImageMessage(imageFile) {
  /**
   * Sends an image for text extraction and processes the extracted text through the chat system.
   *
   * This function performs the following steps:
   * 1. Uploads the image to the text extraction API.
   * 2. Displays the extracted text in the chat interface.
   * 3. Sends the extracted text to the chat API for processing.
   * 4. Displays the bot's response to the extracted text.
   *
   * @param {File} imageFile - The image file to be processed.
   * @throws {Error} If there's an issue with the API calls or data processing.
   *
   * @example
   * // Assuming you have a file input element
   * const imageInput = document.getElementById('imageInput');
   * imageInput.addEventListener('change', (event) => {
   *   const file = event.target.files[0];
   *   if (file) {
   *     sendImageMessage(file);
   *   }
   * });
   */

  try {
    const formData = new FormData();
    formData.append("image", imageFile, imageFile.name);

    const extractResponse = await makeApiCall(
      "http://localhost:8000/api/extract_text",
      "POST",
      formData,
    );

    if (extractResponse.ok) {
      const data = await extractResponse.json();

      // Add the extracted text to the chat as a user message
      addMessageToChat(data.text, "user-message");

      // Send the extracted text to the chat route
      const chatResponse = await makeApiCall(
        "http://localhost:8001/api/chat",
        "POST",
        { new_message: data.text },
        "application/json",
      );

      if (chatResponse.ok) {
        const botMessage = document.createElement("div");
        botMessage.className = "message bot-message";
        const chatMessages = document.getElementById("chatMessages");
        chatMessages.appendChild(botMessage);

        const reader = chatResponse.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          botMessage.textContent += chunk;
          chatMessages.scrollTop = chatMessages.scrollHeight;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } else {
        console.error("Failed to send extracted text to chat");
        const errorText = await chatResponse.text();
        console.error("Error details:", errorText);
      }
    } else {
      console.error("Failed to extract text from image");
      const errorText = await extractResponse.text();
      console.error("Error details:", errorText);
    }
  } catch (error) {
    console.error("Error in sendImageMessage:", error);
  }
}

function initializeChatInterface() {
  const userInput = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");
  const imageInput = document.getElementById("imageInput");
  const uploadButton = document.getElementById("uploadButton");

  if (userInput) {
    userInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message) {
          addMessageToChat(message, "user-message");
          sendChatMessage(message);
          userInput.value = "";
        }
      }
    });
  }

  if (sendButton) {
    sendButton.addEventListener("click", function () {
      const message = userInput.value.trim();
      if (message) {
        addMessageToChat(message, "user-message");
        sendChatMessage(message);
        userInput.value = "";
      }
    });
  }

  if (uploadButton) {
    uploadButton.addEventListener("click", function () {
      imageInput.click();
    });
  }

  if (imageInput) {
    imageInput.addEventListener("change", function () {
      const imageFile = imageInput.files[0];
      if (imageFile) {
        sendImageMessage(imageFile);
      }
    });
  }
}

function initializeLogout() {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

function initializeChatPage() {
  initializeSession().then(() => {
    initializeChatInterface();
    initializeAudioRecording();
    initializeLogout();
  });
}

document.addEventListener("DOMContentLoaded", initializeChatPage);
