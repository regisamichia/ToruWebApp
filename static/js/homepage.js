document.addEventListener("DOMContentLoaded", () => {
  const chatLink = document.getElementById("chatLink");
  const historyLink = document.getElementById("historyLink");
  const settingsLink = document.getElementById("settingsLink");
  const logoutLink = document.getElementById("logoutLink");
  const ctaButton = document.querySelector(".cta-button");

  // Chat link should work without JavaScript intervention
  // as it's a direct link to /chat

  historyLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/chatHistory";
  });

  settingsLink.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/settings";
  });

  logoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    // Add logic for logout
    console.log("Logging out");
    // After logout, redirect to login page or home page
    // window.location.href = '/login';
  });

  ctaButton.addEventListener("click", () => {
    // Redirect to chat page when CTA button is clicked
    window.location.href = "/chat";
  });

  // Accordion functionality
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  
  accordionHeaders.forEach(header => {
    header.addEventListener('click', function() {
      this.classList.toggle('active');
      const content = this.nextElementSibling;
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });
});
