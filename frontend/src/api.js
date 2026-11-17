export const API = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");
export async function api(route, options = {}) {
  const token = sessionStorage.getItem("taskboard-token");
  const response = await fetch(API + "/api" + route, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...options.headers,
    },
    signal: options.signal || AbortSignal.timeout(90000),
  });
  if (response.status === 204) return null;
  const data = await response
    .json()
    .catch(() => ({ error: "Respuesta inesperada del servidor" }));
  if (!response.ok) {
    const error = new Error(data.error || "No se pudo completar la solicitud");
    error.status = response.status;
    if (response.status === 401 && !route.startsWith("/auth/"))
      window.dispatchEvent(new Event("session-expired"));
    throw error;
  }
  return data;
}
export const json = (method, body) => ({ method, body: JSON.stringify(body) });
