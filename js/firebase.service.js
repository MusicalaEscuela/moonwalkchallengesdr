import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  update,
  onValue,
  get,
  remove,
  serverTimestamp,
  runTransaction,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { firebaseConfig } from "./firebase.config.js";

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

export {
  ref,
  set,
  update,
  onValue,
  get,
  remove,
  serverTimestamp,
  runTransaction,
  onDisconnect
};

export const paths = {
  publicRoom: (roomId) => `publicRooms/${roomId}`,
  participants: (roomId) => `participants/${roomId}`,
  participant: (roomId, participantId) => `participants/${roomId}/${participantId}`,
  answers: (roomId, questionId) => `answers/${roomId}/${questionId}`,
  answer: (roomId, questionId, participantId) => `answers/${roomId}/${questionId}/${participantId}`,
  results: (roomId, questionId) => `results/${roomId}/${questionId}`,
  result: (roomId, questionId, participantId) => `results/${roomId}/${questionId}/${participantId}`,
  allResults: (roomId) => `results/${roomId}`,
  adminRoom: (roomId) => `adminRooms/${roomId}`
};
