const crypto = require("node:crypto");

function hashPassword(password = "") {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password, passwordHash) {
  return Boolean(passwordHash) && hashPassword(password) === passwordHash;
}

module.exports = { hashPassword, verifyPassword };
