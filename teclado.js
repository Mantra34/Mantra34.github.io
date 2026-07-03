/* ════════════════════════════════════════════════════════════════════════
   ÍNDICE DE SECCIONES
   ════════════════════════════════════════════════════════════════════════
   1. CONFIGURACIÓN
   2. ESTADO
   3. CANVAS — tamaño y referencia
   4. CARGA DE FRASES (messages.json)
   5. CONSTRUCCIÓN DEL CORAZÓN — geometría
   6. ANIMACIÓN
   7. AÑADIR FRASES EN CALIENTE
   8. ARRANQUE
   ════════════════════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════════════════════
   1. CONFIGURACIÓN
   Ajusta estos valores para cambiar densidad, tamaño y velocidad.
   ════════════════════════════════════════════════════════════════════════ */

const TOTAL_BASE = 300;      // cantidad de frases que forman el corazón al inicio
const ADD_STEP = 6;          // cuántos puntos nuevos se agregan por cada frase que añades
const FONT_SIZE = 11;        // tamaño de letra de cada frase (px)
const FALLBACK_PHRASE = "Te amo"; // se usa solo si falla la carga de messages.json


/* ════════════════════════════════════════════════════════════════════════
   2. ESTADO
   ════════════════════════════════════════════════════════════════════════ */

let pool = [FALLBACK_PHRASE]; // lista de frases disponibles (normales + especiales + las que añadas)
let total = TOTAL_BASE;       // cuántos puntos del corazón se dibujan
let particles = [];           // posiciones ya calculadas (una por frase)
let time = 0;                 // reloj interno de la animación


/* ════════════════════════════════════════════════════════════════════════
   3. CANVAS — tamaño y referencia
   El canvas debe ajustarse al tamaño de pantalla; si la ventana cambia
   de tamaño, lo recalculamos.
   ════════════════════════════════════════════════════════════════════════ */

const canvas = document.getElementById("loveCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


/* ════════════════════════════════════════════════════════════════════════
   4. CARGA DE FRASES (messages.json)
   Reutiliza el mismo archivo que usa script.js en index.html. Si falla
   (ruta incorrecta, sin conexión, etc.), cae en la frase de respaldo
   para que el corazón nunca se quede vacío.
   ════════════════════════════════════════════════════════════════════════ */

async function loadPool() {
  try {
    const response = await fetch("assets/messages-words.json");
    if (!response.ok) throw new Error("No se pudo cargar messages.json");
    const data = await response.json();
    const combined = [...(data.normales || []), ...(data.especiales || [])];
    if (combined.length) pool = combined;
  } catch (error) {
    console.warn("No se pudieron cargar las frases, usando frase de respaldo:", error);
  }
  buildParticles();
  requestAnimationFrame(animate);
}


/* ════════════════════════════════════════════════════════════════════════
   5. CONSTRUCCIÓN DEL CORAZÓN — geometría
   Ecuación paramétrica del corazón: cada valor de t (0 a 2π) da una
   posición (x, y). A cada posición le asignamos una frase del pool,
   repitiendo la lista si hay más puntos que frases.
   ════════════════════════════════════════════════════════════════════════ */

function buildParticles() {
  particles = [];
  for (let i = 0; i < total; i++) {
    const t = (i / total) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);

    particles.push({
      baseX: x,
      baseY: y,
      phrase: pool[i % pool.length],
      phase: Math.random() * Math.PI * 2, // desfase individual para que no se muevan todas igual
    });
  }
}


/* ════════════════════════════════════════════════════════════════════════
   6. ANIMACIÓN
   El corazón "respira" (escala con un seno) y gira levemente; además
   cada frase tiene su propio pequeño temblor (wobble) para que se
   sienta vivo y no estático.
   ════════════════════════════════════════════════════════════════════════ */

function animate() {
  time += 0.015;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${FONT_SIZE}px "Quicksand", Arial, sans-serif`;

  const breathe = 1 + Math.sin(time * 0.8) * 0.05;
  const scale = (Math.min(canvas.width, canvas.height) / 26) * breathe;
  const rotation = Math.sin(time * 0.15) * 0.06;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2.3;

  particles.forEach((p) => {
    // Rotación suave de todo el corazón como conjunto.
    const rx = p.baseX * Math.cos(rotation) - p.baseY * Math.sin(rotation);
    const ry = p.baseX * Math.sin(rotation) + p.baseY * Math.cos(rotation);

    // Temblor individual de cada frase (movimiento propio, desfasado).
    const wobbleX = Math.sin(time * 1.4 + p.phase) * 2;
    const wobbleY = Math.cos(time * 1.4 + p.phase) * 2;

    const px = cx + rx * scale + wobbleX;
    const py = cy - ry * scale + wobbleY;

    const hue = 335 + Math.sin(time + p.phase) * 12;
    ctx.fillStyle = `hsla(${hue}, 70%, 68%, 0.8)`;
    ctx.fillText(p.phrase, px, py);
  });

  requestAnimationFrame(animate);
}


/* ════════════════════════════════════════════════════════════════════════
   7. AÑADIR FRASES EN CALIENTE
   El formulario del HTML permite meter una frase nueva al pool sin
   recargar la página. Nota: esto vive solo en memoria — si recargas,
   vuelve a las frases del JSON.
   ════════════════════════════════════════════════════════════════════════ */

const addWordForm = document.getElementById("addWordForm");
const addWordInput = document.getElementById("addWordInput");

addWordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = addWordInput.value.trim();
  if (!text) return;

  pool.push(text);
  total += ADD_STEP; // le da más presencia a la frase nueva dentro del corazón
  buildParticles();
  addWordInput.value = "";
});


/* ════════════════════════════════════════════════════════════════════════
   8. ARRANQUE
   ════════════════════════════════════════════════════════════════════════ */

loadPool();
