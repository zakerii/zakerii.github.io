/* ── CARRUSEL DE PROYECTOS Y GALERÍA MEJORADO ── */

class ModernCarousel {
  constructor(sliderId, options = {}) {
    this.container = document.getElementById(sliderId);
    if (!this.container) return;

    this.slidesContainer = this.container.querySelector('.slides');
    this.slides = Array.from(this.container.querySelectorAll('.slide'));
    this.controller = this.container.querySelector('.slider-controler');

    this.currentIndex = 0;
    this.autoplayInterval = null;
    this.autoplayDelay = options.autoplayDelay || 4000;
    this.isPlaying = true;

    // Drag / Touch state
    this.startX = 0;
    this.currentX = 0;
    this.isDragging = false;

    this.init();
  }

  init() {
    if (!this.slidesContainer || this.slides.length === 0) return;

    // Disable CSS animation keyframes on slides to allow JS-controlled smooth transform
    this.slides.forEach(slide => {
      slide.style.animation = 'none';
      slide.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)';
    });

    // Ensure image error handling with procedural SVG fallback
    this.setupFallbackImages();

    // Create Navigation Controls (Prev/Next buttons, Autoplay Toggle, Counter)
    this.createControls();

    // Setup Dot indicators
    this.setupDots();

    // Setup Lightbox Modal for Fullscreen View
    this.setupLightbox();

    // Event Listeners for Touch/Drag
    this.addDragEvents();

    // Start Autoplay
    this.startAutoplay();

