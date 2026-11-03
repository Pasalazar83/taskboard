// Configuración centralizada: el resto del código no lee process.env directamente.
require("dotenv").config();

module.exports = Object.freeze({
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: process.env.DB_SSL === "true",
  // Sin barra final para que coincida exactamente con el origen del navegador
  frontendUrl: (process.env.FRONTEND_URL || "").replace(/\/+$/, "")
});
