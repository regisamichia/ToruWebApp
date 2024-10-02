import getUrls from "./config.js";

let apiBaseUrl;

async function initializeUrls() {
  const urls = await getUrls();
  apiBaseUrl = urls.apiBaseUrl;
}

async function initializeWaitingList() {
  await initializeUrls();
  const form = document.getElementById("waitingListForm");
  if (form) {
    form.addEventListener("submit", handleWaitingListSubmit);
  }
}

async function handleWaitingListSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const schoolClass = document.getElementById("schoolClass").value;

  try {
    const response = await fetch(`${apiBaseUrl}/api/waiting-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, school_class: schoolClass }),
    });

    if (response.ok) {
      alert(
        "Thank you for joining our waiting list! We will notify you when registration opens.",
      );
      // Optionally, redirect to homepage or clear the form
    } else {
      const data = await response.json();
      alert(data.detail || "An error occurred. Please try again.");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred. Please try again.");
  }
}

document.addEventListener("DOMContentLoaded", initializeWaitingList);
