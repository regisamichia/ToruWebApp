import { addMessageToChat, sendMessage } from "./chat.js";
import { sessionId } from "./main.js";

let currentTranscription = "";
let fullTranscription = "";
const TRANSCRIPTION_TIMEOUT = 3000; // 3 seconds timeout
let transcriptionTimer = null;

export function handleTranscription(data) {
  console.log(
    "Transcription received:",
    data.text,
    "Is final:",
    data.is_final,
    "Speech final:",
    data.speech_final,
  );

  if (transcriptionTimer) {
    clearTimeout(transcriptionTimer);
  }

  if (data.is_final) {
    currentTranscription = data.text;
    fullTranscription += currentTranscription + " ";

    updateTranscriptionDisplay(fullTranscription);

    if (data.speech_final) {
      finalizeTranscription();
    } else {
      transcriptionTimer = setTimeout(() => {
        console.log("Transcription timeout reached. Finalizing transcription.");
        finalizeTranscription();
      }, TRANSCRIPTION_TIMEOUT);
    }
  } else {
    updateTranscriptionDisplay(fullTranscription + data.text);
  }
}

function updateTranscriptionDisplay(text) {
  const transcriptionElement = document.getElementById("currentTranscription");
  if (transcriptionElement) {
    transcriptionElement.textContent = text;
  }
}

function finalizeTranscription() {
  if (transcriptionTimer) {
    clearTimeout(transcriptionTimer);
    transcriptionTimer = null;
  }

  if (fullTranscription.trim() !== "") {
    console.log("Final Transcription:", fullTranscription);
    addMessageToChat(fullTranscription.trim(), "user-message");
    sendMessage(fullTranscription.trim(), sessionId);

    fullTranscription = "";
    currentTranscription = "";
    updateTranscriptionDisplay("");
  }
}
