const config = {
  development: {
    apiBaseUrl: "http://localhost:8000",
    chatUrl: "http://localhost:8001",
    multiModalUrl: "http://localhost:8003",
  },
  production: {
    apiBaseUrl: "",
    chatUrl: "",
    multiModalUrl: "",
  },
};

// Function to get environment from the server
async function getEnvironment() {
  try {
    const response = await fetch("/api/environment");
    const data = await response.json();
    return data.environment;
  } catch (error) {
    console.error("Failed to get environment:", error);
    return "development";
  }
}

// Function to get URLs
async function getUrls() {
  const environment = await getEnvironment();
  if (environment === "production") {
    try {
      const response = await fetch("/api/config");
      const data = await response.json();
      return {
        apiBaseUrl: data.API_BASE_URL || config.development.apiBaseUrl,
        chatUrl: data.CHAT_URL || config.development.chatUrl,
        multiModalUrl: data.MULTIMODAL_URL || config.development.multiModalUrl,
      };
    } catch (error) {
      console.error("Failed to get production URLs:", error);
      return config.development;
    }
  }
  return config.development;
}

export default getUrls;
