import { setAudioEnabled } from "./main.js";
import { makeApiCall } from "./api.js";
import { handleLogout } from "./login.js";

function initializeSettings() {
  const toggleAudioInput = document.getElementById("toggleAudio");
  if (toggleAudioInput) {
    toggleAudioInput.checked = localStorage.getItem('audioEnabled') !== 'false';
    toggleAudioInput.addEventListener("change", toggleAudio);
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
    headerLogoutButton.addEventListener("click", handleLogout);
  }
  
  // Use event delegation for the sidebar logout button
  const chatSidebar = document.querySelector(".chat-sidebar");
  if (chatSidebar) {
    chatSidebar.addEventListener("click", function(e) {
      if (e.target.id === "sidebarLogoutButton" || e.target.closest("#sidebarLogoutButton")) {
        e.preventDefault();
        handleLogout(e);
      }
    });
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

document.addEventListener("DOMContentLoaded", initializeSettings);
