/* Installed before any authored script in each embedded document. Only local
 * package navigation/resources are redirected; external services stay external. */
(function () {
  'use strict';
  const pkg = window.BioqPackage = top.BioqPackage;
  const context = pkg.connect(window, window.__BIOQ_ROUTE__);
  const native = {
    setAttribute:Element.prototype.setAttribute,
    removeAttribute:Element.prototype.removeAttribute,
    fetch:window.fetch.bind(window),
    open:window.open.bind(window)
  };
  function changeHash(value, mode = 'push', state = null, event = true) {
    const next = new URL(context.url.href), oldURL = next.href;
    next.hash = value;
    pkg.commit(window, next, mode, state);
    if (event && oldURL !== next.href) {
      queueMicrotask(() => {
        dispatchEvent(new HashChangeEvent('hashchange', {oldURL,newURL:next.href}));
        document.getElementById(decodeURIComponent(next.hash.slice(1)))?.scrollIntoView();
      });
    }
  }
  function navigate(value, replace = false) {
    const next = new URL(value, context.url.href);
    if (next.pathname === context.url.pathname && next.search === context.url.search && next.origin === context.url.origin) changeHash(next.hash, replace ? 'replace' : 'push');
    else if (!pkg.navigate(window, next.href, replace ? 'replace' : 'push')) {
      if (replace) window.location.replace(next.href); else window.location.assign(next.href);
    }
  }
  const route = {
    get href() {return context.url.href;}, set href(value) {navigate(value);},
    get hash() {return context.url.hash;}, set hash(value) {changeHash(value);},
    get search() {return context.url.search;}, set search(value) {const url = new URL(context.url); url.search = value; navigate(url.href);},
    get pathname() {return context.url.pathname;},
    get origin() {return top.location.protocol === 'file:' ? 'null' : top.location.origin;},
    get protocol() {return top.location.protocol;},
    get host() {return top.location.host;},
    get hostname() {return top.location.hostname;},
    get port() {return top.location.port;},
    assign:value => navigate(value), replace:value => navigate(value,true),
    reload:() => {window.frameElement.src = context.url.href;},
    toString:() => context.url.href
  };
  window.BioqLocation = route;
  window.BioqHistory = {
    get length() {return top.history.length;}, get state() {return top.history.state;},
    back:() => top.history.back(), forward:() => top.history.forward(), go:delta => top.history.go(delta),
    pushState(state, unused, value) {pkg.commit(window, new URL(value || context.url.href, context.url.href), 'push', state);},
    replaceState(state, unused, value) {pkg.commit(window, new URL(value || context.url.href, context.url.href), 'replace', state);}
  };
  // srcdoc inherits the containing document's origin. Share the top document's
  // storage explicitly only on browsers restricting storage on about:srcdoc.
  for (const key of ['localStorage','sessionStorage']) {
    try {void window[key].length;} catch (_) {
      try {Object.defineProperty(window,key,{value:top[key]});} catch (_) { /* authored on-device fallbacks remain */ }
    }
  }
  const iframeSource = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
  Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
    configurable:true, enumerable:iframeSource.enumerable,
    get() {return this.getAttribute('src') || iframeSource.get.call(this);},
    set(value) {
      if (pkg.loadFrame(this,String(value),native)) return;
      native.removeAttribute.call(this,'srcdoc'); iframeSource.set.call(this,value);
    }
  });
  for (const [Type, property] of [[HTMLImageElement,'src'],[HTMLScriptElement,'src'],[HTMLLinkElement,'href'],[HTMLSourceElement,'src']]) {
    const descriptor = Object.getOwnPropertyDescriptor(Type.prototype, property);
    Object.defineProperty(Type.prototype,property,{
      configurable:true,enumerable:descriptor.enumerable,get:descriptor.get,
      set(value) {
        // Every section is already present. A network prefetch cannot improve it.
        if (this instanceof HTMLLinkElement && this.rel === 'prefetch') return;
        descriptor.set.call(this,pkg.resource(String(value),context.url.href));
      }
    });
  }
  Element.prototype.setAttribute = function (name,value) {
    const key = String(name).toLowerCase();
    if (key === 'src' && this instanceof HTMLIFrameElement) {this.src=value; return;}
    if ((key === 'src' && (this instanceof HTMLImageElement || this instanceof HTMLScriptElement || this instanceof HTMLSourceElement)) || (key === 'href' && this instanceof HTMLLinkElement)) {
      this[key]=value; return;
    }
    return native.setAttribute.call(this,name,value);
  };
  // Catalog previews are rendered from template strings via innerHTML, which
  // bypasses image.src setters. Resolve their attributes before HTML parsing.
  for (const property of ['innerHTML','outerHTML']) {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype,property);
    Object.defineProperty(Element.prototype,property,{
      configurable:true,enumerable:descriptor.enumerable,get:descriptor.get,
      set(value) {descriptor.set.call(this,pkg.rewriteMarkup(value,context.url.href));}
    });
  }
  const insertHTML = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (position,value) {
    return insertHTML.call(this,position,pkg.rewriteMarkup(value,context.url.href));
  };
  window.fetch = (input, options) => pkg.fetch(window,input,options,native.fetch);
  window.open = function (value, target, features) {
    if (value && pkg.navigate(window,String(value))) return window;
    return native.open(value,target,features);
  };
  // Run after element/document handlers so existing simulations retain their
  // click handlers; the browser's default local-document navigation stays here.
  window.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;
    const href = anchor.getAttribute('href');
    if (href.startsWith('#')) {event.preventDefault(); changeHash(href); return;}
    if (pkg.navigate(window,href)) event.preventDefault();
  });
  // Browser fragments on srcdoc do not represent authored section routes.
  // Existing History API callers use BioqHistory; all rendering remains local.
})();
