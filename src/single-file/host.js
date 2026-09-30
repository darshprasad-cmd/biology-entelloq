/* The only physical document. Authored section scopes share its embedded files,
 * origin and storage; no server, service worker or extracted files are needed. */
(async function () {
  'use strict';
  const workspace = document.getElementById('bioq-workspace');
  const loading = document.getElementById('bioq-loading');
  const manifest = JSON.parse(document.getElementById('bioq-manifest').textContent);
  const pages = new Map(), assets = new Map(), contexts = new WeakMap();
  const synthetic = 'https://biology.entelloq.com/__single__/';
  const base = new URL('./', location.href);
  const sections = new Set(['home','learn','lessons','reason','labs','solve','explore','me','about','lab','universe']);
  const encode = value => JSON.stringify(value).replace(/</g, '\\u003c');
  const escapeRE = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // WindowProxy identity survives frame navigation, while its document changes.
  // Read the active document's context so a history-restored document cannot
  // inherit a newer document's route from the WeakMap.
  function contextFor(win) {
    try {return win.BioqContext || contexts.get(win);} catch (_) {return undefined;}
  }
  async function unpack(data) {
    const binary = atob(data), bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  }
  function logical(value, from = new URL('app.html', base).href) {
    try { return new URL(value, from); } catch (_) { return null; }
  }
  function localPath(value, from) {
    const url = logical(value, from);
    if (!url || !['http:', 'https:', 'file:'].includes(url.protocol)) return null;
    const ourOrigin = url.origin === base.origin;
    const packageOrigin = url.origin === 'https://biology.entelloq.com';
    if (!ourOrigin && !packageOrigin) return null;
    let pathname = decodeURIComponent(url.pathname);
    if (packageOrigin && pathname.startsWith('/__single__/')) return pathname.slice('/__single__/'.length);
    if (ourOrigin && pathname.startsWith(base.pathname)) pathname = pathname.slice(base.pathname.length);
    else if (packageOrigin) pathname = pathname.replace(/^\//, '');
    else return null;
    return pathname || 'index.html';
  }
  function resource(value, from) {
    const key = localPath(value, from);
    return assets.get(key)?.url || value;
  }
  function rewriteMarkup(markup, from) {
    return String(markup).replace(/(\b(?:src|href|poster)\s*=\s*)(["'])([^"']*)\2/gi,
      (_, prefix, quote, value) => prefix + quote + resource(value, from) + quote)
      .replace(/url\((['"]?)([^'"()]+)\1\)/gi, (_, quote, value) => 'url(' + quote + resource(value, from) + quote + ')');
  }
  function routeFor(url) {
    const key = localPath(url.href);
    if (key === 'index.html') return url.hash ? '#landing/' + url.hash.slice(1) : '';
    if (key === 'app.html') return url.hash || '#home';
    if (pages.has(key)) return '#' + key.replace(/\.html$/, '') + (url.hash ? '/' + url.hash.slice(1) : '');
    return null;
  }
  function setOuter(hash, mode, state) {
    const url = location.pathname + location.search + hash;
    if (mode === 'replace' || location.hash === hash) history.replaceState(state, '', url);
    else history.pushState(state, '', url);
  }
  function commit(win, url, mode = 'push', state = null) {
    const context = contextFor(win);
    if (!context) return;
    context.url = url;
    if (context.restoring) return;
    const hash = routeFor(url);
    // Nested dissection views must not replace their owning notebook route.
    if (hash !== null && (context.frame === workspace || /\/(learn|lessons|reason|labs|solve|explore|me|about)\.html$/.test(url.pathname))) {
      setOuter(hash, mode, state);
      const app = contextFor(workspace.contentWindow);
      if (app && app !== context && app.page === 'app.html') app.url.hash = hash;
    }
  }
  function render(name, route) {
    let html = pages.get(name);
    if (!html) throw new Error('The embedded section is missing: ' + name);
    // Replace complete local asset literals in HTML, inline CSS and JavaScript.
    // GLB URLs remain relative for the existing validating fetch boundary.
    for (const [path, asset] of assets) {
      if (/\.(?:glb|js)$/.test(path)) continue;
      const expression = new RegExp('(["\'\\(])(?:\\./)?' + escapeRE(path) + '(?=["\'\\)])', 'g');
      html = html.replace(expression, (_, prefix) => prefix + asset.url);
    }
    const moduleMap = {};
    for (const [path, asset] of assets) if (path.endsWith('.js')) {
      moduleMap[synthetic + path] = asset.url;
      if (path.startsWith('src/single-file/vendor/three-addons/')) moduleMap['three/addons/' + path.slice('src/single-file/vendor/three-addons/'.length)] = asset.url;
    }
    let importmap = false;
    html = html.replace(/(<script\b[^>]*type=["']importmap["'][^>]*>)([\s\S]*?)(<\/script>)/i, (_, start, body, end) => {
      const map = JSON.parse(body); map.imports = {...map.imports, ...moduleMap}; importmap = true;
      return start + encode(map) + end;
    });
    const bootstrap = '<base href=' + encode(base.href) + '><script>window.__BIOQ_ROUTE__=' + encode(route) + ';\n' + manifest.bridge.replace(/<\/script/gi, '<\\/script') + '<\/script>';
    html = html.replace(/<head\b[^>]*>/i, match => match + bootstrap + (importmap ? '' : '<script type="importmap">' + encode({imports:moduleMap}) + '<\/script>'));
    return html;
  }
  function loadFrame(frame, value, native) {
    const owner = contextFor(frame.ownerDocument.defaultView);
    const url = logical(value, owner?.url.href);
    const name = url && localPath(url.href);
    if (!pages.has(name)) return false;
    const old = contextFor(frame.contentWindow);
    if (old && old.page === name && old.url.search === url.search && old.url.hash !== url.hash && old.ready) {
      const oldURL = old.url.href; old.url = url;
      frame.contentWindow.dispatchEvent(new frame.contentWindow.HashChangeEvent('hashchange', {oldURL,newURL:url.href}));
      if (frame.id === 'launchFrame') queueMicrotask(() => frame.dispatchEvent(new frame.ownerDocument.defaultView.Event('load')));
      return true;
    }
    // srcdoc takes precedence over src. Keep src as a logical identity for the
    // existing validated frame bridges and MutationObservers, without a fetch.
    native.setAttribute.call(frame, 'srcdoc', render(name, url.href));
    native.setAttribute.call(frame, 'src', url.href);
    return true;
  }
  function navigate(win, value, mode = 'push') {
    const context = contextFor(win), url = logical(value, context?.url.href);
    const name = url && localPath(url.href);
    if (!pages.has(name)) return false;
    const route = routeFor(url);
    setOuter(route || '', mode);
    showRoute(false, name === 'app.html' ? url.search : '');
    return true;
  }
  function showRoute(fromHistory, search = '') {
    const hash = location.hash;
    const section = hash.slice(1).split('/')[0];
    const landing = !hash || hash.startsWith('#landing/') || !sections.has(section);
    const name = landing ? 'index.html' : 'app.html';
    const route = new URL(name + (search || location.search), base);
    route.hash = landing ? (hash.startsWith('#landing/') ? '#' + hash.slice(9) : hash) : hash;
    const current = contextFor(workspace.contentWindow);
    if (current?.page === name && current.ready && current.url.search === route.search) {
      if (current.url.hash !== route.hash || fromHistory) {
        const oldURL = current.url.href;
        const target = workspace.contentWindow;
        // The authored shell ignores hashchange while an immersive overlay is
        // open. Close that owner before restoring a route, without letting its
        // cleanup replace the browser history entry being restored.
        current.restoring = true;
        try {
          if (name === 'app.html' && target.document.getElementById('launcher')?.classList.contains('on')) target.closeLaunch();
          current.url = route;
          target.dispatchEvent(fromHistory ? new target.PopStateEvent('popstate', {state:history.state}) : new target.HashChangeEvent('hashchange',{oldURL,newURL:route.href}));
          // Child-owned mode changes do not alter the authored shell's cached
          // loadedSrc. Back can therefore hit its no-op branch even though the
          // active child's hash differs. Reconcile only an already-ready view;
          // a pending document load will receive its route in its bootstrap.
          const view = target.document.getElementById('viewFrame');
          const child = view && contextFor(view.contentWindow);
          if (child?.ready && child.page === section + '.html' && view.classList.contains('on') && !target.document.getElementById('skel')?.classList.contains('on')) {
            const next = new URL(child.url.href); next.hash = hash.slice(section.length + 2);
            if (next.hash !== child.url.hash) {
              const childOldURL = child.url.href; child.url = next;
              view.contentWindow.dispatchEvent(new view.contentWindow.HashChangeEvent('hashchange',{oldURL:childOldURL,newURL:next.href}));
            }
          }
        } finally {current.restoring = false;}
        if (landing && route.hash) target.document.getElementById(route.hash.slice(1))?.scrollIntoView();
      }
      return;
    }
    workspace.srcdoc = render(name, route.href);
  }
  window.BioqPackage = {
    contexts, resource, rewriteMarkup, loadFrame, commit, navigate,
    connect(win, route) {
      const url = new URL(route), page = localPath(route);
      const context = {url, page, frame:win.frameElement, ready:false}; contexts.set(win, context);
      win.BioqContext = context;
      win.addEventListener('DOMContentLoaded', () => {
        context.ready = true;
        if (context.frame === workspace) { document.title = win.document.title || 'Biology Entelloq'; loading.hidden = true; }
        if (context.url.hash) win.document.getElementById(context.url.hash.slice(1))?.scrollIntoView();
      }, {once:true});
      return context;
    },
    async fetch(win, input, options, nativeFetch) {
      const value = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
      const path = localPath(value, contextFor(win)?.url.href), asset = assets.get(path);
      if (!asset) return nativeFetch(input, options);
      const signal = options?.signal || input?.signal;
      if (signal?.aborted) throw new win.DOMException('Request aborted', 'AbortError');
      return new win.Response(asset.bytes, {headers:{'Content-Type':asset.type,'Content-Length':String(asset.bytes.byteLength)}});
    }
  };
  try {
    if (!window.DecompressionStream) throw new Error('Please open this file in a current version of Chrome, Edge, Firefox or Safari.');
    await Promise.all(Object.entries(manifest.assets).map(async ([path, entry]) => {
      const bytes = await unpack(entry.data);
      assets.set(path, {bytes,type:entry.type,url:URL.createObjectURL(new Blob([bytes], {type:entry.type}))});
    }));
    await Promise.all(Object.entries(manifest.pages).map(async ([name, data]) => pages.set(name, new TextDecoder().decode(await unpack(data)))));
    document.getElementById('bioq-manifest').remove();
    delete manifest.assets; delete manifest.pages;
    addEventListener('popstate', () => showRoute(true));
    // Hash-only links from outside the app are restored without a new visit.
    addEventListener('hashchange', () => showRoute(false));
    showRoute(false);
  } catch (error) {
    document.getElementById('bioq-loading-message').textContent = 'The workspace could not open. ' + error.message;
    document.getElementById('bioq-retry').hidden = false;
    console.error(error);
  }
})();
