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
