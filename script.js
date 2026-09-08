/* ════════════════════════════════════════════════════════════════════════
   ÍNDICE DE SECCIONES
   ════════════════════════════════════════════════════════════════════════
   1. CONFIGURACIÓN GLOBAL
   2. ESTADO GLOBAL
   3. REFERENCIAS AL DOM — botón principal y tarjeta de mensajes
   4. REFERENCIAS AL DOM — evento especial (overlay de pétalos)
   5. CARGA DE MENSAJES (messages.json)
   6. UTILIDADES — mensajes, botón, sparkles
   7. EVENTO ESPECIAL — pétalos, disparo y cierre
   8. INTERACCIÓN PRINCIPAL — click del corazón
   9. DOCK LATERAL — menú expandible con íconos
   10. EVENT LISTENERS GENERALES + ARRANQUE
   ════════════════════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════════════════════
   1. CONFIGURACIÓN GLOBAL
   Constantes que puedes tocar para cambiar el comportamiento sin tener
   que leer el resto del código.
   ════════════════════════════════════════════════════════════════════════ */

const CLICKS_BEFORE_SPECIAL = 200;   // a partir de este número de clicks...
const SPECIAL_CHANCE = 1;            // ...esta es la probabilidad (1 = 100%) en cada click

const STORAGE_KEY = "lovePage.clickCount"; 
const TIME_KEY = "lovePage.lastClickTime";   // Clave para guardar la hora
const RESET_TIME_MS = 12 * 60 * 60 * 1000;   // 12 horas exactas en milisegundos

/* ════════════════════════════════════════════════════════════════════════
   2. ESTADO GLOBAL
   ════════════════════════════════════════════════════════════════════════ */

let messagesData = { normales: [], especiales: [] }; 
let lastIndex = -1;                                  

// --- NUEVA LÓGICA DE CADUCIDAD (12 HORAS) ---
let lastTime = Number(localStorage.getItem(TIME_KEY)) || Date.now();
if (Date.now() - lastTime > RESET_TIME_MS) {
  localStorage.setItem(STORAGE_KEY, "0"); // Reinicia el registro si pasaron 12 horas
}
// --------------------------------------------

let clickCount = Number(localStorage.getItem(STORAGE_KEY)) || 0; 
let specialAlreadyTriggered = false;


/* ════════════════════════════════════════════════════════════════════════
   3. REFERENCIAS AL DOM — botón principal y tarjeta de mensajes
   ════════════════════════════════════════════════════════════════════════ */

const loveButton = document.getElementById("loveButton");
const messageText = document.getElementById("messageText");
const counterText = document.getElementById("counterText");
const sparklesContainer = document.getElementById("sparkles");


/* ════════════════════════════════════════════════════════════════════════
   4. REFERENCIAS AL DOM — evento especial (overlay de pétalos)
   ════════════════════════════════════════════════════════════════════════ */

const specialOverlay = document.getElementById("specialOverlay");
const specialText = document.getElementById("specialText");
const closeSpecialBtn = document.getElementById("closeSpecial");
const petalsContainer = document.getElementById("petals");
const specialAudio = document.getElementById("specialAudio");


/* ════════════════════════════════════════════════════════════════════════
   5. CARGA DE MENSAJES (messages.json)
   Trae los mensajes normales y especiales desde el archivo externo.
   Si falla (por ejemplo al abrir el HTML directo con file://), usa un
   mensaje de respaldo para que la página nunca se quede muda.
   ════════════════════════════════════════════════════════════════════════ */

async function loadMessages() {
  try {
    const response = await fetch("assets/messages.json");
    if (!response.ok) throw new Error("No se pudo cargar messages.json");
    messagesData = await response.json();
  } catch (error) {
    console.error("Error cargando mensajes:", error);
    // Mensaje de respaldo por si el fetch falla
    messagesData = {
      normales: ["No pude cargar los mensajes, pero igual te quiero mucho. 💗"],
      especiales: ["Encontraste algo especial, aunque los mensajes no cargaron bien."],
    };
  }
  updateCounterText();
}


