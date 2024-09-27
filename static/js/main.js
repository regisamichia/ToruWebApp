import { initializeAudioRecording } from "./audioRecording.js";
import { initializeWebSocket } from "./websocket.js";
import { addMessageToChat, sendMessage, addLoadingAnimation } from "./chat.js";
import { initializeImageUpload } from "./imageUpload.js"; // Add this import
// Remove any imports related to login or registration

export let sessionId = null;
export let userId = null;
export let isAudioEnabled = localStorage.getItem("audioEnabled") !== "false";
export let audioMode = localStorage.getItem("audioMode") || "continuous"; // Add this line

// Function to generate a session ID
function generateSessionId() {
  return "session_" + Math.random().toString(36).substr(2, 9);
}

// Function to get or set user ID
function getUserId() {
  let id = localStorage.getItem("userId");
  if (!id) {
    id = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("userId", id);
  }
  return id;
}

// Initialize session and user ID
export function initializeSession() {
  sessionId = generateSessionId();
  userId = getUserId();
  console.log(
    "Session initialized with sessionId:",
    sessionId,
    "and userId:",
    userId,
  );
}

// Call this function when your app starts, perhaps in your main init function or DOMContentLoaded event
document.addEventListener("DOMContentLoaded", () => {
  initializeSession();
  // ... other initialization code ...
});

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

export function setAudioMode(mode) {
  audioMode = mode;
  localStorage.setItem("audioMode", mode); // Save to localStorage when set
}

export function getAudioMode() {
  return audioMode;
}

async function initializeChatPage() {
  console.log("Initializing chat page...");

  try {
    console.log("About to initialize audio recording...");
    await initializeAudioRecording();
    console.log("Audio recording initialized successfully");

    console.log("Initializing WebSocket...");
    initializeWebSocket(); // Add this line
    console.log("WebSocket initialized successfully");

    console.log("Initializing image upload..."); // Add this line
    initializeImageUpload(); // Add this line
    console.log("Image upload initialized successfully"); // Add this line
  } catch (error) {
    console.error("Failed to initialize:", error);
  }

  // Other initialization code...
  console.log("Chat page initialization complete");
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM content loaded, initializing chat page...");
  initializeChatPage();
});

console.log("Script is running");

try {
  // Your main initialization code here
  // For example:
  document.addEventListener('DOMContentLoaded', async function() {
    console.log("DOM content loaded");
    await initializeAudioRecording();
    console.log("Audio recording initialized");
    // ... other initialization code
  });
} catch (error) {
  console.error("Error in main script:", error);
}
