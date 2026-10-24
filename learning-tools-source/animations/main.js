(() => {
  'use strict';
  const params = new URLSearchParams(location.search);
  const subject = params.get('subject') === 'biology' ? 'biology' : 'physics';
  const lesson = window.EntelloqAnimationCatalog[subject];
  const $ = id => document.getElementById(id);
  const video = $('lesson-video');
  const status = $('player-status');
  const play = $('play-button');
  let loading = null, controller = null, pendingTime = null, disposed = false, playbackIntent = 0;
  const blobURLs = new Set();
  const fmt = sec => `0:${String(Math.floor(Math.max(0, sec))).padStart(2, '0')}`;
  function setTheme(theme, tokens = {}) {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
    const allowed = { accent: '--accent', surface: '--surface', text: '--text', muted: '--muted', border: '--border' };
    for (const [key, prop] of Object.entries(allowed)) {
      const value = tokens[key];
      if (typeof value === 'string' && value.length < 100 && CSS.supports('color', value)) document.documentElement.style.setProperty(prop, value);
      else document.documentElement.style.removeProperty(prop);
    }
  }
  setTheme(params.get('theme'));
  const onTheme = event => {
    if (parent === window || event.source !== parent || event.origin !== location.origin) return;
    if (['entelloq:theme', 'entelloq-learning:theme'].includes(event.data?.type)) setTheme(event.data.theme, event.data.tokens);
  };
  window.addEventListener('message', onTheme);
  $('animation-app').dataset.subject = subject;
  document.documentElement.dataset.subject = subject;
  $('lesson-title').textContent = lesson.title;
  $('lesson-summary').textContent = lesson.summary;
  $('lesson-scope').textContent = lesson.scope;
  $('lesson-poster').src = `media/${subject}-poster.png`;
  $('lesson-poster').alt = lesson.steps[3].alt;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $('transcript').open = true;
    status.textContent = 'Reduced motion is enabled. Read the transcript or choose Play when ready.';
  }
  lesson.steps.forEach((step, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.time = String(step.time);
    const stamp = document.createElement('span'); stamp.textContent = `${String(index + 1).padStart(2, '0')} · ${fmt(step.time)}`;
    button.append(stamp, document.createTextNode(step.title));
    button.addEventListener('click', () => seek(step.time));
    $('chapters').append(button);
    const li = document.createElement('li'), title = document.createElement('strong');
    title.textContent = `${fmt(step.time)} — ${step.title}`;
    li.append(title, document.createTextNode(step.text)); $('transcript-list').append(li);
    const figure = document.createElement('figure'), image = document.createElement('img'), caption = document.createElement('figcaption');
    image.loading = 'lazy'; image.width = 1280; image.height = 720;
    image.src = `media/${subject}-step-${index + 1}.png`; image.alt = step.alt;
    caption.textContent = `${index + 1}. ${step.title}. ${step.text}`;
    figure.append(image, caption); $('still-grid').append(figure);
  });
  function update() {
    const time = video.currentTime || 0;
    const index = lesson.steps.reduce((found, step, i) => time >= step.time ? i : found, 0);
    $('caption-text').textContent = lesson.steps[index].caption;
    $('time-display').textContent = `${fmt(time)} / 0:22`;
    for (const [i, button] of [...$('chapters').children].entries()) button.setAttribute('aria-current', String(i === index));
    play.textContent = video.paused ? 'Play explanation' : 'Pause explanation';
  }
  function requireActive(signal) {
    if (disposed || signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  }
  async function assetBlob(path, type, signal) {
    // Relative fetch is understood by Biology's portable virtual-file bridge.
    requireActive(signal);
    const response = await fetch(path, { signal });
    requireActive(signal);
    if (!response.ok) throw new Error(`Asset unavailable (${response.status}).`);
    const bytes = await response.arrayBuffer();
    // A buffered response or virtual-file bridge may resolve after cancellation.
    // Guard immediately before URL creation; no await separates guard and owner.
    requireActive(signal);
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    blobURLs.add(url); return url;
  }
  async function load() {
    if (loading) return loading;
    if (video.src) return;
    if (disposed) throw new DOMException('Cancelled', 'AbortError');
    controller = new AbortController();
    const signal = controller.signal;
    status.textContent = 'Loading this local film…'; play.disabled = true;
    loading = (async () => {
      const movie = await assetBlob(`media/${subject}.mp4`, 'video/mp4', signal);
      requireActive(signal);
      const captions = await assetBlob(`media/${subject}.vtt`, 'text/vtt', signal);
      requireActive(signal);
      const track = document.createElement('track'); track.kind = 'captions'; track.label = 'English'; track.srclang = 'en'; track.src = captions;
      video.append(track);
      video.src = movie;
      video.hidden = false; $('lesson-poster').hidden = true;
      await new Promise((resolve, reject) => {
        if (video.readyState >= 1) return resolve();
        const cleanup = () => { video.removeEventListener('loadedmetadata', ready); video.removeEventListener('error', failed); signal.removeEventListener('abort', cancelled); };
        const ready = () => { cleanup(); resolve(); };
        const failed = () => { cleanup(); reject(new Error('This browser could not decode the film.')); };
        const cancelled = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')); };
        video.addEventListener('loadedmetadata', ready, { once: true }); video.addEventListener('error', failed, { once: true }); signal.addEventListener('abort', cancelled, { once: true });
        video.load();
      });
      requireActive(signal);
      status.textContent = 'Film ready. Captions below follow the current chapter.';
    })();
    try { await loading; }
    catch (error) { if (!disposed && error.name !== 'AbortError') { status.textContent = `${error.message} You can still read the transcript and four stills.`; resetMedia(); } throw error; }
    finally { loading = null; play.disabled = false; }
  }
  async function seek(time) {
    pendingTime = time;
    pause();
    try { await load(); if (disposed) return; video.currentTime = pendingTime; update(); status.textContent = 'Chapter selected and paused. Press Play to continue.'; }
    catch (_) { /* Visible fallback is set by load. */ }
  }
  play.addEventListener('click', async () => {
    if (!video.paused) { pause(); return; }
    const intent = ++playbackIntent;
    try {
      await load();
      if (!disposed && !document.hidden && intent === playbackIntent) {
        await video.play();
        if (disposed || document.hidden || intent !== playbackIntent) { video.pause(); return; }
        status.textContent = 'Playing. Pause at any time, or choose a chapter.';
      }
    }
    catch (error) { if (!disposed && error.name !== 'AbortError' && video.src) status.textContent = 'Playback could not start. Use the video controls or read the transcript.'; }
  });
  $('restart-button').addEventListener('click', () => {
    pause();
    if (video.src) video.currentTime = 0;
    pendingTime = 0; update();
  });
  $('playback-speed').addEventListener('change', event => { video.playbackRate = Number(event.target.value); });
  for (const name of ['timeupdate', 'play', 'pause', 'seeked', 'ended']) video.addEventListener(name, update);
  function pause() {
    // Hosts may hide an iframe without a document visibilitychange/pagehide.
    // Invalidate a pending Play as well as pausing an already-loaded film.
    playbackIntent += 1;
    video.pause();
  }
  function resetMedia() {
    pause(); video.removeAttribute('src'); video.replaceChildren(); video.load();
    for (const url of blobURLs) URL.revokeObjectURL(url);
    blobURLs.clear(); video.hidden = true; $('lesson-poster').hidden = false;
  }
  const pauseHidden = () => { if (document.hidden) pause(); };
  document.addEventListener('visibilitychange', pauseHidden);
  function destroy() {
    disposed = true; controller?.abort(); resetMedia();
    window.removeEventListener('message', onTheme);
    document.removeEventListener('visibilitychange', pauseHidden);
  }
  window.EntelloqAnimations = Object.freeze({ destroy, pause });
  window.addEventListener('pagehide', destroy);
  window.addEventListener('pageshow', () => {
    disposed = false;
    window.addEventListener('message', onTheme);
    document.addEventListener('visibilitychange', pauseHidden);
    update();
  });
  update();
})();
