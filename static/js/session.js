import getUrls from "./config.js";
import { resetFirstMessageState } from './messageHandling.js';

export let sessionId = null;
let chatUrl;

/**
 * Initializes the URLs for the API.
 */
async function initializeUrls() {
  if (!chatUrl) {
    const urls = await getUrls();
    chatUrl = urls.chatUrl;
  }
}

/**
 * Generates a session ID.
 * @returns {string} A generated session ID.
 */
function generateSessionId() {
  return "session_" + Math.random().toString(36).substr(2, 9);
}

/**
 * Gets or sets the user ID.
 * @returns {string} The user ID.
 */
function getUserId() {
  let id = localStorage.getItem("userId");
  if (!id) {
    id = "user_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("userId", id);
  }
  return id;
}

/**
 * Initializes a new chat session.
 * @returns {string|null} The session ID if successful, null otherwise.
 */
export async function initializeSession() {
  try {
    await initializeUrls();
    console.log("Initializing session with chatUrl:", chatUrl);
    const response = await fetch(`${chatUrl}/new_session`, {
      method: 'POST',
    });
    if (response.ok) {
      const data = await response.json();
      if (data.session_id && typeof data.session_id === 'string') {
        sessionId = data.session_id;
        localStorage.setItem('sessionId', sessionId);
        console.log("New session created:", sessionId);
        return sessionId;
      } else {
        console.error("Invalid session ID received from server");
      }
    } else {
      console.error("Failed to create new session");
    }
  } catch (error) {
    console.error("Error creating new session:", error);
  }
  return null;
}

export function getSessionId() {
  console.log("getSessionId called, current sessionId:", sessionId);
  if (!sessionId) {
    sessionId = localStorage.getItem('sessionId');
    console.log("sessionId retrieved from localStorage:", sessionId);
  }
  if (!sessionId || typeof sessionId !== 'string') {
    console.error("No valid session ID available");
    return null;
  }
  console.log("Returning sessionId:", sessionId);
  return sessionId;
}

export function getUserIdFromSession() {
  const userId = localStorage.getItem('user_id');
  if (!userId) {
    console.error("No user ID found in local storage");
    return null;
  }
  return userId;
}

// Add this function to the existing session.js file
export async function clearAndCreateNewSession() {
  try {
    await initializeUrls();
    const response = await fetch(`${chatUrl}/new_session`, {
      method: 'POST',
    });
    if (response.ok) {
      const data = await response.json();
      if (data.session_id && typeof data.session_id === 'string') {
        sessionId = data.session_id;
        localStorage.setItem('sessionId', sessionId);
        console.log("New session created:", sessionId);
        
        // Reset the first message state
        resetFirstMessageState();
        
        return sessionId;
      } else {
        console.error("Invalid session ID received from server");
      }
    } else {
      console.error("Failed to create new session");
    }
  } catch (error) {
    console.error("Error creating new session:", error);
  }
  return null;
}
