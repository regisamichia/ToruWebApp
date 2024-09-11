import { makeApiCall } from "./api.js";
import { handleLogout } from "./login.js";
import { addMessageToChat, addLoadingAnimation } from "./chat.js";

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
    const formData = new FormData();
    formData.append("session_id", sessionId);
    formData.append("message", message);

    const response = await makeApiCall(
      "http://localhost:8001/api/argentic_chat",
      "POST",
      formData,
    );

    if (response.ok) {
      const data = await response.json();
      const botMessage = document.createElement("div");
      botMessage.className = "message bot-message";
      botMessage.innerHTML = marked.parse(data.response);
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

export async function sendImageMessage(imageFile) {
  try {
    // Create a preview of the image
    const imagePreview = URL.createObjectURL(imageFile);

    // Add the image to the chat as a user message
    const userMessageDiv = document.createElement("div");
    userMessageDiv.className = "message user-message";
    const img = document.createElement("img");
    img.src = imagePreview;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "200px"; // Adjust this value as needed
    userMessageDiv.appendChild(img);
    document.getElementById("chatMessages").appendChild(userMessageDiv);

    // Scroll to the bottom of the chat
    document.getElementById("chatMessages").scrollTop = document.getElementById("chatMessages").scrollHeight;

    // Add loading animation
    const loadingAnimation = addLoadingAnimation();

    try {
      // First, send the image to the extract_text route
      const extractFormData = new FormData();
      extractFormData.append("image", imageFile, imageFile.name);

      const extractResponse = await makeApiCall(
        "http://localhost:8000/api/extract_text",
        "POST",
        extractFormData,
      );

      if (!extractResponse.ok) {
        console.error("Failed to extract text from image");
        const errorText = await extractResponse.text();
        console.error("Error details:", errorText);
        return;
      }

      const extractData = await extractResponse.json();
      const extractedText = extractData.text;

      // Now, send both the image and extracted text to the argentic_chat route
      const chatFormData = new FormData();
      chatFormData.append("session_id", sessionId);
      chatFormData.append("image", imageFile, imageFile.name);
      chatFormData.append("extracted_text", extractedText);

      const chatResponse = await makeApiCall(
        "http://localhost:8001/api/argentic_chat",
        "POST",
        chatFormData,
        "multipart/form-data",
      );

      if (chatResponse.ok) {
        const data = await chatResponse.json();
        const botMessage = document.createElement("div");
        botMessage.className = "message bot-message";
        botMessage.innerHTML = marked.parse(data.response);
        document.getElementById("chatMessages").appendChild(botMessage);
        document.getElementById("chatMessages").scrollTop =
          document.getElementById("chatMessages").scrollHeight;
      } else {
        console.error("Failed to process image and text in chat");
        const errorText = await chatResponse.text();
        console.error("Error details:", errorText);
      }
    } catch (error) {
      console.error("Error in sendImageMessage:", error);
    } finally {
      // Remove loading animation
      loadingAnimation.remove();
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
