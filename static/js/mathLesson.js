import { getSessionId } from "./main.js";
import getUrls from "./config.js";
import { renderContent } from "./chatUI.js";

let chatUrl;
let lessonContent = null; // Store the lesson content

async function initializeUrls() {
  const urls = await getUrls();
  chatUrl = urls.chatUrl;
}

export async function requestLesson() {
  await initializeUrls();
  const sessionId = getSessionId();
  console.log("Requesting lesson with sessionId:", sessionId);

  if (!sessionId) {
    console.error("Session ID is null. Cannot request lesson.");
    return;
  }

  const lessonContainer = document.querySelector(".lesson-container");
  const chatContainer = document.querySelector(".chat-container");
  const lessonButton = document.getElementById("lessonButton");

  // Show lesson container and adjust layout
  lessonContainer.classList.add("active");
  chatContainer.style.width = "50%";
  lessonContainer.style.width = "50%";
  lessonButton.style.display = "none"; // Hide the lesson button

  const lessonMessages = document.getElementById("lessonMessages");

  if (lessonContent) {
    console.log("Using stored lesson content");
    lessonMessages.innerHTML = lessonContent;
    return; // Exit the function early if we have stored content
  }

  console.log("Generating new lesson content");
  lessonMessages.innerHTML =
    '<div class="message">Toru est en train de créer la leçon, encore quelques secondes...</div>';

  try {
    const response = await fetch(`${chatUrl}/api/math_lesson`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `session_id=${sessionId}`,
    });

    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      lessonMessages.innerHTML = ""; // Clear initial loading message
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        accumulatedText += chunk;

        // Split the accumulated text into sections (e.g., by double newlines)
        const sections = accumulatedText.split("\n\n");

        // Render each new section as a separate message
        sections.forEach((section, index) => {
          if (section.trim() && index >= lessonMessages.children.length) {
            const { html } = renderContent(section);
            const messageDiv = document.createElement("div");
            messageDiv.className = "message";
            messageDiv.innerHTML = html;
            lessonMessages.appendChild(messageDiv);
          }
        });

        // Scroll to the bottom of the lesson messages
        lessonMessages.scrollTop = lessonMessages.scrollHeight;
      }

      // Store the generated lesson content
      lessonContent = lessonMessages.innerHTML;
      console.log("Lesson content stored");
    } else {
      throw new Error("Failed to fetch lesson");
    }
  } catch (error) {
    console.error("Error:", error);
    lessonMessages.innerHTML =
      '<div class="message">Failed to generate lesson. Please try again.</div>';
  }
}

// Add a function to close the lesson
export function closeLesson() {
  const lessonContainer = document.querySelector(".lesson-container");
  const chatContainer = document.querySelector(".chat-container");
  const lessonButton = document.getElementById("lessonButton");

  lessonContainer.classList.remove("active");
  chatContainer.style.width = "100%";
  lessonContainer.style.width = "0";
  lessonButton.style.display = "block"; // Show the lesson button again
}

// Add a function to clear the lesson content
export function clearLesson() {
  lessonContent = null;
  const lessonMessages = document.getElementById("lessonMessages");
  lessonMessages.innerHTML = "";
  console.log("Lesson content cleared");
}
