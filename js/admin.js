import {
  db,
  ref,
  set,
  update,
  onValue,
  get,
  remove,
  serverTimestamp,
  paths
} from "./firebase.service.js";
import { EVENT_CONFIG } from "./firebase.config.js";
import { DEFAULT_QUESTIONS, getQuestionById, getQuestionIndex, toPublicQuestion } from "./questions.js";
import {
  $,
  getRoomId,
  buildJoinUrl,
  escapeHtml,
  statusLabel,
  difficultyLabel,
  formatMs,
  calculateBasePoints,
  rankingFromParticipants,
  renderPodiumHTML,
  downloadJson
} from "./utils.js";

const roomId = getRoomId();

const state = {
  room: null,
  participants: {},
  currentAnswers: {},
  currentResults: {},
  allResults: {}
};

const joinUrl = buildJoinUrl(roomId);
const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=16&data=${encodeURIComponent(joinUrl)}`;

$("#adminRoomTitle").textContent = roomId;
$("#joinUrlText").textContent = joinUrl;
$("#openScreenLink").href = new URL(`screen.html?room=${roomId}`, location.href).toString();
$("#openPlayerLink").href = joinUrl;

$("#qrOverlayImg").src = qrSrc;
$("#qrOverlayRoom").textContent = `Sala ${EVENT_CONFIG.roomLabel}`;
$("#qrOverlayUrl").textContent = joinUrl;

setupQuestionSelect();
startListeners();
log("Panel listo.");

// QR a pantalla completa
const qrOverlay = $("#qrOverlay");
const openQr = () => { qrOverlay.hidden = false; };
const closeQr = () => { qrOverlay.hidden = true; };
$("#showQrBtn").addEventListener("click", openQr);
$("#showQrBtn2").addEventListener("click", openQr);
$("#closeQrBtn").addEventListener("click", closeQr);
qrOverlay.addEventListener("click", (event) => { if (event.target === qrOverlay) closeQr(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeQr(); });

$("#copyJoinBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(joinUrl);
    log("Link copiado al portapapeles.");
  } catch {
    alert(joinUrl);
  }
});

$("#prepareRoomBtn").addEventListener("click", prepareRoom);
$("#openRegistrationBtn").addEventListener("click", () => updateRoom({ status: "registration", registrationOpen: true, acceptingAnswers: false, showCorrect: false }));
$("#closeRegistrationBtn").addEventListener("click", () => updateRoom({ status: "waiting", registrationOpen: false, acceptingAnswers: false }));
$("#resetRoomBtn").addEventListener("click", resetRoom);
$("#launchQuestionBtn").addEventListener("click", launchSelectedQuestion);
$("#nextQuestionBtn").addEventListener("click", launchNextQuestion);
$("#lockQuestionBtn").addEventListener("click", lockQuestion);
$("#scoreQuestionBtn").addEventListener("click", scoreCurrentQuestion);
$("#showAnswerBtn").addEventListener("click", showAnswer);
$("#showLeaderboardBtn").addEventListener("click", showLeaderboard);
$("#clearQuestionBtn").addEventListener("click", clearCurrentQuestion);
$("#finishGameBtn").addEventListener("click", finishGame);
$("#exportResultsBtn").addEventListener("click", exportResults);

function setupQuestionSelect() {
  const select = $("#questionSelect");
  select.innerHTML = DEFAULT_QUESTIONS.map((question, index) => `
    <option value="${question.id}">${index + 1}. ${escapeHtml(question.question)}</option>
  `).join("");

  select.addEventListener("change", renderQuestionPreview);
  renderQuestionPreview();
}

function renderQuestionPreview() {
  const question = getQuestionById($("#questionSelect").value);
  if (!question) return;

  $("#questionPreview").innerHTML = `
    <p><strong>${escapeHtml(question.category)}</strong> · ${difficultyLabel(question.difficulty)} · ${question.timeLimit}s</p>
    <p>${escapeHtml(question.question)}</p>
    <div class="preview-options">
      ${Object.entries(question.options).map(([key, value]) => `
        <span class="${key === question.correct ? "is-correct" : ""}">
          <strong>${escapeHtml(key)}</strong> ${escapeHtml(value)}
        </span>
      `).join("")}
    </div>
  `;
}

function startListeners() {
  onValue(ref(db, paths.publicRoom(roomId)), (snapshot) => {
    state.room = snapshot.val();
    renderRoom();
    listenCurrentAnswers();
  });

  onValue(ref(db, paths.participants(roomId)), (snapshot) => {
    state.participants = snapshot.val() || {};
    renderParticipants();
    renderRanking();
  });

  onValue(ref(db, paths.allResults(roomId)), (snapshot) => {
    state.allResults = snapshot.val() || {};
    renderRanking();
  });
}

let answersUnsubscribe = null;
let resultsUnsubscribe = null;

function listenCurrentAnswers() {
  const questionId = state.room?.currentQuestionId;
  if (!questionId) return;

  if (answersUnsubscribe) answersUnsubscribe();
  if (resultsUnsubscribe) resultsUnsubscribe();

  answersUnsubscribe = onValue(ref(db, paths.answers(roomId, questionId)), (snapshot) => {
    state.currentAnswers = snapshot.val() || {};
    renderAnswers();
  });

  resultsUnsubscribe = onValue(ref(db, paths.results(roomId, questionId)), (snapshot) => {
    state.currentResults = snapshot.val() || {};
    renderAnswers();
  });
}

async function prepareRoom() {
  await set(ref(db, paths.publicRoom(roomId)), {
    status: "registration",
    registrationOpen: true,
    acceptingAnswers: false,
    showCorrect: false,
    showLeaderboard: false,
    currentQuestionId: null,
    currentQuestionPublic: null,
    questionStartedAt: null,
    questionDurationMs: null,
    winner: null,
    eventName: EVENT_CONFIG.eventName,
    prize: EVENT_CONFIG.prize,
    roomLabel: EVENT_CONFIG.roomLabel,
    updatedAt: serverTimestamp()
  });
  log("Sala preparada con inscripciones abiertas.");
}

async function resetRoom() {
  if (!confirm("¿Reiniciar sala, participantes, respuestas y resultados? Esto sí borra todo.")) return;

  await Promise.all([
    remove(ref(db, paths.publicRoom(roomId))),
    remove(ref(db, paths.participants(roomId))),
    remove(ref(db, `answers/${roomId}`)),
    remove(ref(db, `results/${roomId}`)),
    remove(ref(db, paths.adminRoom(roomId)))
  ]);

  await prepareRoom();
  log("Sala reiniciada.");
}

async function updateRoom(payload) {
  await update(ref(db, paths.publicRoom(roomId)), {
    ...payload,
    updatedAt: serverTimestamp()
  });
  log(`Sala actualizada: ${JSON.stringify(payload)}`);
}

async function launchSelectedQuestion() {
  const questionId = $("#questionSelect").value;
  const question = getQuestionById(questionId);
  const index = getQuestionIndex(questionId);

  if (!question) return;

  await Promise.all([
    remove(ref(db, paths.answers(roomId, questionId))),
    remove(ref(db, paths.results(roomId, questionId)))
  ]);

  await update(ref(db, paths.publicRoom(roomId)), {
    status: "question",
    registrationOpen: false,
    acceptingAnswers: true,
    showCorrect: false,
    showLeaderboard: false,
    currentQuestionId: question.id,
    currentQuestionPublic: toPublicQuestion(question, index),
    correctAnswerPublic: null,
    questionStartedAt: serverTimestamp(),
    questionDurationMs: question.timeLimit * 1000,
    updatedAt: serverTimestamp()
  });

  $("#currentQuestionTitle").textContent = `Pregunta ${index + 1}`;
  log(`Pregunta lanzada: ${question.id}`);
}

async function launchNextQuestion() {
  // Base: la pregunta activa si la hay; si no, la seleccionada en la lista.
  const referenceId = state.room?.currentQuestionId || $("#questionSelect").value;
  const currentIndex = getQuestionIndex(referenceId);
  const nextIndex = currentIndex + 1;

  if (nextIndex >= DEFAULT_QUESTIONS.length) {
    alert("Ya estás en la última pregunta. Usa “Finalizar y mostrar ganador”.");
    return;
  }

  const select = $("#questionSelect");
  select.value = DEFAULT_QUESTIONS[nextIndex].id;
  renderQuestionPreview();
  await launchSelectedQuestion();
}

async function lockQuestion() {
  await updateRoom({ status: "locked", acceptingAnswers: false });
  log("Respuestas cerradas.");
}

async function clearCurrentQuestion() {
  const questionId = state.room?.currentQuestionId;
  if (!questionId) return alert("No hay pregunta activa.");

  if (!confirm("¿Anular esta pregunta y borrar sus respuestas/resultados?")) return;

  await Promise.all([
    remove(ref(db, paths.answers(roomId, questionId))),
    remove(ref(db, paths.results(roomId, questionId))),
    update(ref(db, paths.publicRoom(roomId)), {
      status: "waiting",
      acceptingAnswers: false,
      showCorrect: false,
      showLeaderboard: false,
      currentQuestionId: null,
      currentQuestionPublic: null,
      correctAnswerPublic: null,
      questionStartedAt: null,
      questionDurationMs: null,
      updatedAt: serverTimestamp()
    })
  ]);

  await recalculateTotals();
  log(`Pregunta anulada: ${questionId}`);
}

async function scoreCurrentQuestion() {
  const room = state.room;
  const questionId = room?.currentQuestionId;
  const question = getQuestionById(questionId);

  if (!room || !question) return alert("No hay pregunta activa para calificar.");

  const [answersSnapshot, previousResultsSnapshot] = await Promise.all([
    get(ref(db, paths.answers(roomId, questionId))),
    get(ref(db, paths.allResults(roomId)))
  ]);

  const answers = answersSnapshot.val() || {};
  const allResults = previousResultsSnapshot.val() || {};
  const updates = {};
  const startedAt = Number(room.questionStartedAt || Date.now());

  for (const [participantId, answer] of Object.entries(answers)) {
    const answeredAt = Number(answer.answeredAt || answer.clientSentAt || Date.now());
    const responseTimeMs = Math.max(0, answeredAt - startedAt);
    const isCorrect = answer.answerKey === question.correct;
    const streakBefore = getPreviousStreak(participantId, questionId, allResults);
    const streakAfter = isCorrect ? streakBefore + 1 : 0;
    const bonus = isCorrect && streakAfter > 0 && streakAfter % 3 === 0 ? 100 : 0;
    const basePoints = isCorrect ? calculateBasePoints(responseTimeMs) : 0;
    const points = isCorrect ? basePoints + bonus : 0;

    updates[`${paths.result(roomId, questionId, participantId)}`] = {
      participantId,
      name: answer.name || state.participants[participantId]?.name || "Sin nombre",
      answerKey: answer.answerKey,
      answerText: answer.answerText || "",
      correctKey: question.correct,
      correctText: question.options[question.correct],
      responseTimeMs,
      isCorrect,
      basePoints,
      bonus,
      points,
      streakAfter,
      scoredAt: serverTimestamp()
    };
  }

  if (!Object.keys(updates).length) {
    alert("No hay respuestas para calificar.");
    return;
  }

  await update(ref(db), updates);
  await recalculateTotals();
  await updateRoom({ status: "locked", acceptingAnswers: false });
  log(`Pregunta calificada: ${questionId}`);
}

function getPreviousStreak(participantId, currentQuestionId, allResults) {
  const currentIndex = getQuestionIndex(currentQuestionId);
  if (currentIndex <= 0) return 0;

  let streak = 0;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const previousQuestionId = DEFAULT_QUESTIONS[i].id;
    const result = allResults?.[previousQuestionId]?.[participantId];
    if (result?.isCorrect) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

async function recalculateTotals() {
  const [participantsSnapshot, resultsSnapshot] = await Promise.all([
    get(ref(db, paths.participants(roomId))),
    get(ref(db, paths.allResults(roomId)))
  ]);

  const participants = participantsSnapshot.val() || {};
  const results = resultsSnapshot.val() || {};
  const totals = {};

  for (const participantId of Object.keys(participants)) {
    totals[participantId] = {
      score: 0,
      correctCount: 0,
      totalTime: 0,
      streak: 0
    };
  }

  for (const question of DEFAULT_QUESTIONS) {
    const questionResults = results[question.id] || {};
    for (const [participantId, result] of Object.entries(questionResults)) {
      if (!totals[participantId]) {
        totals[participantId] = { score: 0, correctCount: 0, totalTime: 0, streak: 0 };
      }

      totals[participantId].score += result.points || 0;
      if (result.isCorrect) {
        totals[participantId].correctCount += 1;
        totals[participantId].totalTime += result.responseTimeMs || 0;
        totals[participantId].streak += 1;
      } else {
        totals[participantId].streak = 0;
      }
    }
  }

  const updates = {};
  for (const [participantId, total] of Object.entries(totals)) {
    updates[`${paths.participant(roomId, participantId)}/score`] = total.score;
    updates[`${paths.participant(roomId, participantId)}/correctCount`] = total.correctCount;
    updates[`${paths.participant(roomId, participantId)}/totalTime`] = total.totalTime;
    updates[`${paths.participant(roomId, participantId)}/streak`] = total.streak;
    updates[`${paths.participant(roomId, participantId)}/updatedAt`] = serverTimestamp();
  }

  if (Object.keys(updates).length) {
    await update(ref(db), updates);
  }
}

async function showAnswer() {
  const questionId = state.room?.currentQuestionId;
  const question = getQuestionById(questionId);
  if (!question) return alert("No hay pregunta activa.");

  await updateRoom({
    status: "answer",
    acceptingAnswers: false,
    showCorrect: true,
    correctAnswerPublic: {
      key: question.correct,
      text: question.options[question.correct]
    }
  });

  log("Respuesta correcta revelada.");
}

async function showLeaderboard() {
  await updateRoom({
    status: "leaderboard",
    acceptingAnswers: false,
    showCorrect: false,
    showLeaderboard: true
  });
  log("Ranking mostrado.");
}

async function finishGame() {
  await recalculateTotals();

  const ranking = rankingFromParticipants(state.participants);
  const winner = ranking[0];

  if (!winner) {
    alert("No hay participantes.");
    return;
  }

  await updateRoom({
    status: "finished",
    acceptingAnswers: false,
    showCorrect: false,
    showLeaderboard: true,
    winner: {
      participantId: winner.id,
      name: winner.name,
      score: winner.score,
      correctCount: winner.correctCount,
      totalTime: winner.totalTime,
      prize: EVENT_CONFIG.prize,
      code: `MJFULL80S-2026-${winner.name.replace(/\s+/g, "-").toUpperCase().slice(0, 20)}`
    }
  });

  log(`Juego finalizado. Ganador: ${winner.name}`);
}

async function exportResults() {
  const [roomSnapshot, participantsSnapshot, answersSnapshot, resultsSnapshot] = await Promise.all([
    get(ref(db, paths.publicRoom(roomId))),
    get(ref(db, paths.participants(roomId))),
    get(ref(db, `answers/${roomId}`)),
    get(ref(db, `results/${roomId}`))
  ]);

  downloadJson(`moonwalk-challenge-${roomId}.json`, {
    exportedAt: new Date().toISOString(),
    room: roomSnapshot.val(),
    participants: participantsSnapshot.val(),
    answers: answersSnapshot.val(),
    results: resultsSnapshot.val()
  });

  log("Resultados exportados.");
}

const NEXT_HINTS = {
  waiting: "Sala lista. Abre inscripciones o lanza la primera pregunta.",
  registration: "Inscripciones abiertas. Muestra el QR y, cuando estén dentro, lanza la pregunta.",
  question: "Pregunta en vivo. Cuando termine el tiempo, pulsa “Cerrar respuestas”.",
  locked: "Respuestas cerradas. Pulsa “Calificar” y luego “Mostrar respuesta”.",
  answer: "Respuesta revelada. Pulsa “Mostrar ranking” para ver posiciones.",
  leaderboard: "Ranking en pantalla. Lanza la siguiente pregunta o finaliza el juego.",
  finished: "Juego finalizado. Puedes exportar resultados o reiniciar todo."
};

function renderRoom() {
  const status = state.room?.status || null;
  $("#statusChip").textContent = statusLabel(status || "Sin preparar");
  $("#nextHint").textContent = status
    ? (NEXT_HINTS[status] || "")
    : "Pulsa “Preparar sala” para empezar.";
  $("#currentQuestionTitle").textContent = state.room?.currentQuestionPublic
    ? state.room.currentQuestionPublic.question
    : "Ninguna";
}

function renderParticipants() {
  const participants = Object.entries(state.participants);
  $("#participantCount").textContent = participants.length;

  $("#participantsTable").innerHTML = participants.map(([id, player]) => `
    <tr>
      <td>
        <strong>${escapeHtml(player.name || "Sin nombre")}</strong>
        <small>${player.active === false ? "Desconectado" : "Activo"}</small>
      </td>
      <td>${player.score || 0}</td>
      <td>${player.correctCount || 0}</td>
      <td>${player.streak || 0}</td>
      <td><button class="tiny-btn" data-remove="${escapeHtml(id)}">Eliminar</button></td>
    </tr>
  `).join("") || `<tr><td colspan="5">Sin participantes todavía.</td></tr>`;

  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.remove;
      if (confirm("¿Eliminar participante?")) {
        await remove(ref(db, paths.participant(roomId, id)));
        log(`Participante eliminado: ${id}`);
      }
    });
  });
}

function renderAnswers() {
  const answers = Object.entries(state.currentAnswers || {});
  $("#answersTitle").textContent = state.room?.currentQuestionId || "Pregunta actual";
  $("#answersCountChip").textContent = `${answers.length} / ${Object.keys(state.participants).length}`;

  if (!answers.length) {
    $("#answersList").innerHTML = `<div class="empty-state">Sin respuestas todavía.</div>`;
    return;
  }

  const startedAt = Number(state.room?.questionStartedAt || Date.now());

  $("#answersList").innerHTML = answers.map(([participantId, answer]) => {
    const result = state.currentResults?.[participantId];
    const responseTime = result?.responseTimeMs ?? Math.max(0, Number(answer.answeredAt || answer.clientSentAt || Date.now()) - startedAt);

    return `
      <article class="answer-row">
        <strong>${escapeHtml(answer.name || "Sin nombre")}</strong>
        <span>Opción ${escapeHtml(answer.answerKey || "—")}</span>
        <span>${formatMs(responseTime)}</span>
        <span class="${result?.isCorrect ? "good" : result ? "bad" : ""}">
          ${result ? (result.isCorrect ? `Correcta · ${result.points} pts` : "Incorrecta") : "Sin calificar"}
        </span>
      </article>
    `;
  }).join("");
}

function renderRanking() {
  const ranking = rankingFromParticipants(state.participants);
  $("#adminRankingList").innerHTML = renderPodiumHTML(ranking, 10);
}

function log(message) {
  const logBox = $("#adminLog");
  const time = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  logBox.innerHTML = `<p><strong>${time}</strong> ${escapeHtml(message)}</p>` + logBox.innerHTML;
}
