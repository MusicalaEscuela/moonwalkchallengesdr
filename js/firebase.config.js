// Moonwalk Challenge · Full80s x Musicala
// Reemplaza estos datos con la configuración real de tu proyecto Firebase.

export const firebaseConfig = {
  apiKey: "AIzaSyBOT0nhoWvQ114kTLhJgQhHEuWxNfogNcw",
  authDomain: "moonwalk-challenge-sdr.firebaseapp.com",
  databaseURL: "https://moonwalk-challenge-sdr-default-rtdb.firebaseio.com",
  projectId: "moonwalk-challenge-sdr",
  storageBucket: "moonwalk-challenge-sdr.firebasestorage.app",
  messagingSenderId: "405287908509",
  appId: "1:405287908509:web:50283e0e63e5e93c02d074"
};

export const DEFAULT_ROOM_ID = "full80s2026";

// Clave simple para entrar a admin.html?key=...
// Esto NO es seguridad real. Es una barrera básica para evento sin login.
export const ADMIN_KEY = "FULL80S-ADMIN-2026";

export const EVENT_CONFIG = {
  appName: "Moonwalk Challenge",
  eventName: "Salvémoslos del Reggaetón 2026",
  alliance: "Full80s x Musicala",
  prize: "4 clases gratis en cualquier modalidad",
  roomLabel: "FULL80S2026"
};

// Instrucciones que se muestran mientras la gente espera en sala.
// Edítalas libremente; aparecen en la vista de jugador y en la pantalla pública.
export const INSTRUCTIONS = {
  title: "Cómo se juega",
  steps: [
    "Cada pregunta aparece en pantalla con 4 opciones y un cronómetro.",
    "Responde desde tu celular lo más rápido posible: entre más rápido aciertes, más puntos sumas.",
    "Solo puedes responder una vez por pregunta, así que piensa rápido pero bien.",
    "Gana quien acumule más puntos respondiendo correctamente y a mayor velocidad.",
    "El premio es para quien quede de primero: 4 clases gratis en cualquier modalidad."
  ]
};
