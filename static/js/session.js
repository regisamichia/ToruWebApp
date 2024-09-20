import { makeApiCall } from "./api.js";

export async function initializeSession() {
  try {
    const response = await makeApiCall(
      "http://localhost:8001/new_session",
      "POST",
    );
    if (response.ok) {
      const data = await response.json();
      console.log("New session created:", data.session_id);
      return data.session_id;
    } else {
      console.error("Failed to create new session");
    }
  } catch (error) {
    console.error("Error creating new session:", error);
  }
  return null;
}
