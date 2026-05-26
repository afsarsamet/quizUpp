const getBackendUrl = () => {
  const hostname = window.location.hostname || "localhost";
  return `http://${hostname}:5000`;
};

export const BACKEND_URL = getBackendUrl();
