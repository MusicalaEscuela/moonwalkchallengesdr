import { DEFAULT_ROOM_ID } from "./firebase.config.js";

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function getRoomId() {
  const params = new URLSearchParams(location.search);
  return normalizeRoomId(params.get("room") || DEFAULT_ROOM_ID);
}

export function normalizeRoomId(value) {
  return String(value || DEFAULT_ROOM_ID)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40) || DEFAULT_ROOM_ID;
}

export function getQueryParam(name) {
  return new URLSearchParams(location.search).get(name);
}

export function createParticipantId(roomId) {
  const key = `moonwalkParticipantId:${roomId}`;
  let existing = localStorage.getItem(key);
  if (existing) return existing;

  const id = crypto?.randomUUID?.() || `p_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(key, id);
  return id;
}

export function sanitizeName(rawName) {
  const clean = String(rawName || "")
    .replace(/\s+/g, " ")
    .replace(/[<>/\\{}[\]|^`~]/g, "")
    .trim()
    .slice(0, 24);

  return clean;
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatMs(ms) {
  if (!Number.isFinite(ms)) return "—";
  const safe = Math.max(0, ms);
  if (safe < 1000) return `${safe} ms`;
  return `${(safe / 1000).toFixed(2)} s`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function calculateBasePoints(responseTimeMs) {
  const safeTime = Number.isFinite(responseTimeMs) ? Math.max(0, responseTimeMs) : 99999;
  return Math.max(100, 1000 - Math.floor(safeTime / 10));
}

export function sortRanking(items) {
  return [...items].sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    if ((b.correctCount || 0) !== (a.correctCount || 0)) return (b.correctCount || 0) - (a.correctCount || 0);
    return (a.totalTime || 999999999) - (b.totalTime || 999999999);
  });
}

export function rankingFromParticipants(participants = {}) {
  return sortRanking(
    Object.entries(participants).map(([id, data]) => ({
      id,
      name: data.name || "Sin nombre",
      score: data.score || 0,
      correctCount: data.correctCount || 0,
      totalTime: data.totalTime || 0,
      streak: data.streak || 0,
      active: data.active !== false
    }))
  );
}

export function buildJoinUrl(roomId) {
  const url = new URL("index.html", location.href);
  url.searchParams.set("room", roomId);
  return url.toString();
}

export function difficultyLabel(value) {
  const map = {
    easy: "Fácil",
    medium: "Media",
    hard: "Difícil"
  };
  return map[value] || value || "—";
}

export function statusLabel(status) {
  const map = {
    waiting: "En espera",
    registration: "Inscripciones abiertas",
    question: "Pregunta activa",
    locked: "Respuestas cerradas",
    answer: "Respuesta revelada",
    leaderboard: "Ranking",
    finished: "Finalizado"
  };
  return map[status] || "Sin preparar";
}

export function makeCountdown(endAt, onTick, onDone) {
  let intervalId = null;

  const tick = () => {
    const remaining = Math.max(0, endAt - Date.now());
    onTick(remaining);
    if (remaining <= 0) {
      clearInterval(intervalId);
      onDone?.();
    }
  };

  tick();
  intervalId = setInterval(tick, 200);

  return () => clearInterval(intervalId);
}

export function renderPodiumHTML(ranking, limit = 5) {
  const medals = ["🥇", "🥈", "🥉"];
  const top = ranking.slice(0, limit);

  if (!top.length) {
    return `<div class="empty-state">Todavía no hay puntajes. La ansiedad puede esperar.</div>`;
  }

  return top.map((player, index) => `
    <article class="ranking-row ${index < 3 ? "ranking-row--podium" : ""}">
      <span class="ranking-pos">${medals[index] || `#${index + 1}`}</span>
      <span class="ranking-name">${escapeHtml(player.name)}</span>
      <span class="ranking-meta">${player.correctCount || 0} correctas · ${formatMs(player.totalTime || 0)}</span>
      <strong class="ranking-score">${player.score || 0}</strong>
    </article>
  `).join("");
}

export function launchConfetti({ duration = 7000, count = 160 } = {}) {
  const colors = ["#facc15", "#ec4899", "#8b5cf6", "#38bdf8", "#4ade80", "#ffffff"];
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  document.body.appendChild(layer);

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 1.8}s`;
    piece.style.animationDuration = `${2.5 + Math.random() * 2.5}s`;
    piece.style.setProperty("--drift", `${(Math.random() * 2 - 1) * 25}vw`);
    piece.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    if (Math.random() > 0.5) piece.style.borderRadius = "50%";
    layer.appendChild(piece);
  }

  setTimeout(() => layer.remove(), duration);
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
