import { getToken, refreshToken } from "./login.js";

export async function makeApiCall(
  url,
  method,
  body = null,
  contentType = "application/json",
) {
  const headers = {};
  const token = getToken();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    if (body instanceof FormData) {
      // Don't set Content-Type for FormData, let the browser set it
      options.body = body;
    } else if (contentType === "application/json") {
      headers["Content-Type"] = contentType;
      options.body = JSON.stringify(body);
    } else {
      headers["Content-Type"] = contentType;
      options.body = body;
    }
  }

  let response = await fetch(url, options);

  if (response.status === 401) {
    // Unauthorized, token might be expired
    // Try to refresh the token
    const newToken = await refreshToken();
    if (newToken) {
      // Update the Authorization header with the new token
      headers["Authorization"] = `Bearer ${newToken}`;
      // Retry the original request
      response = await fetch(url, options);
    } else {
      // If we couldn't refresh the token, redirect to login
      window.location.href = "/login";
      return;
    }
  }

  return response;
}
