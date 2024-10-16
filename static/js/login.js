import getUrls from "./config.js";

let apiBaseUrl;
let releaseMode;

/**
 * Initializes the URLs for the API and sets release mode.
 */
async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
  releaseMode = urls.release_mode;
}

/**
 * Initializes the login functionality.
 */
async function initializeLogin() {
  await initializeUrls();
  initializeLoginForm();
}

document.addEventListener("DOMContentLoaded", initializeLogin);

/**
 * Retrieves the authentication token from local storage.
 * @returns {string|null} The authentication token or null if not found.
 */
export function getToken() {
  return localStorage.getItem("token");
}

/**
 * Refreshes the authentication token.
 * @returns {string|null} The new token if refresh successful, null otherwise.
 */
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

/**
 * Initializes the login form and register form/button based on release mode.
 */
function initializeLoginForm() {
  const loginForm = document.getElementById("login");
  const registerForm = document.getElementById("register");
  const registerButton = document.getElementById("registerButton");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  } else {
    console.error("Login form not found");
  }

  if (releaseMode === "beta") {
    if (registerButton) {
      registerButton.addEventListener("click", handleRegisterRedirect);
    } else {
      console.log("Register button not found on this page");
    }
  } else {
    if (registerForm) {
      registerForm.addEventListener("submit", handleRegister);
      console.log("Register form initialized for public mode");
    } else {
      console.log("Register form not found on this page");
    }
  }
}

/**
 * Handles the login form submission.
 * @param {Event} e - The form submission event.
 */
function handleRegisterRedirect(e) {
  e.preventDefault();
  window.location.href = "/waiting-list";
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  try {
    const response = await fetch(`${apiBaseUrl}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      credentials: "include",
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Login successful, setting tokens and user data...");
      console.log("Full response data:", data);
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user_id", data.user_id);
      console.log("data user after login:", data);
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

/**
 * Handles the register form submission.
 * @param {Event} e - The form submission event.
 */
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

      if (loginResponse.ok) {
        localStorage.setItem("token", loginData.access_token);
        localStorage.setItem("isLoggedIn", "true");
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

/**
 * Performs the login process.
 * @param {string} username - The user's email.
 * @param {string} password - The user's password.
 */
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
      window.location.href = "/homepage";
    } else {
      console.error("Failed to log in");
    }
  } catch (error) {
    console.error("Error logging in:", error);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  await initializeUrls();
  initializeLoginForm();

  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showLoginBtn = document.getElementById("showLoginBtn");
  const showRegisterBtn = document.getElementById("showRegisterBtn");

  if (showLoginBtn && showRegisterBtn) {
    showLoginBtn.addEventListener("click", function () {
      loginForm.style.display = "block";
      registerForm.style.display = "none";
      showLoginBtn.classList.add("active");
      showRegisterBtn.classList.remove("active");
    });

    showRegisterBtn.addEventListener("click", function () {
      if (releaseMode === "beta") {
        window.location.href = "/waiting-list";
      } else {
        loginForm.style.display = "none";
        registerForm.style.display = "block";
        showLoginBtn.classList.remove("active");
        showRegisterBtn.classList.add("active");
      }
    });
  }
});
