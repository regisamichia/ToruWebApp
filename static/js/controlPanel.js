import { clearAndCreateNewSession } from "./session.js";
import { clearChatContainer, clearLessonContainer } from "./chatUI.js";
import { resetFirstMessageState } from "./messageHandling.js";

export function initializeControlPanel() {
  console.log("Initializing control panel...");
  const newExerciseButton = document.getElementById("newExerciseButton");
  const tutorialButton = document.getElementById("tutorialButton");

  if (newExerciseButton) {
    console.log("New Exercise button found, adding event listener");
    newExerciseButton.addEventListener("click", handleNewExercise);
  } else {
    console.error("New Exercise button not found");
  }

  if (tutorialButton) {
    console.log("Tutorial button found, adding event listener");
    tutorialButton.addEventListener("click", handleTutorial);
  } else {
    console.error("Tutorial button not found");
  }
}

async function handleNewExercise() {
  console.log("New Exercise button clicked");

  // Clear current session and create a new one
  const newSessionId = await clearAndCreateNewSession();

  if (newSessionId) {
    console.log("New session created, clearing containers");
    // Clear chat container
    clearChatContainer();

    // Clear lesson container
    clearLessonContainer();

    // Reset the first message state
    resetFirstMessageState();

    console.log("New exercise started with session ID:", newSessionId);
    // You might want to add some UI feedback here, like a toast message
    alert("New exercise started!"); // Simple feedback, replace with a more elegant solution later
  } else {
    console.error("Failed to start new exercise");
    alert("Failed to start new exercise. Please try again."); // Simple error message, replace with a more elegant solution later
  }
}

function handleTutorial() {
  console.log("Tutorial button clicked");
  alert("Tutorial functionality not implemented yet."); // Placeholder
}
