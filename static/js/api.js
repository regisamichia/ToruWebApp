export async function makeApiCall(url, method, data = null) {
  const headers = {};

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
    credentials: 'include',
  };

  if (data) {
    options.body = data;
  }

  console.log("Request options:", options); // Log the request options

  return fetch(url, options);
}
