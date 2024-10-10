import { setAudioEnabled, setTtsProvider, getTtsProvider } from "./main.js";
import { makeApiCall } from "./api.js";
import { setAudioMode, getAudioMode } from "./main.js";
import { checkAuthAndFetchUserInfo, logout } from "./auth.js";

async function initializeSettings() {
  const userData = await checkAuthAndFetchUserInfo();
  if (!userData) {
    return;
  }

  // Authentication successful, show the main content
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("mainContent").style.display = "block";

  // Proceed with initializing settings page
  initializeSettingsUI();
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
  setTtsProvider(provider);
  // Add this line to immediately see the effect
  console.log(`Current TTS Provider: ${getTtsProvider()}`);
}

function toggleAudioMode(event) {
  const mode = event.target.value;
  localStorage.setItem("audioMode", mode); // Save to localStorage
  setAudioMode(mode);
  // Add this line to immediately see the effect
  console.log(`Current Audio Mode: ${getAudioMode()}`);
}

document.addEventListener("DOMContentLoaded", initializeSettings);
