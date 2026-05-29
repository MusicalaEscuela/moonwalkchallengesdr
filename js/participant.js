import {
  db,
  ref,
  set,
  update,
  onValue,
  get,
  runTransaction,
  serverTimestamp,
  onDisconnect,
  paths
} from "./firebase.service.js";
import { EVENT_CONFIG, INSTRUCTIONS } from "./firebase.config.js";
import {
  $,
  $$,
  getRoomId,
  createParticipantId,
  sanitizeName,
  formatMs,
  rankingFromParticipants,
  renderPodiumHTML,
  makeCountdown,
  escapeHtml,
  launchConfetti
} from "./utils.js";

const roomId = getRoomId();
const participantId = createParticipantId(roomId);

const state = {
  room: null,
  participant: null,
  participants: {},
  currentAnswer: null,
  currentResult: null,
  activeQuestionId: null,
  countdownStop: null
};

const views = {
  register: $("#registerView"),
  waiting: $("#waitingView"),
  question: $("#questionView"),
  sent: $("#sentView"),
  result: $("#resultView"),
  leaderboard: $("#leaderboardView"),
  final: $("#finalView")
};

$("#prizeLabel").textContent = `Premio: ${EVENT_CONFIG.prize}`;
$("#roomLabel").textContent = `Sala ${EVENT_CONFIG.roomLabel}`;

$("#instructionsTitle").textContent = INSTRUCTIONS.title;
$("#instructionsList").innerHTML = INSTRUCTIONS.steps
  .map((step) => `<li>${escapeHtml(step)}</li>`)
  .join("");