/* ════════════════════════════════════════════════════════════════════════
   6. UTILIDADES — mensajes, botón, sparkles
   Funciones pequeñas y reutilizables que usan otras secciones.
   ════════════════════════════════════════════════════════════════════════ */

// Elige un mensaje al azar de la lista, evitando repetir el último mostrado.
function getRandomMessage(list) {
  if (list.length === 1) return list[0];
  let index;
  do {
    index = Math.floor(Math.random() * list.length);
  } while (index === lastIndex);
  lastIndex = index;
  return list[index];
}

// Actualiza el texto de "X mensajes recibidos" debajo del botón.
function updateCounterText() {
  if (clickCount === 0) {
    counterText.textContent = "";
    return;
  }
  counterText.textContent =
    clickCount === 1 ? "1 mensaje recibido" : `${clickCount} mensajes recibidos`;
}

// Muestra un mensaje nuevo en la tarjeta, con un pequeño fundido de salida/entrada.
function showMessage(text) {
  messageText.classList.remove("is-visible");
  // Pequeño delay para permitir el efecto de transición (fade + slide)
  window.setTimeout(() => {
    messageText.textContent = text;
    messageText.classList.add("is-visible");
  }, 120);
}

// Reinicia y vuelve a disparar la animación de "pulso" del botón (el anillo).
function pulseButton() {
  loveButton.classList.remove("pulse");
  // Forzar reflow para poder reiniciar la animación
  void loveButton.offsetWidth;
  loveButton.classList.add("pulse");
}

// Crea un destello (sparkle) suelto en una posición aleatoria del cielo de fondo.
function createSparkle() {
  const sparkle = document.createElement("div");
  sparkle.className = "sparkle";
  sparkle.style.left = `${Math.random() * 100}%`;
  sparkle.style.top = `${Math.random() * 100}%`;
  sparkle.style.animationDelay = `${Math.random() * 3}s`;
  sparklesContainer.appendChild(sparkle);
}


/* ════════════════════════════════════════════════════════════════════════
   7. EVENTO ESPECIAL — pétalos, disparo y cierre
   Todo lo relacionado con el momento sorpresa: overlay a pantalla
   completa, lluvia de pétalos y música.
   ════════════════════════════════════════════════════════════════════════ */

const PETAL_EMOJIS = ["🌸", "💮", "🌷", "💗", "✨"];

// Genera `count` pétalos con posición, tamaño y velocidad de caída aleatorios.
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

// Abre el overlay especial: elige mensaje, lanza pétalos y reproduce el audio.
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

// Cierra el overlay especial y detiene el audio.
function closeSpecialEvent() {
  specialOverlay.classList.remove("is-active");
  specialOverlay.setAttribute("aria-hidden", "true");
  specialAudio.pause();
  specialAudio.currentTime = 0;
}


/* ════════════════════════════════════════════════════════════════════════
   8. INTERACCIÓN PRINCIPAL — click del corazón
   Punto de entrada de la experiencia principal: cada click suma al
   contador, dispara efectos visuales y decide si toca mensaje normal
   o evento especial.
   ════════════════════════════════════════════════════════════════════════ */

