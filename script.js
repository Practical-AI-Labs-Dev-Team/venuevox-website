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

  // ===== Vapi Live Call (in-browser voice demo) =====
  // Lazily loads the Vapi Web SDK on first click, runs a small state machine,
  // and always preserves the phone CTA as a fallback for any failure mode.
  document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('liveCallBtn');
    const panel    = document.getElementById('liveCallPanel');
    if (!startBtn || !panel) return;

    // Vapi public key — safe to expose per Vapi docs, but must be set.
    // The Vercel build (build.sh) substitutes VAPI_PUBLIC_KEY_PLACEHOLDER below
    // with the env var at deploy time. PLACEHOLDER_TOKEN is built by string
    // concatenation so the same sed pass doesn't rewrite the comparison value.
    const PLACEHOLDER_TOKEN = 'VAPI_PUBLIC_KEY' + '_PLACEHOLDER';
    const VAPI_PUBLIC_KEY = (window.VAPI_PUBLIC_KEY || 'VAPI_PUBLIC_KEY_PLACEHOLDER').trim();
    const ASSISTANT_ID    = startBtn.dataset.vapiAssistantId;
    const SDK_URL         = 'https://esm.sh/@vapi-ai/web@2.3.8';
    const PHONE_FALLBACK  =
      'or call <a href="tel:+19292362392">(929)&nbsp;236‑2392</a>.';

    const titleEl    = document.getElementById('liveCallTitle');
    const subEl      = document.getElementById('liveCallSub');
    const meterEl    = document.getElementById('liveCallMeter');
    const meterBars  = meterEl ? Array.from(meterEl.querySelectorAll('span')) : [];
    const endBtn     = document.getElementById('endCallBtn');
    const retryBtn   = document.getElementById('liveCallRetryBtn');
    const dismissBtn = document.getElementById('liveCallDismissBtn');
    const labelEl    = startBtn.querySelector('.btn-label');

    // ----- State -----
    // idle | requesting | connecting | active | ending | error-mic
    // | error-unsupported | error-insecure | error-sdk | error-network
    let state = 'idle';
    let vapi = null;
    let sdkLoadPromise = null;
    let busy = false;
    let meterRaf = 0;
    let meterTarget = 0;
    let cleanupBound = false;
    let connectTimeoutId = 0;
    let endTimeoutId = 0;
    let endedFadeId = 0;

    function setState(next, opts = {}) {
      state = next;
      panel.dataset.state =
        next.startsWith('error') ? 'error' :
        next === 'active'        ? 'active' :
        next === 'connecting' || next === 'requesting' ? 'connecting' : 'idle';

      const isErrorState = next.startsWith('error');
      const isLive       = next === 'active';
      const isWorking    = next === 'connecting' || next === 'requesting' || next === 'ending';

      panel.hidden = (next === 'idle' && !opts.keepVisible);
      titleEl.textContent = opts.title || '';
      subEl.innerHTML     = opts.sub   || '';

      endBtn.hidden     = !(isLive || next === 'ending');
      endBtn.disabled   = next === 'ending';
      retryBtn.hidden   = !(isErrorState && opts.allowRetry !== false);
      dismissBtn.hidden = !isErrorState;

      if (isLive) {
        startBtn.disabled = true;
        if (labelEl) labelEl.textContent = 'Live now';
      } else if (isWorking) {
        startBtn.disabled = true;
        if (labelEl) labelEl.textContent =
          next === 'requesting' ? 'Requesting mic…' :
          next === 'ending'     ? 'Ending…'        : 'Connecting…';
      } else {
        startBtn.disabled = false;
        if (labelEl) labelEl.textContent = 'Talk to VenueVox now';
      }
    }

    // ----- Volume meter -----
    function animateMeter() {
      meterBars.forEach((bar, i) => {
        const jitter = (Math.sin(performance.now() / 110 + i * 1.7) + 1) / 2;
        const h = 4 + meterTarget * (10 + i * 2) * (0.6 + jitter * 0.5);
        bar.style.height  = `${Math.min(22, h)}px`;
        bar.style.opacity = meterTarget > 0.02 ? 1 : 0.55;
      });
      if (state === 'active') {
        meterRaf = requestAnimationFrame(animateMeter);
      } else {
        meterTarget = 0;
        meterBars.forEach(b => { b.style.height = '4px'; b.style.opacity = 0.55; });
      }
    }
    function startMeter() {
      cancelAnimationFrame(meterRaf);
      meterRaf = requestAnimationFrame(animateMeter);
    }

    // ----- Environment checks (run before any mic prompt) -----
    function envBlocker() {
      if (!VAPI_PUBLIC_KEY || VAPI_PUBLIC_KEY === PLACEHOLDER_TOKEN) {
        return {
          state: 'error-sdk',
          title: 'Live demo not configured',
          sub: 'The browser demo isn\'t set up yet — ' + PHONE_FALLBACK,
          allowRetry: false,
        };
      }
      const insecure =
        location.protocol !== 'https:' &&
        location.hostname !== 'localhost' &&
        location.hostname !== '127.0.0.1';
      if (insecure) {
        return {
          state: 'error-insecure',
          title: 'Secure connection required',
          sub: 'Browsers only allow microphone access over HTTPS. ' + PHONE_FALLBACK,
          allowRetry: false,
        };
      }
      const noMedia = !(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      if (noMedia) {
        return {
          state: 'error-unsupported',
          title: 'Browser not supported',
          sub: 'Your browser can\'t open a live call here — ' + PHONE_FALLBACK,
          allowRetry: false,
        };
      }
      return null;
    }

    async function micPermissionState() {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const status = await navigator.permissions.query({ name: 'microphone' });
          return status.state; // 'granted' | 'denied' | 'prompt'
        }
      } catch (_) { /* not all browsers expose 'microphone' here */ }
      return 'prompt';
    }

    function loadSdk() {
      if (sdkLoadPromise) return sdkLoadPromise;
      sdkLoadPromise = import(/* @vite-ignore */ SDK_URL)
        .then(mod => mod.default || mod.Vapi || mod)
        .catch(err => { sdkLoadPromise = null; throw err; });
      return sdkLoadPromise;
    }

    function disposeVapi() {
      clearTimeout(connectTimeoutId);
      clearTimeout(endTimeoutId);
      clearTimeout(endedFadeId);
      if (!vapi) return;
      try { vapi.removeAllListeners && vapi.removeAllListeners(); } catch (_) {}
      try { vapi.stop && vapi.stop(); } catch (_) {}
      vapi = null;
    }
    function bindPageCleanup() {
      if (cleanupBound) return;
      cleanupBound = true;
      window.addEventListener('beforeunload', disposeVapi);
      window.addEventListener('pagehide', disposeVapi);
    }

    function showError(stateName, title, subExtra, allowRetry = true) {
      disposeVapi();
      busy = false;
      const sub = (subExtra ? subExtra + ' ' : '') + PHONE_FALLBACK;
      setState(stateName, { title, sub, allowRetry, keepVisible: true });
    }

    async function startCall() {
      if (busy) return;
      busy = true;

      const blocker = envBlocker();
      if (blocker) {
        setState(blocker.state, {
          title: blocker.title, sub: blocker.sub,
          allowRetry: blocker.allowRetry, keepVisible: true,
        });
        busy = false;
        return;
      }

      const perm = await micPermissionState();
      if (perm === 'denied') {
        showError(
          'error-mic',
          'Microphone access blocked',
          'Re-enable the mic for this site in your browser\'s site settings,',
          true
        );
        return;
      }

      setState('requesting', {
        title: 'Requesting microphone…',
        sub: 'Allow access in your browser to start the call.',
        keepVisible: true,
      });

      let Vapi;
      try {
        Vapi = await loadSdk();
      } catch (_) {
        showError('error-sdk', 'Couldn\'t load the live demo',
          'There was a network issue —', true);
        return;
      }

      try {
        disposeVapi();
        vapi = new Vapi(VAPI_PUBLIC_KEY);
        bindPageCleanup();

        vapi.on('call-start', () => {
          clearTimeout(connectTimeoutId);
          setState('active', {
            title: 'Live with VenueVox',
            sub: 'Speak naturally — VenueVox will respond.',
            keepVisible: true,
          });
          startMeter();
        });
        vapi.on('volume-level', (vol) => {
          const v = typeof vol === 'number' ? vol : 0;
          meterTarget = meterTarget * 0.6 + v * 0.4;
        });
        vapi.on('call-end', () => {
          clearTimeout(connectTimeoutId);
          clearTimeout(endTimeoutId);
          if (state === 'idle') return;
          disposeVapi();
          busy = false;
          setState('idle', {
            keepVisible: true,
            title: 'Call ended',
            sub: 'Thanks for trying the live demo. ' + PHONE_FALLBACK,
          });
          clearTimeout(endedFadeId);
          endedFadeId = setTimeout(() => {
            if (state === 'idle') setState('idle');
          }, 4500);
        });
        vapi.on('error', (err) => {
          const msg = String((err && (err.errorMsg || err.message || err.error)) || '');
          if (/permission|denied|NotAllowed|getUserMedia|mic/i.test(msg)) {
            showError('error-mic', 'Microphone access blocked',
              'Allow mic access for this site,', true);
          } else {
            showError('error-network', 'Connection issue',
              'The live demo couldn\'t connect —', true);
          }
        });

        setState('connecting', {
          title: 'Connecting to VenueVox…',
          sub: 'Negotiating the live audio stream.',
          keepVisible: true,
        });

        clearTimeout(connectTimeoutId);
        connectTimeoutId = setTimeout(() => {
          if (state === 'connecting') {
            showError('error-network', 'Connection timed out',
              'The live demo didn\'t connect in time —', true);
          }
        }, 15000);

        await vapi.start(ASSISTANT_ID);
        // 'call-start' will flip us to 'active'; busy stays true until then or until error.
      } catch (err) {
        const msg = String((err && (err.message || err.errorMsg)) || '');
        if (/NotAllowedError|denied|permission/i.test(msg)) {
          showError('error-mic', 'Microphone access blocked',
            'Allow mic access for this site,', true);
        } else {
          showError('error-network', 'Couldn\'t start the call',
            'Something went wrong on our side —', true);
        }
      }
    }

    function endCall() {
      if (state !== 'active' && state !== 'connecting') return;
      setState('ending', {
        title: 'Ending call…',
        sub: 'Closing the audio stream.',
        keepVisible: true,
      });
      try { vapi && vapi.stop && vapi.stop(); } catch (_) {}
      // If 'call-end' doesn't arrive within 4s, force-reset so we never hang.
      clearTimeout(endTimeoutId);
      endTimeoutId = setTimeout(() => {
        if (state === 'ending') {
          disposeVapi();
          busy = false;
          setState('idle', {
            keepVisible: true,
            title: 'Call ended',
            sub: 'Thanks for trying the live demo. ' + PHONE_FALLBACK,
          });
        }
      }, 4000);
    }

    startBtn.addEventListener('click', startCall);
    endBtn.addEventListener('click', endCall);
    retryBtn.addEventListener('click', () => { setState('idle'); startCall(); });
    dismissBtn.addEventListener('click', () => { setState('idle'); });

    setState('idle');
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