$("#joinForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = sanitizeName($("#playerName").value);
  if (!name) {
    alert("Pon tu nombre primero, artista misterioso.");
    return;
  }

  await set(ref(db, paths.participant(roomId, participantId)), {
    name,
    score: 0,
    correctCount: 0,
    totalTime: 0,
    streak: 0,
    active: true,
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const participantRef = ref(db, paths.participant(roomId, participantId));
  onDisconnect(participantRef).update({ active: false, updatedAt: serverTimestamp() });

  showOnly("waiting");
});

onValue(ref(db, paths.publicRoom(roomId)), (snapshot) => {
  state.room = snapshot.val();
  state.activeQuestionId = state.room?.currentQuestionId || null;
  listenToCurrentAnswerAndResult();
  render();
});

onValue(ref(db, paths.participant(roomId, participantId)), (snapshot) => {
  state.participant = snapshot.val();
  render();
});

onValue(ref(db, paths.participants(roomId)), (snapshot) => {
  state.participants = snapshot.val() || {};
  renderLeaderboard();
});

setInterval(() => {
  if (!state.participant) return;
  update(ref(db, paths.participant(roomId, participantId)), {
    active: true,
    updatedAt: serverTimestamp()
  }).catch(() => {});
}, 15000);

let answerUnsubscribe = null;
let resultUnsubscribe = null;

function listenToCurrentAnswerAndResult() {
  if (!state.activeQuestionId) {
    state.currentAnswer = null;
    state.currentResult = null;
    return;
  }

  if (answerUnsubscribe) answerUnsubscribe();
  if (resultUnsubscribe) resultUnsubscribe();

  answerUnsubscribe = onValue(ref(db, paths.answer(roomId, state.activeQuestionId, participantId)), (snapshot) => {
    state.currentAnswer = snapshot.val();
    render();
  });

  resultUnsubscribe = onValue(ref(db, paths.result(roomId, state.activeQuestionId, participantId)), (snapshot) => {
    state.currentResult = snapshot.val();
    render();
  });
}

function showOnly(viewName) {
  Object.values(views).forEach((view) => view.hidden = true);
  views[viewName].hidden = false;
}

function render() {
  if (!state.participant) {
    showOnly("register");
    return;
  }

  $("#participantScore").textContent = `${state.participant.score || 0} puntos`;
  $("#participantCorrect").textContent = `${state.participant.correctCount || 0} correctas`;

  const room = state.room;

  if (!room) {
    showWaiting("Sala no preparada", "Espera a que el equipo abra la trivia.");
    return;
  }

  if (room.status === "finished") {
    showFinal(room);
    return;
  }

  if (room.status === "leaderboard") {
    showOnly("leaderboard");
    renderLeaderboard();
    return;
  }

  if (room.status === "answer" || room.showCorrect) {
    showResult(room);
    return;
  }

  if (room.status === "question" && room.currentQuestionPublic) {
    if (state.currentAnswer) {
      showSent(room);
    } else {
      showQuestion(room);
    }
    return;
  }

  if (room.status === "locked") {
    showSent(room, "Respuestas cerradas", "Ya se cerró esta ronda. Si alcanzaste, bien. Si no, la vida sigue, a veces.");
    return;
  }

  if (room.status === "registration") {
    showWaiting("Inscripciones abiertas", "Ya estás dentro. Espera a que lancemos la pregunta.");
    return;
  }

  showWaiting("Ya estás dentro", "Espera a que lancemos la siguiente pregunta.");
}

function showWaiting(title, text) {
  showOnly("waiting");
  $("#waitingTitle").textContent = title;
  $("#waitingText").textContent = text;
}

function showQuestion(room) {
  showOnly("question");

  const question = room.currentQuestionPublic;
  $("#questionCount").textContent = `Pregunta ${(question.index ?? 0) + 1} / ${question.total || "?"}`;
  $("#questionCategory").textContent = question.category || "Trivia";
  $("#questionText").textContent = question.question || "Pregunta";

  const grid = $("#optionsGrid");
  grid.innerHTML = "";

  Object.entries(question.options || {}).forEach(([key, value]) => {
    const button = document.createElement("button");
    button.className = "option-btn";
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(key)}</strong><span>${escapeHtml(value)}</span>`;
    button.addEventListener("click", () => submitAnswer(key, value));
    grid.appendChild(button);
  });

  startQuestionCountdown(room);
}

function startQuestionCountdown(room) {
  if (state.countdownStop) state.countdownStop();

  const startedAt = Number(room.questionStartedAt || Date.now());
  const duration = Number(room.questionDurationMs || 15000);
  const endAt = startedAt + duration;

  const timerEl = $("#questionTimer");
  state.countdownStop = makeCountdown(
    endAt,
    (remaining) => {
      timerEl.textContent = Math.ceil(remaining / 1000).toString().padStart(2, "0");
      timerEl.classList.toggle("timer-urgent", remaining <= 5000 && remaining > 0);
    },
    () => {
      timerEl.classList.remove("timer-urgent");
      timerEl.classList.add("timer-done");
      timerEl.textContent = "00";
      $$("#optionsGrid .option-btn").forEach((button) => button.disabled = true);
    }
  );
  timerEl.classList.remove("timer-done");
}

async function submitAnswer(answerKey, answerText) {
  const room = state.room;
  if (!room?.currentQuestionId || !room.acceptingAnswers) {
    alert("Esta pregunta ya se cerró. El tiempo, ese enemigo silencioso.");
    return;
  }

  // Bloqueo por tiempo: aunque el admin no haya cerrado, no se acepta
  // una respuesta después de que se agotó el cronómetro de la pregunta.
  const startedAt = Number(room.questionStartedAt || Date.now());
  const duration = Number(room.questionDurationMs || 15000);
  const elapsed = Date.now() - startedAt;
  if (elapsed > duration + 1500) {
    $$("#optionsGrid .option-btn").forEach((button) => button.disabled = true);
    alert("Se acabó el tiempo de esta pregunta.");
    return;
  }

  $$("#optionsGrid .option-btn").forEach((button) => button.disabled = true);

  const answerRef = ref(db, paths.answer(roomId, room.currentQuestionId, participantId));

  try {
    const result = await runTransaction(answerRef, (current) => {
      if (current !== null) return current;

      return {
        participantId,
        name: state.participant?.name || "Sin nombre",
        answerKey,
        answerText,
        answeredAt: serverTimestamp(),
        clientSentAt: Date.now()
      };
    });

    if (!result.committed) {
      alert("Ya habías respondido esta pregunta.");
    }

    showSent(room);
  } catch (error) {
    console.error("Error al enviar respuesta:", error);
    alert("No se pudo enviar tu respuesta. Revisa tu conexión e inténtalo de nuevo.");
    $$("#optionsGrid .option-btn").forEach((button) => button.disabled = false);
  }
}

function showSent(room, customTitle, customText) {
  showOnly("sent");
  $("#sentView h2").textContent = customTitle || "Respuesta registrada";
  const answerText = state.currentAnswer?.answerKey
    ? `Marcaste la opción ${state.currentAnswer.answerKey}. Espera el resultado.`
    : "Espera el resultado.";
  $("#sentText").textContent = customText || answerText;
}

function showResult(room) {
  showOnly("result");

  if (!state.currentResult) {
    $("#resultIcon").textContent = "🎤";
    $("#resultTitle").textContent = "Resultado en camino";
    $("#resultText").textContent = "Todavía no se ha calculado tu respuesta.";
    $("#resultPoints").textContent = "0 puntos";
    $("#resultTime").textContent = "—";
    return;
  }

  if (state.currentResult.isCorrect) {
    $("#resultIcon").textContent = "🕺";
    $("#resultTitle").textContent = "¡Correcto!";
    $("#resultText").textContent = state.currentResult.bonus
      ? `Sumaste ${state.currentResult.points} puntos, con bonus de racha. La humanidad todavía tiene esperanza.`
      : `Sumaste ${state.currentResult.points} puntos.`;
  } else {
    $("#resultIcon").textContent = "💿";
    $("#resultTitle").textContent = "No fue esta";
    $("#resultText").textContent = "Cero puntos esta ronda. Duele, pero no tanto como ensayar sin afinador.";
  }

  $("#resultPoints").textContent = `${state.currentResult.points || 0} puntos`;
  $("#resultTime").textContent = formatMs(state.currentResult.responseTimeMs);
}

function renderLeaderboard() {
  const ranking = rankingFromParticipants(state.participants);
  $("#leaderboardList").innerHTML = renderPodiumHTML(ranking, 8);
}

let winnerCelebrated = false;

function showFinal(room) {
  showOnly("final");
  const winner = room.winner;

  const ranking = rankingFromParticipants(state.participants);
  const myPosition = ranking.findIndex((player) => player.id === participantId);
  const me = myPosition >= 0 ? ranking[myPosition] : null;
  const iWon = winner && winner.participantId === participantId;

  if (iWon) {
    $("#finalIcon").textContent = "🏆";
    $("#finalEyebrow").textContent = "★ ¡Ganaste! ★";
    $("#winnerName").textContent = winner.name;
    $("#finalStanding").textContent = `${winner.score || 0} puntos · ${winner.correctCount || 0} correctas`;
    $("#finalMessage").textContent = "¡Eres la leyenda del Moonwalk! 🕺";
    $("#winnerPrize").textContent = `🎁 Premio: ${EVENT_CONFIG.prize}`;
    $("#winnerPrize").hidden = false;

    if (!winnerCelebrated) {
      winnerCelebrated = true;
      launchConfetti();
    }
  } else {
    $("#finalIcon").textContent = me && myPosition < 3 ? "🎉" : "🎶";
    $("#finalEyebrow").textContent = "Resultado final";
    $("#winnerName").textContent = me ? me.name : (state.participant?.name || "¡Gracias por jugar!");
    $("#finalStanding").textContent = me
      ? `Quedaste #${myPosition + 1} de ${ranking.length} · ${me.score || 0} puntos`
      : "";
    $("#finalMessage").textContent = winner
      ? `🏆 Ganó ${winner.name}. ¡Gracias por bailar con nosotros!`
      : "¡Gracias por jugar!";
    $("#winnerPrize").hidden = true;
  }
}
