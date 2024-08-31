import {
  handleLogin,
  handleRegister,
  handleLogout,
  checkLoginStatus,
} from "./auth.js";
import { sendMessage } from "./chat.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login");
  const registerForm = document.getElementById("register");
  const showRegister = document.getElementById("showRegister");
  const showLogin = document.getElementById("showLogin");
  const logoutButton = document.getElementById("logoutButton");

  if (showRegister && showLogin) {
    showRegister.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("loginForm").style.display = "none";
      document.getElementById("registerForm").style.display = "block";
    });

    showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("registerForm").style.display = "none";
      document.getElementById("loginForm").style.display = "block";
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }

  if (window.location.pathname === "/chat") {
    checkLoginStatus();
  }

  const userInput = document.getElementById("userInput");
  if (userInput) {
    userInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault(); // Prevent form submission if it's in a form
        sendMessage();
      }
    });
  }

  const sendButton = document.getElementById("sendButton");
  if (sendButton) {
    sendButton.addEventListener("click", sendMessage);
  }
});
