import { makeApiCall } from "./api.js";
import getUrls from "./config.js";

let apiBaseUrl;

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

export async function initializeSession() {
  await initializeUrls();
  try {
    const response = await makeApiCall(`${apiBaseUrl}/new_session`, "POST");
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
