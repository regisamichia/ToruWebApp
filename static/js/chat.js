import {
  initializeChatUI,
  addMessageToChat,
  addLoadingAnimation,
  displayTextWithDynamicDelay,
  renderContent,
} from "./chatUI.js";
import {
  initializeAudioHandling,
  handleMicrophoneClick,
  streamAudio,
} from "./audioHandling.js";
import { sendMessage, handleUserInput } from "./messageHandling.js";
import { storeConversation } from "./conversationStorage.js";
import { checkAuthAndFetchUserInfo, logout } from "./auth.js";
import { getAudioMode } from "./main.js";

export async function initializeChat() {
  const userData = await checkAuthAndFetchUserInfo();
  if (!userData) {
    console.log("Authentication check failed, redirecting...");
    return;
  }

  // Authentication successful, show the main content
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('mainContent').style.display = 'block';

  initializeChatUI();
  initializeAudioHandling();
  initializeLogoutButtons();
}

function initializeLogoutButtons() {
  const logoutButton = document.getElementById("logoutButton");
  const sidebarLogoutButton = document.getElementById("sidebarLogoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", logout);
  }

  if (sidebarLogoutButton) {
    sidebarLogoutButton.addEventListener("click", logout);
  }
}

// document.addEventListener("DOMContentLoaded", initializeChat);

export {
  addMessageToChat,
  addLoadingAnimation,
  handleUserInput,
  handleMicrophoneClick,
  sendMessage,
  storeConversation,
  getAudioMode,
  displayTextWithDynamicDelay,
  renderContent,
  streamAudio, // Add this line
};
