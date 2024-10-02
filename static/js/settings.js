import { setAudioEnabled, setTtsProvider, getTtsProvider } from "./main.js";
import { makeApiCall } from "./api.js";
import { setAudioMode, getAudioMode } from "./main.js";
import { redirectToLogin, checkAuthAndRedirect, logout } from "./auth.js";
import getUrls from "./config.js";

let apiBaseUrl;

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

async function initializeSettings() {
  console.log("Initializing settings page...");
  await initializeUrls();
  if (!checkAuthAndRedirect()) {
    return; // This will redirect to login if not authenticated
  }

  try {
    const token = localStorage.getItem("token");
    console.log(
      "Token retrieved from localStorage:",
      token ? "Token exists" : "Token is missing",
    );

    const response = await fetch(`${apiBaseUrl}/api/user_info`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Fetch response status:", response.status);

    if (response.status === 401) {
      console.error("Unauthorized: Token may be invalid or expired");
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch user info: ${response.status} ${errorText}`,
      );
    }

    const userData = await response.json();
    console.log("User data fetched:", userData);

    // Proceed with initializing settings page
    initializeSettingsUI();
  } catch (error) {
    console.error("Error initializing settings page:", error);
    displayErrorMessage(
      "Failed to load settings. Please try logging in again.",
    );
  }
}

function initializeSettingsUI() {
  // Move all the UI initialization code here
  const toggleAudioInput = document.getElementById("toggleAudio");
  if (toggleAudioInput) {
    toggleAudioInput.checked = localStorage.getItem("audioEnabled") !== "false";
    toggleAudioInput.addEventListener("change", toggleAudio);
  }

  // Initialize TTS provider radio buttons
  const ttsProviderRadios = document.querySelectorAll(
    'input[name="ttsProvider"]',
  );
  if (ttsProviderRadios) {
    const savedProvider = getTtsProvider();
    const radioToCheck = document.getElementById(
      `ttsProvider${savedProvider.charAt(0).toUpperCase() + savedProvider.slice(1)}`,
    );
    if (radioToCheck) {
      radioToCheck.checked = true;
    }
    ttsProviderRadios.forEach((radio) => {
      radio.addEventListener("change", toggleTtsProvider);
    });
  }

  const changePasswordBtn = document.getElementById("changePasswordBtn");
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", changePassword);
  }

  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", saveSettings);
  }

  const headerLogoutButton = document.getElementById("headerLogoutButton");
  if (headerLogoutButton) {
    headerLogoutButton.addEventListener("click", logout);
  }

  // Use event delegation for the sidebar logout button
  const chatSidebar = document.querySelector(".chat-sidebar");
  if (chatSidebar) {
    chatSidebar.addEventListener("click", function (e) {
      if (
        e.target.id === "sidebarLogoutButton" ||
        e.target.closest("#sidebarLogoutButton")
      ) {
        e.preventDefault();
        logout(e);
      }
    });
  }

  // Initialize audio mode radio buttons
  const audioModeRadios = document.querySelectorAll('input[name="audioMode"]');
  if (audioModeRadios) {
    const savedMode = localStorage.getItem("audioMode") || "continuous"; // Get from localStorage
    const radioToCheck = document.getElementById(
      `audioMode${savedMode.charAt(0).toUpperCase() + savedMode.slice(1)}`,
    );
    if (radioToCheck) {
      radioToCheck.checked = true;
    }
    audioModeRadios.forEach((radio) => {
      radio.addEventListener("change", toggleAudioMode);
    });
  }
}

function displayErrorMessage(message) {
  const errorElement = document.getElementById("errorMessage");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }
}

async function handleUnauthorized() {
  // Implement token refresh logic here if your backend supports it
  // If refresh fails or is not implemented, redirect to login
  console.log("Redirecting to login due to unauthorized access");
  window.location.href = "/login";
}

function toggleAudio() {
  const toggleAudioInput = document.getElementById("toggleAudio");
  const isAudioEnabled = toggleAudioInput.checked;
  console.log(`Audio ${isAudioEnabled ? "enabled" : "disabled"}`);
  localStorage.setItem("audioEnabled", isAudioEnabled);
  setAudioEnabled(isAudioEnabled);
}

async function changePassword() {
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (newPassword !== confirmPassword) {
    alert("New password and confirm password do not match.");
    return;
  }

  try {
    const response = await makeApiCall("/api/change_password", "POST", {
      current_password: currentPassword,
      new_password: newPassword,
    });

    if (response.ok) {
      const data = await response.json();
      alert(data.message);
      // Clear the password fields
      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
    } else {
      const errorData = await response.json();
      alert("Failed to change password: " + errorData.detail);
    }
  } catch (error) {
    console.error("Error changing password:", error);
    alert("An error occurred while changing the password.");
  }
}

function saveSettings() {
  const language = document.getElementById("language").value;
  const theme = document.getElementById("theme").value;

  // Save settings to localStorage or send to server
  localStorage.setItem("language", language);
  localStorage.setItem("theme", theme);

  // You might want to implement an API call here to save settings on the server
  // makeApiCall("/api/save_settings", "POST", { language, theme });

  alert("Settings saved successfully.");
}

function toggleTtsProvider(event) {
  const provider = event.target.value;
  console.log(`TTS Provider set to ${provider}`);
  setTtsProvider(provider);
  // Add this line to immediately see the effect
  console.log(`Current TTS Provider: ${getTtsProvider()}`);
}

function toggleAudioMode(event) {
  const mode = event.target.value;
  console.log(`Audio Mode set to ${mode}`);
  localStorage.setItem("audioMode", mode); // Save to localStorage
  setAudioMode(mode);
  // Add this line to immediately see the effect
  console.log(`Current Audio Mode: ${getAudioMode()}`);
}

document.addEventListener("DOMContentLoaded", initializeSettings);
