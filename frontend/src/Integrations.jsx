import React, { useEffect, useRef, useState } from "react";
import { CloudSun, MapPin, RefreshCw } from "lucide-react";
import { api } from "./api";
let mapsPromise;
function maps() {
  if (window.google?.maps?.importLibrary)
    return Promise.resolve(window.google.maps);
  if (!mapsPromise)
    mapsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const callback = "taskboardMapsReady";
      window[callback] = () => {
        delete window[callback];
        resolve(window.google.maps);
      };
      script.src =
        "https://maps.googleapis.com/maps/api/js?" +
        new URLSearchParams({
          key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          loading: "async",
          libraries: "places",
          v: "weekly",
          language: "es",
          callback,
        });
      script.onerror = () => {
        mapsPromise = null;
        reject(new Error("No se pudo cargar Google Maps"));
      };
      document.head.appendChild(script);
    });
  return mapsPromise;
}
export function Weather() {
  const [weather, setWeather] = useState(null),
    [message, setMessage] = useState("El clima donde estás"),
    [enabled, setEnabled] = useState(true);
  const last = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setMessage("Tu navegador no ofrece ubicación");
      return;
    }
    let active = true;
    const success = async ({ coords }) => {
      if (Date.now() - last.current < 600000) return;
      last.current = Date.now();
      setMessage("Consultando el clima…");
      try {
        const result = await api(
          "/weather?lat=" + coords.latitude + "&lon=" + coords.longitude,
        );
        if (active) {
          setWeather(result);
          setMessage("");
        }
      } catch (e) {
        if (active) {
          setWeather(null);
          setMessage(e.message);
          last.current = 0;
        }
      }
    };
    const failure = () => {
      if (active) {
        setWeather(null);
        setMessage("Ubicación no disponible. Revisa el permiso del navegador.");
        setEnabled(false);
      }
    };
    const options = {
      enableHighAccuracy: false,
      maximumAge: 300000,
      timeout: 15000,
    };
    const id = navigator.geolocation.watchPosition(success, failure, options);
    const timer = setInterval(
      () => navigator.geolocation.getCurrentPosition(success, failure, options),
      600000,
    );
    return () => {
      active = false;
      clearInterval(timer);
      navigator.geolocation.clearWatch(id);
    };
  }, [enabled]);
  return (
    <div className="weather">
      <CloudSun size={30} />
      <div>
        {weather ? (
          <>
            <strong>
              {weather.temperature}° <span>{weather.city}</span>
            </strong>
            <small>{weather.description}</small>
          </>
        ) : (
          <>
            <strong>Tu clima local</strong>
            <small>{message}</small>
          </>
        )}
      </div>
      <button
        className="icon-button"
        aria-label="Consultar clima en mi ubicación"
        title="Usar mi ubicación"
        onClick={() => {
          last.current = 0;
          setEnabled(false);
          setTimeout(() => setEnabled(true), 0);
        }}
      >
        {enabled ? <RefreshCw size={16} /> : <MapPin size={16} />}
      </button>
    </div>
  );
}
export function LocationPicker({ value, onChange }) {
  const holder = useRef(null),
    canvas = useRef(null),
    mapRef = useRef(null),
    markerRef = useRef(null);
  const callback = useRef(onChange);
  callback.current = onChange;
  const [error, setError] = useState("");
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  useEffect(() => {
    if (!key) return;
    let active = true,
      element;
    (async () => {
      try {
        const googleMaps = await maps();
        const { PlaceAutocompleteElement } =
          await googleMaps.importLibrary("places");
        const { Map } = await googleMaps.importLibrary("maps");
        const { AdvancedMarkerElement } =
          await googleMaps.importLibrary("marker");
        if (!active) return;
        const center = value
          ? { lat: value.lat, lng: value.lng }
          : { lat: 4.65, lng: -74.08 };
        const map = new Map(canvas.current, {
          center,
          zoom: value ? 15 : 5,
          mapId: "DEMO_MAP_ID",
          disableDefaultUI: true,
          zoomControl: true,
        });
        mapRef.current = map;
        const marker = new AdvancedMarkerElement({
          map,
          position: value ? center : null,
        });
        markerRef.current = marker;
        element = new PlaceAutocompleteElement({});
        element.setAttribute("aria-label", "Buscar un lugar en Google Maps");
        holder.current.appendChild(element);
        element.addEventListener("gmp-error", () =>
          setError(
            "Google Maps no está disponible. Revisa la configuración de la clave.",
          ),
        );
        element.addEventListener("gmp-select", async ({ placePrediction }) => {
          try {
            const place = placePrediction.toPlace();
            await place.fetchFields({
              fields: ["displayName", "formattedAddress", "location"],
            });
            if (!active || !place.location) return;
            const lat = place.location.lat(),
              lng = place.location.lng();
            callback.current({
              label: place.formattedAddress || place.displayName,
              lat,
              lng,
              place_id: place.id,
            });
            map.setCenter({ lat, lng });
            map.setZoom(15);
            marker.position = { lat, lng };
            setError("");
          } catch {
            setError("No se pudo obtener el lugar. Intenta nuevamente.");
          }
        });
        map.addListener("click", (event) => {
          const lat = event.latLng.lat(),
            lng = event.latLng.lng();
          marker.position = { lat, lng };
          callback.current({
            label:
              "Punto en el mapa (" +
              lat.toFixed(4) +
              ", " +
              lng.toFixed(4) +
              ")",
            lat,
            lng,
            place_id: "",
          });
        });
      } catch (e) {
        if (active) setError(e.message);
      }
    })();
    return () => {
      active = false;
      element?.remove();
      if (markerRef.current) markerRef.current.map = null;
    };
  }, [key]);
  useEffect(() => {
    if (!value && markerRef.current) markerRef.current.position = null;
  }, [value]);
  if (!key)
    return (
      <p className="hint">
        La búsqueda de lugares estará disponible cuando se configure Google
        Maps.
      </p>
    );
  return (
    <div className="location-picker">
      <div ref={holder} />
      <div ref={canvas} className="map" />
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {value && (
        <div className="location-result">
          <MapPin size={16} />
          <span>{value.label}</span>
          <button
            type="button"
            className="text-button"
            onClick={() => onChange(null)}
          >
            Quitar
          </button>
        </div>
      )}
      <small className="hint">
        Busca un lugar o selecciona un punto en el mapa. Es opcional.
      </small>
    </div>
  );
}
