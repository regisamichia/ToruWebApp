import { makeApiCall } from "./api.js";
import {
  addMessageToChat,
  addLoadingAnimation,
  renderContent,
  displayTextWithDynamicDelay,
  streamAudio,
  storeConversation,
} from "./chat.js";
import { getSessionId, isAudioEnabled, getUserId } from "./main.js";
import getUrls from "./config.js";
import { addPlayButtonToMessage } from "./chatUI.js";

function generateUniqueId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let apiBaseUrl, chatUrl;

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
  chatUrl = urls.chatUrl;
}

export async function initializeImageUpload() {
  await initializeUrls();
  console.log("Initializing image upload...");
  const imageInput = document.getElementById("imageInput");
  const uploadButton = document.getElementById("uploadButton");

  if (uploadButton && imageInput) {
    console.log(
      "Upload button and image input found, adding click event listener",
    );
    uploadButton.addEventListener("click", function (event) {
      event.preventDefault();
      console.log("Upload button clicked");
      console.log("Image input element:", imageInput);
      imageInput.click();
      console.log("Image input clicked");
    });

    imageInput.addEventListener("change", handleImageUpload);
  } else {
    console.error("Upload button or image input not found");
  }

  console.log("Image upload initialization complete");
}

export function handleImageUpload(event) {
  console.log("Image input changed");
  const imageFile = event.target.files[0];
  if (imageFile) {
    console.log("Image file selected:", imageFile.name);
    sendImageMessage(imageFile);
  } else {
    console.log("No image file selected");
  }
}

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
      // Generate a unique ID for the message
      const messageId = generateUniqueId();

      // Upload image to S3
      const uploadResponse = await uploadImageToS3(imageFile, messageId);
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image to S3");
      }

      const extractFormData = new FormData();
      extractFormData.append("image", imageFile);

      // Add authentication token to the request
      const token = localStorage.getItem("token");
      const headers = new Headers();
      headers.append("Authorization", `Bearer ${token}`);

      const extractResponse = await makeApiCall(
        `${apiBaseUrl}/api/extract_text`,
        "POST",
        extractFormData,
        "multipart/form-data",
        headers,
      );

      if (!extractResponse.ok) {
        console.error("Failed to extract text from image");
        const errorText = await extractResponse.text();
        console.error("Error details:", errorText);
        loadingAnimation.remove();
        addMessageToChat(
          "Failed to process the image. Please try again.",
          "error-message",
        );
        return;
      }

      const extractData = await extractResponse.json();
      const extractedText = extractData.text;

      if (!extractedText || extractedText.trim() === "") {
        loadingAnimation.remove();
        addMessageToChat(
          "Je n'ai pas pu détecter de texte dans ton image, si tu veux que je t'aide à résoudre l'exercice, il me faut aussi des explications.",
          "bot-message",
        );
        return;
      }

      const chatFormData = new FormData();
      chatFormData.append("session_id", getSessionId());
      chatFormData.append("user_id", getUserId());
      chatFormData.append("image", imageFile);
      chatFormData.append("extracted_text", extractedText);

      const chatResponse = await makeApiCall(
        `${chatUrl}/api/math_chat`,
        "POST",
        chatFormData,
        "multipart/form-data",
        headers,
      );

      if (chatResponse.ok) {
        const botMessageId = generateUniqueId();
        const { element: botMessageElement, id: messageId } = addMessageToChat("", "bot-message");
        const messageContent = botMessageElement.querySelector('.message-content');
        const reader = chatResponse.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let buffer = "";
        let audioBuffers = [];
        let audioSegmentIds = [];
        loadingAnimation.remove();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value);

          const sentences = buffer.match(/[^.!?]+[.!?]+/g) || [];

          for (const sentence of sentences) {
            accumulatedText += sentence;
            const { html, text } = renderContent(sentence);
            if (isAudioEnabled) {
              const audioBuffer = await streamAudio(text, `${botMessageId}_${audioSegmentIds.length}`);
              if (audioBuffer) {
                audioBuffers.push(audioBuffer);
                audioSegmentIds.push(`${botMessageId}_${audioSegmentIds.length}`);
              }
            }
            await displayTextWithDynamicDelay(sentence, messageContent);
          }

          buffer = buffer.substring(sentences.join("").length);
        }

        // Process any remaining text in the buffer
        if (buffer) {
          accumulatedText += buffer;
          const { html, text } = renderContent(buffer);
          if (isAudioEnabled) {
            const audioBuffer = await streamAudio(text, `${botMessageId}_${audioSegmentIds.length}`);
            if (audioBuffer) {
              audioBuffers.push(audioBuffer);
              audioSegmentIds.push(`${botMessageId}_${audioSegmentIds.length}`);
            }
          }
          await displayTextWithDynamicDelay(buffer, messageContent);
        }

        // Final render
        if (messageContent) {
          const { html, text } = renderContent(accumulatedText);
          messageContent.innerHTML = html;
          messageContent.dataset.plainText = text;
          console.log("Final rendering complete for image message");
        }

        // Add play button for audio replay
        addPlayButtonToMessage(botMessageElement, botMessageId, audioBuffers);

        // Store the conversation in local storage
        storeConversation(
          getSessionId(),
          extractedText,
          accumulatedText,
          messageId,
          audioSegmentIds,
          messageId // Use messageId as imageId
        );
      } else {
        console.error("Failed to process image and text in chat");
        const errorText = await chatResponse.text();
        console.error("Error details:", errorText);
        loadingAnimation.remove();
        addMessageToChat(
          "I encountered an issue while processing the image. Could you please try again or provide more details about what you're asking?",
          "bot-message",
        );
      }
    } catch (error) {
      console.error("Error in sendImageMessage:", error);
      loadingAnimation.remove();
      addMessageToChat(
        "An error occurred while processing the image. Please try again.",
        "error-message",
      );
    }
  } catch (error) {
    console.error("Error in sendImageMessage:", error);
    addMessageToChat(
      "Failed to upload the image. Please try again.",
      "error-message",
    );
  }
}

async function uploadImageToS3(imageFile, messageId) {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("image_id", messageId);

  const token = localStorage.getItem("token");
  const headers = new Headers();
  headers.append("Authorization", `Bearer ${token}`);

  return await makeApiCall(
    `${apiBaseUrl}/api/upload_image`,
    "POST",
    formData,
    "multipart/form-data",
    headers,
  );
}