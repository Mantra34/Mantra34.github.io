/* ════════════════════════════════════════════════════════════════════════
   ÍNDICE DE SECCIONES
   ════════════════════════════════════════════════════════════════════════
   1. CONFIGURACIÓN
   2. ESTADO
   3. CANVAS — tamaño y referencia
   4. CARGA DE FRASES (assets/audio/messages-words.json)
   5. CORAZÓN — geometría y tabla de longitud de arco (con tangente)
   6. FRASE ACTIVA — automática cada 12 horas, o manual al tocar el corazón
   7. EMPAQUETADO — coloca cada letra sobre el contorno
   8. CORAZÓN SÓLIDO CENTRAL — el botón
   9. INTERACCIÓN — tocar el corazón para pasar de frase
   10. ANIMACIÓN — el anillo exterior gira, el centro queda quieto
   11. ARRANQUE
   ════════════════════════════════════════════════════════════════════════ */


/* ════════════════════════════════════════════════════════════════════════
   1. CONFIGURACIÓN
   Ajusta estos valores para cambiar tamaño, separación y ritmo de giro.
   ════════════════════════════════════════════════════════════════════════ */

const FONT_SIZE       = 16;    // tamaño de letra del anillo exterior (px)
const CHAR_GAP_PX     = 1.0;   // espacio entre una letra y la siguiente
const FLOW_SPEED      = 0.015; // qué tan rápido gira el anillo alrededor del corazón
const WOBBLE_AMOUNT   = 0.6;   // temblor individual por letra, en px — sutil, solo para que se sienta vivo
const WOBBLE_SPEED    = 1.1;
const ARC_SAMPLES     = 720;   // resolución de la tabla de longitud de arco
const HOURS_PER_PHRASE = 12;   // cada cuántas horas cambia la frase sola (si no se toca el corazón)
const FALLBACK_PHRASE = "Te amo"; // se usa solo si falla la carga del JSON de frases

const INNER_HEART_SCALE = 0.5; // qué tan grande es el corazón sólido central, fijo, respecto al anillo
const TEXT_COLOR        = "#241318";  // color del texto del anillo (casi negro)
const HEART_COLOR_LIGHT = "#ff4d63";  // corazón central — degradado claro
const HEART_COLOR_DARK  = "#b3001e";  // corazón central — degradado oscuro


/* ════════════════════════════════════════════════════════════════════════
   2. ESTADO
   ════════════════════════════════════════════════════════════════════════ */

let pool = [FALLBACK_PHRASE]; // frases disponibles; una se turna cada HOURS_PER_PHRASE horas (o al tocar el corazón)
let currentPhrase = null;     // la frase que está activa ahora mismo, repetida a lo largo del anillo
let particles = [];           // una entrada por LETRA colocada sobre el contorno
let time = 0;                 // reloj interno de la animación
let arcTable = [];            // tabla { s, x, y, tx, ty } para movernos por el contorno por arco
let perimeter = 0;            // longitud total del contorno del corazón (en unidades propias del corazón)

let manualPhraseIndex = null;     // índice del pool elegido a mano (toque); null = modo automático
let manualSlotAtSelection = null; // en qué bloque de 12h se hizo el último toque

// Guardado cada cuadro, para poder saber dónde está el corazón (botón)
// al momento de recibir un toque, sin tener que recalcularlo aparte.
let lastCenterX = 0;
let lastCenterY = 0;
let lastScale = 0;


/* ════════════════════════════════════════════════════════════════════════
   3. CANVAS — tamaño y referencia
   ════════════════════════════════════════════════════════════════════════ */

const canvas = document.getElementById("loveCanvas");
const ctx = canvas.getContext("2d");
let resizeTimer = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

// Al cambiar el tamaño de ventana, el ancho en píxeles de cada letra
// cambia (la escala del corazón cambia), así que hay que re-armar el
// anillo. Se espera un poquito (debounce) para no recalcular en cada
// micro-cambio mientras se arrastra el borde de la ventana.
window.addEventListener("resize", () => {
  resizeCanvas();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => buildParticles(currentPhrase), 200);
});


/* ════════════════════════════════════════════════════════════════════════
   4. CARGA DE FRASES
   ════════════════════════════════════════════════════════════════════════ */

