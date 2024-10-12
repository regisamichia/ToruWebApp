import { handleUserInput } from "./messageHandling.js";
import { getAudioMode } from "./main.js";
import { requestLesson } from "./mathLesson.js";
import {
  handleMicrophoneClick,
  updateMicrophoneButtonState,
  replayAudioFromS3,
} from "./audioHandling.js";
import {
  addMessageToChat,
  addLoadingAnimation,
  addUserLoadingAnimation,
  addPlayButtonToMessage,
} from "./uiHelpers.js";
import {
  renderContent,
  displayTextWithDynamicDelay,
} from "./messageRendering.js";

// Create audioContext at the top level
let audioContext;

let messageCount = 0;

let isPlaying = false;

/**
 * Initializes the chat UI components.
 */
export function initializeChatUI() {
  const userInput = document.getElementById("userInput");
  const microphoneButton = document.getElementById("microphoneButton");
  const uploadButton = document.getElementById("uploadButton");
  const imageInput = document.getElementById("imageInput");

  if (userInput) {
    userInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        handleUserInput();
      }
    });
  }

  if (microphoneButton) {
    microphoneButton.addEventListener("click", handleMicrophoneClick);
  }

  if (uploadButton && imageInput) {
    uploadButton.addEventListener("click", () => {
      imageInput.click();
    });

    //imageInput.addEventListener("change", handleImageUpload);
  }

  updateMicrophoneButtonState();
}

export function replayAudioBuffers(audioBuffers) {
  if (isPlaying) {
    return;
  }

  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  let currentIndex = 0;

  function playNextBuffer() {
    if (currentIndex >= audioBuffers.length) {
      isPlaying = false;
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffers[currentIndex];
    source.connect(audioContext.destination);
    source.onended = () => {
      currentIndex++;
      playNextBuffer();
    };
    source.start();
  }

  isPlaying = true;
  playNextBuffer();
}

export function clearChatContainer() {
  console.log("Clearing chat container");
  const chatMessages = document.getElementById("chatMessages");
  const fixedMessageContainer = document.getElementById(
    "fixedMessageContainer",
  );

  if (chatMessages) chatMessages.innerHTML = "";
  if (fixedMessageContainer) fixedMessageContainer.innerHTML = "";

  messageCount = 0;
  hideLessonButton(); // Ensure this line is present and not commented out
}

export function clearLessonContainer() {
  console.log("Clearing lesson container");
  const lessonMessages = document.getElementById("lessonMessages");
  if (lessonMessages) lessonMessages.innerHTML = "";
}

export function hideLessonButton() {
  console.log("Hiding lesson button");
  const lessonButton = document.getElementById("lessonButton");
  if (lessonButton) {
    lessonButton.style.display = "none";
  } else {
    console.error("Lesson button not found");
  }
}

export function showLessonButton() {
  const lessonButton = document.getElementById("lessonButton");
  if (lessonButton && messageCount > 0) {
    lessonButton.style.display = "block";
  }
}

// Re-export functions from uiHelpers.js and messageRendering.js
export {
  addMessageToChat,
  addLoadingAnimation,
  addUserLoadingAnimation,
  addPlayButtonToMessage,
  renderContent,
  displayTextWithDynamicDelay,
};
