export const DEFAULT_QUESTIONS = [
  {
    id: "q001",
    category: "Calentamiento Pop",
    difficulty: "easy",
    timeLimit: 15,
    question: "¿Cómo se conoce popularmente a Michael Jackson?",
    options: {
      A: "El Duque del Funk",
      B: "El Rey del Pop",
      C: "El Príncipe del Rock",
      D: "El Maestro del Disco"
    },
    correct: "B"
  },
  {
    id: "q002",
    category: "Baile e historia",
    difficulty: "easy",
    timeLimit: 15,
    question: "¿Qué paso de baile hizo famoso Michael Jackson en una presentación televisada de 1983?",
    options: {
      A: "Moonwalk",
      B: "Break Spin",
      C: "Robot Walk",
      D: "Disco Jump"
    },
    correct: "A"
  },
  {
    id: "q003",
    category: "Videoclips",
    difficulty: "easy",
    timeLimit: 15,
    question: "¿Qué videoclip de Michael Jackson es recordado por zombies y una coreografía nocturna?",
    options: {
      A: "Bad",
      B: "Thriller",
      C: "Black or White",
      D: "Remember the Time"
    },
    correct: "B"
  },
  {
    id: "q004",
    category: "Álbumes",
    difficulty: "easy",
    timeLimit: 15,
    question: "¿Cuál de estas canciones pertenece al álbum Thriller?",
    options: {
      A: "Beat It",
      B: "Smooth Criminal",
      C: "They Don't Care About Us",
      D: "Earth Song"
    },
    correct: "A"
  },
  {
    id: "q005",
    category: "Estilo MJ",
    difficulty: "easy",
    timeLimit: 12,
    question: "¿Qué accesorio se volvió uno de los símbolos visuales más recordados de Michael Jackson?",
    options: {
      A: "Un guante blanco",
      B: "Una capa roja",
      C: "Un sombrero mexicano",
      D: "Un saxofón dorado"
    },
    correct: "A"
  },
  {
    id: "q006",
    category: "Producción musical",
    difficulty: "medium",
    timeLimit: 18,
    question: "¿Qué productor trabajó de forma clave con Michael Jackson en el álbum Thriller?",
    options: {
      A: "George Martin",
      B: "Quincy Jones",
      C: "Phil Spector",
      D: "Nile Rodgers"
    },
    correct: "B"
  },
  {
    id: "q007",
    category: "Videos 80s",
    difficulty: "medium",
    timeLimit: 15,
    question: "¿Qué canción se asocia con una historia de pandillas, baile callejero y energía rockera?",
    options: {
      A: "Beat It",
      B: "Heal the World",
      C: "Ben",
      D: "You Are Not Alone"
    },
    correct: "A"
  },
  {
    id: "q008",
    category: "Videoclips",
    difficulty: "medium",
    timeLimit: 15,
    question: "¿Qué canción tiene un videoclip famoso por la inclinación imposible y estética de gánster clásico?",
    options: {
      A: "Bad",
      B: "Smooth Criminal",
      C: "Jam",
      D: "Human Nature"
    },
    correct: "B"
  },
  {
    id: "q009",
    category: "Álbumes",
    difficulty: "medium",
    timeLimit: 15,
    question: "¿Qué álbum de estudio lanzó Michael Jackson después de Thriller?",
    options: {
      A: "Dangerous",
      B: "Bad",
      C: "HIStory",
      D: "Invincible"
    },
    correct: "B"
  },
  {
    id: "q010",
    category: "Colaboraciones",
    difficulty: "medium",
    timeLimit: 18,
    question: "¿Cuál canción del álbum Thriller fue un dueto con Paul McCartney?",
    options: {
      A: "The Girl Is Mine",
      B: "Billie Jean",
      C: "Wanna Be Startin' Somethin'",
      D: "P.Y.T."
    },
    correct: "A"
  },
  {
    id: "q011",
    category: "Videoclips",
    difficulty: "medium",
    timeLimit: 15,
    question: "¿Qué videoclip de Michael Jackson tiene una estética inspirada en el antiguo Egipto?",
    options: {
      A: "Remember the Time",
      B: "Dirty Diana",
      C: "Rock With You",
      D: "Scream"
    },
    correct: "A"
  },
  {
    id: "q012",
    category: "Personajes y canciones",
    difficulty: "hard",
    timeLimit: 18,
    question: "¿Qué canción de Michael Jackson presenta una historia de misterio alrededor de un personaje llamado Annie?",
    options: {
      A: "Smooth Criminal",
      B: "Bad",
      C: "Leave Me Alone",
      D: "Another Part of Me"
    },
    correct: "A"
  },
  {
    id: "q013",
    category: "Álbumes",
    difficulty: "hard",
    timeLimit: 18,
    question: "¿Cuál fue el álbum anterior a Thriller dentro de su etapa adulta con Epic Records?",
    options: {
      A: "Off the Wall",
      B: "Got to Be There",
      C: "Music & Me",
      D: "Forever, Michael"
    },
    correct: "A"
  },
  {
    id: "q014",
    category: "Cultura pop",
    difficulty: "easy",
    timeLimit: 12,
    question: "¿Cuál de estos elementos NO se asocia normalmente con la imagen artística de Michael Jackson?",
    options: {
      A: "Guante blanco",
      B: "Moonwalk",
      C: "Sombrero fedora",
      D: "Acordeón vallenato"
    },
    correct: "D"
  },
  {
    id: "q015",
    category: "Álbum Bad",
    difficulty: "medium",
    timeLimit: 15,
    question: "¿Cuál de estas canciones pertenece al álbum Bad?",
    options: {
      A: "Man in the Mirror",
      B: "Rock With You",
      C: "Don't Stop 'Til You Get Enough",
      D: "You Rock My World"
    },
    correct: "A"
  }
];

export function getQuestionById(questionId) {
  return DEFAULT_QUESTIONS.find((question) => question.id === questionId) || null;
}

export function getQuestionIndex(questionId) {
  return DEFAULT_QUESTIONS.findIndex((question) => question.id === questionId);
}

export function toPublicQuestion(question, index = 0) {
  return {
    id: question.id,
    category: question.category,
    difficulty: question.difficulty,
    timeLimit: question.timeLimit,
    question: question.question,
    options: question.options,
    index,
    total: DEFAULT_QUESTIONS.length
  };
}
