document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showRegister = document.getElementById("showRegister");
  const showLogin = document.getElementById("showLogin");
  const logoutButton = document.getElementById("logoutButton");

  if (showRegister && showLogin) {
    showRegister.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.style.display = "none";
      registerForm.style.display = "block";
    });

    showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      registerForm.style.display = "none";
      loginForm.style.display = "block";
    });

    document.getElementById("login").addEventListener("submit", handleLogin);
    document
      .getElementById("register")
      .addEventListener("submit", handleRegister);
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
        sendMessage();
      }
    });
  }
});

function getToken() {
  return localStorage.getItem("token");
}

async function checkLoginStatus() {
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

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch("http://localhost:8000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: email,
        password: password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("isLoggedIn", "true");
      window.location.href = "/chat";
    } else {
      alert(data.detail);
    }
  } catch (error) {
    console.error("Error:", error);
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
    const response = await fetch("http://localhost:8000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ first_name, email, password, school_class }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Registration successful");

      // Automatically log in the user after successful registration
      const loginResponse = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        localStorage.setItem("token", loginData.access_token);
        localStorage.setItem("isLoggedIn", "true");
        window.location.href = "/chat"; // Redirect to chat page
      } else {
        console.error("Auto-login failed:", loginData);
        alert(
          "Registration successful, but auto-login failed. Please log in manually.",
        );
        window.location.href = "/login.html"; // Explicitly redirect to login page
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

async function handleLogout(e) {
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

async function sendMessage() {
  const userInput = document.getElementById("userInput");
  const chatMessages = document.getElementById("chatMessages");

  if (userInput.value.trim() === "") return;

  // Add user message
  const userMessage = document.createElement("div");
  userMessage.className = "message user-message";
  userMessage.textContent = userInput.value;
  chatMessages.appendChild(userMessage);

  // Clear input
  userInput.value = "";

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Send message to backend
  try {
    const response = await fetch("http://localhost:8000/api/send_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ message: userMessage.textContent }),
    });

    if (response.ok) {
      const data = await response.json();
      const botMessage = document.createElement("div");
      botMessage.className = "message bot-message";
      botMessage.textContent = data.response;
      chatMessages.appendChild(botMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
      console.error("Failed to send message");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
