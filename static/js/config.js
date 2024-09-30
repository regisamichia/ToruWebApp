const config = {
  development: {
    apiBaseUrl: "http://localhost:8000",
  },
  production: {
    apiBaseUrl: "https://toruwebapp.onrender.com",
  },
};

const environment = process.env.NODE_ENV || "development";

export const apiBaseUrl = config[environment].apiBaseUrl;
