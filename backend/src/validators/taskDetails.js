const sanitize = require("sanitize-html");
const { ValidationError } = require("../errors/AppError");
const { validateTitle } = require("./taskValidator");
function taskDetails(body, current = {}) {
  const data = { ...current, ...body };
  const title = validateTitle(data.title);
  const status = data.status ?? (data.done === true ? "done" : "pending");
  const priority = data.priority ?? "medium";
  if (!["pending", "progress", "done"].includes(status))
    throw new ValidationError("Estado inválido");
  if (!["low", "medium", "high"].includes(priority))
    throw new ValidationError("Prioridad inválida");
  if (
    typeof (data.description ?? "") !== "string" ||
    (data.description || "").length > 20000
  )
    throw new ValidationError(
      "Descripción demasiado larga (máximo 20.000 caracteres)",
    );
  const description = sanitize(data.description || "", {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "ul",
      "ol",
      "li",
      "a",
      "blockquote",
      "h2",
      "h3",
    ],
    allowedAttributes: { a: ["href", "title"] },
    allowedSchemes: ["https", "http", "mailto"],
  });
  let due_at = data.due_at || null;
  if (
    due_at &&
    ((typeof due_at !== "string" && !(due_at instanceof Date)) ||
      !Number.isFinite(new Date(due_at).getTime()))
  )
    throw new ValidationError("Fecha inválida");
  if (due_at) due_at = new Date(due_at).toISOString();
  const reminder_minutes = data.reminder_minutes ?? 1440;
  if (
    !Number.isInteger(reminder_minutes) ||
    reminder_minutes < 0 ||
    reminder_minutes > 10080
  )
    throw new ValidationError("Recordatorio inválido");
  let location = data.location ?? null;
  if (location !== null) {
    if (
      typeof location !== "object" ||
      typeof location.label !== "string" ||
      !location.label.trim() ||
      location.label.length > 300 ||
      !Number.isFinite(location.lat) ||
      Math.abs(location.lat) > 90 ||
      !Number.isFinite(location.lng) ||
      Math.abs(location.lng) > 180
    )
      throw new ValidationError("Ubicación inválida");
    location = {
      label: location.label.trim(),
      lat: location.lat,
      lng: location.lng,
      place_id:
        typeof location.place_id === "string"
          ? location.place_id.slice(0, 300)
          : "",
    };
  }
  return {
    title,
    description,
    status,
    priority,
    due_at,
    reminder_minutes,
    location,
  };
}
module.exports = { taskDetails };
