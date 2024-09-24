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

export let sessionId = null;
export let userId = null;
export let isAudioEnabled = localStorage.getItem("audioEnabled") !== "false"; // Default to true if not set

export function setAudioEnabled(enabled) {
  isAudioEnabled = enabled;
  localStorage.setItem("audioEnabled", enabled);
}

async function initializeChatPage() {
  try {
    const response = await fetch("http://localhost:8000/api/user_info", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userData = await response.json();
    console.log("User data fetched:", userData);

    userId = userData.user_id;
    sessionId = await initializeSession();

    console.log("Initialized sessionId:", sessionId);
    console.log("Initialized userId:", userId);

    initializeChatInterface();
    await initializeAudioRecording();
    initializeWebSocket();
    initializeLogout();
  } catch (error) {
    console.error("Error initializing chat page:", error);
    // Handle error (e.g., redirect to login page)
    // window.location.href = "/login";
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
          sendMessage(message, sessionId, userId); // Pass userId here
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

export { pauseAudioRecording, resumeAudioRecording };
