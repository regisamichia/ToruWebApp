import getUrls from "./config.js";

let apiBaseUrl;

/**
 * Initializes the URLs for the API.
 */
async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

/**
 * Checks if the user is authenticated.
 * @returns {boolean} True if authenticated, false otherwise.
 */
export function isAuthenticated() {
  return !!localStorage.getItem("token");
}

/**
 * Redirects the user to the login page.
 */
export function redirectToLogin() {
  window.location.href = "/login";
}

/**
 * Checks authentication and fetches user info.
 * @returns {Object|boolean} User data if authenticated, false otherwise.
 */
export async function checkAuthAndFetchUserInfo() {
  await initializeUrls();
  if (!isAuthenticated()) {
    redirectToLogin();
    return false;
  }

  try {
    const token = localStorage.getItem("token");

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
        `Failed to fetch user info: ${response.status} ${errorText}`,
      );
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error("Error checking authentication:", error);
    redirectToLogin();
    return false;
  }
}

/**
 * Logs out the user by clearing local storage and redirecting to homepage.
 */
export function logout() {
  const token = localStorage.getItem("token");

  fetch("/api/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      // Remove any other auth-related items from localStorage
      window.location.href = "/homepage";
    })
    .catch((error) => {
      console.error("Error during logout:", error);
      // Still remove items and redirect even if there's an error
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      window.location.href = "/homepage";
    });
}
