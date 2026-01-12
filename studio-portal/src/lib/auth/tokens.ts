import { randomBytes } from "crypto";

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

