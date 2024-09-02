export function getToken() {
  return localStorage.getItem("token");
}

function initializeLoginForm() {
  const loginForm = document.getElementById("login");
  const registerForm = document.getElementById("register");
  const showRegisterLink = document.getElementById("showRegister");
  const showLoginLink = document.getElementById("showLogin");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  } else {
    console.error("Login form not found");
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  } else {
    console.error("Register form not found");
  }

  if (showRegisterLink) {
    showRegisterLink.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("loginForm").style.display = "none";
      document.getElementById("registerForm").style.display = "block";
    });
  }

  if (showLoginLink) {
    showLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("registerForm").style.display = "none";
      document.getElementById("loginForm").style.display = "block";
    });
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
    const response = await fetch("http://localhost:8000/api/login", {
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
      console.log("Login successful, setting token...");
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("isLoggedIn", "true");
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
    const response = await fetch("http://localhost:8000/api/register", {
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
      const loginResponse = await fetch("http://localhost:8000/api/login", {
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

// This function can be exported and used in other files if needed
export async function handleLogout(e) {
  e.preventDefault();
  try {
    const response = await fetch("http://localhost:8000/api/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (response.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");
      window.location.href = "/";
    } else {
      alert("Logout failed");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// This function can be exported and used in other files if needed
export async function checkLoginStatus() {
  const token = getToken();
  if (!token) {
    window.location.href = "/";
    return;
  }

  try {
    const response = await fetch("http://localhost:8000/api/check_login", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");
      window.location.href = "/";
    }
  } catch (error) {
    console.error("Error:", error);
    window.location.href = "/";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM content loaded"); // Debug log
  initializeLoginForm();
});
