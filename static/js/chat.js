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
import { checkAuthAndRedirect, logout } from "./auth.js";
import { getAudioMode } from "./main.js";

export function initializeChat() {
  if (!checkAuthAndRedirect()) {
    console.log("Authentication check failed, redirecting...");
    return;
  }

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

document.addEventListener("DOMContentLoaded", initializeChat);

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
