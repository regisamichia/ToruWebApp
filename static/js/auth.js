import getUrls from "./config.js";

let apiBaseUrl;

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

export function isAuthenticated() {
  return !!localStorage.getItem("token");
}

export function redirectToLogin() {
  window.location.href = "/login";
}

export async function checkAuthAndFetchUserInfo() {
  await initializeUrls();
  if (!isAuthenticated()) {
    console.log("User not authenticated. Redirecting to login.");
    redirectToLogin();
    return false;
  }

  try {
    const token = localStorage.getItem("token");
    console.log(
      "Token retrieved from localStorage:",
      token ? "Token exists" : "Token is missing"
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
      return false;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch user info: ${response.status} ${errorText}`
      );
    }

    const userData = await response.json();
    console.log("User data fetched:", userData);
    return userData;
  } catch (error) {
    console.error("Error checking authentication:", error);
    redirectToLogin();
    return false;
  }
}

export function logout() {
  const token = localStorage.getItem('token');
  
  fetch('/api/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }).then(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    // Remove any other auth-related items from localStorage
    window.location.href = "/homepage";
  }).catch(error => {
    console.error('Error during logout:', error);
    // Still remove items and redirect even if there's an error
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "/homepage";
  });
}
