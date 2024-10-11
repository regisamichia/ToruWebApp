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
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  let currentIndex = 0;

  function playNextBuffer() {
    if (currentIndex >= audioBuffers.length) {
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

  playNextBuffer();
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
