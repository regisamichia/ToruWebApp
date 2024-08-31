import { getToken } from "./auth.js";

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
    if (body instanceof URLSearchParams) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      options.body = body;
    } else if (contentType === "application/json") {
      headers["Content-Type"] = contentType;
      options.body = JSON.stringify(body);
    } else {
      headers["Content-Type"] = contentType;
      options.body = body;
    }
  }

  console.log("Making API call to:", url);
  console.log("Request method:", method);
  console.log("Request headers:", headers);
  console.log("Request body:", options.body);

  const response = await fetch(url, options);
  console.log("Response status:", response.status);
  return response;
}
