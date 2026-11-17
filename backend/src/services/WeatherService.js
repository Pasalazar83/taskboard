const { AppError } = require("../errors/AppError");
function createWeatherService(key, fetcher = fetch) {
  const cache = new Map();
  return async (lat, lon) => {
    if (!key) throw new AppError("El clima todavía no está configurado", 503);
    const id = lat.toFixed(2) + "," + lon.toFixed(2);
    const hit = cache.get(id);
    if (hit && hit.until > Date.now()) return hit.data;
    let response;
    try {
      response = await fetcher(
        "https://api.openweathermap.org/data/2.5/weather?" +
          new URLSearchParams({
            lat,
            lon,
            appid: key,
            units: "metric",
            lang: "es",
          }),
        { signal: AbortSignal.timeout(10000) },
      );
    } catch {
      throw new AppError(
        "No se pudo consultar el clima. Intenta nuevamente.",
        502,
      );
    }
    if (!response.ok)
      throw new AppError("El servicio del clima no está disponible", 502);
    const raw = await response.json();
    const data = {
      city: raw.name,
      temperature: Math.round(raw.main.temp),
      description: raw.weather[0].description,
      humidity: raw.main.humidity,
      updated_at: new Date().toISOString(),
    };
    if (cache.size > 500) cache.clear();
    cache.set(id, { data, until: Date.now() + 600000 });
    return data;
  };
}
module.exports = { createWeatherService };
