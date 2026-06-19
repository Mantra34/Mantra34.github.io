/* ==CONFIGURACIÓN */
const CLICKS_BEFORE_SPECIAL = 30;   // a partir de este número de clicks...
const SPECIAL_CHANCE = 0.05;        // ...esta es la probabilidad (5%) en cada click

const STORAGE_KEY = "lovePage.clickCount";

/* ESTADO */
let messagesData = { normales: [], especiales: [] };
let lastIndex = -1;
let clickCount = Number(localStorage.getItem(STORAGE_KEY)) || 0;
let specialAlreadyTriggered = false;


const loveButton = document.getElementById("loveButton");
const messageText = document.getElementById("messageText");
const counterText = document.getElementById("counterText");
const sparklesContainer = document.getElementById("sparkles");

const specialOverlay = document.getElementById("specialOverlay");
const specialText = document.getElementById("specialText");
const closeSpecialBtn = document.getElementById("closeSpecial");
const petalsContainer = document.getElementById("petals");
const specialAudio = document.getElementById("specialAudio");

/* CARGA DE LOS MENSAJES*/
async function loadMessages() {
  try {
    const response = await fetch("assets/messages.json");
    if (!response.ok) throw new Error("No se pudo cargar messages.json");
    messagesData = await response.json();
  } catch (error) {
    console.error("Error cargando mensajes:", error);
    // Mensaje de respaldo por si el fetch falla (ej. abriendo el HTML directo con file://)
    messagesData = {
      normales: ["No pude cargar los mensajes, pero igual te quiero mucho. 💗"],
      especiales: ["Encontraste algo especial, aunque los mensajes no cargaron bien."],
    };
  }
  updateCounterText();
}

/* UTILIDADES*/
function getRandomMessage(list) {
  if (list.length === 1) return list[0];
  let index;
  do {
    index = Math.floor(Math.random() * list.length);
  } while (index === lastIndex);
  lastIndex = index;
  return list[index];
}

function updateCounterText() {
  if (clickCount === 0) {
    counterText.textContent = "";
    return;
  }
  counterText.textContent =
    clickCount === 1 ? "1 mensaje recibido" : `${clickCount} mensajes recibidos`;
}

function showMessage(text) {
  messageText.classList.remove("is-visible");
  // Pequeño delay para permitir el efecto de transición (fade + slide)
  window.setTimeout(() => {
    messageText.textContent = text;
    messageText.classList.add("is-visible");
  }, 120);
}

function pulseButton() {
  loveButton.classList.remove("pulse");
  // Forzar reflow para poder reiniciar la animación
  void loveButton.offsetWidth;
  loveButton.classList.add("pulse");
}

function createSparkle() {
  const sparkle = document.createElement("div");
  sparkle.className = "sparkle";
  sparkle.style.left = `${Math.random() * 100}%`;
  sparkle.style.top = `${Math.random() * 100}%`;
  sparkle.style.animationDelay = `${Math.random() * 3}s`;
  sparklesContainer.appendChild(sparkle);
}

/* EVENTO ESPECIAL */
const PETAL_EMOJIS = ["🌸", "💮", "🌷", "💗", "✨"];

function spawnPetals(count = 26) {
  petalsContainer.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const petal = document.createElement("span");
    petal.className = "petal";
    petal.textContent = PETAL_EMOJIS[Math.floor(Math.random() * PETAL_EMOJIS.length)];
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.fontSize = `${1 + Math.random() * 1.3}rem`;
    const duration = 4 + Math.random() * 4;
    petal.style.animationDuration = `${duration}s`;
    petal.style.animationDelay = `${Math.random() * 2}s`;
    petalsContainer.appendChild(petal);
  }
}

function triggerSpecialEvent() {
  const special = getRandomMessage(
    messagesData.especiales.length ? messagesData.especiales : ["Este momento es solo para ti. 💗"]
  );
  specialText.textContent = special;

  spawnPetals();
  specialOverlay.classList.add("is-active");
  specialOverlay.setAttribute("aria-hidden", "false");

  // Intentar reproducir el audio. Si el archivo aún no existe, no rompe la página.
  specialAudio.currentTime = 0;
  specialAudio.volume = 0.85;
  const playPromise = specialAudio.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch(() => {
      console.warn(
        "No se pudo reproducir la canción especial. Verifica que el archivo " +
          "assets/audio/cancion-especial.mp3 exista."
      );
    });
  }
}

function closeSpecialEvent() {
  specialOverlay.classList.remove("is-active");
  specialOverlay.setAttribute("aria-hidden", "true");
  specialAudio.pause();
  specialAudio.currentTime = 0;
}

/* INTERACCIÓN PRINCIPAL*/
function handleLoveButtonPress() {
  clickCount += 1;
  localStorage.setItem(STORAGE_KEY, String(clickCount));
  updateCounterText();
  pulseButton();
  createSparkle();

  // Probabilidad del evento especial: solo aplica después de cierto número de clicks
  const eligibleForSpecial = clickCount > CLICKS_BEFORE_SPECIAL;
  const rolledSpecial = eligibleForSpecial && Math.random() < SPECIAL_CHANCE;

  if (rolledSpecial) {
    triggerSpecialEvent();
    return; // el evento especial reemplaza al mensaje normal en este click
  }

  const normalMessage = getRandomMessage(
    messagesData.normales.length ? messagesData.normales : ["Te quiero. 💗"]
  );
  showMessage(normalMessage);
}

/* INICIO */

loveButton.addEventListener("click", handleLoveButtonPress);

closeSpecialBtn.addEventListener("click", closeSpecialEvent);

specialOverlay.addEventListener("click", (event) => {
  if (event.target === specialOverlay) {
    closeSpecialEvent();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && specialOverlay.classList.contains("is-active")) {
    closeSpecialEvent();
  }
});

/* load del js */
loadMessages();
