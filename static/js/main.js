import { makeApiCall } from "./api.js";
import { sendMessage, addMessageToChat } from "./chat.js";

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
    formData.append("audio", audioBlob, "audio.webm");

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

async function sendChatMessage(message) {
  try {
    const response = await makeApiCall(
      "http://localhost:8001/api/chat",
      "POST",
      { new_message: message },
      "application/json",
    );

    if (response.ok) {
      const botMessage = document.createElement("div");
      botMessage.className = "message bot-message";
      document.getElementById("chatMessages").appendChild(botMessage);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        botMessage.textContent += chunk;
        document.getElementById("chatMessages").scrollTop =
          document.getElementById("chatMessages").scrollHeight;
        await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay to allow rendering
      }
    } else {
      console.error("Failed to send message to chat");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

function initializeChatInterface() {
  const userInput = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");

  if (userInput) {
    userInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (sendButton) {
    sendButton.addEventListener("click", function () {
      sendMessage();
    });
  }
}

function initializeLogout() {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

async function handleLogout() {
  try {
    // Clear the token from localStorage
    localStorage.removeItem("token");

    // Optionally, you can also make an API call to invalidate the token on the server
    // await makeApiCall("http://localhost:8000/api/logout", "POST");

    // Redirect to the login page
    window.location.href = "/login";
  } catch (error) {
    console.error("Error during logout:", error);
  }
}

function initializeChatPage() {
  initializeChatInterface();
  initializeAudioRecording();
  initializeLogout();
}

document.addEventListener("DOMContentLoaded", initializeChatPage);
