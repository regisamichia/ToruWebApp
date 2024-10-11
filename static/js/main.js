import {
  initializeSession as initializeSessionFromAPI,
  getSessionId as getSessionIdFromSession,
  getUserIdFromSession,
} from "./session.js";
import { initializeChatUI, addMessageToChat } from "./chatUI.js";
import { initializeAudioRecording } from "./audioRecording.js";
import { initializeWebSocket } from "./websocket.js";
import { initializeImageUpload } from "./imageUpload.js";
import { initializeMessageHandling } from "./messageHandling.js";
import { initializeChat } from "./chat.js";
import getUrls from "./config.js";
import { closeLesson, requestLesson, clearLesson } from "./mathLesson.js";
import { initializeControlPanel } from "./controlPanel.js";

let sessionId = null;
let userId = null;
let isAudioEnabled = localStorage.getItem("audioEnabled") !== "false";
let audioMode = localStorage.getItem("audioMode") || "continuous";
let apiBaseUrl, chatUrl, multiModalUrl;

async function initializeUrls() {
  const urls = await getUrls();
  window.apiBaseUrl = urls.apiBaseUrl;
  window.chatUrl = urls.chatUrl;
  window.multiModalUrl = urls.multiModalUrl;
  console.log("URLs initialized:", { apiBaseUrl, chatUrl, multiModalUrl });
}

async function initializeSession() {
  sessionId = await initializeSessionFromAPI();
  if (!sessionId) {
    console.error("Failed to initialize session");
    // You might want to add some user-facing error handling here
    return;
  }
  userId = getUserIdFromSession();
  console.log(
    "Session initialized with sessionId:",
    sessionId,
    "and userId:",
    userId,
  );
}

function setAudioEnabled(enabled) {
  isAudioEnabled = enabled;
  localStorage.setItem("audioEnabled", enabled);
}

function getTtsProvider() {
  return localStorage.getItem("ttsProvider") || "elevenlabs";
}

function setTtsProvider(provider) {
  localStorage.setItem("ttsProvider", provider);
}

function setAudioMode(mode) {
  audioMode = mode;
  localStorage.setItem("audioMode", mode);
}

function getAudioMode() {
  return audioMode;
}

function getAudioEnabled() {
  return isAudioEnabled;
}

async function initializeChatPage() {
  console.log("Initializing chat page...");

  try {
    console.log("Initializing chat...");
    await initializeChat();
    console.log("Chat initialized successfully");

    console.log("About to initialize audio recording...");
    await initializeAudioRecording();
    console.log("Audio recording initialized successfully");

    console.log("About to initialize message handling...");
    await initializeMessageHandling();
    console.log("Message handling initialized successfully");

    console.log("Initializing WebSocket...");
    await initializeWebSocket();
    console.log("WebSocket initialized successfully");

    console.log("Initializing image upload...");
    await initializeImageUpload();
    console.log("Image upload initialized successfully");

    console.log("Initializing chat UI...");
    initializeChatUI();
    console.log("Chat UI initialized successfully");

    console.log("Initializing control panel...");
    initializeControlPanel();
    console.log("Control panel initialized successfully");
  } catch (error) {
    console.error("Failed to initialize:", error);
  }

  console.log("Chat page initialization complete");
}

async function initializeApp() {
  try {
    console.log("Starting initializeApp...");
    await initializeSession();
    if (!sessionId) {
      console.error(
        "Failed to initialize session. Aborting app initialization.",
      );
      // Add user-facing error handling here
      return;
    }
    console.log("Session initialized, sessionId:", sessionId);

    const chatContainer = document.querySelector(".chat-container");
    const chatHistory = document.getElementById("chatHistory");

    console.log("chatContainer:", chatContainer ? "Found" : "Not found");
    console.log("chatHistory:", chatHistory ? "Found" : "Not found");

    if (chatContainer) {
      console.log("Chat container found, about to call initializeChatPage...");
      await initializeChatPage();
      console.log("initializeChatPage completed");
      document.getElementById("loadingState").style.display = "none";
      document.getElementById("mainContent").style.display = "block";
    } else if (chatHistory) {
      console.log("Chat history found, initializing chat history...");
      // Implement initializeChatHistory function if needed
      // await initializeChatHistory();
    } else {
      console.log("Neither chat container nor chat history found.");
    }
    console.log("initializeApp completed.");
  } catch (error) {
    console.error("Error in initializeApp:", error);
    // Add user-facing error handling here
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM content loaded, initializing app...");
  initializeApp().catch((error) => {
    console.error("Error during app initialization:", error);
  });

  const closeLessonButton = document.getElementById("closeLessonButton");
  closeLessonButton.addEventListener("click", closeLesson);

  const lessonButton = document.getElementById("lessonButton");
  if (lessonButton) {
    lessonButton.addEventListener("click", requestLesson);
  }

  window.showLessonButton = function () {
    lessonButton.style.display = "block";
  };
});

function addMessage(message, isUser = false) {
  const className = isUser ? "user-message" : "bot-message";
  addMessageToChat(message, className, sessionId);
}

function getSessionId() {
  const currentSessionId = getSessionIdFromSession();
  console.log("getSessionId in main.js, currentSessionId:", currentSessionId);
  if (!currentSessionId) {
    console.error("No valid session ID available in main.js");
    // You might want to add some user-facing error handling here
  }
  return currentSessionId;
}

function getUserId() {
  return userId;
}

console.log("Main script loaded");

// Export everything at once at the end of the file
export {
  initializeSession,
  setAudioEnabled,
  getTtsProvider,
  setTtsProvider,
  setAudioMode,
  getAudioMode,
  getAudioEnabled,
  addMessage,
  getSessionId,
  getUserId,
  isAudioEnabled,
  apiBaseUrl,
  chatUrl,
  multiModalUrl,
};
