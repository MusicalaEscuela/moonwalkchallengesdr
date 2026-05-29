# Moonwalk Challenge · Full80s x Musicala

App web estática para trivia en vivo de Michael Jackson en el evento **Salvémoslos del Reggaetón 2026**.

La dinámica: el público escanea un QR, entra desde el celular, escribe su nombre y responde preguntas. El equipo controla todo desde una pantalla de administración y puede proyectar una pantalla pública con QR, pregunta, temporizador, ranking y ganador.

## Vistas incluidas

- `index.html`: vista participante.
- `admin.html`: vista de administración.
- `screen.html`: pantalla pública/proyector.
- `styles.css`: estilos generales.
- `js/firebase.config.js`: configuración de Firebase.
- `js/questions.js`: banco inicial de preguntas.
- `js/firebase.service.js`: conexión a Realtime Database.
- `js/participant.js`: lógica del participante.
- `js/admin.js`: lógica del admin.
- `js/screen.js`: lógica de pantalla pública.
- `js/utils.js`: utilidades.
- `firebase-rules.test.json`: reglas abiertas para pruebas rápidas.
- `firebase-rules-safer-mvp.json`: reglas un poco más controladas para MVP sin login.

## Configuración rápida

### 1. Crear proyecto en Firebase

1. Entra a Firebase Console.
2. Crea un proyecto.
3. Agrega una app web.
4. Copia el objeto `firebaseConfig`.
5. Crea una **Realtime Database**.
6. Usa modo prueba mientras configuras.

### 2. Pegar configuración

Abre:

```txt
js/firebase.config.js
```

Y reemplaza esto:

```js
export const firebaseConfig = {
  apiKey: "PEGA_AQUI_TU_API_KEY",
  authDomain: "PEGA_AQUI.firebaseapp.com",
  databaseURL: "https://PEGA_AQUI-default-rtdb.firebaseio.com",
  projectId: "PEGA_AQUI",
  storageBucket: "PEGA_AQUI.appspot.com",
  messagingSenderId: "PEGA_AQUI",
  appId: "PEGA_AQUI"
};
```

con tu configuración real.

### 3. Cambiar clave de admin

En el mismo archivo:

```js
export const ADMIN_KEY = "FULL80S-ADMIN-2026";
```

Cámbiala por algo propio.

Importante: como esto no usa login ni backend, esta clave no es seguridad real. Sirve para evitar que alguien entre al admin por accidente. Para seguridad seria, se necesita login, Cloud Functions o reglas más estrictas. La tecnología, como siempre, pide sacrificios.

### 4. Reglas de Firebase

Para probar rápido puedes pegar el contenido de:

```txt
firebase-rules.test.json
```

Cuando ya esté funcionando, puedes probar con:

```txt
firebase-rules-safer-mvp.json
```

El modo sin login tiene límites de seguridad. Para un evento controlado funciona, pero no lo dejen abierto eternamente como puerta de garaje en barrio bravo.

### 5. Abrir las pantallas

Si subes a GitHub Pages:

```txt
https://TU_USUARIO.github.io/TU_REPO/index.html?room=full80s2026
https://TU_USUARIO.github.io/TU_REPO/admin.html?room=full80s2026&key=TU_CLAVE
https://TU_USUARIO.github.io/TU_REPO/screen.html?room=full80s2026
```

En local también puede funcionar abriendo con Live Server de VS Code. Evita abrirlo como `file://`, porque los módulos JS pueden fallar.

## Flujo sugerido para el evento

1. Abrir `screen.html` en el computador conectado al proyector.
2. Abrir `admin.html?key=TU_CLAVE` en el computador o tablet del equipo.
3. En admin, presionar **Preparar sala**.
4. En pantalla pública, mostrar QR.
5. El público escanea, pone nombre y espera.
6. Admin lanza pregunta.
7. Participantes responden desde el celular.
8. Admin cierra respuestas.
9. Admin califica.
10. Admin muestra respuesta y ranking.
11. Repetir.
12. Admin finaliza y muestra ganador.

## Premio

La app está pensada para mostrar:

**Premio: 4 clases gratis en cualquier modalidad**

Puedes editar textos en los HTML o en `js/firebase.config.js`.

## Sistema de puntos

- Correcta: máximo 1000 puntos.
- Mientras más rápido responde, más puntos.
- Incorrecta: 0 puntos.
- Bonus: cada 3 respuestas correctas seguidas suma 100 puntos extra.
- Desempate:
  1. Mayor puntaje.
  2. Más respuestas correctas.
  3. Menor tiempo total acumulado.

## Editar preguntas

Abre:

```txt
js/questions.js
```

Cada pregunta tiene este formato:

```js
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
}
```

No uses letras de canciones protegidas. Mejor usa pistas visuales, datos históricos, títulos, álbumes y referencias culturales.

## Recomendación para evento real

Prueba con 10 celulares antes del día del evento. No el mismo día, no cinco minutos antes, no mientras alguien pregunta por el micrófono. Ese ritual humano ya lo hemos sufrido bastante.

También deja una pregunta extra de desempate y una forma manual de entregar el premio si el internet se pone dramático.
