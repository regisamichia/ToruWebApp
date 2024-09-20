import { initializeSession } from "./session.js";
import { initializeAudioRecording, pauseAudioRecording, resumeAudioRecording } from "./audioRecording.js";
import { initializeWebSocket } from "./websocket.js";
import { addMessageToChat, sendMessage, addLoadingAnimation } from "./chat.js";
import { initializeImageUpload } from "./imageUpload.js";
import { handleLogout } from "./login.js";

export let sessionId = null;
export let isAudioEnabled = true;

async function initializeChatPage() {
  sessionId = await initializeSession();
  initializeChatInterface();
  await initializeAudioRecording();
  initializeWebSocket();
  initializeLogout();
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
          sendMessage(message, sessionId, isAudioEnabled);
          userInput.value = "";
        }
      }
    });
  }

  initializeImageUpload();

  const toggleAudioInput = document.getElementById('toggleAudio');
  if (toggleAudioInput) {
    toggleAudioInput.addEventListener('change', toggleAudio);
    isAudioEnabled = toggleAudioInput.checked;
  }
}

function toggleAudio() {
  const toggleAudioInput = document.getElementById('toggleAudio');
  isAudioEnabled = toggleAudioInput.checked;
  console.log(`Audio ${isAudioEnabled ? 'enabled' : 'disabled'}`);
}

function initializeLogout() {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

document.addEventListener("DOMContentLoaded", initializeChatPage);

window.addEventListener("beforeunload", () => {
  // Cleanup code here
});

export { pauseAudioRecording, resumeAudioRecording };
