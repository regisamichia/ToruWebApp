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
  const name = document.getElementById("firstName").value;
  const email = document.getElementById("email").value;
  const schoolClass = document.getElementById("schoolClass").value;
  const sourcing = document.getElementById("sourcing").value;

  try {
    const response = await fetch(`${apiBaseUrl}/api/waiting-list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        school_class: schoolClass,
        sourcing,
      }),
    });

    if (response.ok) {
      alert(
        "Merci d'avoir rejoint notre liste d'attente. Nous vous tiendrons informé dès que les inscriptions seront ouvertes.",
      );
      window.location.href = "/homepage";
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
