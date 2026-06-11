import { clearAccess, hasValidAccess } from "../js/session.js";

if (!hasValidAccess()) {
  window.location.replace("/");
}

document.getElementById("logout-btn").addEventListener("click", () => {
  clearAccess();
  window.location.replace("/");
});
