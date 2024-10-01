import getUrls from './config.js';

let apiBaseUrl;

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

// Rest of the code remains the same, but wrap the initialization in an async function:

async function initializeLogin() {
  await initializeUrls();
  initializeLoginForm();
  // Other initialization code...
}

document.addEventListener("DOMContentLoaded", initializeLogin);

export function getToken() {
  return localStorage.getItem("token");
}

export async function refreshToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${apiBaseUrl}/api/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);
      return data.access_token;
    } else {
      // If refresh failed, clear tokens and return null
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      return null;
    }
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}

function initializeLoginForm() {
  const loginForm = document.getElementById("login");
  const registerForm = document.getElementById("register");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
    console.log("Login form initialized");
  } else {
    console.error("Login form not found");
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
    console.log("Register form initialized");
  } else {
    console.log("Register form not found on this page");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  console.log("Attempting login with email:", email);

  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  try {
    console.log("Sending login request...");
    const response = await fetch(`${apiBaseUrl}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    console.log("Login response status:", response.status);
    const data = await response.json();
    console.log("Login response data:", data);

    if (response.ok) {
      console.log("Login successful, setting tokens and user data...");
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user_id); // Make sure this line is present
      console.log(
        "Data set in localStorage:",
        JSON.stringify({
          token: localStorage.getItem("token"),
          refreshToken: localStorage.getItem("refreshToken"),
          isLoggedIn: localStorage.getItem("isLoggedIn"),
          userId: localStorage.getItem("user_id"),
        }),
      );
      console.log("Redirecting to chat...");
      window.location.href = "/chat";
    } else {
      console.error("Login failed:", data.detail);
      alert(data.detail || "Login failed. Please try again.");
    }
  } catch (error) {
    console.error("Error during login:", error);
    alert("An error occurred. Please try again.");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const first_name = document.getElementById("registerFirstName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  const school_class = document.getElementById("registerClass").value;

  if (!school_class) {
    alert("Please select a school class");
    return;
  }

  try {
    console.log("Sending registration request...");
    const response = await fetch(`${apiBaseUrl}/api/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name,
        email,
        password,
        school_class,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Registration successful, attempting auto-login...");
      const loginFormData = new URLSearchParams();
      loginFormData.append("username", email);
      loginFormData.append("password", password);

      console.log("Sending login request...");
      const loginResponse = await fetch(`${apiBaseUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: loginFormData,
      });

      console.log("Login response status:", loginResponse.status);
      const loginData = await loginResponse.json();
      console.log("Login response data:", loginData);

      if (loginResponse.ok) {
        console.log("Auto-login successful, setting token...");
        localStorage.setItem("token", loginData.access_token);
        localStorage.setItem("isLoggedIn", "true");
        console.log("Redirecting to chat...");
        window.location.href = "/chat";
      } else {
        console.error("Auto-login failed:", loginData.detail);
        alert(
          "Registration successful, but auto-login failed. Please log in manually.",
        );
        window.location.href = "/";
      }
    } else {
      console.error("Registration error:", data);
      alert(data.detail || "Registration failed. Please try again.");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred. Please try again.");
  }
}

import { makeApiCall } from "./api.js";

export async function handleLogout(e) {
  e.preventDefault();
  try {
    const response = await makeApiCall("/api/logout", "POST");
    if (response.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userId");
      localStorage.removeItem("refreshToken");
      window.location.href = "/login";
    } else {
      alert("Logout failed");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred during logout");
  }
}

async function login(username, password) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("sessionId", data.sessionId); // Store the session ID
      console.log("Stored sessionId:", data.sessionId); // Debugging line
      window.location.href = "/homepage";
    } else {
      console.error("Failed to log in");
    }
  } catch (error) {
    console.error("Error logging in:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM content loaded"); // Debug log
  initializeLoginForm();
});

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showLoginBtn = document.getElementById("showLoginBtn");
  const showRegisterBtn = document.getElementById("showRegisterBtn");

  if (showLoginBtn && showRegisterBtn) {
    showLoginBtn.addEventListener("click", function () {
      if (loginForm) loginForm.style.display = "block";
      if (registerForm) registerForm.style.display = "none";
      showLoginBtn.classList.add("active");
      showRegisterBtn.classList.remove("active");
    });

    showRegisterBtn.addEventListener("click", function () {
      if (loginForm) loginForm.style.display = "none";
      if (registerForm) registerForm.style.display = "block";
      showLoginBtn.classList.remove("active");
      showRegisterBtn.classList.add("active");
    });
  }
});
