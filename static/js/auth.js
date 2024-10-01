export function isAuthenticated() {
  return !!localStorage.getItem("token");
}

export function redirectToLogin() {
  window.location.href = "/login";
}

export function checkAuthAndRedirect() {
  if (!isAuthenticated()) {
    console.log("User not authenticated. Redirecting to login.");
    redirectToLogin();
    return false;
  }
  return true;
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
