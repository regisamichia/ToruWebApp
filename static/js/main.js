import { initializeSession } from "./session.js";
import {
  initializeAudioRecording,
  pauseAudioRecording,
  resumeAudioRecording,
} from "./audioRecording.js";
import { initializeWebSocket } from "./websocket.js";
import { addMessageToChat, sendMessage, addLoadingAnimation } from "./chat.js";
import { initializeImageUpload } from "./imageUpload.js";
import { handleLogout } from "./login.js";
import { isAuthenticated, redirectToLogin, checkAuthAndRedirect } from "./auth.js";

export let sessionId = null;
export let userId = null;
export let isAudioEnabled = localStorage.getItem("audioEnabled") !== "false"; // Default to true if not set

// Remove these duplicate function declarations
// export function isAuthenticated() { ... }
// export function redirectToLogin() { ... }
// export function checkAuthAndRedirect() { ... }

export function setAudioEnabled(enabled) {
  isAudioEnabled = enabled;
  localStorage.setItem("audioEnabled", enabled);
}

export function getTtsProvider() {
  return localStorage.getItem("ttsProvider") || "elevenlabs";
}

export function setTtsProvider(provider) {
  localStorage.setItem("ttsProvider", provider);
}

async function initializeChatPage() {
  if (!isAuthenticated()) {
    console.log("User not authenticated. Redirecting to login.");
    redirectToLogin();
    return;
  }

  try {
    const response = await fetch("http://localhost:8000/api/user_info", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log("Token expired or invalid. Redirecting to login.");
        redirectToLogin();
        return;
      }
      throw new Error("Failed to fetch user info");
    }

    const userData = await response.json();
    console.log("User data fetched:", userData);

    userId = userData.user_id;
    sessionId = await initializeSession();

    console.log("Initialized sessionId:", sessionId);
    console.log("Initialized userId:", userId);

    initializeChatInterface();
    
    let retries = 3;
    while (retries > 0) {
      try {
        await initializeAudioRecording();
        console.log("Audio recording initialized successfully");
        break; // Exit the loop if successful
      } catch (audioError) {
        console.error("Failed to initialize audio recording:", audioError);
        retries--;
        if (retries > 0) {
          console.log(`Retrying audio initialization. Attempts left: ${retries}`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
        } else {
          // Update the UI to inform the user about the audio issue
          const micStatus = document.getElementById("micStatus");
          if (micStatus) {
            micStatus.textContent = "Microphone: Unavailable - " + audioError.message;
          }
          // Optionally, you can disable audio-related features here
        }
      }
    }
    
    initializeWebSocket();
    initializeLogout();
  } catch (error) {
    console.error("Error initializing chat page:", error);
    alert("An error occurred while loading the chat page. Please try again later.");
  }
}

function initializeChatInterface() {
  const userInput = document.getElementById("userInput");
  if (userInput) {
    userInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message) {
          addMessageToChat(message, "user-message");
          sendMessage(message); // Remove sessionId and userId from here
          userInput.value = "";
        }
      }
    });
  }

  initializeImageUpload();
}

function initializeLogout() {
  const logoutButton = document.getElementById("logoutButton");
  const sidebarLogoutButton = document.getElementById("sidebarLogoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }

  if (sidebarLogoutButton) {
    sidebarLogoutButton.addEventListener("click", handleLogout);
  }
}

document.addEventListener("DOMContentLoaded", initializeChatPage);

window.addEventListener("beforeunload", () => {
  // Cleanup code here
});

// Update the exports at the end of the file
export { 
  pauseAudioRecording, 
  resumeAudioRecording,
};
