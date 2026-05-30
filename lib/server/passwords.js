import crypto from "node:crypto";

export function hashPassword(password = "") {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password, passwordHash) {
  return Boolean(passwordHash) && hashPassword(password) === passwordHash;
}

export default { hashPassword, verifyPassword };
