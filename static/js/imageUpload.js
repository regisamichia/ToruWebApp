import { makeApiCall } from "./api.js";
import { addMessageToChat, addLoadingAnimation, renderContent, displayTextWithDynamicDelay, streamAudio, storeConversation } from "./chat.js";
import { sessionId, isAudioEnabled, userId } from "./main.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

export function initializeImageUpload() {
  console.log("Initializing image upload...");
  const imageInput = document.getElementById("imageInput");
  const uploadButton = document.getElementById("uploadButton");

  if (uploadButton && imageInput) {
    console.log("Upload button and image input found, adding click event listener");
    uploadButton.addEventListener("click", function(event) {
      event.preventDefault();
      console.log("Upload button clicked");
      console.log("Image input element:", imageInput);
      imageInput.click();
      console.log("Image input clicked");
    });

    imageInput.addEventListener("change", function() {
      console.log("Image input changed");
      const imageFile = imageInput.files[0];
      if (imageFile) {
        console.log("Image file selected:", imageFile.name);
        sendImageMessage(imageFile);
      } else {
        console.log("No image file selected");
      }
    });
  } else {
    console.error("Upload button or image input not found");
  }

  console.log("Image upload initialization complete");
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
      const extractFormData = new FormData();
      extractFormData.append("image", imageFile);

      // Add authentication token to the request
      const token = localStorage.getItem("token");
      const headers = new Headers();
      headers.append("Authorization", `Bearer ${token}`);

      const extractResponse = await makeApiCall(
        "http://localhost:8000/api/extract_text",
        "POST",
        extractFormData,
        "multipart/form-data",
        headers  // Add headers to the makeApiCall function
      );

      if (!extractResponse.ok) {
        console.error("Failed to extract text from image");
        const errorText = await extractResponse.text();
        console.error("Error details:", errorText);
        loadingAnimation.remove();
        addMessageToChat("Failed to process the image. Please try again.", "error-message");
        return;
      }

      const extractData = await extractResponse.json();
      const extractedText = extractData.text;

      const chatFormData = new FormData();
      chatFormData.append("session_id", sessionId);
      chatFormData.append("user_id", userId);
      chatFormData.append("image", imageFile);
      chatFormData.append("extracted_text", extractedText);

      const chatResponse = await makeApiCall(
        "http://localhost:8001/api/math_chat",
        "POST",
        chatFormData,
        "multipart/form-data",
        headers  // Add headers to this request as well
      );

      if (chatResponse.ok) {
        loadingAnimation.remove();
        const botMessageElement = addMessageToChat("", "bot-message");
        const reader = chatResponse.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value);

          const sentences = buffer.match(/[^.!?]+[.!?]+/g) || [];

          for (const sentence of sentences) {
            accumulatedText += sentence;
            if (isAudioEnabled) {
              await streamAudio(sentence);
            }
            await displayTextWithDynamicDelay(sentence, botMessageElement);
          }

          buffer = buffer.substring(sentences.join("").length);
        }

        // Process any remaining text in the buffer
        if (buffer) {
          accumulatedText += buffer;
          if (isAudioEnabled) {
            await streamAudio(buffer);
          }
          await displayTextWithDynamicDelay(buffer, botMessageElement);
        }

        // Final render with MathJax
        if (botMessageElement) {
          botMessageElement.innerHTML = renderContent(accumulatedText);
          MathJax.typesetPromise([botMessageElement])
            .then(() => {
              console.log("MathJax rendering complete for image message");
            })
            .catch((err) =>
              console.log("MathJax processing failed for image message:", err)
            );
        }

        // Store the conversation in local storage
        storeConversation(userId, sessionId, extractedText, accumulatedText);

      } else {
        console.error("Failed to process image and text in chat");
        const errorText = await chatResponse.text();
        console.error("Error details:", errorText);
      }
    } catch (error) {
      console.error("Error in sendImageMessage:", error);
      loadingAnimation.remove();
      addMessageToChat("An error occurred while processing the image. Please try again.", "error-message");
    }
  } catch (error) {
    console.error("Error in sendImageMessage:", error);
    addMessageToChat("Failed to upload the image. Please try again.", "error-message");
  }
}
