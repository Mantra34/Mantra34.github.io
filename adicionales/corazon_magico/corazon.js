document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('turtleCanvas');
    const ctx = canvas.getContext('2d');

    // Ajustar el canvas al tamaño de la pantalla
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Configuración visual (Equivalente a t.color y t.write en Python)
    const textColor = "#ffb6c1";
    const text = "Te amo Sara"; 
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // 1. Calcular todas las coordenadas matemáticas por adelantado
    const points = [];
    
    // Los mismos bucles de escala y ángulo del código en Python
    for (let scale = 11; scale < 17; scale++) {
        for (let i = 0; i < 120; i++) {
            let angle = i * (Math.PI * 2) / 120;
            
            // Ecuaciones paramétricas del corazón
            let x = 16 * Math.pow(Math.sin(angle), 3) * scale;
            let y = (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) * scale;
            
            points.push({ x, y });
        }
    }

    let currentFrame = 0;

    // 2. Función de animación para imitar el progreso de la tortuga
  function draw() {
        if (currentFrame < points.length) {
            // Ya no hay bucle "for", solo dibujamos un punto a la vez
            let p = points[currentFrame];
            
            let drawX = (canvas.width / 2) + p.x;
            let drawY = (canvas.height / 2) - p.y;

            ctx.fillStyle = textColor;
            ctx.fillText(text, drawX, drawY);
            
            currentFrame++;
            
            // Llama al siguiente fotograma
            requestAnimationFrame(draw);
        }
    }

    // Iniciar el dibujo automático
    draw();
});