    // Render initial position
    this.updateCarousel();
  }

  setupFallbackImages() {
    this.slides.forEach((slide, idx) => {
      const img = slide.querySelector('img');
      if (img) {
        const handleFallback = () => {
          if (img.dataset.fallbackDone) return;
          img.dataset.fallbackDone = 'true';
          const svgData = this.generateFallbackSVG(idx + 1, img.alt || `Proyecto 3D ${idx + 1}`);
          img.src = svgData;
        };

        img.onerror = handleFallback;
        if (img.complete && img.naturalWidth === 0) {
          handleFallback();
        }
      }
    });
  }

  generateFallbackSVG(num, title) {
    const colors = [
      ['#0f2027', '#203a43', '#2c5364', '#00f0ff'],
      ['#1a002c', '#3d0066', '#5c0099', '#ff007f'],
      ['#00223e', '#1d976c', '#93f9b9', '#00f0ff'],
      ['#232526', '#414345', '#f39c12', '#f1c40f'],
      ['#0b0c10', '#1f2833', '#c5c6c7', '#66fcf1'],
      ['#141e30', '#243b55', '#e0eafc', '#00d2ff']
    ];
    const c = colors[(num - 1) % colors.length];

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
        <defs>
          <linearGradient id="bg${num}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${c[0]}"/>
            <stop offset="50%" stop-color="${c[1]}"/>
            <stop offset="100%" stop-color="${c[2]}"/>
          </linearGradient>
          <pattern id="grid${num}" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${c[3]}" stroke-width="0.5" opacity="0.2"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg${num})"/>
        <rect width="100%" height="100%" fill="url(#grid${num})"/>
        
        <!-- Abstract 3D Geometric Art -->
        <g transform="translate(600, 300)">
          <polygon points="0,-120 100,-40 100,80 0,160 -100,80 -100,-40" fill="none" stroke="${c[3]}" stroke-width="3" opacity="0.8"/>
          <polygon points="0,-120 100,-40 0,0 -100,-40" fill="${c[3]}" opacity="0.15"/>
          <polygon points="0,0 100,-40 100,80 0,160" fill="${c[3]}" opacity="0.25"/>
          <circle cx="0" cy="0" r="160" fill="none" stroke="${c[3]}" stroke-width="1" stroke-dasharray="8,8" opacity="0.5"/>
        </g>
        
        <!-- Project Title Banner -->
        <rect x="60" y="520" width="1080" height="100" rx="16" fill="rgba(0,0,0,0.6)" backdrop-filter="blur(10px)" stroke="${c[3]}" stroke-width="1"/>
        <text x="100" y="565" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="28" font-weight="bold">PROYECTO 0${num}: ${title.toUpperCase()}</text>
        <text x="100" y="598" fill="${c[3]}" font-family="Segoe UI, sans-serif" font-size="16">MODELADO 3D • TEXTURIZADO BLENDER & SUBSTANCE • ZAKERII</text>
      </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  createControls() {
    // Left & Right Prev/Next Buttons
    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-arrow carousel-prev';
    prevBtn.innerHTML = '❮';
    prevBtn.ariaLabel = 'Anterior';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-arrow carousel-next';
    nextBtn.innerHTML = '❯';
    nextBtn.ariaLabel = 'Siguiente';

    prevBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.prev();
    });
    nextBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.next();
    });

    this.container.appendChild(prevBtn);
    this.container.appendChild(nextBtn);

    // Top Right Autoplay toggle & counter badge
    const topBadge = document.createElement('div');
    topBadge.className = 'carousel-badge';
    topBadge.innerHTML = `
      <span class="carousel-counter">1 / ${this.slides.length}</span>
      <button class="carousel-play-btn" title="Pausar / Reproducir">⏸</button>
    `;

    const playBtn = topBadge.querySelector('.carousel-play-btn');
    playBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (this.isPlaying) {
        this.stopAutoplay();
        playBtn.innerHTML = '▶';
      } else {
        this.startAutoplay();
        playBtn.innerHTML = '⏸';
      }
    });

    this.container.appendChild(topBadge);
  }

  setupDots() {
    if (!this.controller) return;
    this.controller.innerHTML = '';

    this.slides.forEach((_, idx) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = 'javascript:void(0)';
      a.className = idx === 0 ? 'active' : '';
      a.addEventListener('click', e => {
        e.preventDefault();
        this.goTo(idx);
      });
      li.appendChild(a);
      this.controller.appendChild(li);
    });
  }

  updateCarousel() {
    const offset = -this.currentIndex * 100;
    this.slides.forEach(slide => {
      slide.style.transform = `translateX(${offset}%)`;
    });

    // Update Dots
    if (this.controller) {
      const dots = this.controller.querySelectorAll('a');
      dots.forEach((dot, idx) => {
        if (idx === this.currentIndex) {
          dot.classList.add('active');
          dot.style.background = 'var(--secondary, #00f0ff)';
          dot.style.transform = 'scale(1.3)';
        } else {
          dot.classList.remove('active');
          dot.style.background = 'rgba(255, 255, 255, 0.5)';
          dot.style.transform = 'scale(1)';
        }
      });
    }

    // Update Counter
    const counter = this.container.querySelector('.carousel-counter');
    if (counter) {
      counter.textContent = `${this.currentIndex + 1} / ${this.slides.length}`;
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
    this.updateCarousel();
    this.resetAutoplayTimer();
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.updateCarousel();
    this.resetAutoplayTimer();
  }

  goTo(index) {
    this.currentIndex = index;
    this.updateCarousel();
    this.resetAutoplayTimer();
  }

  startAutoplay() {
    this.isPlaying = true;
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);
    this.autoplayInterval = setInterval(() => this.next(), this.autoplayDelay);
  }

  stopAutoplay() {
    this.isPlaying = false;
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  resetAutoplayTimer() {
    if (this.isPlaying) {
      this.startAutoplay();
    }
  }

  addDragEvents() {
    const onStart = e => {
      this.isDragging = true;
      this.startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    };

    const onEnd = e => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
      const diffX = endX - this.startX;

      if (diffX < -40) {
        this.next();
      } else if (diffX > 40) {
        this.prev();
      }
    };

    this.slidesContainer.addEventListener('mousedown', onStart);
    this.slidesContainer.addEventListener('mouseup', onEnd);

    this.slidesContainer.addEventListener('touchstart', onStart, { passive: true });
    this.slidesContainer.addEventListener('touchend', onEnd);
  }

  setupLightbox() {
    // Create Lightbox Modal DOM if not exists
    let modal = document.getElementById('carousel-lightbox-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'carousel-lightbox-modal';
      modal.className = 'lightbox-modal';
      modal.innerHTML = `
        <div class="lightbox-content">
          <button class="lightbox-close" title="Cerrar (Esc)">✕</button>
          <img class="lightbox-img" src="" alt="Vista Previa">
          <div class="lightbox-caption"></div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeBtn = modal.querySelector('.lightbox-close');
      closeBtn.addEventListener('click', () => modal.classList.remove('active'));

      modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('active');
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
          modal.classList.remove('active');
        }
      });
    }

    // Attach click to slides
    this.slides.forEach(slide => {
      slide.addEventListener('click', e => {
        const img = slide.querySelector('img');
        if (img) {
          const lightboxImg = modal.querySelector('.lightbox-img');
          const lightboxCap = modal.querySelector('.lightbox-caption');
          lightboxImg.src = img.src;
          lightboxCap.textContent = img.alt || 'Vista previa de trabajo 3D';
          modal.classList.add('active');
        }
      });
    });
  }
}

// Global initialization
window.initCarousel = function(sliderId) {
  return new ModernCarousel(sliderId);
};
