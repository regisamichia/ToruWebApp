import { clearAndCreateNewSession } from "./session.js";
import { clearChatContainer, clearLessonContainer } from "./chatUI.js";
import { resetFirstMessageState } from "./messageHandling.js";
import { setAudioEnabled, getAudioEnabled } from "./main.js";

export function initializeControlPanel() {
  console.log("Initializing control panel...");
  const newExerciseButton = document.getElementById("newExerciseButton");
  const tutorialButton = document.getElementById("tutorialButton");
  const toggleAudioControl = document.getElementById("toggleAudioControl");

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

  if (toggleAudioControl) {
    console.log("Audio toggle found, initializing");
    toggleAudioControl.checked = getAudioEnabled();
    toggleAudioControl.addEventListener("change", handleAudioToggle);
  } else {
    console.error("Audio toggle not found");
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

function handleAudioToggle(event) {
  const isAudioEnabled = event.target.checked;
  console.log(`Audio ${isAudioEnabled ? "enabled" : "disabled"}`);
  localStorage.setItem("audioEnabled", isAudioEnabled);
  setAudioEnabled(isAudioEnabled);
}
