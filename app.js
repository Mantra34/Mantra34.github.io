const frasesOriginales = [
  "Eres el 'te amo' que quiero repetir toda la vida.",
  "Te amo hoy, mañana y siempre.",
  "Eres mi princesa",
  "Mi vida es más linda desde que dijiste que sí",
  "Estas muy preciosa hoy mi vida",
  "Te amo mi cielo",
  "Ya te dije que te amo?",
  "Solo hay una mujer a la que amo y es a ti",
  "Si tengo una razón para sonreir en mis mañanas es por ti",
  "Te amo mi niña",
  "Maria Jose Moya Lozano, que nombre tan precioso no crees?",
  "Encontre una mujer que vale la pena, que curioso que tiene tu mismo nombre y apellido",
  "Esa mirada tuya me hace sentir que estoy viendo las estrellas",
  "Que te disfrazaras de angel en diciembre no es una casualidad",
  "Crees que esto fue lindo? dime que si jeje",
  "FUNCIONO MI PAGINA AMORRR JEJEJE",
  "Eres mi razon de sonreir",
  "Mi caramalosa",
  "Bona",
];

let frasesDisponibles = [...frasesOriginales];

function mostrarFrase() {
  if (frasesDisponibles.length === 0) {
    frasesDisponibles = [...frasesOriginales];
  }

  const indice = Math.floor(Math.random() * frasesDisponibles.length);
  const frase = frasesDisponibles.splice(indice, 1)[0];

  const nube = document.createElement("div");
  nube.className = "nube";
  nube.textContent = frase;

  document.body.appendChild(nube);

  setTimeout(() => {
    nube.remove();
  }, 5000);
}