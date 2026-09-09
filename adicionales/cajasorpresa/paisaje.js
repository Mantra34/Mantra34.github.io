document.addEventListener('DOMContentLoaded', () => {
    
    setTimeout(() => {
        document.getElementById('inicio-sorpresa').scrollIntoView({ behavior: 'instant', block: 'center' });
    }, 100);

    // 1. AHORA LE DECIMOS QUÉ "TIPO" ES CADA ARCHIVO
    const recuerdos = [
        {
            tipo: 'imagen',
            url: '/adicionales/cajasorpresa/exportadas/beauty_collage.jpeg', 
            texto: 'Un hermoso collage de una preciosa mujer.'
        },
        {
            tipo: 'video', // <--- ¡AQUÍ ESTÁ EL CAMBIO!
            url: '/adicionales/cajasorpresa/exportadas/un_despertar_juntos.mp4', 
            texto: 'Un despertar juntitos, amor mío. 💖'
        },
        {
                    tipo: 'imagen',
            url: '/adicionales/cajasorpresa/exportadas/beautifull_woman.jpeg',
            texto: 'Que mujer tan bella e increible 🍷'
        },
        {
                    tipo: 'imagen',
            url: '/adicionales/cajasorpresa/exportadas/nosotros_gacha.jpeg',
            texto: 'Un recuerdo de nosotros en Gacha Life. 💕'
        },
                {
                    tipo: 'imagen',
            url: '/adicionales/cajasorpresa/exportadas/epic_foto.jpeg',
            texto: 'Que pose tan epica la tuya 🤩'

        },
                {
                    tipo: 'imagen',
            url: '/adicionales/cajasorpresa/exportadas/lenguita_teamo.jpeg',
            texto: 'De nuestras primeras instantaneas. 😍'

        }

    ];

    const galleryGrid = document.getElementById('galleryGrid');
    
    [...recuerdos].reverse().forEach((recuerdo) => {
        const item = document.createElement('div');
        item.className = 'polaroid-item';
        
        // 2. DEPENDIENDO DEL TIPO, CREAMOS IMAGEN O VIDEO
        let mediaHTML = '';
        if (recuerdo.tipo === 'video') {
            // Video sin sonido (muted), que se reproduce solo (autoplay) y en bucle (loop)
            mediaHTML = `<video src="${recuerdo.url}" muted loop autoplay playsinline></video>`;
        } else {
            mediaHTML = `<img src="${recuerdo.url}" alt="Recuerdo" onerror="this.src='https://via.placeholder.com/350x350/4a2021/ffffff?text=Tu+Foto+Aquí'">`;
        }
        
        item.innerHTML = `
            <div class="tape"></div>
            ${mediaHTML}
            <p class="polaroid-text">${recuerdo.texto}</p>
        `;
        
        // Le pasamos el 'tipo' a la función abrirModal
        item.addEventListener('click', () => abrirModal(recuerdo.url, recuerdo.texto, recuerdo.tipo));
        galleryGrid.appendChild(item);
    });

    const updateToast = document.getElementById('updateToast');
    setTimeout(() => {
        updateToast.classList.add('is-visible');
        updateToast.style.transform = 'translateY(0)';
    }, 1500);

    updateToast.addEventListener('click', () => {
        document.getElementById('roots-section').scrollIntoView({ behavior: 'smooth' });
        updateToast.classList.remove('is-visible');
    });

    const surpriseButton = document.getElementById('surpriseButton');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalVideo = document.getElementById('modalVideo'); // Referencia al video oculto
    const modalText = document.getElementById('modalText');
    const closeModalBtn = document.getElementById('closeModalBtn');

    const ultimoRecuerdo = recuerdos[recuerdos.length - 1];

    // 3. LA FUNCIÓN QUE ABRE EL MODAL AHORA SEPARA FOTOS DE VIDEOS
    function abrirModal(mediaSrc, texto, tipo) {
        if (tipo === 'video') {
            modalImage.style.display = 'none';
            modalVideo.style.display = 'block';
            modalVideo.src = mediaSrc;
            modalVideo.play(); // Inicia el video automáticamente
        } else {
            modalVideo.style.display = 'none';
            modalVideo.pause(); // Pausa el video por si acaso
            modalImage.style.display = 'block';
            modalImage.src = mediaSrc;
            modalImage.onerror = function() { this.src = 'https://via.placeholder.com/400x400/ffd1dc/6b4e71?text=Sorpresa'; };
        }
        
        modalText.textContent = texto;
        imageModal.classList.add('is-active');
    }

    surpriseButton.addEventListener('click', () => {
        abrirModal(ultimoRecuerdo.url, ultimoRecuerdo.texto, ultimoRecuerdo.tipo);
        updateToast.classList.remove('is-visible');
    });

    // 4. AL CERRAR, TENEMOS QUE PAUSAR EL VIDEO
    closeModalBtn.addEventListener('click', () => {
        imageModal.classList.remove('is-active');
        modalVideo.pause(); // Para que el audio no siga sonando de fondo
    });
});