import { makeApiCall } from "./api.js";
import { addMessageToChat, addLoadingAnimation, renderContent, displayTextWithDynamicDelay, streamAudio } from "./chat.js";
import { sessionId, isAudioEnabled } from "./main.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

export function initializeImageUpload() {
  const imageInput = document.getElementById("imageInput");
  const uploadButton = document.getElementById("uploadButton");

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

          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            const chunk = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            accumulatedText += chunk;
            if (isAudioEnabled) {
              await streamAudio(chunk);
            }
            await displayTextWithDynamicDelay(chunk, botMessageElement);
          }
        }

        // Final render with MathJax
        if (botMessageElement) {
          botMessageElement.innerHTML = renderContent(accumulatedText);
          MathJax.typesetPromise([botMessageElement])
            .then(() => {
              console.log("MathJax rendering complete for image message");
            })
            .catch((err) =>
              console.log("MathJax processing failed for image message:", err),
            );
        }
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
