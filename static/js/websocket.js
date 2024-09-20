import { handleTranscription } from "./transcription.js";

let socket;
let isListening = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

export function initializeWebSocket() {
  console.log("Initializing WebSocket connection to backend");
  socket = new WebSocket("ws://localhost:8000/ws/audio");

  socket.onopen = () => {
    console.log("WebSocket connection opened");
    isListening = true;
    reconnectAttempts = 0;
  };

  socket.onmessage = (event) => {
    console.log("Received message from server:", event.data);
    try {
      const data = JSON.parse(event.data);
      if (data.type === "transcription") {
        handleTranscription(data);
      }
    } catch (error) {
      console.error("Error parsing message from server:", error);
    }
  };

  socket.onclose = (event) => {
    console.log("WebSocket closed:", event.code, event.reason);
    isListening = false;
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`,
      );
      setTimeout(initializeWebSocket, 5000);
    } else {
      console.log(
        "Max reconnection attempts reached. Please refresh the page.",
      );
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    isListening = false;
  };
}

export function sendAudioData(audioData) {
  if (isListening && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(audioData);
    console.log("Sent audio data, size:", audioData.byteLength, "bytes");
  } else {
    console.log(
      "Not sending audio. isListening:",
      isListening,
      "socket state:",
      socket ? socket.readyState : "no socket",
    );
  }
}
