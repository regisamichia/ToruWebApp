import { sendAudioData } from "./websocket.js";
import { getAudioMode } from "./main.js";

let audioContext;
let sourceNode;
let processorNode;
let analyser;
let isRecording = false;
let mediaRecorder;
let audioChunks = [];

const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION = 3000; // 3 seconds

let lastNonSilenceTime = Date.now();
let isSendingAudio = true;

export async function initializeAudioRecording() {
  const micStatus = document.getElementById("micStatus");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
      },
    });
    micStatus.textContent = "Microphone: Active";
    audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000,
    });
    sourceNode = audioContext.createMediaStreamSource(stream);

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect(analyser);

    processorNode = audioContext.createScriptProcessor(4096, 1, 1);
    sourceNode.connect(processorNode);
    processorNode.connect(audioContext.destination);

    if (getAudioMode() === "continuous") {
      processorNode.onaudioprocess = processAudioContinuous;
      isRecording = true; // Start recording immediately in continuous mode
      console.log("Continuous mode: Started recording");
    } else {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
    }
  } catch (error) {
    console.error("Error initializing audio:", error);
    micStatus.textContent = "Microphone: Error - " + error.message;
    throw error;
  }
}

export function startRecording() {
  if (getAudioMode() === "manual" && mediaRecorder) {
    audioChunks = [];
    mediaRecorder.start();
    isRecording = true;
    console.log("Manual recording started");
  }
}

export function stopRecording() {
  if (getAudioMode() === "manual" && mediaRecorder) {
    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        resolve(audioBlob);
      };
      mediaRecorder.stop();
      isRecording = false;
      console.log("Manual recording stopped");
    });
  }
}

export function pauseAudioRecording() {
  isRecording = false;
  console.log("Audio recording paused");
}

export function resumeAudioRecording() {
  isRecording = true;
  console.log("Audio recording resumed");
}

function processAudioContinuous(audioProcessingEvent) {
  if (!isRecording || getAudioMode() !== "continuous") return;

  const inputBuffer = audioProcessingEvent.inputBuffer;
  const inputData = inputBuffer.getChannelData(0);

  const energy = calculateRMSEnergy(inputData);
  const currentTime = Date.now();
  const isSilent = energy < SILENCE_THRESHOLD;

  if (!isSilent) {
    lastNonSilenceTime = currentTime;
    if (!isSendingAudio) {
      isSendingAudio = true;
      console.log("Resuming audio transmission");
    }
  } else if (currentTime - lastNonSilenceTime > SILENCE_DURATION) {
    if (isSendingAudio) {
      isSendingAudio = false;
      console.log("Pausing audio transmission due to silence");
    }
  }

  const pcmData = new Int16Array(inputData.length);
  for (let i = 0; i < inputData.length; i++) {
    pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
  }

  if (isSendingAudio) {
    sendAudioData(pcmData.buffer);
  }
}

function calculateRMSEnergy(buffer) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}