async function loadPool() {
  try {
    // 1. Ajustamos la ruta. Suponiendo que el JSON está en la carpeta assets 
    // en la raíz de tu proyecto, subimos dos niveles (../../)
    const response = await fetch("../../assets/messages-words.json"); 
    
    if (!response.ok) throw new Error("No se pudo cargar el archivo JSON");
    
    const data = await response.json();
    
    // 2. Hacemos que sea flexible: si es un Array simple o un Objeto con categorías
    let combined = [];
    if (Array.isArray(data)) {
        combined = data;
    } else {
        combined = [...(data.normales || []), ...(data.especiales || [])];
    }

    // 3. Si logramos sacar frases, las guardamos en el pool
    if (combined.length > 0) {
        pool = combined;
    }

  } catch (error) {
    console.warn("No se pudo cargar el JSON, usando frases locales de respaldo:", error);
    
    // 4. MÚLTIPLES frases de respaldo. Ahora, si falla el JSON, el botón 
    // intercalará entre estas opciones y verás que sí funciona.
    pool = [
        "Te amo demasiado",
        "Eres mi princesa",
        "Siempre juntos",
        "Me haces muy feliz",
        "Nuestras raíces son fuertes"
    ];
  }
  
  buildArcTable();
  buildParticles();
  requestAnimationFrame(animate);
}


/* ════════════════════════════════════════════════════════════════════════
   5. CORAZÓN — geometría y tabla de longitud de arco (con tangente)
   heartPoint(t) da un punto del contorno para un ángulo t (0 a 2π), pero
   pasos iguales de t NO dan pasos iguales de distancia real sobre el
   contorno. arcTable recorre el contorno en pasos finos y acumula la
   distancia real recorrida, para ubicar cada letra por LONGITUD DE ARCO
   en vez de por ángulo — así el anillo queda parejo de verdad.
   Además, en cada punto guarda el vector TANGENTE (tx, ty): la
   dirección exacta hacia la que "mira" la curva ahí, para poder rotar
   cada letra y que siga la curva de forma natural.
   ════════════════════════════════════════════════════════════════════════ */

function heartPoint(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y =
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t);
  return { x, y };
}

function buildArcTable() {
  const N = ARC_SAMPLES;
  const pts = [];
  for (let i = 0; i < N; i++) {
    pts.push(heartPoint((i / N) * Math.PI * 2));
  }

  arcTable = [];
  let acc = 0;
  for (let i = 0; i < N; i++) {
    const cur = pts[i];
    const next = pts[(i + 1) % N];
    const prev = pts[(i - 1 + N) % N];

    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const tlen = Math.hypot(tx, ty) || 1;
    tx /= tlen;
    ty /= tlen;

    arcTable.push({ s: acc, x: cur.x, y: cur.y, tx, ty });
    acc += Math.hypot(next.x - cur.x, next.y - cur.y);
  }
  // entrada de cierre, para poder interpolar justo antes de completar la vuelta
  arcTable.push({ s: acc, x: pts[0].x, y: pts[0].y, tx: arcTable[0].tx, ty: arcTable[0].ty });
  perimeter = acc;
}

// Dada una distancia recorrida sobre el contorno (0..perimeter), devuelve
// el punto (x, y) y el ángulo de la tangente ahí, interpolando entre las
// dos muestras más cercanas de arcTable.
function pointAtArcLength(s) {
  s = ((s % perimeter) + perimeter) % perimeter; // envolver si se pasa o es negativo

  let lo = 0;
  let hi = arcTable.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arcTable[mid].s < s) lo = mid + 1;
    else hi = mid;
  }

  const b = arcTable[lo];
  const a = arcTable[Math.max(0, lo - 1)];
  if (b.s === a.s) {
    return { x: b.x, y: b.y, angle: Math.atan2(b.ty, b.tx) };
  }

  const ratio = (s - a.s) / (b.s - a.s);
  const x = a.x + (b.x - a.x) * ratio;
  const y = a.y + (b.y - a.y) * ratio;

  let tx = a.tx + (b.tx - a.tx) * ratio;
  let ty = a.ty + (b.ty - a.ty) * ratio;
  const tlen = Math.hypot(tx, ty) || 1;
  tx /= tlen;
  ty /= tlen;

  return { x, y, angle: Math.atan2(ty, tx) };
}