function handleLoveButtonPress() {
  clickCount += 1;
  localStorage.setItem(STORAGE_KEY, String(clickCount));
  localStorage.setItem(TIME_KEY, String(Date.now())); // <-- NUEVO: Guarda el momento exacto del click
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


/* ════════════════════════════════════════════════════════════════════════
   9. DOCK LATERAL — menú expandible con íconos
   Botón fijo (abajo a la derecha) que al tocarlo despliega una barra
   horizontal deslizable con 10 íconos. El primero (⌨️) navega a
   teclado.html; los otros 9 (❓) son placeholders para futuras páginas.
   ════════════════════════════════════════════════════════════════════════ */

const sideDock = document.getElementById("sideDock");
const dockToggle = document.getElementById("dockToggle");
const dockTrack = document.getElementById("dockTrack");
const dockToast = document.getElementById("dockToast");

// Lista de íconos del dock. Para activar una de las "sorpresas", cámbiale
// el `type` a "keyboard" (o similar) y agrégale su propio `href`.
const DOCK_ITEMS = [
  { icon: "⌨️", label: "Teclado", href: "adicionales/teclado/teclado.html", type: "keyboard" },
  { icon: "🎁", label: "Little_Gift", href: "/adicionales/cajasorpresa/arbol.html", type: "keyboard" },
  { icon: "💗", label: "Hearth code for you", type: "placeholder" },
    { 
    // Código SVG del logo de Spotify
    icon: `<svg viewBox="0 0 24 24" width="26" height="26" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`,label: "My songs, for you sweethearth", href: "", 
  },
  { icon: "❓", label: "Sorpresa 5", type: "placeholder" },
  { icon: "❓", label: "Sorpresa 6", type: "placeholder" },
  { icon: "❓", label: "Sorpresa 7", type: "placeholder" },
  { icon: "❓", label: "Sorpresa 8", type: "placeholder" },
  { icon: "❓", label: "Sorpresa 9", type: "placeholder" },
  { icon: "❓", label: "Sorpresa 10", type: "placeholder" }
];

let toastTimeout = null;

// Muestra un mensajito flotante abajo (usado por los íconos placeholder).
function showToast(text) {
  dockToast.textContent = text;
  dockToast.classList.add("is-visible");
  clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    dockToast.classList.remove("is-visible");
  }, 1600);
}

// Crea dinámicamente los botones de íconos dentro de la barra del dock,
// a partir del array DOCK_ITEMS.
function buildDockItems() {
  DOCK_ITEMS.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dock-icon" + (item.type === "keyboard" ? " dock-icon--keyboard" : "");
    btn.setAttribute("role", "listitem");
    btn.setAttribute("aria-label", item.label);
    btn.innerHTML = item.icon;

    if (item.type === "keyboard") {
      // Ícono funcional: navega a otra página.
      btn.addEventListener("click", () => {
        window.location.href = item.href;
      });
    } else {
      // Ícono placeholder: solo avisa que viene pronto.
      btn.addEventListener("click", () => {
        showToast("Próximamente 💗");
      });
    }

    dockTrack.appendChild(btn);
  });
}

// Abre/cierra el dock y sincroniza el atributo de accesibilidad aria-expanded.
function toggleDock() {
  const isOpen = sideDock.classList.toggle("is-open");
  dockToggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    dockTrack.scrollLeft = 0; // siempre abre mostrando el primer ícono
  }
}

buildDockItems();
dockToggle.addEventListener("click", toggleDock);

// Cerrar el dock con la tecla Escape.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sideDock.classList.contains("is-open")) {
    toggleDock();
  }
});

// Cerrar el dock si el usuario toca en cualquier parte fuera de él.
document.addEventListener("click", (event) => {
  const clickedInsideDock = sideDock.contains(event.target);
  if (!clickedInsideDock && sideDock.classList.contains("is-open")) {
    toggleDock();
  }
});


/* ════════════════════════════════════════════════════════════════════════
   10. EVENT LISTENERS GENERALES + ARRANQUE
   Conecta los listeners que faltan (botón de amor, cerrar evento
   especial) y dispara la carga inicial de mensajes.
   ════════════════════════════════════════════════════════════════════════ */

loveButton.addEventListener("click", handleLoveButtonPress);

closeSpecialBtn.addEventListener("click", closeSpecialEvent);

// Cerrar el evento especial tocando fuera de la tarjeta (en el fondo oscuro).
specialOverlay.addEventListener("click", (event) => {
  if (event.target === specialOverlay) {
    closeSpecialEvent();
  }
});

// Cerrar el evento especial con la tecla Escape.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && specialOverlay.classList.contains("is-active")) {
    closeSpecialEvent();
  }
});

// Arranque: carga los mensajes desde el JSON en cuanto el script se ejecuta.
loadMessages();
