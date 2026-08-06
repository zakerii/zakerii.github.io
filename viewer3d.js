/* ============================================================
   viewer3d.js — Visor fullscreen para Imágenes, Modelos 3D y Vídeos
   Con soporte para Cargar modelos 3D (.glb, .gltf, .obj, .stl)
   y Modos de Visualización estilo Sketchfab (Texturado, Arcilla, Wireframe, Normales, Auto-Girar)
   Zakerii Portfolio
   ============================================================ */

(function () {

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const GLTF_URL  = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js';
  const OBJ_URL   = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js';
  const STL_URL   = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js';
  const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ── Recopilar ÚNICAMENTE elementos visibles (Imágenes, Vídeos y 3D) ── */
  function getAllItems() {
    const items = [];
    const cards = document.querySelectorAll('.work-card, img.ImagenTrabajo, video.ImagenTrabajo');
    const processedEls = new Set();

    cards.forEach(el => {
      if (processedEls.has(el) || el.classList.contains('work-card-upload')) return;

      // Ignorar ocultos por filtros
      if (el.style.display === 'none' || getComputedStyle(el).display === 'none') {
        return;
      }

      const glbTarget = el.matches('[data-glb], [data-3d]') ? el : el.querySelector('[data-glb], [data-3d]');
      const glb = glbTarget?.dataset?.glb || glbTarget?.dataset?.['3d'] || el.dataset?.glb || el.dataset?.['3d'];

      const videoEl = el.tagName === 'VIDEO' ? el : el.querySelector('video');
      const imgEl = el.tagName === 'IMG' ? el : el.querySelector('img');
      const titleEl = el.querySelector('.work-card-title');
      const alt = glbTarget?.dataset?.nombre || el.dataset?.nombre || imgEl?.alt || titleEl?.textContent || 'Trabajo Zakerii';

      processedEls.add(el);
      if (imgEl) processedEls.add(imgEl);
      if (videoEl) processedEls.add(videoEl);
      if (glbTarget) processedEls.add(glbTarget);

      if (glb) {
        items.push({ type: 'glb', src: glb, alt, el });
      } else if (videoEl) {
        items.push({ type: 'video', src: videoEl.src || videoEl.getAttribute('src'), alt, el: videoEl });
      } else if (imgEl && (imgEl.classList.contains('ImagenTrabajo') || imgEl.classList.contains('work-card-img'))) {
        items.push({ type: 'image', src: imgEl.src || imgEl.getAttribute('src'), alt, el: imgEl });
      }
    });

    return items;
  }

  /* ── Estilos del Visor Fullscreen ── */
  function injectStyles() {
    if (document.getElementById('visor3d-styles')) return;
    const style = document.createElement('style');
    style.id = 'visor3d-styles';
    style.textContent = `
      #visor3d-overlay {
        display: none; position: fixed; inset: 0; z-index: 99999;
        flex-direction: column; align-items: center; justify-content: center;
      }
      #visor3d-overlay.active { display: flex; animation: v3d-in .2s ease; }
      @keyframes v3d-in { from { opacity: 0; } to { opacity: 1; } }

      #visor3d-bg {
        position: absolute; inset: 0;
        background: rgba(8, 10, 16, 0.95);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      }
      #visor3d-header {
        position: absolute; top: 0; left: 0; right: 0;
        padding: 16px 24px; display: flex; align-items: center; gap: 12px;
        background: linear-gradient(to bottom, rgba(0,0,0,.8), transparent); z-index: 2;
      }
      #visor3d-title {
        color: #fff; font-size: 15px; font-weight: 700;
        letter-spacing: .05em; text-transform: uppercase; flex: 1;
        font-family: system-ui, -apple-system, sans-serif;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      #visor3d-badge {
        font-size: 11px; font-weight: 700; letter-spacing: .08em;
        padding: 4px 10px; border-radius: 20px;
        background: rgba(0, 240, 255, 0.15); color: #00f0ff;
        border: 1px solid rgba(0, 240, 255, 0.4);
        text-transform: uppercase; font-family: sans-serif; flex-shrink: 0;
      }
      #visor3d-counter { color: rgba(255,255,255,.5); font-size: 13px; font-family: sans-serif; flex-shrink: 0; }
      
      .v3d-upload-btn {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 12px; font-weight: 700; letter-spacing: .05em;
        padding: 6px 14px; border-radius: 20px;
        background: linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 150, 255, 0.2));
        color: #00f0ff; border: 1px solid rgba(0, 240, 255, 0.5);
        cursor: pointer; transition: all .2s ease; text-transform: uppercase;
        font-family: sans-serif; user-select: none; flex-shrink: 0;
      }
      .v3d-upload-btn:hover {
        background: #00f0ff; color: #000; box-shadow: 0 0 15px rgba(0, 240, 255, 0.5);
        transform: translateY(-1px);
      }

      #visor3d-close {
        width: 40px; height: 40px; border-radius: 50%;
        background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.2);
        color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all .2s ease; flex-shrink: 0;
      }
      #visor3d-close:hover { background: rgba(255,0,80,.8); border-color: transparent; transform: scale(1.05); }

      #visor3d-stage {
        position: relative; z-index: 1; display: flex;
        align-items: center; justify-content: center;
        width: 100%; max-width: 96vw; padding: 0 10px; box-sizing: border-box;
      }
      #visor3d-prev, #visor3d-next {
        width: 48px; height: 48px; flex-shrink: 0; border-radius: 50%;
        background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.25);
        color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all .2s ease; margin: 0 12px; z-index: 2;
      }
      #visor3d-prev:hover, #visor3d-next:hover { background: var(--primary, #00f0ff); color: #000; border-color: var(--primary, #00f0ff); }
      #visor3d-prev:disabled, #visor3d-next:disabled { opacity: .15; pointer-events: none; }

      #visor3d-content {
        flex: 1; display: flex; align-items: center; justify-content: center;
        max-width: calc(96vw - 130px); height: 80vh; position: relative;
      }
      #visor3d-img, #visor3d-video {
        max-width: 100%; max-height: 80vh; object-fit: contain;
        border-radius: 8px; display: none; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        transition: opacity .18s ease; user-select: none;
      }
      #visor3d-img.visible, #visor3d-video.visible { display: block; }
      #visor3d-img.fade { opacity: 0; }

      #visor3d-canvas {
        display: none; border-radius: 8px;
        width: 100% !important; height: 100% !important;
        cursor: grab; touch-action: none;
      }
      #visor3d-canvas.visible { display: block; }
      #visor3d-canvas:active { cursor: grabbing; }

      #visor3d-loading {
        display: none; flex-direction: column; align-items: center;
        gap: 14px; color: rgba(255,255,255,.7); font-size: 14px; font-family: sans-serif;
      }
      #visor3d-loading.visible { display: flex; }
      .v3d-spinner {
        width: 40px; height: 40px;
        border: 3px solid rgba(255,255,255,.15); border-top-color: #00f0ff;
        border-radius: 50%; animation: v3d-spin .8s linear infinite;
      }
      @keyframes v3d-spin { to { transform: rotate(360deg); } }

      .v3d-hint {
        position: absolute; bottom: 16px; z-index: 1; margin: 0;
        color: rgba(255,255,255,.4); font-size: 12px; letter-spacing: .03em;
        pointer-events: none; font-family: sans-serif;
      }

      /* ── Toolbar Modo Sketchfab ── */
      .v3d-toolbar {
        position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
        display: none; align-items: center; gap: 4px; padding: 6px 12px;
        background: rgba(13, 15, 23, 0.88); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 240, 255, 0.35); border-radius: 30px;
        z-index: 20; box-shadow: 0 8px 32px rgba(0,0,0,0.6); user-select: none;
        max-width: 92vw; overflow-x: auto; scrollbar-width: none;
      }
      .v3d-toolbar::-webkit-scrollbar { display: none; }
      .v3d-toolbar.visible { display: flex; animation: v3d-fadeup 0.25s ease; }
      @keyframes v3d-fadeup { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }

      .v3d-mode-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 12px; border-radius: 18px; border: 1px solid transparent;
        background: transparent; color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 600;
        cursor: pointer; transition: all 0.2s ease; font-family: sans-serif; white-space: nowrap;
      }
      .v3d-mode-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
      .v3d-mode-btn.active {
        background: rgba(0, 240, 255, 0.2); color: #00f0ff;
        border-color: rgba(0, 240, 255, 0.5); box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
      }
      .v3d-toolbar-divider {
        width: 1px; height: 18px; background: rgba(255,255,255,0.15); margin: 0 4px; flex-shrink: 0;
      }

      .v3d-drag-overlay {
        position: absolute; inset: 0; z-index: 10;
        background: rgba(0, 240, 255, 0.2); border: 3px dashed #00f0ff;
        border-radius: 12px; display: none; align-items: center; justify-content: center;
        color: #00f0ff; font-size: 18px; font-weight: bold; font-family: sans-serif;
        pointer-events: none; backdrop-filter: blur(4px); text-transform: uppercase;
      }
      #visor3d-overlay.drag-active .v3d-drag-overlay { display: flex; }

      .work-card-upload:hover {
        border-color: #00f0ff !important;
        box-shadow: 0 0 25px rgba(0, 240, 255, 0.25) !important;
        transform: translateY(-4px);
      }
      .work-card-upload:hover .upload-icon-wrapper {
        transform: scale(1.1);
        background: rgba(0, 240, 255, 0.25) !important;
      }

      @media (max-width: 650px) {
        .v3d-mode-btn span { display: none; }
        .v3d-mode-btn { padding: 8px 10px; }
      }

      img.ImagenTrabajo, .work-card-img { cursor: zoom-in; }
      [data-glb], [data-3d], .work-card[data-glb], .work-card[data-3d] { cursor: pointer; }
    `;
    document.head.appendChild(style);
  }

  /* ── Overlay HTML ── */
  function buildOverlay() {
    const ov = document.createElement('div');
    ov.id = 'visor3d-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `
      <div id="visor3d-bg"></div>
      <div id="visor3d-header">
        <span id="visor3d-title"></span>
        <span id="visor3d-badge"></span>
        <span id="visor3d-counter"></span>
        <label id="visor3d-upload-btn" class="v3d-upload-btn" title="Cargar tu propio archivo 3D (.glb, .gltf, .obj, .stl)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Cargar 3D</span>
          <input type="file" id="visor3d-modal-file-input" accept=".glb,.gltf,.obj,.stl" hidden>
        </label>
        <button id="visor3d-close" title="Cerrar (Esc)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      <div id="visor3d-stage">
        <button id="visor3d-prev" title="Anterior (←)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div id="visor3d-content">
          <img id="visor3d-img" alt="" draggable="false">
          <video id="visor3d-video" controls autoplay loop playsinline></video>
          <canvas id="visor3d-canvas"></canvas>
          <div id="visor3d-loading"><div class="v3d-spinner"></div><span>Cargando modelo 3D...</span></div>
          <div class="v3d-drag-overlay">Arrastra y suelta tu archivo 3D aquí (.glb, .gltf, .obj, .stl)</div>
          
          <!-- Toolbar Estilo Sketchfab -->
          <div id="visor3d-toolbar-3d" class="v3d-toolbar">
            <button class="v3d-mode-btn active" data-mode="textured" title="Modo Texturizado (Original)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              <span>Textura</span>
            </button>
            <button class="v3d-mode-btn" data-mode="clay" title="Modo Arcilla / Sin Textura">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z"/></svg>
              <span>Arcilla</span>
            </button>
            <button class="v3d-mode-btn" data-mode="wireframe" title="Modo Malla (Wireframe)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
              <span>Wireframe</span>
            </button>
            <button class="v3d-mode-btn" data-mode="overlay" title="Textura + Malla Overlay">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 12l10 5 10-5"/><line x1="7" y1="7" x2="17" y2="17" stroke-dasharray="2 2"/></svg>
              <span>Textura+Malla</span>
            </button>
            <button class="v3d-mode-btn" data-mode="normals" title="Mapa de Normales">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><line x1="12" y1="12" x2="18" y2="12"/><line x1="12" y1="12" x2="12" y2="6"/></svg>
              <span>Normales</span>
            </button>
            <div class="v3d-toolbar-divider"></div>
            <button class="v3d-mode-btn" id="v3d-btn-rotate" title="Girar Automáticamente (Turntable)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Girar</span>
            </button>
          </div>
        </div>
        <button id="visor3d-next" title="Siguiente (→)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
      <p class="v3d-hint" id="visor3d-hint-img">Flechas del teclado para navegar · Esc para cerrar</p>
      <p class="v3d-hint" id="visor3d-hint-3d">Click y arrastra para rotar en 3D · Rueda para Zoom · Esc para cerrar</p>
    `;
    document.body.appendChild(ov);
    return ov;
  }

  /* ── Three.js Context ── */
  let ctx3d = null, animId = null;
  let currentRenderMode = 'textured';
  let isAutoRotating = false;

  function initThree(canvas) {
    if (ctx3d) return ctx3d;
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
    camera.position.set(0, 0, 3);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dl1 = new THREE.DirectionalLight(0xffffff, 1.2); dl1.position.set(3, 5, 4); scene.add(dl1);
    const dl2 = new THREE.DirectionalLight(0x00f0ff, 0.5); dl2.position.set(-3, -2, -3); scene.add(dl2);

    const controls = new THREE.OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.3;
    controls.maxDistance = 20;

    ctx3d = { renderer, scene, camera, controls, model: null };
    return ctx3d;
  }

  function resizeThree(canvas) {
    if (!ctx3d) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx3d.renderer.setSize(w, h, false);
    ctx3d.camera.aspect = w / h;
    ctx3d.camera.updateProjectionMatrix();
  }

  function startLoop(canvas) {
    cancelAnimationFrame(animId);
    function tick() {
      animId = requestAnimationFrame(tick);
      if (ctx3d) {
        ctx3d.controls.update();
        resizeThree(canvas);
        ctx3d.renderer.render(ctx3d.scene, ctx3d.camera);
      }
    }
    tick();
  }

  function stopLoop() {
    cancelAnimationFrame(animId);
    animId = null;
  }

  function clearModel() {
    if (!ctx3d || !ctx3d.model) return;
    ctx3d.scene.remove(ctx3d.model);
    ctx3d.model.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach(m => m.dispose());
    });
    ctx3d.model = null;
  }

  /* ── Aplicar Modos de Renderizado (Estilo Sketchfab) ── */
  function setRenderMode(mode) {
    currentRenderMode = mode;
    if (!ctx3d || !ctx3d.model) return;
    const THREE = window.THREE;
    if (!THREE) return;

    ctx3d.model.traverse(child => {
      if (child.isMesh) {
        const wireOverlay = child.getObjectByName('__wireframeOverlay__');
        if (wireOverlay) wireOverlay.visible = (mode === 'overlay');

        if (mode === 'textured') {
          child.material = child.userData.originalMaterial;
        } else if (mode === 'clay') {
          if (!child.userData.clayMaterial) {
            child.userData.clayMaterial = new THREE.MeshStandardMaterial({
              color: 0x9095a5,
              roughness: 0.65,
              metalness: 0.15
            });
          }
          child.material = child.userData.clayMaterial;
        } else if (mode === 'wireframe') {
          if (!child.userData.wireMaterial) {
            child.userData.wireMaterial = new THREE.MeshBasicMaterial({
              color: 0x00f0ff,
              wireframe: true
            });
          }
          child.material = child.userData.wireMaterial;
        } else if (mode === 'overlay') {
          child.material = child.userData.originalMaterial;
        } else if (mode === 'normals') {
          if (!child.userData.normalMaterial) {
            child.userData.normalMaterial = new THREE.MeshNormalMaterial();
          }
          child.material = child.userData.normalMaterial;
        }
      }
    });

    // Actualizar botones activos del toolbar
    document.querySelectorAll('.v3d-mode-btn[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
  }

  function toggleAutoRotate() {
    isAutoRotating = !isAutoRotating;
    if (ctx3d && ctx3d.controls) {
      ctx3d.controls.autoRotate = isAutoRotating;
      ctx3d.controls.autoRotateSpeed = 2.5;
    }
    const btn = document.getElementById('v3d-btn-rotate');
    if (btn) {
      btn.classList.toggle('active', isAutoRotating);
    }
  }

  function prepareMeshMaterials(object3d) {
    const THREE = window.THREE;
    object3d.traverse(child => {
      if (child.isMesh) {
        child.userData.originalMaterial = child.material;

        // Crear geometría wireframe para overlay
        if (child.geometry && !child.getObjectByName('__wireframeOverlay__')) {
          try {
            const wireGeo = new THREE.WireframeGeometry(child.geometry);
            const wireMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.35 });
            const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
            wireMesh.name = '__wireframeOverlay__';
            wireMesh.visible = false;
            child.add(wireMesh);
          } catch (e) {
            console.warn('Could not build wireframe overlay:', e);
          }
        }
      }
    });
  }

  function load3DModel(url, canvas, spinner, fileName) {
    return new Promise((resolve, reject) => {
      const THREE = window.THREE;
      spinner.classList.add('visible');
      
      const fileExt = (fileName || url).split('.').pop().split('?')[0].toLowerCase();

      const tryLoad = (targetUrl, fallbackUrl) => {
        const onLoaded = (object3d) => {
          spinner.classList.remove('visible');
          clearModel();
          prepareMeshMaterials(object3d);

          const box = new THREE.Box3().setFromObject(object3d);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z || 1);
          const sc = 2.2 / maxDim;
          object3d.scale.setScalar(sc);
          object3d.position.sub(center.multiplyScalar(sc));

          ctx3d.scene.add(object3d);
          ctx3d.model = object3d;
          ctx3d.camera.position.set(0, 0, 3.5);
          ctx3d.controls.reset();

          // Aplicar modo actual de renderizado y rotación
          setRenderMode(currentRenderMode);
          if (ctx3d.controls) {
            ctx3d.controls.autoRotate = isAutoRotating;
            ctx3d.controls.autoRotateSpeed = 2.5;
          }

          resolve();
        };

        const onError = (err) => {
          if (fallbackUrl) {
            console.warn(`Fallback de ruta 3D a "${fallbackUrl}"`);
            tryLoad(fallbackUrl, null);
          } else {
            spinner.classList.remove('visible');
            console.error('Error al cargar modelo 3D:', err);
            reject(err);
          }
        };

        if (fileExt === 'obj') {
          new THREE.OBJLoader().load(targetUrl, (obj) => {
            obj.traverse(child => {
              if (child.isMesh && (!child.material || child.material.type === 'MeshBasicMaterial')) {
                child.material = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.5, roughness: 0.3 });
              }
            });
            onLoaded(obj);
          }, undefined, onError);
        } else if (fileExt === 'stl') {
          new THREE.STLLoader().load(targetUrl, (geometry) => {
            const mat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.4, roughness: 0.3 });
            const mesh = new THREE.Mesh(geometry, mat);
            onLoaded(mesh);
          }, undefined, onError);
        } else {
          new THREE.GLTFLoader().load(targetUrl, (gltf) => {
            onLoaded(gltf.scene);
          }, undefined, onError);
        }
      };

      let altPath = null;
      if (url.includes('Vinos.glb')) altPath = url.replace('Vinos.glb', 'vino.glb');
      else if (url.includes('vino.glb')) altPath = url.replace('vino.glb', 'Vinos.glb');

      tryLoad(url, altPath);
    });
  }

  /* ── Lógica Principal ── */
  function init() {
    injectStyles();

    let items = [], currentIdx = 0;
    let ov, imgEl, videoModalEl, canvasEl, spinner, prevBtn, nextBtn, counterEl, titleEl, badgeEl, hintImg, hint3d, toolbar3d;
    let built = false, threeReady = false;
    let activeObjectUrl = null;

    function ensureOverlay() {
      if (built) return; built = true;
      ov           = buildOverlay();
      imgEl        = document.getElementById('visor3d-img');
      videoModalEl = document.getElementById('visor3d-video');
      canvasEl     = document.getElementById('visor3d-canvas');
      spinner      = document.getElementById('visor3d-loading');
      prevBtn      = document.getElementById('visor3d-prev');
      nextBtn      = document.getElementById('visor3d-next');
      counterEl    = document.getElementById('visor3d-counter');
      titleEl      = document.getElementById('visor3d-title');
      badgeEl      = document.getElementById('visor3d-badge');
      hintImg      = document.getElementById('visor3d-hint-img');
      hint3d       = document.getElementById('visor3d-hint-3d');
      toolbar3d    = document.getElementById('visor3d-toolbar-3d');

      document.getElementById('visor3d-bg').addEventListener('click', close);
      document.getElementById('visor3d-close').addEventListener('click', close);
      prevBtn.addEventListener('click', () => navigate(-1));
      nextBtn.addEventListener('click', () => navigate(1));

      // Eventos Toolbar Estilo Sketchfab
      if (toolbar3d) {
        toolbar3d.querySelectorAll('.v3d-mode-btn[data-mode]').forEach(btn => {
          btn.addEventListener('click', () => setRenderMode(btn.dataset.mode));
        });
        const rotateBtn = document.getElementById('v3d-btn-rotate');
        if (rotateBtn) {
          rotateBtn.addEventListener('click', toggleAutoRotate);
        }
      }

      // Input de archivo en el modal de visor
      const modalFileInput = document.getElementById('visor3d-modal-file-input');
      if (modalFileInput) {
        modalFileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            openCustomFile(e.target.files[0]);
            e.target.value = '';
          }
        });
      }

      // Soporte Drag & Drop en el overlay
      window.addEventListener('dragover', (e) => {
        if (!ov.classList.contains('active')) return;
        e.preventDefault();
        ov.classList.add('drag-active');
      });
      window.addEventListener('dragleave', (e) => {
        if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
          ov.classList.remove('drag-active');
        }
      });
      window.addEventListener('drop', (e) => {
        if (!ov.classList.contains('active')) return;
        e.preventDefault();
        ov.classList.remove('drag-active');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          openCustomFile(e.dataTransfer.files[0]);
        }
      });
    }

    async function openCustomFile(file) {
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['glb', 'gltf', 'obj', 'stl'].includes(ext)) {
        alert('Por favor selecciona un archivo 3D válido (.glb, .gltf, .obj, .stl)');
        return;
      }

      if (activeObjectUrl) {
        URL.revokeObjectURL(activeObjectUrl);
      }
      activeObjectUrl = URL.createObjectURL(file);

      const customItem = {
        type: 'glb',
        src: activeObjectUrl,
        alt: file.name,
        fileName: file.name,
        isCustom: true
      };

      ensureOverlay();
      const currentItems = getAllItems();
      items = [customItem, ...currentItems];
      currentIdx = 0;

      await render();
      ov.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    // Exponer globalmente para que las tarjetas puedan invocarlo
    window.load3DUserFile = openCustomFile;

    async function open(idx) {
      items = getAllItems();
      if (!items.length) return;
      ensureOverlay();
      currentIdx = Math.max(0, Math.min(idx, items.length - 1));
      await render();
      ov.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      if (!ov) return;
      ov.classList.remove('active');
      document.body.style.overflow = '';
      if (videoModalEl) { videoModalEl.pause(); videoModalEl.src = ''; }
      stopLoop(); clearModel();
    }

    async function navigate(dir) {
      const next = currentIdx + dir;
      if (next < 0 || next >= items.length) return;
      if (items[currentIdx] && items[currentIdx].type === 'image') {
        imgEl.classList.add('fade');
        await new Promise(r => setTimeout(r, 160));
      }
      if (videoModalEl) { videoModalEl.pause(); videoModalEl.src = ''; }
      stopLoop();
      currentIdx = next;
      await render();
    }

    async function render() {
      const item = items[currentIdx];
      if (!item) return;

      titleEl.textContent = item.alt;
      counterEl.textContent = `${currentIdx + 1} / ${items.length}`;
      prevBtn.disabled = currentIdx === 0;
      nextBtn.disabled = currentIdx === items.length - 1;

      if (item.type === 'image') {
        badgeEl.textContent = 'IMAGEN';
        canvasEl.classList.remove('visible');
        if (videoModalEl) videoModalEl.classList.remove('visible');
        if (toolbar3d) toolbar3d.classList.remove('visible');
        spinner.classList.remove('visible');
        imgEl.classList.add('visible');
        hint3d.style.display = 'none';
        hintImg.style.display = 'block';
        imgEl.classList.add('fade');
        imgEl.src = item.src;
        imgEl.onload = () => imgEl.classList.remove('fade');
        if (imgEl.complete) imgEl.classList.remove('fade');

      } else if (item.type === 'video') {
        badgeEl.textContent = 'VÍDEO';
        canvasEl.classList.remove('visible');
        imgEl.classList.remove('visible');
        if (toolbar3d) toolbar3d.classList.remove('visible');
        spinner.classList.remove('visible');
        videoModalEl.classList.add('visible');
        videoModalEl.src = item.src;
        videoModalEl.play().catch(() => {});
        hint3d.style.display = 'none';
        hintImg.style.display = 'block';

      } else {
        badgeEl.textContent = item.isCustom ? 'MODELO PROPIO' : 'INTERACTIVO 3D';
        imgEl.classList.remove('visible');
        imgEl.classList.remove('fade');
        if (videoModalEl) videoModalEl.classList.remove('visible');
        canvasEl.classList.add('visible');
        if (toolbar3d) toolbar3d.classList.add('visible');
        hintImg.style.display = 'none';
        hint3d.style.display = 'block';

        if (!threeReady) {
          spinner.classList.add('visible');
          try {
            await loadScript(THREE_URL);
            await loadScript(GLTF_URL);
            await loadScript(OBJ_URL);
            await loadScript(STL_URL);
            await loadScript(ORBIT_URL);
            threeReady = true;
          } catch (e) {
            spinner.classList.remove('visible');
            console.error('Error cargando Three.js:', e);
            return;
          }
        }
        initThree(canvasEl);
        await load3DModel(item.src, canvasEl, spinner, item.fileName);
        startLoop(canvasEl);
      }
    }

    document.addEventListener('keydown', e => {
      if (!ov || !ov.classList.contains('active')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
    });

    function bindAll() {
      // Input de tarjeta de upload en la página
      const cardFileInput = document.getElementById('main3dFileInput');
      const uploadCard = document.getElementById('upload3DCard');

      if (cardFileInput && !cardFileInput.dataset.v3dBound) {
        cardFileInput.dataset.v3dBound = '1';
        cardFileInput.addEventListener('change', (e) => {
          if (e.target.files && e.target.files[0]) {
            openCustomFile(e.target.files[0]);
            e.target.value = '';
          }
        });
      }

      if (uploadCard && !uploadCard.dataset.v3dBound) {
        uploadCard.dataset.v3dBound = '1';

        uploadCard.addEventListener('dragover', (e) => {
          e.preventDefault();
          uploadCard.style.borderColor = '#00f0ff';
          uploadCard.style.background = 'rgba(0, 240, 255, 0.12)';
        });

        uploadCard.addEventListener('dragleave', (e) => {
          e.preventDefault();
          uploadCard.style.borderColor = 'var(--primary, #00f0ff)';
          uploadCard.style.background = 'rgba(0, 240, 255, 0.04)';
        });

        uploadCard.addEventListener('drop', (e) => {
          e.preventDefault();
          uploadCard.style.borderColor = 'var(--primary, #00f0ff)';
          uploadCard.style.background = 'rgba(0, 240, 255, 0.04)';
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
            openCustomFile(e.dataTransfer.files[0]);
          }
        });
      }

      const elements = document.querySelectorAll('img.ImagenTrabajo, .work-card-img, video.ImagenTrabajo, [data-glb], [data-3d], .work-card[data-glb], .work-card[data-3d]');
      elements.forEach((el) => {
        if (el.dataset.v3dBound || el.closest('.work-card-upload')) return;
        el.dataset.v3dBound = '1';
        el.addEventListener('click', (e) => {
          if (e.target.tagName === 'VIDEO' && e.offsetY > e.target.clientHeight - 40) return;
          e.preventDefault();
          const visibleItems = getAllItems();
          if (!visibleItems.length) return;

          const targetIndex = visibleItems.findIndex(item => item.el === el || item.el.contains(el) || el.contains(item.el));
          if (targetIndex !== -1) {
            open(targetIndex);
          } else {
            open(0);
          }
        });
      });
    }

    bindAll();
    window.addEventListener('load', bindAll);
    const obs = new MutationObserver(bindAll);
    obs.observe(document.body, { childList: true, subtree: true });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();
