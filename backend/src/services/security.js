const {
  randomBytes,
  createHash,
  scrypt,
  timingSafeEqual,
} = require("node:crypto");
const { promisify } = require("node:util");
const derive = promisify(scrypt);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("hex");
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + (await derive(password, salt, 64)).toString("hex");
}
async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const actual = await derive(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
module.exports = { digest, token, hashPassword, verifyPassword };
