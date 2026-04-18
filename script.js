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

    wave.innerHTML = heights.map((h, i) => {
      const played = i / N < 0.34;
      return `<span style="height:${h}px; background:${played ? '#0F1B2D' : 'rgba(15,27,45,.25)'}"></span>`;
    }).join('');
  });

  // ===== Play Button Simulation =====
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('playBtn');
    const timeLabel = document.getElementById('timeLabel');
    if (!btn || !timeLabel) return;

    let playing = false;
    let t = 42;
    let iv;

    const playIcon = '<svg width="18" height="18" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2 L11 7 L3 12 Z"/></svg>';
    const pauseIcon = '<svg width="18" height="18" viewBox="0 0 14 14" fill="currentColor"><rect x="3" y="2" width="3" height="10"/><rect x="8" y="2" width="3" height="10"/></svg>';

    btn.addEventListener('click', () => {
      playing = !playing;
      btn.innerHTML = playing ? pauseIcon : playIcon;

      if (playing) {
        iv = setInterval(() => {
          t++;
          if (t >= 138) {
            t = 42;
            playing = false;
            clearInterval(iv);
            btn.innerHTML = playIcon;
          }
          const m = String(Math.floor(t / 60)).padStart(2, '0');
          const s = String(t % 60).padStart(2, '0');
          timeLabel.textContent = `${m}:${s}`;
        }, 1000);
      } else {
        clearInterval(iv);
      }
    });
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
