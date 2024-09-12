import { makeApiCall } from "./api.js";
import { handleLogout } from "./login.js";
import { addMessageToChat, addLoadingAnimation, sendMessage } from "./chat.js";

let sessionId = null;
let socket;
let isListening = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
let currentTranscription = "";
let fullTranscription = "";

// Audio context and related variables
let audioContext;
let sourceNode;
let processorNode;
let analyser;

// Initialize the chat page
async function initializeChatPage() {
  await initializeSession();
  initializeChatInterface();
  initializeAudioRecording();
  initializeLogout();
}

// Initialize the session
async function initializeSession() {
  try {
    const response = await makeApiCall(
      "http://localhost:8001/new_session",
      "POST",
    );
    if (response.ok) {
      const data = await response.json();
      sessionId = data.session_id;
      console.log("New session created:", sessionId);
    } else {
      console.error("Failed to create new session");
    }
  } catch (error) {
    console.error("Error creating new session:", error);
  }
}

// Initialize the chat interface
function initializeChatInterface() {
  const userInput = document.getElementById("userInput");
  const imageInput = document.getElementById("imageInput");
  const uploadButton = document.getElementById("uploadButton");

  if (userInput) {
    userInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message) {
          addMessageToChat(message, "user-message");
          sendMessage(message);
          userInput.value = "";
        }
      }
    });
  }

  if (uploadButton) {
    uploadButton.addEventListener("click", function () {
      imageInput.click();
    });
  }

  if (imageInput) {
    imageInput.addEventListener("change", function () {
      const imageFile = imageInput.files[0];
      if (imageFile) {
        sendImageMessage(imageFile);
      }
    });
  }
}

// Initialize audio recording
async function initializeAudioRecording() {
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

    // Create an AnalyserNode to detect silence
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect(analyser);

    // Create a ScriptProcessorNode for audio processing
    processorNode = audioContext.createScriptProcessor(4096, 1, 1);
    sourceNode.connect(processorNode);
    processorNode.connect(audioContext.destination);

    processorNode.onaudioprocess = processAudio;

    initializeWebSocket();
  } catch (error) {
    console.error("Error initializing audio:", error);
    micStatus.textContent = "Microphone: Error - " + error.message;
  }
}

// Process audio data
function processAudio(audioProcessingEvent) {
  const inputBuffer = audioProcessingEvent.inputBuffer;
  const inputData = inputBuffer.getChannelData(0);

  // Convert float32 audio data to 16-bit PCM
  const pcmData = new Int16Array(inputData.length);
  for (let i = 0; i < inputData.length; i++) {
    pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7fff;
  }

  // Send audio data if not silent
  if (isListening && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(pcmData.buffer);
    console.log("Sent audio data, size:", pcmData.buffer.byteLength, "bytes");
  } else {
    console.log(
      "Not sending audio. isListening:",
      isListening,
      "socket state:",
      socket ? socket.readyState : "no socket",
    );
  }
}

// Initialize WebSocket connection
function initializeWebSocket() {
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
        console.log("Transcription received:", data.text, "Is final:", data.is_final, "Speech final:", data.speech_final);

        if (data.is_final) {
          currentTranscription = data.text;
          fullTranscription += currentTranscription + " ";
          
          // Update the current transcription display
          const transcriptionElement = document.getElementById("currentTranscription");
          if (transcriptionElement) {
            transcriptionElement.textContent = fullTranscription;
          }
          
          if (data.speech_final) {
            finalizeTranscription();
          }
        } else {
          // Display interim results
          const transcriptionElement = document.getElementById("currentTranscription");
          if (transcriptionElement) {
            transcriptionElement.textContent = fullTranscription + data.text;
          }
        }
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

function finalizeTranscription() {
  if (fullTranscription.trim() !== "") {
    console.log("Final Transcription:", fullTranscription);
    addMessageToChat(fullTranscription.trim(), "user-message");
    sendMessage(fullTranscription.trim(), sessionId);
    
    // Clear the transcriptions
    fullTranscription = "";
    currentTranscription = "";
    
    // Clear the current transcription display
    const transcriptionElement = document.getElementById("currentTranscription");
    if (transcriptionElement) {
      transcriptionElement.textContent = "";
    }
  }
}

let interimTranscription = "";
let finalTranscription = "";

function displayTranscription(text, isFinal) {
  const transcriptionElement = document.getElementById("currentTranscription");
  if (transcriptionElement) {
    transcriptionElement.textContent = text;
    transcriptionElement.style.fontStyle = isFinal ? "normal" : "italic";
  }

  if (isFinal) {
    addMessageToChat(text.trim(), "user-message");
    sendMessage(text.trim());
    finalTranscription = "";
    interimTranscription = "";
  }
}

// Initialize logout functionality
function initializeLogout() {
  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }
}

// Send image message
async function sendImageMessage(imageFile) {
  try {
    const imagePreview = URL.createObjectURL(imageFile);

    const userMessageDiv = document.createElement("div");
    userMessageDiv.className = "message user-message";
    const img = document.createElement("img");
    img.src = imagePreview;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "200px";
    userMessageDiv.appendChild(img);
    document.getElementById("chatMessages").appendChild(userMessageDiv);

    document.getElementById("chatMessages").scrollTop =
      document.getElementById("chatMessages").scrollHeight;

    const loadingAnimation = addLoadingAnimation();

    try {
      const extractFormData = new FormData();
      extractFormData.append("image", imageFile, imageFile.name);

      const extractResponse = await makeApiCall(
        "http://localhost:8000/api/extract_text",
        "POST",
        extractFormData,
      );

      if (!extractResponse.ok) {
        console.error("Failed to extract text from image");
        const errorText = await extractResponse.text();
        console.error("Error details:", errorText);
        return;
      }

      const extractData = await extractResponse.json();
      const extractedText = extractData.text;

      const chatFormData = new FormData();
      chatFormData.append("session_id", sessionId);
      chatFormData.append("image", imageFile, imageFile.name);
      chatFormData.append("extracted_text", extractedText);

      const chatResponse = await makeApiCall(
        "http://localhost:8001/api/argentic_chat",
        "POST",
        chatFormData,
        "multipart/form-data",
      );

      if (chatResponse.ok) {
        const data = await chatResponse.json();
        const botMessage = document.createElement("div");
        botMessage.className = "message bot-message";
        botMessage.innerHTML = marked.parse(data.response);
        document.getElementById("chatMessages").appendChild(botMessage);
        document.getElementById("chatMessages").scrollTop =
          document.getElementById("chatMessages").scrollHeight;
      } else {
        console.error("Failed to process image and text in chat");
        const errorText = await chatResponse.text();
        console.error("Error details:", errorText);
      }
    } catch (error) {
      console.error("Error in sendImageMessage:", error);
    } finally {
      loadingAnimation.remove();
    }
  } catch (error) {
    console.error("Error in sendImageMessage:", error);
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", initializeChatPage);

window.addEventListener("beforeunload", () => {
  if (socket) {
    socket.close();
  }
  if (audioContext) {
    audioContext.close();
  }
});
