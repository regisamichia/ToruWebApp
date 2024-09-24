export async function makeApiCall(url, method, body = null) {
  const options = {
    method: method,
    credentials: 'include',
  };

  if (body instanceof FormData) {
    options.body = body;
  } else if (body) {
    options.headers = {
      'Content-Type': 'application/json',
    };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  return response;
}