/* ════════════════════════════════════════════════════════════════════════
   6. FRASE ACTIVA — automática cada 12 horas, o manual al tocar el corazón
   Por defecto, la frase activa se calcula sola a partir de la hora real
   del reloj (getScheduledPhrase): cada HOURS_PER_PHRASE horas pasa a la
   siguiente frase del pool, sin tocar nada. Si el usuario toca el
   corazón (sección 9), se activa el modo manual: se fija la frase
   elegida y el cambio automático se pausa hasta que empiece el
   siguiente bloque de 12 horas, momento en el que vuelve solo al modo
   automático.
   ════════════════════════════════════════════════════════════════════════ */

function currentSlotNumber() {
  const msPerPhrase = HOURS_PER_PHRASE * 60 * 60 * 1000;
  return Math.floor(Date.now() / msPerPhrase);
}

function getScheduledPhrase() {
  if (!pool.length) return FALLBACK_PHRASE;
  return pool[currentSlotNumber() % pool.length];
}

// Revisa cada pocos minutos si, según el reloj, ya tocó cambiar de frase
// (por si dejas la pestaña abierta más de 12 horas seguidas), y también
// si ya pasó el bloque de 12 horas en el que se tocó el corazón a mano
// (para volver solo al modo automático).
setInterval(() => {
  const slot = currentSlotNumber();

  if (manualPhraseIndex !== null) {
    if (slot !== manualSlotAtSelection) {
      manualPhraseIndex = null; // ya pasó ese bloque de 12h, vuelve a lo automático
      buildParticles();
    }
    return;
  }

  const scheduled = getScheduledPhrase();
  if (scheduled !== currentPhrase) buildParticles();
}, 5 * 60 * 1000);


/* ════════════════════════════════════════════════════════════════════════
   7. EMPAQUETADO — coloca cada letra sobre el contorno
   Cada LETRA (no un trozo de varias) se coloca en su propio punto del
   contorno. Como en la animación cada letra se rota para seguir la
   tangente exacta de la curva ahí (sección 10), no hay problema de que
   se vean apiladas o de lado en los tramos empinados.
   ════════════════════════════════════════════════════════════════════════ */

function buildParticles(forcedPhrase) {
  particles = [];
  if (!perimeter) return;

  const scale = Math.min(canvas.width, canvas.height) / 26; // misma escala base que usa animate()
  ctx.font = `${FONT_SIZE}px "Quicksand", Arial, sans-serif`; // medir con la misma fuente que se dibuja

  const phrase = (forcedPhrase || getScheduledPhrase()) + " ";
  currentPhrase = forcedPhrase || getScheduledPhrase();

  const gapHeart = CHAR_GAP_PX / scale; // separación entre letras, en unidades del corazón (no px)
  let cursor = 0;
  let charCursor = 0;
  let guard = 0; // corta el bucle si algo sale mal (frase vacía, etc.)

  while (cursor < perimeter && guard < 4000) {
    guard++;

    const ch = phrase[charCursor % phrase.length];
    charCursor++;

    const widthHeart = Math.max(ctx.measureText(ch).width, 1) / scale;
    const center = cursor + widthHeart / 2;

    particles.push({
      ch,
      f0: (center % perimeter) / perimeter, // posición inicial, como fracción [0,1) del contorno
      phase: Math.random() * Math.PI * 2,   // desfase del temblor individual
    });

    cursor += widthHeart + gapHeart;
  }
}


/* ════════════════════════════════════════════════════════════════════════
   8. CORAZÓN SÓLIDO CENTRAL — el botón
   Un corazón relleno, quieto, en el medio. buildHeartPath() arma su
   contorno como un Path2D — se usa tanto para dibujarlo como para saber,
   en la sección 9, si un toque cayó adentro (ctx.isPointInPath).
   ════════════════════════════════════════════════════════════════════════ */

function buildHeartPath(cx, cy, scale) {
  const path = new Path2D();
  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * Math.PI * 2;
    const p = heartPoint(t);
    const px = cx + p.x * INNER_HEART_SCALE * scale;
    const py = cy - p.y * INNER_HEART_SCALE * scale;
    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  }
  path.closePath();
  return path;
}

