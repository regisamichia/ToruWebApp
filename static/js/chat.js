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
import { checkAuthAndRedirect } from "./auth.js";
import { getAudioMode } from "./main.js";

export function initializeChat() {
  if (!checkAuthAndRedirect()) {
    console.log("Authentication check failed, redirecting...");
    return;
  }

  initializeChatUI();
  initializeAudioHandling();
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
  streamAudio,  // Add this line
};
