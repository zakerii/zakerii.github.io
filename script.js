/* ── estrellas generativas ── */
(function generateStars() {
  const container = document.getElementById('stars');
  for (let i = 0; i < 90; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2.5 + 0.5;
    s.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      --d: ${(Math.random() * 4 + 2).toFixed(1)}s;
      animation-delay: ${(Math.random() * 5).toFixed(2)}s;
      opacity: ${Math.random() * 0.5 + 0.1};
    `;
    container.appendChild(s);
  }
})();

/* ── reproductor de audio ── */
const audio       = document.getElementById('audio');
const playBtn     = document.getElementById('play-btn');
const prevBtn     = document.getElementById('prev-btn');
const nextBtn     = document.getElementById('next-btn');
const progressBar = document.querySelector('.progress-bar');
const fill        = document.getElementById('progress-fill');
const timeLabel   = document.getElementById('track-time');
const titleLabel  = document.getElementById('track-title');
const disc        = document.getElementById('disc');
const coverImg    = document.getElementById('cover-img');

/* ── CONFIGURA TUS CANCIONES AQUÍ ── */
const playlist = [
  { title: 'xd',       src: 'music.mp3',   cover: 'cover.png'  },
  // { title: 'otra',  src: 'otra.mp3',    cover: 'cover2.png' },
];

let current = 0;
let playing = false;

function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }
function fmt(s) { return `${Math.floor(s / 60)}:${pad(s % 60)}`; }

function loadTrack(idx) {
  const t = playlist[idx];
  audio.src = t.src;
  titleLabel.textContent = t.title;
  coverImg.src = t.cover;
  fill.style.width = '0%';
  timeLabel.textContent = '0:00 / 0:00';
  if (playing) audio.play();
}

function togglePlay() {
  if (audio.paused) {
    audio.play().catch(() => {});
    playBtn.innerHTML = '&#9646;&#9646;';
    disc.classList.add('spinning');
    playing = true;
  } else {
    audio.pause();
    playBtn.innerHTML = '&#9654;';
    disc.classList.remove('spinning');
    playing = false;
  }
}

playBtn.addEventListener('click', togglePlay);

prevBtn.addEventListener('click', () => {
  current = (current - 1 + playlist.length) % playlist.length;
  loadTrack(current);
});

nextBtn.addEventListener('click', () => {
  current = (current + 1) % playlist.length;
  loadTrack(current);
});

audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  fill.style.width = pct + '%';
  timeLabel.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
});

audio.addEventListener('ended', () => {
  current = (current + 1) % playlist.length;
  loadTrack(current);
  audio.play().catch(() => {});
});

progressBar.addEventListener('click', (e) => {
  const rect = progressBar.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  audio.currentTime = ratio * audio.duration;
});

/* inicializar */
loadTrack(current);

