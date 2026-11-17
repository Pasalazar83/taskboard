require("dotenv").config();
const trim = (value) => (value || "").replace(/\/+$/, "");
module.exports = Object.freeze({
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: process.env.DB_SSL === "true",
  frontendUrl: trim(process.env.FRONTEND_URL || "http://localhost:5173"),
  openweatherKey: process.env.OPENWEATHER_API_KEY,
  zohoClientId: process.env.ZOHO_CLIENT_ID,
  zohoClientSecret: process.env.ZOHO_CLIENT_SECRET,
  zohoRefreshToken: process.env.ZOHO_REFRESH_TOKEN,
  zohoAccountId: process.env.ZOHO_ACCOUNT_ID,
  zohoAccountsUrl: trim(
    process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com",
  ),
  zohoMailUrl: trim(process.env.ZOHO_MAIL_URL || "https://mail.zoho.com"),
  mailFrom: process.env.MAIL_FROM || "dav@ingcol.space",
  reminderInterval: Math.max(
    10000,
    Number(process.env.REMINDER_INTERVAL_MS) || 30000,
  ),
  trustProxy: process.env.TRUST_PROXY === "1" ? 1 : false,
});
