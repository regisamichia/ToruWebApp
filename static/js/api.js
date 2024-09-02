import { getToken } from "./login.js";

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

  const response = await fetch(url, options);
  return response;
}
