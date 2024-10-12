document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM content loaded in sidebar.js");
  const chatBody = document.querySelector(".chat-body");
  const sidebar = document.querySelector(".chat-sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const chatMain = document.querySelector(".chat-main");
  const chatContainer = document.querySelector(".chat-container");

  console.log("Initial sidebar width:", sidebar.style.width);

  let isCollapsed = false;

  if (sidebarToggle && sidebar && chatMain && chatBody && chatContainer) {
    sidebarToggle.addEventListener("click", function () {
      console.log("Sidebar toggle clicked");
      isCollapsed = !isCollapsed;

      if (isCollapsed) {
        sidebar.style.width = "60px";
        sidebar.style.padding = "60px 5px 20px"; // Adjust padding
        chatMain.style.marginLeft = "70px"; // 60px (sidebar) + 10px (gap)
        chatMain.style.padding = "20px 10px 20px 0"; // Remove left padding
        chatContainer.style.marginLeft = "0";
      } else {
        sidebar.style.width = "250px";
        sidebar.style.padding = "20px";
        chatMain.style.marginLeft = "0";
        chatMain.style.padding = "20px"; // Restore original padding
        chatContainer.style.marginLeft = "20px";
      }

      // Force a reflow
      void sidebar.offsetWidth;

      setTimeout(() => {
        console.log("Sidebar width after toggle:", sidebar.style.width);
        console.log("Sidebar padding after toggle:", sidebar.style.padding);
        console.log("Chat main margin-left after toggle:", chatMain.style.marginLeft);
        console.log("Chat container margin-left after toggle:", chatContainer.style.marginLeft);
      }, 300);
    });
  } else {
    console.error("Required elements not found");
  }
});
