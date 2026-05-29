import { db, ref, onValue, paths } from "./firebase.service.js";
import { EVENT_CONFIG, INSTRUCTIONS } from "./firebase.config.js";
import {
  $,
  getRoomId,
  buildJoinUrl,
  escapeHtml,
  rankingFromParticipants,
  renderPodiumHTML,
  makeCountdown,
  launchConfetti
} from "./utils.js";

const roomId = getRoomId();

const state = {
  room: null,
  participants: {},
  answers: {},
  countdownStop: null
};

$("#screenPrize").textContent = `Premio: ${EVENT_CONFIG.prize}`;
$("#screenRoomLabel").textContent = `Sala ${EVENT_CONFIG.roomLabel}`;

$("#screenInstructionsTitle").textContent = INSTRUCTIONS.title;
$("#screenInstructionsList").innerHTML = INSTRUCTIONS.steps
  .map((step) => `<li>${escapeHtml(step)}</li>`)
  .join("");

const joinUrl = buildJoinUrl(roomId);
$("#joinShortUrl").textContent = joinUrl;
$("#qrImage").src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(joinUrl)}`;

onValue(ref(db, paths.publicRoom(roomId)), (snapshot) => {
  state.room = snapshot.val();
  listenAnswers();
  render();
});

onValue(ref(db, paths.participants(roomId)), (snapshot) => {
  state.participants = snapshot.val() || {};
  $("#screenParticipantCount").textContent = Object.keys(state.participants).length;
  renderRanking();
  render();
});

let answersUnsubscribe = null;

function listenAnswers() {
  const questionId = state.room?.currentQuestionId;
  if (!questionId) return;

  if (answersUnsubscribe) answersUnsubscribe();
  answersUnsubscribe = onValue(ref(db, paths.answers(roomId, questionId)), (snapshot) => {
    state.answers = snapshot.val() || {};
    $("#answersCounter").textContent = `${Object.keys(state.answers).length} respuestas recibidas`;
  });
}

function showOnly(viewId) {
  ["screenWaiting", "screenQuestion", "screenAnswer", "screenLeaderboard", "screenWinner"].forEach((id) => {
    document.getElementById(id).hidden = id !== viewId;
  });
}

function render() {
  const room = state.room;

  if (!room || room.status === "waiting" || room.status === "registration") {
    showOnly("screenWaiting");
    return;
  }

  if (room.status === "question" && room.currentQuestionPublic) {
    showQuestion(room);
    return;
  }

  if (room.status === "answer" || room.showCorrect) {
    showAnswer(room);
    return;
  }

  if (room.status === "leaderboard" || room.status === "locked") {
    showOnly("screenLeaderboard");
    renderRanking();
    return;
  }

  if (room.status === "finished") {
    showWinner(room);
    return;
  }

  showOnly("screenWaiting");
}

function showQuestion(room) {
  showOnly("screenQuestion");

  const question = room.currentQuestionPublic;
  $("#screenQuestionCount").textContent = `Pregunta ${(question.index ?? 0) + 1} / ${question.total || "?"}`;
  $("#screenQuestionCategory").textContent = question.category || "Trivia";
  $("#screenQuestionText").textContent = question.question || "Pregunta";

  $("#screenOptions").innerHTML = Object.entries(question.options || {}).map(([key, value]) => `
    <article class="screen-option">
      <strong>${escapeHtml(key)}</strong>
      <span>${escapeHtml(value)}</span>
    </article>
  `).join("");

  startCountdown(room);
}

function startCountdown(room) {
  if (state.countdownStop) state.countdownStop();

  const startedAt = Number(room.questionStartedAt || Date.now());
  const duration = Number(room.questionDurationMs || 15000);
  const endAt = startedAt + duration;

  const timerEl = $("#screenQuestionTimer");
  timerEl.classList.remove("timer-done");
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
    }
  );
}

function showAnswer(room) {
  showOnly("screenAnswer");
  const correct = room.correctAnswerPublic;
  $("#correctAnswerText").textContent = correct ? `${correct.key}. ${correct.text}` : "Respuesta por revelar";
  $("#correctAnswerDetail").textContent = "Que el ranking dicte sentencia.";
}

function renderRanking() {
  const ranking = rankingFromParticipants(state.participants);
  $("#screenRankingList").innerHTML = renderPodiumHTML(ranking, 8);
}

let winnerCelebrated = false;

function showWinner(room) {
  showOnly("screenWinner");
  const winner = room.winner;
  $("#screenWinnerName").textContent = winner?.name || "Por definir";
  $("#screenWinnerScore").textContent = winner
    ? `${winner.score || 0} puntos · ${winner.correctCount || 0} correctas`
    : "";

  if (winner && !winnerCelebrated) {
    winnerCelebrated = true;
    launchConfetti({ count: 220, duration: 9000 });
  }
}
