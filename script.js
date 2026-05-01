/* ============================================================
   VenueVox — Interactive Behaviors
   ============================================================ */

(function () {
  'use strict';

  // ===== Theme Toggle =====
  const THEME_KEY = 'venuevox-theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night';
  }

  function applyTheme(theme) {
    document.body.classList.toggle('theme-day', theme === 'day');
    localStorage.setItem(THEME_KEY, theme);

    // Toggle icon visibility
    const moonIcons = document.querySelectorAll('.icon-moon');
    const sunIcons = document.querySelectorAll('.icon-sun');
    moonIcons.forEach(el => el.style.display = theme === 'day' ? 'none' : 'block');
    sunIcons.forEach(el => el.style.display = theme === 'day' ? 'block' : 'none');
  }

  // Apply saved theme immediately
  const currentTheme = getPreferredTheme();
  applyTheme(currentTheme);

  // Bind toggle button
  document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const next = document.body.classList.contains('theme-day') ? 'night' : 'day';
        applyTheme(next);
      });
    }
  });

  // ===== Smooth Scroll for Anchor Links =====
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          e.preventDefault();
          const navHeight = document.querySelector('.nav')?.offsetHeight || 68;
          const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  });

  // ===== Demo Waveform Rendering =====
  document.addEventListener('DOMContentLoaded', () => {
    const wave = document.getElementById('wave');
    if (!wave) return;

    const N = 72;
    const heights = [];
    for (let i = 0; i < N; i++) {
      const x = i / N;
      const h = 6 + Math.round(Math.abs(Math.sin(x * 9)) * 16 + Math.abs(Math.cos(x * 3)) * 4);
      heights.push(h);
    }

    wave.innerHTML = heights.map((h) => {
      return `<span style="height:${h}px; background:rgba(15,27,45,.25)"></span>`;
    }).join('');
  });

  // ===== Demo Audio Player =====
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('playBtn');
    const audio = document.getElementById('demoAudio');
    const timeLabel = document.getElementById('timeLabel');
    const durationLabel = document.getElementById('durationLabel');
    const wave = document.getElementById('wave');
    if (!btn || !audio || !timeLabel) return;

    const fallbackDuration = 69.8;
    const playIcon = '<svg width="18" height="18" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2 L11 7 L3 12 Z"/></svg>';
    const pauseIcon = '<svg width="18" height="18" viewBox="0 0 14 14" fill="currentColor"><rect x="3" y="2" width="3" height="10"/><rect x="8" y="2" width="3" height="10"/></svg>';

    function formatTime(seconds) {
      if (!Number.isFinite(seconds)) return '00:00';
      const m = String(Math.floor(seconds / 60)).padStart(2, '0');
      const s = String(Math.floor(seconds % 60)).padStart(2, '0');
      return `${m}:${s}`;
    }

    function setWaveProgress(progress) {
      const bars = wave ? Array.from(wave.querySelectorAll('span')) : [];
      bars.forEach((bar, i) => {
        const threshold = bars.length > 1 ? i / (bars.length - 1) : 1;
        bar.style.background = threshold <= progress ? '#0F1B2D' : 'rgba(15,27,45,.25)';
      });
    }

    function updateTime() {
      const duration = Number.isFinite(audio.duration) ? audio.duration : fallbackDuration;
      const progress = duration > 0 ? audio.currentTime / duration : 0;
      timeLabel.textContent = formatTime(audio.currentTime);
      if (durationLabel) {
        durationLabel.textContent = `${formatTime(audio.currentTime)} / ${formatTime(duration)}`;
      }
      setWaveProgress(progress);
    }

    function setPlaying(isPlaying) {
      btn.innerHTML = isPlaying ? pauseIcon : playIcon;
      btn.setAttribute('aria-label', isPlaying ? 'Pause demo' : 'Play demo');
    }

    function resetErrorState() {
      btn.classList.remove('has-audio-error');
      btn.setAttribute('aria-label', 'Play demo');
    }

    audio.addEventListener('loadedmetadata', updateTime);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('play', () => setPlaying(true));
    audio.addEventListener('ended', () => {
      audio.currentTime = 0;
      setPlaying(false);
      updateTime();
    });
    audio.addEventListener('error', () => {
      btn.classList.add('has-audio-error');
      btn.setAttribute('aria-label', 'Demo audio unavailable');
      setPlaying(false);
    });

    btn.addEventListener('click', async () => {
      resetErrorState();
      if (audio.paused) {
        try {
          if (audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
            audio.load();
          }
          await audio.play();
        } catch (err) {
          btn.classList.add('has-audio-error');
          btn.setAttribute('aria-label', 'Demo audio unavailable');
          setPlaying(false);
        }
      } else {
        audio.pause();
      }
    });

    updateTime();
  });

  // ===== Intersection Observer for Fade-in Animations =====
  document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
  });

})();
