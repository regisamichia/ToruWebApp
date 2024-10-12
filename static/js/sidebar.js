document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM content loaded in sidebar.js");
  const chatBody = document.querySelector(".chat-body");
  const sidebar = document.querySelector(".chat-sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const chatMain = document.querySelector(".chat-main");

  console.log("Initial sidebar width:", sidebar.style.width);

  let isCollapsed = false;

  if (sidebarToggle && sidebar && chatMain && chatBody) {
    sidebarToggle.addEventListener("click", function () {
      console.log("Sidebar toggle clicked");
      isCollapsed = !isCollapsed;

      if (isCollapsed) {
        sidebar.style.width = "60px";
        sidebar.style.padding = "20px 10px";
        chatMain.style.marginLeft = "60px";
        sidebar.querySelectorAll('h1, nav, .sidebar-footer').forEach(el => el.style.display = 'none');
      } else {
        sidebar.style.width = "250px";
        sidebar.style.padding = "20px";
        chatMain.style.marginLeft = "0";
        sidebar.querySelectorAll('h1, nav, .sidebar-footer').forEach(el => el.style.display = '');
      }

      // Force a reflow
      void sidebar.offsetWidth;

      setTimeout(() => {
        console.log("Sidebar width after toggle:", sidebar.style.width);
        console.log("Sidebar padding after toggle:", sidebar.style.padding);
        console.log("Chat main margin-left after toggle:", chatMain.style.marginLeft);
      }, 300);
    });
  } else {
    console.error("Required elements not found");
  }
});