function drawSolidHeart(cx, cy, scale) {
  const path = buildHeartPath(cx, cy, scale);

  const gradient = ctx.createLinearGradient(
    cx, cy - 12 * INNER_HEART_SCALE * scale,
    cx, cy + 12 * INNER_HEART_SCALE * scale
  );
  gradient.addColorStop(0, HEART_COLOR_LIGHT);
  gradient.addColorStop(1, HEART_COLOR_DARK);
  ctx.fillStyle = gradient;
  ctx.fill(path);
}


/* ════════════════════════════════════════════════════════════════════════
   9. INTERACCIÓN — tocar el corazón para pasar de frase
   OJO: en style.css, #loveCanvas tiene "pointer-events: none" a propósito
   (para que los clics le lleguen al contenido de encima, como el botón
   de volver). Eso significa que el canvas MISMO nunca recibe eventos de
   mouse/touch. Por eso los listeners van en `document`: el clic o toque
   igual burbujea hasta ahí con las coordenadas correctas, y desde acá
   comparamos esas coordenadas contra el contorno del corazón a mano.
   ════════════════════════════════════════════════════════════════════════ */

function advancePhraseManually() {
  if (!pool.length) return;
  const slot = currentSlotNumber();
  const baseIndex = manualPhraseIndex !== null ? manualPhraseIndex : (slot % pool.length);
  manualPhraseIndex = (baseIndex + 1) % pool.length;
  manualSlotAtSelection = slot;
  buildParticles(pool[manualPhraseIndex]);
}

function eventToCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height),
  };
}

function isPointOnHeart(point) {
  const path = buildHeartPath(lastCenterX, lastCenterY, lastScale);
  return ctx.isPointInPath(path, point.x, point.y);
}

document.addEventListener("click", (event) => {
  const point = eventToCanvasPoint(event);
  if (isPointOnHeart(point)) advancePhraseManually();
});

document.addEventListener("touchend", (event) => {
  if (!event.changedTouches || !event.changedTouches.length) return;
  const point = eventToCanvasPoint({ touches: event.changedTouches });
  if (isPointOnHeart(point)) advancePhraseManually();
});

// El canvas no puede mostrar el cursor "mano" (pointer-events: none), así
// que el cambio de cursor se aplica sobre <body> mientras el mouse está
// dentro del área del corazón.
document.addEventListener("mousemove", (event) => {
  const point = eventToCanvasPoint(event);
  document.body.style.cursor = isPointOnHeart(point) ? "pointer" : "";
});


/* ════════════════════════════════════════════════════════════════════════
   10. ANIMACIÓN — el anillo exterior gira, el centro queda quieto
   Todas las letras del anillo avanzan a la misma velocidad sobre el
   contorno (como en el ticker original), así que el espaciado logrado
   en el empaquetado nunca se rompe. Cada letra se rota para seguir la
   tangente de la curva en su posición actual. El corazón central se
   dibuja siempre igual, sin escalarlo con el tiempo.
   ════════════════════════════════════════════════════════════════════════ */

function animate() {
  time += 0.016;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${FONT_SIZE}px "Quicksand", Arial, sans-serif`;

  const scale = Math.min(canvas.width, canvas.height) / 26; // fija, sin respiración
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  lastCenterX = cx;
  lastCenterY = cy;
  lastScale = scale;

  drawSolidHeart(cx, cy, scale);

  ctx.fillStyle = TEXT_COLOR;
  particles.forEach((p) => {
    const f = ((p.f0 + time * FLOW_SPEED) % 1 + 1) % 1; // posición actual como fracción del contorno
    const pt = pointAtArcLength(f * perimeter);

    const wobbleX = Math.sin(time * WOBBLE_SPEED + p.phase) * WOBBLE_AMOUNT;
    const wobbleY = Math.cos(time * WOBBLE_SPEED + p.phase) * WOBBLE_AMOUNT;

    const px = cx + pt.x * scale + wobbleX;
    const py = cy - pt.y * scale + wobbleY;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-pt.angle); // sigue la tangente de la curva en ese punto
    ctx.fillText(p.ch, 0, 0);
    ctx.restore();
  });

  requestAnimationFrame(animate);
}


/* ════════════════════════════════════════════════════════════════════════
   11. ARRANQUE
   ════════════════════════════════════════════════════════════════════════ */

loadPool();
