export async function makeApiCall(url, method, data, contentType, headers = new Headers()) {
  const options = {
    method: method,
    headers: headers,
  };

  if (data) {
    if (contentType === "application/json") {
      options.body = JSON.stringify(data);
      headers.append("Content-Type", "application/json");
    } else if (contentType === "multipart/form-data") {
      options.body = data;
      // Don't set Content-Type for multipart/form-data, let the browser set it
    }
  }

  return fetch(url, options);
}
