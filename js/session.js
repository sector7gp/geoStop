import { GEO_CONFIG } from "./config.js";

export function grantAccess() {
  const payload = {
    granted: true,
    at: Date.now(),
    target: GEO_CONFIG.target.label,
  };
  sessionStorage.setItem(GEO_CONFIG.sessionKey, JSON.stringify(payload));
}

export function hasValidAccess() {
  const raw = sessionStorage.getItem(GEO_CONFIG.sessionKey);
  if (!raw) return false;

  try {
    const payload = JSON.parse(raw);
    if (!payload.granted) return false;

    const age = Date.now() - payload.at;
    if (age > GEO_CONFIG.sessionMaxAgeMs) {
      clearAccess();
      return false;
    }

    return true;
  } catch {
    clearAccess();
    return false;
  }
}

export function clearAccess() {
  sessionStorage.removeItem(GEO_CONFIG.sessionKey);
}
