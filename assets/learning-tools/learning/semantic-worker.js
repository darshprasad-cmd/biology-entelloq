(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // browser-empty:node:fs
  var require_node_fs = __commonJS({
    "browser-empty:node:fs"(exports, module) {
      module.exports = {};
    }
  });

  // browser-empty:node:path
  var require_node_path = __commonJS({
    "browser-empty:node:path"(exports, module) {
      module.exports = {};
    }
  });

  // browser-empty:node:url
  var require_node_url = __commonJS({
    "browser-empty:node:url"(exports, module) {
      module.exports = {};
    }
  });

  // browser-empty:./onnx-node.js
  var require_onnx_node = __commonJS({
    "browser-empty:./onnx-node.js"(exports, module) {
      module.exports = {};
    }
  });

  // node_modules/@huggingface/transformers/src/utils/generic.js
  var Callable = (
    /** @type {any} */
    class {
      /**
       * Creates a new instance of the Callable class.
       */
      constructor() {
        let closure = function(...args) {
          return closure._call(...args);
        };
        return Object.setPrototypeOf(closure, new.target.prototype);
      }
      /**
       * This method should be implemented in subclasses to provide the
       * functionality of the callable object.
       *
       * @param {any[]} args
       * @throws {Error} If the subclass does not implement the `_call` method.
       */
      _call(...args) {
        throw Error("Must implement _call method in subclass");
      }
    }
  );

  // node_modules/@huggingface/transformers/src/env.js
  var import_node_fs = __toESM(require_node_fs(), 1);
  var import_node_path = __toESM(require_node_path(), 1);
  var import_node_url = __toESM(require_node_url(), 1);
  var import_meta = {};
  var VERSION = "4.3.1";
  var HAS_SELF = typeof self !== "undefined";
  var IS_FS_AVAILABLE = !isEmpty(import_node_fs.default);
  var IS_PATH_AVAILABLE = !isEmpty(import_node_path.default);
  var IS_WEB_CACHE_AVAILABLE = HAS_SELF && "caches" in self;
  var IS_DENO_RUNTIME = typeof globalThis.Deno !== "undefined";
  var IS_BUN_RUNTIME = typeof globalThis.Bun !== "undefined";
  var IS_DENO_WEB_RUNTIME = IS_DENO_RUNTIME && IS_WEB_CACHE_AVAILABLE && !IS_FS_AVAILABLE;
  var IS_PROCESS_AVAILABLE = typeof process !== "undefined";
  var IS_NODE_ENV = IS_PROCESS_AVAILABLE && process?.release?.name === "node" && !IS_DENO_WEB_RUNTIME;
  var IS_BROWSER_ENV = typeof window !== "undefined" && typeof window.document !== "undefined";
  var IS_WEBWORKER_ENV = HAS_SELF && ["DedicatedWorkerGlobalScope", "ServiceWorkerGlobalScope", "SharedWorkerGlobalScope"].includes(
    self.constructor?.name
  );
  var IS_WEB_ENV = IS_BROWSER_ENV || IS_WEBWORKER_ENV || IS_DENO_WEB_RUNTIME;
  var IS_WEBGPU_AVAILABLE = IS_NODE_ENV || typeof navigator !== "undefined" && "gpu" in navigator;
  var IS_WEBNN_AVAILABLE = typeof navigator !== "undefined" && "ml" in navigator;
  var IS_CRYPTO_AVAILABLE = typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function";
  var IS_CHROME_AVAILABLE = (
    // @ts-ignore - chrome may not exist in all environments
    typeof chrome !== "undefined" && typeof chrome.runtime !== "undefined" && typeof chrome.runtime.id === "string"
  );
  var IS_SERVICE_WORKER_ENV = (
    // @ts-ignore - ServiceWorkerGlobalScope may not exist in all environments
    typeof ServiceWorkerGlobalScope !== "undefined" && HAS_SELF && self instanceof ServiceWorkerGlobalScope
  );
  var isSafariBelow26 = () => {
    if (typeof navigator === "undefined") {
      return false;
    }
    const userAgent = navigator.userAgent;
    const isSafari = (navigator.vendor || "").indexOf("Apple") > -1 && !userAgent.match(/CriOS|FxiOS|EdgiOS|OPiOS|mercury|brave/i) && !userAgent.includes("Chrome") && !userAgent.includes("Android");
    if (!isSafari) {
      return false;
    }
    const match = userAgent.match(/Version\/(\d+)/);
    return match ? parseInt(match[1], 10) < 26 : false;
  };
  var IS_SAFARI_BELOW_26 = isSafariBelow26();
  var apis = Object.freeze({
    /** Whether we are running in a browser environment (and not a web worker) */
    IS_BROWSER_ENV,
    /** Whether we are running in a web worker environment */
    IS_WEBWORKER_ENV,
    /** Whether we are running in a web-like environment (browser, web worker, or Deno web runtime) */
    IS_WEB_ENV,
    /** Whether we are running in a service worker environment */
    IS_SERVICE_WORKER_ENV,
    /** Whether we are running in Deno's web runtime (CDN imports, Cache API available, no filesystem) */
    IS_DENO_WEB_RUNTIME,
    /** Whether the Cache API is available */
    IS_WEB_CACHE_AVAILABLE,
    /** Whether the WebGPU API is available */
    IS_WEBGPU_AVAILABLE,
    /** Whether the WebNN API is available */
    IS_WEBNN_AVAILABLE,
    /** Whether we are running in a Safari browser older than version 26. */
    IS_SAFARI_BELOW_26,
    /** Whether the Node.js process API is available */
    IS_PROCESS_AVAILABLE,
    /** Whether we are running in a Node.js-like environment (node, deno, bun) */
    IS_NODE_ENV,
    /** Whether the filesystem API is available */
    IS_FS_AVAILABLE,
    /** Whether the path API is available */
    IS_PATH_AVAILABLE,
    /** Whether the crypto API is available */
    IS_CRYPTO_AVAILABLE,
    /** Whether the Chrome runtime API is available */
    IS_CHROME_AVAILABLE
  });
  var RUNNING_LOCALLY = IS_FS_AVAILABLE && IS_PATH_AVAILABLE;
  var dirname__ = "./";
  if (RUNNING_LOCALLY) {
    const _import_meta_url = import_meta.url;
    if (_import_meta_url) {
      dirname__ = import_node_path.default.dirname(import_node_path.default.dirname(import_node_url.default.fileURLToPath(_import_meta_url)));
    } else if (typeof __dirname !== "undefined") {
      dirname__ = import_node_path.default.dirname(__dirname);
    }
  }
  var DEFAULT_CACHE_DIR = RUNNING_LOCALLY ? import_node_path.default.join(dirname__, "/.cache/") : null;
  var DEFAULT_LOCAL_MODEL_PATH = "/models/";
  var localModelPath = RUNNING_LOCALLY ? import_node_path.default.join(dirname__, DEFAULT_LOCAL_MODEL_PATH) : DEFAULT_LOCAL_MODEL_PATH;
  var DEFAULT_FETCH = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : void 0;
  var LogLevel = Object.freeze({
    /** All messages including debug output (value: 10) */
    DEBUG: 10,
    /** Errors, warnings, and info messages (value: 20) */
    INFO: 20,
    /** Errors and warnings (value: 30) */
    WARNING: 30,
    /** Only error messages (value: 40) */
    ERROR: 40,
    /** No logging output (value: 50) */
    NONE: 50
  });
  var logLevel = LogLevel.WARNING;
  var env = {
    version: VERSION,
    /////////////////// Backends settings ///////////////////
    // NOTE: These will be populated later by the backends themselves.
    backends: {
      // onnxruntime-web/onnxruntime-node
      onnx: {}
    },
    /////////////////// Logging settings ///////////////////
    get logLevel() {
      return logLevel;
    },
    set logLevel(level) {
      logLevel = level;
      env.backends.onnx?.setLogLevel?.(level);
    },
    /////////////////// Model settings ///////////////////
    allowRemoteModels: true,
    remoteHost: "https://huggingface.co/",
    remotePathTemplate: "{model}/resolve/{revision}/",
    allowLocalModels: !(IS_BROWSER_ENV || IS_WEBWORKER_ENV || IS_DENO_WEB_RUNTIME),
    // Default to true for non-web environments, false for web environments
    localModelPath,
    useFS: IS_FS_AVAILABLE,
    /////////////////// Cache settings ///////////////////
    useBrowserCache: IS_WEB_CACHE_AVAILABLE,
    useFSCache: IS_FS_AVAILABLE,
    cacheDir: DEFAULT_CACHE_DIR,
    useCustomCache: false,
    customCache: null,
    useWasmCache: IS_WEB_CACHE_AVAILABLE || IS_FS_AVAILABLE,
    cacheKey: "transformers-cache",
    experimental_useCrossOriginStorage: false,
    /////////////////// Custom fetch /////////////////////
    fetch: DEFAULT_FETCH
    //////////////////////////////////////////////////////
  };
  function isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  // node_modules/@huggingface/transformers/src/backends/onnx.js
  var import_onnx_node = __toESM(require_onnx_node(), 1);

  // node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs
  var ort_webgpu_bundle_min_exports = {};
  __export(ort_webgpu_bundle_min_exports, {
    InferenceSession: () => bc,
    TRACE: () => Qa,
    TRACE_EVENT_BEGIN: () => $e,
    TRACE_EVENT_END: () => ze,
    TRACE_FUNC_BEGIN: () => ot,
    TRACE_FUNC_END: () => at,
    Tensor: () => Le,
    default: () => $l,
    env: () => ee,
    registerBackend: () => rt
  });
  var import_meta2 = {};
  var Jr = Object.defineProperty;
  var dc = Object.getOwnPropertyDescriptor;
  var lc = Object.getOwnPropertyNames;
  var pc = Object.prototype.hasOwnProperty;
  var Xr = ((a) => typeof __require < "u" ? __require : typeof Proxy < "u" ? new Proxy(a, { get: (r, s) => (typeof __require < "u" ? __require : r)[s] }) : a)(function(a) {
    if (typeof __require < "u") return __require.apply(this, arguments);
    throw Error('Dynamic require of "' + a + '" is not supported');
  });
  var G = (a, r, s) => () => {
    if (s) throw s[0];
    try {
      return a && (r = a(a = 0)), r;
    } catch (f) {
      throw s = [f], f;
    }
  };
  var At = (a, r) => {
    for (var s in r) Jr(a, s, { get: r[s], enumerable: true });
  };
  var mc = (a, r, s, f) => {
    if (r && typeof r == "object" || typeof r == "function") for (let i of lc(r)) !pc.call(a, i) && i !== s && Jr(a, i, { get: () => r[i], enumerable: !(f = dc(r, i)) || f.enumerable });
    return a;
  };
  var Ht = (a) => mc(Jr({}, "__esModule", { value: true }), a);
  var qt;
  var tt;
  var rt;
  var hc;
  var Da;
  var Zr = G(() => {
    "use strict";
    qt = /* @__PURE__ */ new Map(), tt = [], rt = (a, r, s) => {
      if (r && typeof r.init == "function" && typeof r.createInferenceSessionHandler == "function") {
        let f = qt.get(a);
        if (f === void 0) qt.set(a, { backend: r, priority: s });
        else {
          if (f.priority > s) return;
          if (f.priority === s && f.backend !== r) throw new Error(`cannot register backend "${a}" using priority ${s}`);
        }
        if (s >= 0) {
          let i = tt.indexOf(a);
          i !== -1 && tt.splice(i, 1);
          for (let p = 0; p < tt.length; p++) if (qt.get(tt[p]).priority <= s) {
            tt.splice(p, 0, a);
            return;
          }
          tt.push(a);
        }
        return;
      }
      throw new TypeError("not a valid backend");
    }, hc = async (a) => {
      let r = qt.get(a);
      if (!r) return "backend not found.";
      if (r.initialized) return r.backend;
      if (r.aborted) return r.error;
      {
        let s = !!r.initPromise;
        try {
          return s || (r.initPromise = r.backend.init(a)), await r.initPromise, r.initialized = true, r.backend;
        } catch (f) {
          return s || (r.error = `${f}`, r.aborted = true), r.error;
        } finally {
          delete r.initPromise;
        }
      }
    }, Da = async (a) => {
      let r = a.executionProviders || [], s = r.map((g) => typeof g == "string" ? g : g.name), f = s.length === 0 ? tt : s, i, p = [], l = /* @__PURE__ */ new Set();
      for (let g of f) {
        let w = await hc(g);
        typeof w == "string" ? p.push({ name: g, err: w }) : (i || (i = w), i === w && l.add(g));
      }
      if (!i) throw new Error(`no available backend found. ERR: ${p.map((g) => `[${g.name}] ${g.err}`).join(", ")}`);
      for (let { name: g, err: w } of p) s.includes(g) && console.warn(`removing requested execution provider "${g}" from session options because it is not available: ${w}`);
      let b = r.filter((g) => l.has(typeof g == "string" ? g : g.name));
      return [i, new Proxy(a, { get: (g, w) => w === "executionProviders" ? b : Reflect.get(g, w) })];
    };
  });
  var Pa = G(() => {
    "use strict";
    Zr();
  });
  var Ua;
  var _a = G(() => {
    "use strict";
    Ua = "1.31.0-dev.20260911-2a43ec07e";
  });
  var Ra;
  var ie;
  var Kr = G(() => {
    "use strict";
    _a();
    Ra = "warning", ie = { wasm: {}, webgl: {}, webgpu: {}, versions: { common: Ua }, set logLevel(a) {
      if (a !== void 0) {
        if (typeof a != "string" || ["verbose", "info", "warning", "error", "fatal"].indexOf(a) === -1) throw new Error(`Unsupported logging level: ${a}`);
        Ra = a;
      }
    }, get logLevel() {
      return Ra;
    } };
    Object.defineProperty(ie, "logLevel", { enumerable: true });
  });
  var ee;
  var Na = G(() => {
    "use strict";
    Kr();
    ee = ie;
  });
  var Wa;
  var ka;
  var Fa = G(() => {
    "use strict";
    Wa = (a, r) => {
      let s = typeof document < "u" ? document.createElement("canvas") : new OffscreenCanvas(1, 1);
      s.width = a.dims[3], s.height = a.dims[2];
      let f = s.getContext("2d");
      if (f != null) {
        let i, p;
        r?.tensorLayout !== void 0 && r.tensorLayout === "NHWC" ? (i = a.dims[2], p = a.dims[3]) : (i = a.dims[3], p = a.dims[2]);
        let l = r?.format !== void 0 ? r.format : "RGB", b = r?.norm, g, w;
        b === void 0 || b.mean === void 0 ? g = [255, 255, 255, 255] : typeof b.mean == "number" ? g = [b.mean, b.mean, b.mean, b.mean] : (g = [b.mean[0], b.mean[1], b.mean[2], 0], b.mean[3] !== void 0 && (g[3] = b.mean[3])), b === void 0 || b.bias === void 0 ? w = [0, 0, 0, 0] : typeof b.bias == "number" ? w = [b.bias, b.bias, b.bias, b.bias] : (w = [b.bias[0], b.bias[1], b.bias[2], 0], b.bias[3] !== void 0 && (w[3] = b.bias[3]));
        let S = p * i, v = 0, T = S, A = S * 2, C = -1;
        l === "RGBA" ? (v = 0, T = S, A = S * 2, C = S * 3) : l === "RGB" ? (v = 0, T = S, A = S * 2) : l === "RBG" && (v = 0, A = S, T = S * 2);
        for (let _ = 0; _ < p; _++) for (let k = 0; k < i; k++) {
          let U = (a.data[v++] - w[0]) * g[0], M = (a.data[T++] - w[1]) * g[1], Y = (a.data[A++] - w[2]) * g[2], O = C === -1 ? 255 : (a.data[C++] - w[3]) * g[3];
          f.fillStyle = "rgba(" + U + "," + M + "," + Y + "," + O + ")", f.fillRect(k, _, 1, 1);
        }
        if ("toDataURL" in s) return s.toDataURL();
        throw new Error("toDataURL is not supported");
      } else throw new Error("Can not access image data");
    }, ka = (a, r) => {
      let s = typeof document < "u" ? document.createElement("canvas").getContext("2d") : new OffscreenCanvas(1, 1).getContext("2d"), f;
      if (s != null) {
        let i, p, l;
        r?.tensorLayout !== void 0 && r.tensorLayout === "NHWC" ? (i = a.dims[2], p = a.dims[1], l = a.dims[3]) : (i = a.dims[3], p = a.dims[2], l = a.dims[1]);
        let b = r !== void 0 && r.format !== void 0 ? r.format : "RGB", g = r?.norm, w, S;
        g === void 0 || g.mean === void 0 ? w = [255, 255, 255, 255] : typeof g.mean == "number" ? w = [g.mean, g.mean, g.mean, g.mean] : (w = [g.mean[0], g.mean[1], g.mean[2], 255], g.mean[3] !== void 0 && (w[3] = g.mean[3])), g === void 0 || g.bias === void 0 ? S = [0, 0, 0, 0] : typeof g.bias == "number" ? S = [g.bias, g.bias, g.bias, g.bias] : (S = [g.bias[0], g.bias[1], g.bias[2], 0], g.bias[3] !== void 0 && (S[3] = g.bias[3]));
        let v = p * i;
        if (r !== void 0 && (r.format !== void 0 && l === 4 && r.format !== "RGBA" || l === 3 && r.format !== "RGB" && r.format !== "BGR")) throw new Error("Tensor format doesn't match input tensor dims");
        let T = 4, A = 0, C = 1, _ = 2, k = 3, U = 0, M = v, Y = v * 2, O = -1;
        b === "RGBA" ? (U = 0, M = v, Y = v * 2, O = v * 3) : b === "RGB" ? (U = 0, M = v, Y = v * 2) : b === "RBG" && (U = 0, Y = v, M = v * 2), f = s.createImageData(i, p);
        for (let $ = 0; $ < p * i; A += T, C += T, _ += T, k += T, $++) f.data[A] = (a.data[U++] - S[0]) * w[0], f.data[C] = (a.data[M++] - S[1]) * w[1], f.data[_] = (a.data[Y++] - S[2]) * w[2], f.data[k] = O === -1 ? 255 : (a.data[O++] - S[3]) * w[3];
      } else throw new Error("Can not access image data");
      return f;
    };
  });
  var Qr;
  var Ga;
  var $a;
  var za;
  var Va;
  var ja;
  var Ha = G(() => {
    "use strict";
    Yt();
    Qr = (a, r) => {
      if (a === void 0) throw new Error("Image buffer must be defined");
      if (r.height === void 0 || r.width === void 0) throw new Error("Image height and width must be defined");
      if (r.tensorLayout === "NHWC") throw new Error("NHWC Tensor layout is not supported yet");
      let { height: s, width: f } = r, i = r.norm ?? { mean: 255, bias: 0 }, p, l;
      typeof i.mean == "number" ? p = [i.mean, i.mean, i.mean, i.mean] : p = [i.mean[0], i.mean[1], i.mean[2], i.mean[3] ?? 255], typeof i.bias == "number" ? l = [i.bias, i.bias, i.bias, i.bias] : l = [i.bias[0], i.bias[1], i.bias[2], i.bias[3] ?? 0];
      let b = r.format !== void 0 ? r.format : "RGBA", g = r.tensorFormat !== void 0 && r.tensorFormat !== void 0 ? r.tensorFormat : "RGB", w = s * f, S = g === "RGBA" ? new Float32Array(w * 4) : new Float32Array(w * 3), v = 4, T = 0, A = 1, C = 2, _ = 3, k = 0, U = w, M = w * 2, Y = -1;
      b === "RGB" && (v = 3, T = 0, A = 1, C = 2, _ = -1), g === "RGBA" ? Y = w * 3 : g === "RBG" ? (k = 0, M = w, U = w * 2) : g === "BGR" && (M = 0, U = w, k = w * 2);
      for (let $ = 0; $ < w; $++, T += v, C += v, A += v, _ += v) S[k++] = (a[T] + l[0]) / p[0], S[U++] = (a[A] + l[1]) / p[1], S[M++] = (a[C] + l[2]) / p[2], Y !== -1 && _ !== -1 && (S[Y++] = (a[_] + l[3]) / p[3]);
      return g === "RGBA" ? new ce("float32", S, [1, 4, s, f]) : new ce("float32", S, [1, 3, s, f]);
    }, Ga = async (a, r) => {
      let s = typeof HTMLImageElement < "u" && a instanceof HTMLImageElement, f = typeof ImageData < "u" && a instanceof ImageData, i = typeof ImageBitmap < "u" && a instanceof ImageBitmap, p = typeof a == "string", l, b = r ?? {}, g = () => {
        if (typeof document < "u") return document.createElement("canvas");
        if (typeof OffscreenCanvas < "u") return new OffscreenCanvas(1, 1);
        throw new Error("Canvas is not supported");
      }, w = (S) => typeof HTMLCanvasElement < "u" && S instanceof HTMLCanvasElement || S instanceof OffscreenCanvas ? S.getContext("2d") : null;
      if (s) {
        let S = g();
        S.width = a.width, S.height = a.height;
        let v = w(S);
        if (v != null) {
          let T = a.height, A = a.width;
          if (r !== void 0 && r.resizedHeight !== void 0 && r.resizedWidth !== void 0 && (T = r.resizedHeight, A = r.resizedWidth), r !== void 0) {
            if (b = r, r.tensorFormat !== void 0) throw new Error("Image input config format must be RGBA for HTMLImageElement");
            b.tensorFormat = "RGBA", b.height = T, b.width = A;
          } else b.tensorFormat = "RGBA", b.height = T, b.width = A;
          v.drawImage(a, 0, 0), l = v.getImageData(0, 0, A, T).data;
        } else throw new Error("Can not access image data");
      } else if (f) {
        let S, v;
        if (r !== void 0 && r.resizedWidth !== void 0 && r.resizedHeight !== void 0 ? (S = r.resizedHeight, v = r.resizedWidth) : (S = a.height, v = a.width), r !== void 0 && (b = r), b.format = "RGBA", b.height = S, b.width = v, r !== void 0) {
          let T = g();
          T.width = v, T.height = S;
          let A = w(T);
          if (A != null) A.putImageData(a, 0, 0), l = A.getImageData(0, 0, v, S).data;
          else throw new Error("Can not access image data");
        } else l = a.data;
      } else if (i) {
        if (r === void 0) throw new Error("Please provide image config with format for Imagebitmap");
        let S = g();
        S.width = a.width, S.height = a.height;
        let v = w(S);
        if (v != null) {
          let T = a.height, A = a.width;
          return v.drawImage(a, 0, 0, A, T), l = v.getImageData(0, 0, A, T).data, b.height = T, b.width = A, Qr(l, b);
        } else throw new Error("Can not access image data");
      } else {
        if (p) return new Promise((S, v) => {
          let T = g(), A = w(T);
          if (!a || !A) return v();
          let C = new Image();
          C.crossOrigin = "Anonymous", C.src = a, C.onload = () => {
            T.width = C.width, T.height = C.height, A.drawImage(C, 0, 0, T.width, T.height);
            let _ = A.getImageData(0, 0, T.width, T.height);
            b.height = T.height, b.width = T.width, S(Qr(_.data, b));
          };
        });
        throw new Error("Input data provided is not supported - aborted tensor creation");
      }
      if (l !== void 0) return Qr(l, b);
      throw new Error("Input data provided is not supported - aborted tensor creation");
    }, $a = (a, r) => {
      let { width: s, height: f, download: i, dispose: p } = r, l = [1, f, s, 4];
      return new ce({ location: "texture", type: "float32", texture: a, dims: l, download: i, dispose: p });
    }, za = (a, r) => {
      let { dataType: s, dims: f, download: i, dispose: p } = r;
      return new ce({ location: "gpu-buffer", type: s ?? "float32", gpuBuffer: a, dims: f, download: i, dispose: p });
    }, Va = (a, r) => {
      let { dataType: s, dims: f, download: i, dispose: p } = r;
      return new ce({ location: "ml-tensor", type: s ?? "float32", mlTensor: a, dims: f, download: i, dispose: p });
    }, ja = (a, r, s) => new ce({ location: "cpu-pinned", type: a, data: r, dims: s ?? [r.length] });
  });
  var nt;
  var It;
  var qa;
  var Ya;
  var Ja = G(() => {
    "use strict";
    nt = /* @__PURE__ */ new Map([["float32", Float32Array], ["uint8", Uint8Array], ["int8", Int8Array], ["uint16", Uint16Array], ["int16", Int16Array], ["int32", Int32Array], ["bool", Uint8Array], ["float64", Float64Array], ["uint32", Uint32Array], ["int4", Uint8Array], ["uint4", Uint8Array]]), It = /* @__PURE__ */ new Map([[Float32Array, "float32"], [Uint8Array, "uint8"], [Int8Array, "int8"], [Uint16Array, "uint16"], [Int16Array, "int16"], [Int32Array, "int32"], [Float64Array, "float64"], [Uint32Array, "uint32"]]), qa = false, Ya = () => {
      if (!qa) {
        qa = true;
        let a = typeof BigInt64Array < "u" && BigInt64Array.from, r = typeof BigUint64Array < "u" && BigUint64Array.from, s = globalThis.Float16Array, f = typeof s < "u" && s.from;
        a && (nt.set("int64", BigInt64Array), It.set(BigInt64Array, "int64")), r && (nt.set("uint64", BigUint64Array), It.set(BigUint64Array, "uint64")), f ? (nt.set("float16", s), It.set(s, "float16")) : nt.set("float16", Uint16Array);
      }
    };
  });
  var Xa;
  var Za;
  var Ka = G(() => {
    "use strict";
    Yt();
    Xa = (a) => {
      let r = 1;
      for (let s = 0; s < a.length; s++) {
        let f = a[s];
        if (typeof f != "number" || !Number.isSafeInteger(f)) throw new TypeError(`dims[${s}] must be an integer, got: ${f}`);
        if (f < 0) throw new RangeError(`dims[${s}] must be a non-negative integer, got: ${f}`);
        r *= f;
      }
      return r;
    }, Za = (a, r) => {
      switch (a.location) {
        case "cpu":
          return new ce(a.type, a.data, r);
        case "cpu-pinned":
          return new ce({ location: "cpu-pinned", data: a.data, type: a.type, dims: r });
        case "texture":
          return new ce({ location: "texture", texture: a.texture, type: a.type, dims: r });
        case "gpu-buffer":
          return new ce({ location: "gpu-buffer", gpuBuffer: a.gpuBuffer, type: a.type, dims: r });
        case "ml-tensor":
          return new ce({ location: "ml-tensor", mlTensor: a.mlTensor, type: a.type, dims: r });
        default:
          throw new Error(`tensorReshape: tensor location ${a.location} is not supported`);
      }
    };
  });
  var ce;
  var Yt = G(() => {
    "use strict";
    Fa();
    Ha();
    Ja();
    Ka();
    ce = class {
      constructor(r, s, f) {
        Ya();
        let i, p;
        if (typeof r == "object" && "location" in r) switch (this.dataLocation = r.location, i = r.type, p = r.dims, r.location) {
          case "cpu-pinned": {
            let b = nt.get(i);
            if (!b) throw new TypeError(`unsupported type "${i}" to create tensor from pinned buffer`);
            if (!(r.data instanceof b)) throw new TypeError(`buffer should be of type ${b.name}`);
            this.cpuData = r.data;
            break;
          }
          case "texture": {
            if (i !== "float32") throw new TypeError(`unsupported type "${i}" to create tensor from texture`);
            this.gpuTextureData = r.texture, this.downloader = r.download, this.disposer = r.dispose;
            break;
          }
          case "gpu-buffer": {
            if (i !== "float32" && i !== "float16" && i !== "int32" && i !== "int64" && i !== "uint32" && i !== "uint8" && i !== "bool" && i !== "uint4" && i !== "int4") throw new TypeError(`unsupported type "${i}" to create tensor from gpu buffer`);
            this.gpuBufferData = r.gpuBuffer, this.downloader = r.download, this.disposer = r.dispose;
            break;
          }
          case "ml-tensor": {
            if (i !== "float32" && i !== "float16" && i !== "int32" && i !== "int64" && i !== "uint32" && i !== "uint64" && i !== "int8" && i !== "uint8" && i !== "bool" && i !== "uint4" && i !== "int4") throw new TypeError(`unsupported type "${i}" to create tensor from MLTensor`);
            this.mlTensorData = r.mlTensor, this.downloader = r.download, this.disposer = r.dispose;
            break;
          }
          default:
            throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`);
        }
        else {
          let b, g;
          if (typeof r == "string") if (i = r, g = f, r === "string") {
            if (!Array.isArray(s)) throw new TypeError("A string tensor's data must be a string array.");
            b = s;
          } else {
            let w = nt.get(r);
            if (w === void 0) throw new TypeError(`Unsupported tensor type: ${r}.`);
            if (Array.isArray(s)) {
              if (r === "float16" && w === Uint16Array || r === "uint4" || r === "int4") throw new TypeError(`Creating a ${r} tensor from number array is not supported. Please use ${w.name} as data.`);
              r === "uint64" || r === "int64" ? b = w.from(s, BigInt) : b = w.from(s);
            } else if (s instanceof w) b = s;
            else if (s instanceof Uint8ClampedArray) if (r === "uint8") b = Uint8Array.from(s);
            else throw new TypeError("A Uint8ClampedArray tensor's data must be type of uint8");
            else if (r === "float16" && s instanceof Uint16Array && w !== Uint16Array) b = new globalThis.Float16Array(s.buffer, s.byteOffset, s.length);
            else throw new TypeError(`A ${i} tensor's data must be type of ${w}`);
          }
          else if (g = s, Array.isArray(r)) {
            if (r.length === 0) throw new TypeError("Tensor type cannot be inferred from an empty array.");
            let w = typeof r[0];
            if (w === "string") i = "string", b = r;
            else if (w === "boolean") i = "bool", b = Uint8Array.from(r);
            else throw new TypeError(`Invalid element type of data array: ${w}.`);
          } else if (r instanceof Uint8ClampedArray) i = "uint8", b = Uint8Array.from(r);
          else {
            let w = It.get(r.constructor);
            if (w === void 0) throw new TypeError(`Unsupported type for tensor data: ${r.constructor}.`);
            i = w, b = r;
          }
          if (g === void 0) g = [b.length];
          else if (!Array.isArray(g)) throw new TypeError("A tensor's dims must be a number array");
          p = g, this.cpuData = b, this.dataLocation = "cpu";
        }
        let l = Xa(p);
        if (this.cpuData && l !== this.cpuData.length && !((i === "uint4" || i === "int4") && Math.ceil(l / 2) === this.cpuData.length)) throw new Error(`Tensor's size(${l}) does not match data length(${this.cpuData.length}).`);
        this.type = i, this.dims = p, this.size = l;
      }
      static async fromImage(r, s) {
        return Ga(r, s);
      }
      static fromTexture(r, s) {
        return $a(r, s);
      }
      static fromGpuBuffer(r, s) {
        return za(r, s);
      }
      static fromMLTensor(r, s) {
        return Va(r, s);
      }
      static fromPinnedBuffer(r, s, f) {
        return ja(r, s, f);
      }
      toDataURL(r) {
        return Wa(this, r);
      }
      toImageData(r) {
        return ka(this, r);
      }
      get data() {
        if (this.ensureValid(), !this.cpuData) throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");
        return this.cpuData;
      }
      get location() {
        return this.dataLocation;
      }
      get texture() {
        if (this.ensureValid(), !this.gpuTextureData) throw new Error("The data is not stored as a WebGL texture.");
        return this.gpuTextureData;
      }
      get gpuBuffer() {
        if (this.ensureValid(), !this.gpuBufferData) throw new Error("The data is not stored as a WebGPU buffer.");
        return this.gpuBufferData;
      }
      get mlTensor() {
        if (this.ensureValid(), !this.mlTensorData) throw new Error("The data is not stored as a WebNN MLTensor.");
        return this.mlTensorData;
      }
      async getData(r) {
        switch (this.ensureValid(), this.dataLocation) {
          case "cpu":
          case "cpu-pinned":
            return this.data;
          case "texture":
          case "gpu-buffer":
          case "ml-tensor": {
            if (!this.downloader) throw new Error("The current tensor is not created with a specified data downloader.");
            if (this.isDownloading) throw new Error("The current tensor is being downloaded.");
            try {
              this.isDownloading = true;
              let s = await this.downloader();
              return this.downloader = void 0, this.dataLocation = "cpu", this.cpuData = s, r && this.disposer && (this.disposer(), this.disposer = void 0), s;
            } finally {
              this.isDownloading = false;
            }
          }
          default:
            throw new Error(`cannot get data from location: ${this.dataLocation}`);
        }
      }
      dispose() {
        if (this.isDownloading) throw new Error("The current tensor is being downloaded.");
        this.disposer && (this.disposer(), this.disposer = void 0), this.cpuData = void 0, this.gpuTextureData = void 0, this.gpuBufferData = void 0, this.mlTensorData = void 0, this.downloader = void 0, this.isDownloading = void 0, this.dataLocation = "none";
      }
      ensureValid() {
        if (this.dataLocation === "none") throw new Error("The tensor is disposed.");
      }
      reshape(r) {
        if (this.ensureValid(), this.downloader || this.disposer) throw new Error("Cannot reshape a tensor that owns GPU resource.");
        return Za(this, r);
      }
    };
  });
  var Le;
  var en = G(() => {
    "use strict";
    Yt();
    Le = ce;
  });
  var Qa;
  var es;
  var ot;
  var at;
  var $e;
  var ze;
  var tn = G(() => {
    "use strict";
    Kr();
    Qa = (a, r) => {
      (typeof ie.trace > "u" ? !ie.wasm.trace : !ie.trace) || console.timeStamp(`${a}::ORT::${r}`);
    }, es = (a, r) => {
      let s = new Error().stack?.split(/\r\n|\r|\n/g) || [], f = false;
      for (let i = 0; i < s.length; i++) {
        if (f && !s[i].includes("TRACE_FUNC")) {
          let p = `FUNC_${a}::${s[i].trim().split(" ")[1]}`;
          r && (p += `::${r}`), Qa("CPU", p);
          return;
        }
        s[i].includes("TRACE_FUNC") && (f = true);
      }
    }, ot = (a) => {
      (typeof ie.trace > "u" ? !ie.wasm.trace : !ie.trace) || es("BEGIN", a);
    }, at = (a) => {
      (typeof ie.trace > "u" ? !ie.wasm.trace : !ie.trace) || es("END", a);
    }, $e = (a) => {
      (typeof ie.trace > "u" ? !ie.wasm.trace : !ie.trace) || console.time(`ORT::${a}`);
    }, ze = (a) => {
      (typeof ie.trace > "u" ? !ie.wasm.trace : !ie.trace) || console.timeEnd(`ORT::${a}`);
    };
  });
  var Jt;
  var ts = G(() => {
    "use strict";
    Zr();
    en();
    tn();
    Jt = class a {
      constructor(r) {
        this.handler = r;
      }
      async run(r, s, f) {
        ot(), $e("InferenceSession.run");
        let i = {}, p = {};
        if (typeof r != "object" || r === null || r instanceof Le || Array.isArray(r)) throw new TypeError("'feeds' must be an object that use input names as keys and OnnxValue as corresponding values.");
        let l = true;
        if (typeof s == "object") {
          if (s === null) throw new TypeError("Unexpected argument[1]: cannot be null.");
          if (s instanceof Le) throw new TypeError("'fetches' cannot be a Tensor");
          if (Array.isArray(s)) {
            if (s.length === 0) throw new TypeError("'fetches' cannot be an empty array.");
            l = false;
            for (let w of s) {
              if (typeof w != "string") throw new TypeError("'fetches' must be a string array or an object.");
              if (this.outputNames.indexOf(w) === -1) throw new RangeError(`'fetches' contains invalid output name: ${w}.`);
              i[w] = null;
            }
            if (typeof f == "object" && f !== null) p = f;
            else if (typeof f < "u") throw new TypeError("'options' must be an object.");
          } else {
            let w = false, S = Object.getOwnPropertyNames(s);
            for (let v of this.outputNames) if (S.indexOf(v) !== -1) {
              let T = s[v];
              (T === null || T instanceof Le) && (w = true, l = false, i[v] = T);
            }
            if (w) {
              if (typeof f == "object" && f !== null) p = f;
              else if (typeof f < "u") throw new TypeError("'options' must be an object.");
            } else p = s;
          }
        } else if (typeof s < "u") throw new TypeError("Unexpected argument[1]: must be 'fetches' or 'options'.");
        for (let w of this.inputNames) if (typeof r[w] > "u") throw new Error(`input '${w}' is missing in 'feeds'.`);
        if (l) for (let w of this.outputNames) i[w] = null;
        let b = await this.handler.run(r, i, p), g = {};
        for (let w in b) if (Object.hasOwnProperty.call(b, w)) {
          let S = b[w];
          S instanceof Le ? g[w] = S : g[w] = new Le(S.type, S.data, S.dims);
        }
        return ze("InferenceSession.run"), at(), g;
      }
      async release() {
        return this.handler.dispose();
      }
      static async create(r, s, f, i) {
        ot(), $e("InferenceSession.create");
        let p, l = {};
        if (typeof r == "string") {
          if (p = r, typeof s == "object" && s !== null) l = s;
          else if (typeof s < "u") throw new TypeError("'options' must be an object.");
        } else if (r instanceof Uint8Array) {
          if (p = r, typeof s == "object" && s !== null) l = s;
          else if (typeof s < "u") throw new TypeError("'options' must be an object.");
        } else if (r instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && r instanceof SharedArrayBuffer) {
          let S = r, v = 0, T = r.byteLength;
          if (typeof s == "object" && s !== null) l = s;
          else if (typeof s == "number") {
            if (v = s, !Number.isSafeInteger(v)) throw new RangeError("'byteOffset' must be an integer.");
            if (v < 0 || v >= S.byteLength) throw new RangeError(`'byteOffset' is out of range [0, ${S.byteLength}).`);
            if (T = r.byteLength - v, typeof f == "number") {
              if (T = f, !Number.isSafeInteger(T)) throw new RangeError("'byteLength' must be an integer.");
              if (T <= 0 || v + T > S.byteLength) throw new RangeError(`'byteLength' is out of range (0, ${S.byteLength - v}].`);
              if (typeof i == "object" && i !== null) l = i;
              else if (typeof i < "u") throw new TypeError("'options' must be an object.");
            } else if (typeof f < "u") throw new TypeError("'byteLength' must be a number.");
          } else if (typeof s < "u") throw new TypeError("'options' must be an object.");
          p = new Uint8Array(S, v, T);
        } else throw new TypeError("Unexpected argument[0]: must be 'path' or 'buffer'.");
        let [b, g] = await Da(l), w = await b.createInferenceSessionHandler(p, g);
        return ze("InferenceSession.create"), at(), new a(w);
      }
      startProfiling() {
        this.handler.startProfiling();
      }
      endProfiling() {
        this.handler.endProfiling();
      }
      get inputNames() {
        return this.handler.inputNames;
      }
      get outputNames() {
        return this.handler.outputNames;
      }
      get inputMetadata() {
        return this.handler.inputMetadata;
      }
      get outputMetadata() {
        return this.handler.outputMetadata;
      }
    };
  });
  var bc;
  var rs = G(() => {
    "use strict";
    ts();
    bc = Jt;
  });
  var ns = G(() => {
    "use strict";
  });
  var os = G(() => {
    "use strict";
  });
  var as = G(() => {
    "use strict";
  });
  var ss = G(() => {
    "use strict";
  });
  var rn = {};
  At(rn, { InferenceSession: () => bc, TRACE: () => Qa, TRACE_EVENT_BEGIN: () => $e, TRACE_EVENT_END: () => ze, TRACE_FUNC_BEGIN: () => ot, TRACE_FUNC_END: () => at, Tensor: () => Le, env: () => ee, registerBackend: () => rt });
  var Ve = G(() => {
    "use strict";
    Pa();
    Na();
    rs();
    en();
    ns();
    os();
    tn();
    as();
    ss();
  });
  var Xt = G(() => {
    "use strict";
  });
  var cs = {};
  At(cs, { default: () => gc });
  var us;
  var fs2;
  var gc;
  var ds = G(() => {
    "use strict";
    nn();
    je();
    Zt();
    us = "ort-wasm-proxy-worker", fs2 = globalThis.self?.name === us;
    fs2 && (self.onmessage = (a) => {
      let { type: r, in: s } = a.data;
      try {
        switch (r) {
          case "init-wasm":
            Kt(s.wasm).then(() => {
              Qt(s).then(() => {
                postMessage({ type: r });
              }, (f) => {
                postMessage({ type: r, err: f });
              });
            }, (f) => {
              postMessage({ type: r, err: f });
            });
            break;
          case "init-ep": {
            let { epName: f, env: i } = s;
            er(i, f).then(() => {
              postMessage({ type: r });
            }, (p) => {
              postMessage({ type: r, err: p });
            });
            break;
          }
          case "copy-from": {
            let { buffer: f } = s, i = Lt(f);
            postMessage({ type: r, out: i });
            break;
          }
          case "create": {
            let { model: f, options: i } = s;
            tr(f, i).then((p) => {
              postMessage({ type: r, out: p });
            }, (p) => {
              postMessage({ type: r, err: p });
            });
            break;
          }
          case "release":
            rr(s), postMessage({ type: r });
            break;
          case "run": {
            let { sessionId: f, inputIndices: i, inputs: p, outputIndices: l, options: b } = s;
            nr(f, i, p, l, new Array(l.length).fill(null), b).then((g) => {
              g.some((w) => w[3] !== "cpu") ? postMessage({ type: r, err: "Proxy does not support non-cpu tensor location." }) : postMessage({ type: r, out: g }, ar([...p, ...g]));
            }, (g) => {
              postMessage({ type: r, err: g });
            });
            break;
          }
          case "end-profiling":
            or(s), postMessage({ type: r });
            break;
          default:
        }
      } catch (f) {
        postMessage({ type: r, err: f });
      }
    });
    gc = fs2 ? null : (a) => new Worker(a ?? ye, { type: "module", name: us });
  });
  var ps = {};
  At(ps, { default: () => yc });
  async function ls(a = {}) {
    var r = a, s = !!globalThis.window, f = !!globalThis.WorkerGlobalScope, i = f && self.name?.startsWith("em-pthread");
    r.mountExternalData = (e, t) => {
      e.startsWith("./") && (e = e.substring(2)), (r.ed || (r.ed = /* @__PURE__ */ new Map())).set(e, t);
    }, r.unmountExternalData = () => {
      delete r.ed, delete r.Te, delete r.Se, delete r.Ue;
    }, globalThis.SharedArrayBuffer ?? new WebAssembly.Memory({ initial: 0, maximum: 0, shared: true }).buffer.constructor;
    let p = () => {
      let e = (t) => (...n) => {
        let o = Me;
        return n = t(...n), Me != o ? new Promise((u, c) => {
          Cr = { resolve: u, reject: c };
        }) : n;
      };
      (() => {
        for (let t of ["_OrtAppendExecutionProvider", "_OrtCreateSession", "_OrtRun", "_OrtRunWithBinding", "_OrtBindInput"]) r[t] = e(r[t]);
      })(), typeof jsepRunAsync < "u" && (r._OrtRun = jsepRunAsync(r._OrtRun), r._OrtRunWithBinding = jsepRunAsync(r._OrtRunWithBinding)), p = void 0;
    };
    r.asyncInit = () => {
      p?.();
    };
    var l, b, g = (e, t) => {
      throw t;
    }, w = import_meta2.url, S = "";
    if (s || f) {
      try {
        S = new URL(".", w).href;
      } catch {
      }
      f && (b = (e) => {
        var t = new XMLHttpRequest();
        return t.open("GET", e, false), t.responseType = "arraybuffer", t.send(null), new Uint8Array(t.response);
      }), l = async (e) => {
        if (oe(e)) return new Promise((n, o) => {
          var u = new XMLHttpRequest();
          u.open("GET", e, true), u.responseType = "arraybuffer", u.onload = () => {
            u.status == 200 || u.status == 0 && u.response ? n(u.response) : o(u.status);
          }, u.onerror = o, u.send(null);
        });
        var t = await fetch(e, { credentials: "same-origin" });
        if (t.ok) return t.arrayBuffer();
        throw Error(t.status + " : " + t.url);
      };
    }
    var v, T, A, C, _, k, U = console.log.bind(console), M = console.error.bind(console), Y = U, O = M, $ = false, oe = (e) => e.startsWith("file://");
    function d() {
      Fe.buffer != Z.buffer && se();
    }
    if (i) {
      let e = function(t) {
        try {
          var n = t.data, o = n.$c;
          if (o === "load") {
            let u = [];
            self.onmessage = (c) => u.push(c), k = () => {
              postMessage({ $c: "loaded" });
              for (let c of u) e(c);
              self.onmessage = e;
            };
            for (let c of n.ue) r[c] && !r[c].proxy || (r[c] = (...h) => {
              postMessage({ $c: "callHandler", te: c, args: h });
            }, c == "print" && (Y = r[c]), c == "printErr" && (O = r[c]));
            Fe = n.Me, se(), T = n.Ne, wt(), jt();
          } else if (o === "run") {
            (function(u) {
              var c = (d(), E)[u + 52 >>> 2 >>> 0];
              u = (d(), E)[u + 56 >>> 2 >>> 0], Fo(c, c - u), D(c);
            })(n.Xc), zr(n.Xc, 0, 0, 1, 0, 0), wn(), Br(n.Xc), te || (vo(), te = true);
            try {
              ei(n.ze, n.kd);
            } catch (u) {
              if (u != "unwind") throw u;
            }
          } else n.target !== "setimmediate" && (o === "checkMailbox" ? te && _t() : o && (O(`worker: received unknown command ${o}`), O(n)));
        } catch (u) {
          throw _o(), u;
        }
      };
      var Vc = e, te = false;
      self.onunhandledrejection = (t) => {
        throw t.reason || t;
      }, self.onmessage = e;
    }
    var Z, X, De, K, I, E, R, ae, pe, J, ge, ne = false;
    function se() {
      var e = Fe.buffer;
      r.HEAP8 = Z = new Int8Array(e), De = new Int16Array(e), r.HEAPU8 = X = new Uint8Array(e), K = new Uint16Array(e), r.HEAP32 = I = new Int32Array(e), r.HEAPU32 = E = new Uint32Array(e), R = new Float32Array(e), ae = new Float64Array(e), pe = new BigInt64Array(e), J = new BigUint64Array(e);
    }
    function wr() {
      ne = true, i ? k() : Ne.hc();
    }
    function we(e) {
      throw O(e = "Aborted(" + e + ")"), $ = true, e = new WebAssembly.RuntimeError(e + ". Build with -sASSERTIONS for more info."), _?.(e), e;
    }
    function qe() {
      return { a: { qa: Af, f: ti, K: ri, k: ni, p: oi, l: ai, fa: si, b: ii, da: ui, gc: An, q: fi, ea: On, Ua: Mn, cc: Cn, ec: Dn, Va: Pn, Sa: Un, La: _n, Ra: Rn, oa: Nn, dc: Wn, ac: kn, Ta: Fn, bc: Gn, _a: ci, Ba: li, Xb: pi, Vb: hi, Aa: gi, O: yi, J: wi, Wb: Ti, ka: Li, Yb: Bi, Oa: Oi, _b: Ci, Ea: Di, Tb: Pi, Ca: Ui, Na: Br, Xa: _i, U: ki, n: Vi, c: Ir, qb: ji, w: Hi, N: qi, A: Yi, j: Ji, o: Jn, rb: Xi, H: Zi, T: Ki, g: Qi, u: eu, m: tu, i: ru, Ia: nu, Ja: ou, Ka: au, Ga: Qn, Ha: eo, Ub: to, ab: iu, Za: cu, Z: du, pb: lu, Da: pu, Ya: uu, X: mu, Wa: hu, $b: bu, G: su, db: gu, _: yu, pa: Ft, Zb: Tu, cb: wu, bb: vu, lb: Uu, z: _u, sa: Ru, ra: Nu, nb: Wu, Y: ku, v: Fu, kb: Gu, jb: $u, ib: zu, mb: Vu, gb: ju, fb: Hu, eb: qu, Pa: po, Qa: mo, fc: vr, W: ho, Fa: bo, ma: go, Ma: yo, la: wo, Fb: fc, va: nc, Gb: uc, wa: rc, E: zf, e: Of, r: Lf, x: If2, C: kf, Ib: Qf, ca: Kf, D: Df, xa: ec, aa: oc, ha: Zf, Jb: Xf, Kb: Jf, za: jf, Lb: qf, ya: Yf, Mb: Hf, ua: ic, ba: tc, d: Bf, B: Cf, s: Mf, Eb: cc, t: Uf, y: Gf, F: Pf, I: _f, L: $f, Nb: Vf, R: ac, ia: Wf, $: sc, Pb: Nf, Rb: Rf, Ob: Ff, h: Ju, a: Fe, $a: Ye, Hb: Xu, V: Zu, M: Ku, na: Qu, Db: ef, ja: tf, S: rf, Ab: nf, Bb: of, vb: af, wb: sf, P: uf, xb: ff, yb: cf, ta: df, Sb: lf, ob: pf, Q: mf, hb: hf, Cb: bf, sb: gf, tb: wf, ub: Tf, ga: vf, zb: Ef, Qb: Sf } };
    }
    async function wt() {
      function e(o, u) {
        var c = Ne = o.exports;
        o = {};
        for (let [h, m] of Object.entries(c)) typeof m == "function" ? (c = Ri(m), o[h] = c) : o[h] = m;
        return Ne = o, Ne = (function() {
          var h = Ne, m = (x) => (N) => x(N) >>> 0, y = (x) => () => x() >>> 0;
          return (h = Object.assign({}, h)).ic = m(h.ic), h.Nc = y(h.Nc), h.Pc = m(h.Pc), h.Bd = /* @__PURE__ */ ((x) => (N, F) => x(N, F) >>> 0)(h.Bd), h.Gd = m(h.Gd), h.Hd = y(h.Hd), h.Ld = m(h.Ld), h;
        })(), gn.push(Ne.sd), To = (o = Ne).ic, vo = o.jc, r._OrtInit = o.kc, r._OrtGetLastError = o.lc, r._OrtCreateSessionOptions = o.mc, r._OrtAppendExecutionProvider = o.nc, r._OrtAddFreeDimensionOverride = o.oc, r._OrtAddSessionConfigEntry = o.pc, r._OrtReleaseSessionOptions = o.qc, r._OrtCreateSession = o.rc, r._OrtReleaseSession = o.sc, r._OrtGetInputOutputCount = o.tc, r._OrtGetInputOutputMetadata = o.uc, r._OrtFree = o.vc, r._OrtCreateTensor = o.wc, r._OrtGetTensorData = o.xc, r._OrtReleaseTensor = o.yc, r._OrtCreateRunOptions = o.zc, r._OrtAddRunConfigEntry = o.Ac, r._OrtReleaseRunOptions = o.Bc, r._OrtCreateBinding = o.Cc, r._OrtBindInput = o.Dc, r._OrtBindOutput = o.Ec, r._OrtClearBoundOutputs = o.Fc, r._OrtReleaseBinding = o.Gc, r._OrtRunWithBinding = o.Hc, r._OrtRun = o.Ic, r._OrtEndProfiling = o.Jc, Eo = r._OrtCreateWebGpuInstance = o.Kc, r._wgpuCreateInstance = o.Lc, Nr = r._OrtGetWebGpuDevice = o.Mc, zt = o.Nc, ve = r._free = o.Oc, Ke = r._malloc = o.Pc, So = r._wgpuBufferRelease = o.Qc, xo = o.Rc, Ao = o.Sc, Io = o.Tc, Lo = o.Uc, Bo = o.Vc, Oo = o.Yc, Mo = o.Zc, Co = o.hd, Do = o.id, Po = o.jd, Wr = o.ld, kr = o.md, Fr = o.nd, Gr = o.od, St = o.pd, $r = o.qd, Uo = o.rd, zr = o.ud, _o = o.vd, Ro = o.wd, No = o.xd, Vr = o.yd, Wo = o.zd, ko = o.Ad, jr = o.Bd, W = o.Cd, xt = o.Dd, Fo = o.Ed, D = o.Fd, Vt = o.Gd, P = o.Hd, Go = o.Id, Hr = o.Jd, $o = o.Kd, zo = o.Ld, Vo = o.Md, qr = o.Nd, jo = o.Od, Ho = o.Pd, qo = o.Qd, Yo = o.Rd, Jo = o.Sd, Xo = o.Td, Zo = o.Ud, Ko = o.Vd, Qo = o.Wd, ea = o.Xd, ta = o.Yd, ra = o.Zd, na = o._d, oa = o.$d, aa = o.ae, sa = o.be, ia = o.ce, ua = o.de, fa = o.fe, ca = o.ge, da = o.he, la = o.ie, pa = o.je, ma = o.ke, ha = o.le, ba = o.me, ga = o.Ae, ya = o.Be, wa = o.Ce, Ta = o.De, va = o.Ee, Ea = o.Fe, Sa = o.Ge, xa = o.He, Aa = o.Ie, Ia = o.Je, La = o.Ke, Ba = o.nf, Oa = o.of, Ma = o.pf, Ca = o.qf, T = u, Ne;
      }
      var t, n = qe();
      return r.instantiateWasm ? new Promise((o) => {
        r.instantiateWasm(n, (u, c) => {
          o(e(u, c));
        });
      }) : i ? e(new WebAssembly.Instance(T, qe()), T) : (ge ??= r.locateFile ? r.locateFile ? r.locateFile("ort-wasm-simd-threaded.asyncify.wasm", S) : S + "ort-wasm-simd-threaded.asyncify.wasm" : new URL("ort-wasm-simd-threaded.asyncify.wasm", import_meta2.url).href, t = await (async function(o) {
        var u = ge;
        if (!v && !oe(u)) try {
          var c = fetch(u, { credentials: "same-origin" });
          return await WebAssembly.instantiateStreaming(c, o);
        } catch (h) {
          O(`wasm streaming compile failed: ${h}`), O("falling back to ArrayBuffer instantiation");
        }
        return (async function(h, m) {
          try {
            var y = await (async function(x) {
              if (!v) try {
                var N = await l(x);
                return new Uint8Array(N);
              } catch {
              }
              if (x == ge && v) x = new Uint8Array(v);
              else {
                if (!b) throw "both async and sync fetching of the wasm failed";
                x = b(x);
              }
              return x;
            })(h);
            return await WebAssembly.instantiate(y, m);
          } catch (x) {
            O(`failed to asynchronously prepare wasm: ${x}`), we(x);
          }
        })(u, o);
      })(n), e(t.instance, t.module));
    }
    class Tt {
      name = "ExitStatus";
      constructor(t) {
        this.message = `Program terminated with exit(${t})`, this.status = t;
      }
    }
    var Se = (e) => {
      e.terminate(), e.onmessage = () => {
      };
    }, xe = [], Be = 0, re = null, Q = (e) => {
      ke.length == 0 && (vn(), Tn(ke[0]));
      var t = ke.pop();
      if (!t) return 6;
      vt.push(t), Je[e.Xc] = t, t.Xc = e.Xc;
      var n = { $c: "run", ze: e.ye, kd: e.kd, Xc: e.Xc };
      return t.postMessage(n, e.oe), 0;
    }, z = 0, H = (e, t, ...n) => {
      var o, u = 16 * n.length, c = P(), h = Vt(u), m = h >>> 3;
      for (o of n) typeof o == "bigint" ? ((d(), pe)[m++ >>> 0] = 1n, (d(), pe)[m++ >>> 0] = o) : ((d(), pe)[m++ >>> 0] = 0n, (d(), ae)[m++ >>> 0] = o);
      return e = Ro(e, 0, u, h, t), D(c), e;
    };
    function Ye(e) {
      if (i) return H(0, 1, e);
      if (A = e, !(0 < z)) {
        for (var t of vt) Se(t);
        for (t of ke) Se(t);
        ke = [], vt = [], Je = {}, $ = true;
      }
      g(0, new Tt(e));
    }
    function Tr(e) {
      if (i) return H(1, 0, e);
      vr(e);
    }
    var vr = (e) => {
      if (A = e, i) throw Tr(e), "unwind";
      Ye(e);
    }, ke = [], vt = [], gn = [], Je = {}, yn = (e) => {
      var t = e.Xc;
      delete Je[t], ke.push(e), vt.splice(vt.indexOf(e), 1), e.Xc = 0, No(t);
    };
    function wn() {
      gn.forEach((e) => e());
    }
    var Tn = (e) => new Promise((t) => {
      e.onmessage = (u) => {
        var c = u.data;
        if (u = c.$c, c.gd && c.gd != zt()) {
          var h = Je[c.gd];
          h ? h.postMessage(c, c.oe) : O(`Internal error! Worker sent a message "${u}" to target pthread ${c.gd}, but that thread no longer exists!`);
        } else u === "checkMailbox" ? _t() : u === "spawnThread" ? Q(c) : u === "cleanupThread" ? me(() => {
          yn(Je[c.Le]);
        }) : u === "loaded" ? (e.loaded = true, t(e)) : c.target === "setimmediate" ? e.postMessage(c) : u === "uncaughtException" ? e.onerror(c.error) : u === "callHandler" ? r[c.te](...c.args) : u && O(`worker sent an unknown command ${u}`);
      }, e.onerror = (u) => {
        throw O(`worker sent an error! ${u.filename}:${u.lineno}: ${u.message}`), u;
      };
      var n, o = [];
      for (n of []) r.propertyIsEnumerable(n) && o.push(n);
      e.postMessage({ $c: "load", ue: o, Me: Fe, Ne: T });
    });
    function vn() {
      var e = new Worker((() => {
        let t = URL;
        return import_meta2.url > "file:" && import_meta2.url < "file;" ? new t("ort.webgpu.bundle.min.mjs", import_meta2.url) : new URL(import_meta2.url);
      })(), { type: "module", workerData: "em-pthread", name: "em-pthread" });
      ke.push(e);
    }
    var Fe, ei = (e, t) => {
      z = 0, e = qr(e, t), 0 < z ? A = e : Vr(e);
    }, Pt = [], Ut = 0, ue = (e) => -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e);
    function ti(e) {
      var t = new Er(e >>>= 0);
      return (d(), Z)[t.ad + 12 >>> 0] == 0 && (En(t, true), Ut--), Sn(t, false), Pt.push(t), zo(e);
    }
    var dt = 0, ri = () => {
      W(0, 0);
      var e = Pt.pop();
      Go(e.td), dt = 0;
    };
    function En(e, t) {
      t = t ? 1 : 0, (d(), Z)[e.ad + 12 >>> 0] = t;
    }
    function Sn(e, t) {
      t = t ? 1 : 0, (d(), Z)[e.ad + 13 >>> 0] = t;
    }
    class Er {
      constructor(t) {
        this.td = t, this.ad = t - 24;
      }
    }
    var Sr = (e) => {
      var t = dt;
      if (!t) return xt(0), 0;
      var n = new Er(t);
      (d(), E)[n.ad + 16 >>> 2 >>> 0] = t;
      var o = (d(), E)[n.ad + 4 >>> 2 >>> 0];
      if (!o) return xt(0), t;
      for (var u of e) {
        if (u === 0 || u === o) break;
        if ($o(u, o, n.ad + 16)) return xt(u), t;
      }
      return xt(o), t;
    };
    function ni() {
      return Sr([]);
    }
    function oi(e) {
      return Sr([e >>> 0]);
    }
    function ai(e, t, n, o) {
      return Sr([e >>> 0, t >>> 0, n >>> 0, o >>> 0]);
    }
    var si = () => {
      var e = Pt.pop();
      e || we("no exception to throw");
      var t = e.td;
      throw (d(), Z)[e.ad + 13 >>> 0] == 0 && (Pt.push(e), Sn(e, true), En(e, false), Ut++), Hr(t), dt = t;
    };
    function ii(e, t, n) {
      var o = new Er(e >>>= 0);
      throw t >>>= 0, n >>>= 0, (d(), E)[o.ad + 16 >>> 2 >>> 0] = 0, (d(), E)[o.ad + 4 >>> 2 >>> 0] = t, (d(), E)[o.ad + 8 >>> 2 >>> 0] = n, Hr(e), Ut++, dt = e;
    }
    var ui = () => Ut;
    function xn(e, t, n, o) {
      return i ? H(2, 1, e, t, n, o) : An(e, t, n, o);
    }
    function An(e, t, n, o) {
      if (e >>>= 0, t >>>= 0, n >>>= 0, o >>>= 0, !globalThis.SharedArrayBuffer) return 6;
      var u = [];
      return i && u.length === 0 ? xn(e, t, n, o) : (e = { ye: n, Xc: e, kd: o, oe: u }, i ? (e.$c = "spawnThread", postMessage(e, u), 0) : Q(e));
    }
    function fi(e) {
      throw dt ||= e >>> 0, dt;
    }
    var In = globalThis.TextDecoder && new TextDecoder(), Ln = (e, t, n, o) => {
      if (n = t + n, o) return n;
      for (; e[t] && !(t >= n); ) ++t;
      return t;
    }, Bn = (e, t = 0, n, o) => {
      if (16 < (n = Ln(e, t >>>= 0, n, o)) - t && e.buffer && In) return In.decode(e.buffer instanceof ArrayBuffer ? e.subarray(t, n) : e.slice(t, n));
      for (o = ""; t < n; ) {
        var u = e[t++];
        if (128 & u) {
          var c = 63 & e[t++];
          if ((224 & u) == 192) o += String.fromCharCode((31 & u) << 6 | c);
          else {
            var h = 63 & e[t++];
            65536 > (u = (240 & u) == 224 ? (15 & u) << 12 | c << 6 | h : (7 & u) << 18 | c << 12 | h << 6 | 63 & e[t++]) ? o += String.fromCharCode(u) : (u -= 65536, o += String.fromCharCode(55296 | u >> 10, 56320 | 1023 & u));
          }
        } else o += String.fromCharCode(u);
      }
      return o;
    }, lt = (e, t, n) => (e >>>= 0) ? Bn((d(), X), e, t, n) : "";
    function On(e, t, n) {
      return i ? H(3, 1, e, t, n) : 0;
    }
    function Mn(e, t) {
      if (i) return H(4, 1, e, t);
    }
    function Cn(e, t) {
      if (i) return H(5, 1, e, t);
    }
    function Dn(e, t, n) {
      if (i) return H(6, 1, e, t, n);
    }
    function Pn(e, t, n) {
      return i ? H(7, 1, e, t, n) : 0;
    }
    function Un(e, t) {
      if (i) return H(8, 1, e, t);
    }
    function _n(e, t, n) {
      if (i) return H(9, 1, e, t, n);
    }
    function Rn(e, t, n, o) {
      if (i) return H(10, 1, e, t, n, o);
    }
    function Nn(e, t, n, o) {
      if (i) return H(11, 1, e, t, n, o);
    }
    function Wn(e, t, n, o) {
      if (i) return H(12, 1, e, t, n, o);
    }
    function kn(e) {
      if (i) return H(13, 1, e);
    }
    function Fn(e, t) {
      if (i) return H(14, 1, e, t);
    }
    function Gn(e, t, n) {
      if (i) return H(15, 1, e, t, n);
    }
    var ci = () => we(""), Oe = (e) => {
      e >>>= 0;
      for (var t = ""; ; ) {
        var n = (d(), X)[e++ >>> 0];
        if (!n) return t;
        t += String.fromCharCode(n);
      }
    }, xr = {}, Ar = {}, di = {}, pt = class extends Error {
      constructor(e) {
        super(e), this.name = "BindingError";
      }
    };
    function Pe(e, t, n = {}) {
      return (function(o, u, c = {}) {
        var h = u.name;
        if (!o) throw new pt(`type "${h}" must have a positive integer typeid pointer`);
        if (Ar.hasOwnProperty(o)) {
          if (c.ve) return;
          throw new pt(`Cannot register type '${h}' twice`);
        }
        Ar[o] = u, delete di[o], xr.hasOwnProperty(o) && (u = xr[o], delete xr[o], u.forEach((m) => m()));
      })(e, t, n);
    }
    var $n = (e, t, n) => {
      switch (t) {
        case 1:
          return n ? (o) => (d(), Z)[o >>> 0] : (o) => (d(), X)[o >>> 0];
        case 2:
          return n ? (o) => (d(), De)[o >>> 1 >>> 0] : (o) => (d(), K)[o >>> 1 >>> 0];
        case 4:
          return n ? (o) => (d(), I)[o >>> 2 >>> 0] : (o) => (d(), E)[o >>> 2 >>> 0];
        case 8:
          return n ? (o) => (d(), pe)[o >>> 3 >>> 0] : (o) => (d(), J)[o >>> 3 >>> 0];
        default:
          throw new TypeError(`invalid integer width (${t}): ${e}`);
      }
    };
    function li(e, t, n, o, u) {
      e >>>= 0, n >>>= 0, t = Oe(t >>> 0);
      let c = (h) => h;
      if (o = o === 0n) {
        let h = 8 * n;
        c = (m) => BigInt.asUintN(h, m), u = c(u);
      }
      Pe(e, { name: t, Wc: c, cd: (h, m) => (typeof m == "number" && (m = BigInt(m)), m), bd: $n(t, n, !o), dd: null });
    }
    function pi(e, t, n, o) {
      Pe(e >>>= 0, { name: t = Oe(t >>> 0), Wc: function(u) {
        return !!u;
      }, cd: function(u, c) {
        return c ? n : o;
      }, bd: function(u) {
        return this.Wc((d(), X)[u >>> 0]);
      }, dd: null });
    }
    var zn = [], Xe = [0, 1, , 1, null, 1, true, 1, false, 1];
    function Ir(e) {
      9 < (e >>>= 0) && --Xe[e + 1] === 0 && (Xe[e] = void 0, zn.push(e));
    }
    var Te = (e) => {
      if (!e) throw new pt(`Cannot use deleted val. handle = ${e}`);
      return Xe[e];
    }, Ae = (e) => {
      switch (e) {
        case void 0:
          return 2;
        case null:
          return 4;
        case true:
          return 6;
        case false:
          return 8;
        default:
          let t = zn.pop() || Xe.length;
          return Xe[t] = e, Xe[t + 1] = 1, t;
      }
    };
    function Lr(e) {
      return this.Wc((d(), E)[e >>> 2 >>> 0]);
    }
    var mi = { name: "emscripten::val", Wc: (e) => {
      var t = Te(e);
      return Ir(e), t;
    }, cd: (e, t) => Ae(t), bd: Lr, dd: null };
    function hi(e) {
      return Pe(e >>> 0, mi);
    }
    var bi = (e, t) => {
      switch (t) {
        case 4:
          return function(n) {
            return this.Wc((d(), R)[n >>> 2 >>> 0]);
          };
        case 8:
          return function(n) {
            return this.Wc((d(), ae)[n >>> 3 >>> 0]);
          };
        default:
          throw new TypeError(`invalid float width (${t}): ${e}`);
      }
    };
    function gi(e, t, n) {
      n >>>= 0, Pe(e >>>= 0, { name: t = Oe(t >>> 0), Wc: (o) => o, cd: (o, u) => u, bd: bi(t, n), dd: null });
    }
    function yi(e, t, n, o, u) {
      e >>>= 0, n >>>= 0, t = Oe(t >>> 0);
      let c = (m) => m;
      if (o === 0) {
        var h = 32 - 8 * n;
        c = (m) => m << h >>> h, u = c(u);
      }
      Pe(e, { name: t, Wc: c, cd: (m, y) => y, bd: $n(t, n, o !== 0), dd: null });
    }
    function wi(e, t, n) {
      function o(c) {
        var h = (d(), E)[c >>> 2 >>> 0];
        return c = (d(), E)[c + 4 >>> 2 >>> 0], new u((d(), Z).buffer, c, h);
      }
      var u = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array][t];
      Pe(e >>>= 0, { name: n = Oe(n >>> 0), Wc: o, bd: o }, { ve: true });
    }
    var Ue = (e, t, n) => {
      var o = (d(), X);
      if (t >>>= 0, 0 < n) {
        var u = t;
        n = t + n - 1;
        for (var c = 0; c < e.length; ++c) {
          var h = e.codePointAt(c);
          if (127 >= h) {
            if (t >= n) break;
            o[t++ >>> 0] = h;
          } else if (2047 >= h) {
            if (t + 1 >= n) break;
            o[t++ >>> 0] = 192 | h >> 6, o[t++ >>> 0] = 128 | 63 & h;
          } else if (65535 >= h) {
            if (t + 2 >= n) break;
            o[t++ >>> 0] = 224 | h >> 12, o[t++ >>> 0] = 128 | h >> 6 & 63, o[t++ >>> 0] = 128 | 63 & h;
          } else {
            if (t + 3 >= n) break;
            o[t++ >>> 0] = 240 | h >> 18, o[t++ >>> 0] = 128 | h >> 12 & 63, o[t++ >>> 0] = 128 | h >> 6 & 63, o[t++ >>> 0] = 128 | 63 & h, c++;
          }
        }
        o[t >>> 0] = 0, e = t - u;
      } else e = 0;
      return e;
    }, _e = (e) => {
      for (var t = 0, n = 0; n < e.length; ++n) {
        var o = e.charCodeAt(n);
        127 >= o ? t++ : 2047 >= o ? t += 2 : 55296 <= o && 57343 >= o ? (t += 4, ++n) : t += 3;
      }
      return t;
    };
    function Ti(e, t) {
      Pe(e >>>= 0, { name: t = Oe(t >>> 0), Wc(n) {
        var o = (d(), E)[n >>> 2 >>> 0];
        return o = lt(n + 4, o, true), ve(n), o;
      }, cd(n, o) {
        o instanceof ArrayBuffer && (o = new Uint8Array(o));
        var u = typeof o == "string";
        if (!(u || ArrayBuffer.isView(o) && o.BYTES_PER_ELEMENT == 1)) throw new pt("Cannot pass non-string to std::string");
        var c = u ? _e(o) : o.length, h = Ke(4 + c + 1), m = h + 4;
        return (d(), E)[h >>> 2 >>> 0] = c, u ? Ue(o, m, c + 1) : (d(), X).set(o, m >>> 0), n !== null && n.push(ve, h), h;
      }, bd: Lr, dd(n) {
        ve(n);
      } });
    }
    var Vn = globalThis.TextDecoder ? new TextDecoder("utf-16le") : void 0, vi = (e, t, n) => {
      if (e >>>= 1, 16 < (t = Ln((d(), K), e, t / 2, n)) - e && Vn) return Vn.decode((d(), K).slice(e, t));
      for (n = ""; e < t; ++e) {
        var o = (d(), K)[e >>> 0];
        n += String.fromCharCode(o);
      }
      return n;
    }, Ei = (e, t, n) => {
      if (n ??= 2147483647, 2 > n) return 0;
      var o = t;
      n = (n -= 2) < 2 * e.length ? n / 2 : e.length;
      for (var u = 0; u < n; ++u) {
        var c = e.charCodeAt(u);
        (d(), De)[t >>> 1 >>> 0] = c, t += 2;
      }
      return (d(), De)[t >>> 1 >>> 0] = 0, t - o;
    }, Si = (e) => 2 * e.length, xi = (e, t, n) => {
      var o = "";
      e >>>= 2;
      for (var u = 0; !(u >= t / 4); u++) {
        var c = (d(), E)[e + u >>> 0];
        if (!c && !n) break;
        o += String.fromCodePoint(c);
      }
      return o;
    }, Ai = (e, t, n) => {
      if (t >>>= 0, n ??= 2147483647, 4 > n) return 0;
      var o = t;
      n = o + n - 4;
      for (var u = 0; u < e.length; ++u) {
        var c = e.codePointAt(u);
        if (65535 < c && u++, (d(), I)[t >>> 2 >>> 0] = c, (t += 4) + 4 > n) break;
      }
      return (d(), I)[t >>> 2 >>> 0] = 0, t - o;
    }, Ii = (e) => {
      for (var t = 0, n = 0; n < e.length; ++n) 65535 < e.codePointAt(n) && n++, t += 4;
      return t;
    };
    function Li(e, t, n) {
      if (e >>>= 0, t >>>= 0, n = Oe(n >>>= 0), t === 2) var o = vi, u = Ei, c = Si;
      else o = xi, u = Ai, c = Ii;
      Pe(e, { name: n, Wc: (h) => {
        var m = (d(), E)[h >>> 2 >>> 0];
        return m = o(h + 4, m * t, true), ve(h), m;
      }, cd: (h, m) => {
        if (typeof m != "string") throw new pt(`Cannot pass non-string to C++ string type ${n}`);
        var y = c(m), x = Ke(4 + y + t);
        return (d(), E)[x >>> 2 >>> 0] = y / t, u(m, x + 4, y + t), h !== null && h.push(ve, x), x;
      }, bd: Lr, dd(h) {
        ve(h);
      } });
    }
    function Bi(e, t) {
      Pe(e >>>= 0, { we: true, name: t = Oe(t >>> 0), Wc: () => {
      }, cd: () => {
      } });
    }
    function Oi(e) {
      zr(e >>> 0, !f, 1, !s, 131072, false), wn();
    }
    var me = (e) => {
      if (!$) try {
        if (e(), !(0 < z)) try {
          i ? zt() && Vr(A) : vr(A);
        } catch (t) {
          t instanceof Tt || t == "unwind" || g(0, t);
        }
      } catch (t) {
        t instanceof Tt || t == "unwind" || g(0, t);
      }
    }, Mi = !Atomics.waitAsync || globalThis.navigator?.userAgent && 91 > Number((navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./) || [])[2]);
    function Br(e) {
      e >>>= 0, Mi || (Atomics.waitAsync((d(), I), e >>> 2, e).value.then(_t), e += 128, Atomics.store((d(), I), e >>> 2, 1));
    }
    var _t = () => me(() => {
      var e = zt();
      e && (Br(e), ko());
    });
    function Ci(e, t) {
      (e >>>= 0) == t >>> 0 ? setTimeout(_t) : i ? postMessage({ gd: e, $c: "checkMailbox" }) : (e = Je[e]) && e.postMessage({ $c: "checkMailbox" });
    }
    var Or = [];
    function Di(e, t, n, o, u) {
      for (t >>>= 0, u >>>= 0, Or.length = 0, n = u >>> 3, o = u + o >>> 3; n < o; ) {
        var c;
        c = (d(), pe)[n++ >>> 0] ? (d(), pe)[n++ >>> 0] : (d(), ae)[n++ >>> 0], Or.push(c);
      }
      return (t ? Yr[t] : xf[e])(...Or);
    }
    var Pi = () => {
      z = 0;
    };
    function Ui(e) {
      e >>>= 0, i ? postMessage({ $c: "cleanupThread", Le: e }) : yn(Je[e]);
    }
    function _i(e) {
    }
    var Rt = (e) => {
      try {
        e();
      } catch (t) {
        we(t);
      }
    };
    function Ri(e) {
      var t = (...n) => {
        Nt.push(e);
        try {
          return e(...n);
        } finally {
          $ || (Nt.pop(), Me && Ge === 1 && Nt.length === 0 && (Ge = 0, z += 1, Rt(Oa), typeof Fibers < "u" && Fibers.We()));
        }
      };
      return qn.set(e, t), t;
    }
    var Ge = 0, Me = null, jn = 0, Nt = [], Mr = /* @__PURE__ */ new Map(), Hn = /* @__PURE__ */ new Map(), qn = /* @__PURE__ */ new Map(), Ni = 0, Cr = null, Wi = [], Yn = (e) => (function(t) {
      if (!$) {
        if (Ge === 0) {
          var n = false, o = false;
          t((u = 0) => {
            if (!$ && (jn = u, n = true, o)) {
              Ge = 2, Rt(() => Ma(Me)), typeof MainLoop < "u" && MainLoop.se && MainLoop.resume(), u = false;
              try {
                var c = (function() {
                  var y = (d(), I)[Me + 8 >>> 2 >>> 0];
                  return y = Hn.get(y), y = qn.get(y), --z, y();
                })();
              } catch (y) {
                c = y, u = true;
              }
              var h = false;
              if (!Me) {
                var m = Cr;
                m && (Cr = null, (u ? m.reject : m.resolve)(c), h = true);
              }
              if (u && !h) throw c;
            }
          }), o = true, n || (Ge = 1, Me = (function() {
            var u = Ke(65548), c = u + 12;
            if ((d(), E)[u >>> 2 >>> 0] = c, (d(), E)[u + 4 >>> 2 >>> 0] = c + 65536, c = Nt[0], !Mr.has(c)) {
              var h = Ni++;
              Mr.set(c, h), Hn.set(h, c);
            }
            return c = Mr.get(c), (d(), I)[u + 8 >>> 2 >>> 0] = c, u;
          })(), typeof MainLoop < "u" && MainLoop.se && MainLoop.pause(), Rt(() => Ba(Me)));
        } else Ge === 2 ? (Ge = 0, Rt(Ca), ve(Me), Me = null, Wi.forEach(me)) : we(`invalid state: ${Ge}`);
        return jn;
      }
    })((t) => {
      e().then(t);
    });
    function ki(e) {
      return e >>>= 0, Yn(async () => {
        var t = await Te(e);
        return Ae(t);
      });
    }
    var Dr = [], Fi = (e) => {
      var t = Dr.length;
      return Dr.push(e), t;
    }, Gi = (e, t) => {
      for (var n = Array(e), o = 0; o < e; ++o) {
        var u = o, c = (d(), E)[t + 4 * o >>> 2 >>> 0], h = Ar[c];
        if (h === void 0) throw e = `parameter ${o}`, c = To(c), t = Oe(c), ve(c), new pt(`${e} has unknown type ${t}`);
        n[u] = h;
      }
      return n;
    }, $i = (e, t, n) => {
      var o = [];
      return e = e(o, n), o.length && ((d(), E)[t >>> 2 >>> 0] = Ae(o)), e;
    }, zi = {}, Wt = (e) => {
      var t = zi[e];
      return t === void 0 ? Oe(e) : t;
    };
    function Vi(e, t, n) {
      var [o, ...u] = Gi(e, t >>> 0);
      t = o.cd.bind(o);
      var c = u.map((y) => y.bd.bind(y));
      e--;
      var h = { toValue: Te };
      switch (e = c.map((y, x) => {
        var N = `argFromPtr${x}`;
        return h[N] = y, `${N}(args${x ? "+" + 8 * x : ""})`;
      }), n) {
        case 0:
          var m = "toValue(handle)";
          break;
        case 2:
          m = "new (toValue(handle))";
          break;
        case 3:
          m = "";
          break;
        case 1:
          h.getStringOrSymbol = Wt, m = "toValue(handle)[getStringOrSymbol(methodName)]";
      }
      return m += `(${e})`, o.we || (h.toReturnWire = t, h.emval_returnValue = $i, m = `return emval_returnValue(toReturnWire, destructorsRef, ${m})`), m = `return function (handle, methodName, destructorsRef, args) {
  ${m}
  }`, n = new Function(Object.keys(h), m)(...Object.values(h)), m = `methodCaller<(${u.map((y) => y.name)}) => ${o.name}>`, Fi(Object.defineProperty(n, "name", { value: m }));
    }
    function ji(e, t) {
      return t >>>= 0, (e = Te(e >>> 0)) == Te(t);
    }
    function Hi(e) {
      return (e >>>= 0) ? (e = Wt(e), Ae(globalThis[e])) : Ae(globalThis);
    }
    function qi(e) {
      return e = Wt(e >>> 0), Ae(r[e]);
    }
    function Yi(e, t) {
      return t >>>= 0, e = Te(e >>> 0), t = Te(t), Ae(e[t]);
    }
    function Ji(e) {
      9 < (e >>>= 0) && (Xe[e + 1] += 1);
    }
    function Jn(e, t, n, o, u) {
      return Dr[e >>> 0](t >>> 0, n >>> 0, o >>> 0, u >>> 0);
    }
    function Xi(e, t, n, o, u) {
      return Jn(e >>> 0, t >>> 0, n >>> 0, o >>> 0, u >>> 0);
    }
    function Zi() {
      return Ae([]);
    }
    function Ki(e) {
      e = Te(e >>> 0);
      for (var t = Array(e.length), n = 0; n < e.length; n++) t[n] = e[n];
      return Ae(t);
    }
    function Qi(e) {
      return Ae(Wt(e >>> 0));
    }
    function eu() {
      return Ae({});
    }
    function tu(e) {
      for (var t = Te(e >>>= 0); t.length; ) {
        var n = t.pop();
        t.pop()(n);
      }
      Ir(e);
    }
    function ru(e, t, n) {
      t >>>= 0, n >>>= 0, e = Te(e >>> 0), t = Te(t), n = Te(n), e[t] = n;
    }
    function nu(e, t) {
      e = ue(e), t >>>= 0, e = new Date(1e3 * e), (d(), I)[t >>> 2 >>> 0] = e.getUTCSeconds(), (d(), I)[t + 4 >>> 2 >>> 0] = e.getUTCMinutes(), (d(), I)[t + 8 >>> 2 >>> 0] = e.getUTCHours(), (d(), I)[t + 12 >>> 2 >>> 0] = e.getUTCDate(), (d(), I)[t + 16 >>> 2 >>> 0] = e.getUTCMonth(), (d(), I)[t + 20 >>> 2 >>> 0] = e.getUTCFullYear() - 1900, (d(), I)[t + 24 >>> 2 >>> 0] = e.getUTCDay(), e = (e.getTime() - Date.UTC(e.getUTCFullYear(), 0, 1, 0, 0, 0, 0)) / 864e5 | 0, (d(), I)[t + 28 >>> 2 >>> 0] = e;
    }
    var Xn = (e) => e % 4 == 0 && (e % 100 != 0 || e % 400 == 0), Zn = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], Kn = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    function ou(e, t) {
      e = ue(e), t >>>= 0, e = new Date(1e3 * e), (d(), I)[t >>> 2 >>> 0] = e.getSeconds(), (d(), I)[t + 4 >>> 2 >>> 0] = e.getMinutes(), (d(), I)[t + 8 >>> 2 >>> 0] = e.getHours(), (d(), I)[t + 12 >>> 2 >>> 0] = e.getDate(), (d(), I)[t + 16 >>> 2 >>> 0] = e.getMonth(), (d(), I)[t + 20 >>> 2 >>> 0] = e.getFullYear() - 1900, (d(), I)[t + 24 >>> 2 >>> 0] = e.getDay();
      var n = (Xn(e.getFullYear()) ? Zn : Kn)[e.getMonth()] + e.getDate() - 1 | 0;
      (d(), I)[t + 28 >>> 2 >>> 0] = n, (d(), I)[t + 36 >>> 2 >>> 0] = -60 * e.getTimezoneOffset(), n = new Date(e.getFullYear(), 6, 1).getTimezoneOffset();
      var o = new Date(e.getFullYear(), 0, 1).getTimezoneOffset();
      e = 0 | (n != o && e.getTimezoneOffset() == Math.min(o, n)), (d(), I)[t + 32 >>> 2 >>> 0] = e;
    }
    function au(e) {
      e >>>= 0;
      var t = new Date((d(), I)[e + 20 >>> 2 >>> 0] + 1900, (d(), I)[e + 16 >>> 2 >>> 0], (d(), I)[e + 12 >>> 2 >>> 0], (d(), I)[e + 8 >>> 2 >>> 0], (d(), I)[e + 4 >>> 2 >>> 0], (d(), I)[e >>> 2 >>> 0], 0), n = (d(), I)[e + 32 >>> 2 >>> 0], o = t.getTimezoneOffset(), u = new Date(t.getFullYear(), 6, 1).getTimezoneOffset(), c = new Date(t.getFullYear(), 0, 1).getTimezoneOffset(), h = Math.min(c, u);
      return 0 > n ? (d(), I)[e + 32 >>> 2 >>> 0] = +(u != c && h == o) : 0 < n != (h == o) && (u = Math.max(c, u), t.setTime(t.getTime() + 6e4 * ((0 < n ? h : u) - o))), (d(), I)[e + 24 >>> 2 >>> 0] = t.getDay(), n = (Xn(t.getFullYear()) ? Zn : Kn)[t.getMonth()] + t.getDate() - 1 | 0, (d(), I)[e + 28 >>> 2 >>> 0] = n, (d(), I)[e >>> 2 >>> 0] = t.getSeconds(), (d(), I)[e + 4 >>> 2 >>> 0] = t.getMinutes(), (d(), I)[e + 8 >>> 2 >>> 0] = t.getHours(), (d(), I)[e + 12 >>> 2 >>> 0] = t.getDate(), (d(), I)[e + 16 >>> 2 >>> 0] = t.getMonth(), (d(), I)[e + 20 >>> 2 >>> 0] = t.getYear(), e = t.getTime(), BigInt(isNaN(e) ? -1 : e / 1e3);
    }
    function Qn(e, t, n, o, u, c, h) {
      return i ? H(16, 1, e, t, n, o, u, c, h) : -52;
    }
    function eo(e, t, n, o, u, c) {
      if (i) return H(17, 1, e, t, n, o, u, c);
    }
    var Et = {}, su = () => performance.timeOrigin + performance.now();
    function to(e, t) {
      if (i) return H(18, 1, e, t);
      if (Et[e] && (clearTimeout(Et[e].id), delete Et[e]), !t) return 0;
      var n = setTimeout(() => {
        delete Et[e], me(() => Wo(e, performance.timeOrigin + performance.now()));
      }, t);
      return Et[e] = { id: n, Ve: t }, 0;
    }
    function iu(e, t, n, o) {
      e >>>= 0, t >>>= 0, n >>>= 0, o >>>= 0;
      var u = (/* @__PURE__ */ new Date()).getFullYear(), c = new Date(u, 0, 1).getTimezoneOffset();
      u = new Date(u, 6, 1).getTimezoneOffset();
      var h = Math.max(c, u);
      (d(), E)[e >>> 2 >>> 0] = 60 * h, (d(), I)[t >>> 2 >>> 0] = +(c != u), e = (t = (m) => {
        var y = Math.abs(m);
        return `UTC${0 <= m ? "-" : "+"}${String(Math.floor(y / 60)).padStart(2, "0")}${String(y % 60).padStart(2, "0")}`;
      })(c), t = t(u), u < c ? (Ue(e, n, 17), Ue(t, o, 17)) : (Ue(e, o, 17), Ue(t, n, 17));
    }
    var uu = () => Date.now(), fu = 1;
    function cu(e, t, n) {
      if (n >>>= 0, !(0 <= e && 3 >= e)) return 28;
      if (e === 0) e = Date.now();
      else {
        if (!fu) return 52;
        e = performance.timeOrigin + performance.now();
      }
      return e = Math.round(1e6 * e), (d(), pe)[n >>> 3 >>> 0] = BigInt(e), 0;
    }
    var Pr = [], ro = (e, t) => {
      Pr.length = 0;
      for (var n; n = (d(), X)[e++ >>> 0]; ) {
        var o = n != 105;
        t += (o &= n != 112) && t % 8 ? 4 : 0, Pr.push(n == 112 ? (d(), E)[t >>> 2 >>> 0] : n == 106 ? (d(), pe)[t >>> 3 >>> 0] : n == 105 ? (d(), I)[t >>> 2 >>> 0] : (d(), ae)[t >>> 3 >>> 0]), t += o ? 8 : 4;
      }
      return Pr;
    };
    function du(e, t, n) {
      return e >>>= 0, t = ro(t >>> 0, n >>> 0), Yr[e](...t);
    }
    function lu(e, t, n) {
      return e >>>= 0, t = ro(t >>> 0, n >>> 0), Yr[e](...t);
    }
    var pu = () => {
    };
    function mu(e, t) {
      return O(lt(e >>> 0, t >>> 0));
    }
    var hu = () => {
      throw z += 1, "unwind";
    };
    function bu() {
      return 4294901760;
    }
    var gu = () => 1, yu = () => navigator.hardwareConcurrency, Ze = {}, no = (e) => {
      var t = _e(e) + 1, n = Ke(t);
      return n && Ue(e, n, t), n;
    }, kt = (e) => {
      var t;
      return (t = /\bwasm-function\[\d+\]:(0x[0-9a-f]+)/.exec(e)) ? +t[1] : (t = /:(\d+):\d+(?:\)|$)/.exec(e)) ? 2147483648 | +t[1] : 0;
    }, oo = (e) => {
      for (var t of e) (e = kt(t)) && (Ze[e] = t);
    };
    function wu() {
      var e = Error().stack.toString().split(`
`);
      return e[0] == "Error" && e.shift(), oo(e), Ze.ee = kt(e[3]), Ze.xe = e, Ze.ee;
    }
    function Ft(e) {
      if (!(e = Ze[e >>> 0])) return 0;
      var t;
      if (t = /^\s+at .*\.wasm\.(.*) \(.*\)$/.exec(e)) e = t[1];
      else if (t = /^\s+at (.*) \(.*\)$/.exec(e)) e = t[1];
      else {
        if (!(t = /^(.+?)@/.exec(e))) return 0;
        e = t[1];
      }
      return ve(Ft.ne ?? 0), Ft.ne = no(e), Ft.ne;
    }
    function Tu(e) {
      e >>>= 0;
      var t = (d(), X).length;
      if (e <= t || 4294901760 < e) return false;
      for (var n = 1; 4 >= n; n *= 2) {
        var o = t * (1 + 0.2 / n);
        o = Math.min(o, e + 100663296);
        e: {
          o = (Math.min(4294901760, 65536 * Math.ceil(Math.max(e, o) / 65536)) - Fe.buffer.byteLength + 65535) / 65536 | 0;
          try {
            Fe.grow(o), se();
            var u = 1;
            break e;
          } catch {
          }
          u = void 0;
        }
        if (u) return true;
      }
      return false;
    }
    function vu(e, t, n) {
      if (e >>>= 0, t >>>= 0, Ze.ee == e) var o = Ze.xe;
      else (o = Error().stack.toString().split(`
`))[0] == "Error" && o.shift(), oo(o);
      for (var u = 3; o[u] && kt(o[u]) != e; ) ++u;
      for (e = 0; e < n && o[e + u]; ++e) (d(), I)[t + 4 * e >>> 2 >>> 0] = kt(o[e + u]);
      return e;
    }
    var Ce = (e) => {
      var t = _e(e) + 1, n = Vt(t);
      return Ue(e, n, t), n;
    }, mt = (e) => (d(), E)[e >>> 2 >>> 0] + 4294967296 * (d(), I)[e + 4 >>> 2 >>> 0], fe = [], ao = (e, t) => {
      fe[e >>> 0] = t;
    }, Re = [], Gt = [], ht = (e, t) => {
      Gt[e] = new Promise((n) => t.finally(() => n(e)));
    }, B = (e) => {
      if (e) return fe[e >>> 0];
    }, Ur = (e, t) => {
      for (e = (d(), E)[e >>> 2 >>> 0]; e; e = (d(), E)[e >>> 2 >>> 0]) t[(d(), I)[e + 4 >>> 2 >>> 0]](e);
    }, $t = (e, t, n) => {
      (d(), E)[e >>> 2 >>> 0] = t, (d(), E)[e + 4 >>> 2 >>> 0] = n;
    }, so = (e) => {
      var t = (d(), E)[e >>> 2 >>> 0];
      return e = (d(), E)[e + 4 >>> 2 >>> 0], lt(t, e);
    }, Ie = (e) => {
      var t = (d(), E)[e >>> 2 >>> 0];
      return e = (d(), E)[e + 4 >>> 2 >>> 0], t ? lt(t, e) : e === 0 ? "" : void 0;
    }, Eu = (e) => {
      var t = Ie(e + 4), n = (n = (d(), E)[e + 12 >>> 2 >>> 0]) ? B(n) : "auto";
      if (e += 16) {
        var o = B((d(), E)[e + 4 >>> 2 >>> 0]), u = (d(), E)[e + 16 >>> 2 >>> 0], c = (d(), E)[e + 20 >>> 2 >>> 0];
        if (u) {
          for (var h = {}, m = 0; m < u; ++m) {
            var y = c + 24 * m;
            h[so(y + 4)] = (d(), ae)[y + 16 >>> 3 >>> 0];
          }
          u = h;
        } else u = void 0;
        e = { module: o, constants: u, entryPoint: Ie(e + 8) };
      } else e = void 0;
      return { label: t, layout: n, compute: e };
    }, io = (e, t) => {
      function n(c, h, m, y = 0) {
        c = e[c] ?? y, (d(), E)[h + m >>> 2 >>> 0] = c;
      }
      function o(c, h, m, y = 0) {
        h += m, c = e[c] ?? y, (d(), E)[h >>> 2 >>> 0] = c, y = (d(), E)[h >>> 2 >>> 0], (d(), E)[h + 4 >>> 2 >>> 0] = (c - y) / 4294967296;
      }
      var u = (d(), E)[t >>> 2 >>> 0];
      n("maxTextureDimension1D", t, 4), n("maxTextureDimension2D", t, 8), n("maxTextureDimension3D", t, 12), n("maxTextureArrayLayers", t, 16), n("maxBindGroups", t, 20), n("maxBindGroupsPlusVertexBuffers", t, 24), n("maxBindingsPerBindGroup", t, 28), n("maxDynamicUniformBuffersPerPipelineLayout", t, 32), n("maxDynamicStorageBuffersPerPipelineLayout", t, 36), n("maxSampledTexturesPerShaderStage", t, 40), n("maxSamplersPerShaderStage", t, 44), n("maxStorageBuffersPerShaderStage", t, 48), n("maxStorageTexturesPerShaderStage", t, 52), n("maxUniformBuffersPerShaderStage", t, 56), n("minUniformBufferOffsetAlignment", t, 80), n("minStorageBufferOffsetAlignment", t, 84), o("maxUniformBufferBindingSize", t, 64), o("maxStorageBufferBindingSize", t, 72), n("maxVertexBuffers", t, 88), o("maxBufferSize", t, 96), n("maxVertexAttributes", t, 104), n("maxVertexBufferArrayStride", t, 108), n("maxInterStageShaderVariables", t, 112), n("maxColorAttachments", t, 116), n("maxColorAttachmentBytesPerSample", t, 120), n("maxComputeWorkgroupStorageSize", t, 124), n("maxComputeInvocationsPerWorkgroup", t, 128), n("maxComputeWorkgroupSizeX", t, 132), n("maxComputeWorkgroupSizeY", t, 136), n("maxComputeWorkgroupSizeZ", t, 140), n("maxComputeWorkgroupsPerDimension", t, 144), n("maxImmediateSize", t, 148), u !== 0 && (d(), n("maxStorageBuffersInVertexStage", u, 8, e.maxStorageBuffersPerShaderStage), n("maxStorageBuffersInFragmentStage", u, 16, e.maxStorageBuffersPerShaderStage), n("maxStorageTexturesInVertexStage", u, 12, e.maxStorageTexturesPerShaderStage), n("maxStorageTexturesInFragmentStage", u, 20, e.maxStorageTexturesPerShaderStage));
    }, Su = (e, t) => {
      (d(), E)[t + 52 >>> 2 >>> 0] = e.subgroupMinSize, (d(), E)[t + 56 >>> 2 >>> 0] = e.subgroupMaxSize;
      var n = no(e.vendor + e.architecture + e.device + e.description), o = _e(e.vendor);
      $t(t + 4, n, o), n += o, o = _e(e.architecture), $t(t + 12, n, o), n += o, o = _e(e.device), $t(t + 20, n, o), n += o, o = _e(e.description), $t(t + 28, n, o), n += o, (d(), I)[t + 36 >>> 2 >>> 0] = 2, n = e.isFallbackAdapter ? 3 : 4, (d(), I)[t + 40 >>> 2 >>> 0] = n, (d(), E)[t + 44 >>> 2 >>> 0] = 0, (d(), E)[t + 48 >>> 2 >>> 0] = 0, Ur(t, { 327739: (u) => {
        let c = 0, h = 0;
        if (e.subgroupMatrixConfigs) {
          c = e.subgroupMatrixConfigs.length, h = Ke(20 * c);
          for (let [m, y] of e.subgroupMatrixConfigs.entries()) {
            let x = h + 20 * m, N = fo.indexOf(y.componentType), F = fo.indexOf(y.resultComponentType);
            (d(), I)[x >>> 2 >>> 0] = N, (d(), I)[x + 4 >>> 2 >>> 0] = F, (d(), E)[x + 8 >>> 2 >>> 0] = y.M, (d(), E)[x + 12 >>> 2 >>> 0] = y.N, (d(), E)[x + 16 >>> 2 >>> 0] = y.K;
          }
        }
        (d(), E)[u + 12 >>> 2 >>> 0] = h, (d(), E)[u + 8 >>> 2 >>> 0] = c;
      } });
    }, xu = [, , "uniform", "storage", "read-only-storage"], Au = [, "validation", "out-of-memory", "internal"], Iu = [, "compatibility", "core"], uo = { 1: "core-features-and-limits", 2: "depth-clip-control", 3: "depth32float-stencil8", 4: "texture-compression-bc", 5: "texture-compression-bc-sliced-3d", 6: "texture-compression-etc2", 7: "texture-compression-astc", 8: "texture-compression-astc-sliced-3d", 9: "timestamp-query", 10: "indirect-first-instance", 11: "shader-f16", 12: "rg11b10ufloat-renderable", 13: "bgra8unorm-storage", 14: "float32-filterable", 15: "float32-blendable", 16: "clip-distances", 17: "dual-source-blending", 18: "subgroups", 19: "texture-formats-tier1", 20: "texture-formats-tier2", 21: "primitive-index", 22: "texture-component-swizzle", 23: "subgroup-size-control", 327692: "chromium-experimental-unorm16-texture-formats", 327729: "chromium-experimental-multi-draw-indirect", 327732: "chromium-experimental-subgroup-matrix" }, Lu = [, "low-power", "high-performance"], Bu = [, "occlusion", "timestamp"], Ou = [, , "filtering", "non-filtering", "comparison"], Mu = [, , "write-only", "read-only", "read-write"], fo = [, "f32", "f16", "u32", "i32", "u8", "i8"], Cu = [, "r8unorm", "r8snorm", "r8uint", "r8sint", "r16unorm", "r16snorm", "r16uint", "r16sint", "r16float", "rg8unorm", "rg8snorm", "rg8uint", "rg8sint", "r32float", "r32uint", "r32sint", "rg16unorm", "rg16snorm", "rg16uint", "rg16sint", "rg16float", "rgba8unorm", "rgba8unorm-srgb", "rgba8snorm", "rgba8uint", "rgba8sint", "bgra8unorm", "bgra8unorm-srgb", "rgb10a2uint", "rgb10a2unorm", "rg11b10ufloat", "rgb9e5ufloat", "rg32float", "rg32uint", "rg32sint", "rgba16unorm", "rgba16snorm", "rgba16uint", "rgba16sint", "rgba16float", "rgba32float", "rgba32uint", "rgba32sint", "stencil8", "depth16unorm", "depth24plus", "depth24plus-stencil8", "depth32float", "depth32float-stencil8", "bc1-rgba-unorm", "bc1-rgba-unorm-srgb", "bc2-rgba-unorm", "bc2-rgba-unorm-srgb", "bc3-rgba-unorm", "bc3-rgba-unorm-srgb", "bc4-r-unorm", "bc4-r-snorm", "bc5-rg-unorm", "bc5-rg-snorm", "bc6h-rgb-ufloat", "bc6h-rgb-float", "bc7-rgba-unorm", "bc7-rgba-unorm-srgb", "etc2-rgb8unorm", "etc2-rgb8unorm-srgb", "etc2-rgb8a1unorm", "etc2-rgb8a1unorm-srgb", "etc2-rgba8unorm", "etc2-rgba8unorm-srgb", "eac-r11unorm", "eac-r11snorm", "eac-rg11unorm", "eac-rg11snorm", "astc-4x4-unorm", "astc-4x4-unorm-srgb", "astc-5x4-unorm", "astc-5x4-unorm-srgb", "astc-5x5-unorm", "astc-5x5-unorm-srgb", "astc-6x5-unorm", "astc-6x5-unorm-srgb", "astc-6x6-unorm", "astc-6x6-unorm-srgb", "astc-8x5-unorm", "astc-8x5-unorm-srgb", "astc-8x6-unorm", "astc-8x6-unorm-srgb", "astc-8x8-unorm", "astc-8x8-unorm-srgb", "astc-10x5-unorm", "astc-10x5-unorm-srgb", "astc-10x6-unorm", "astc-10x6-unorm-srgb", "astc-10x8-unorm", "astc-10x8-unorm-srgb", "astc-10x10-unorm", "astc-10x10-unorm-srgb", "astc-12x10-unorm", "astc-12x10-unorm-srgb", "astc-12x12-unorm", "astc-12x12-unorm-srgb"], Du = [, , "float", "unfilterable-float", "depth", "sint", "uint"], co = [, "1d", "2d", "2d-array", "cube", "cube-array", "3d"], Pu = { undefined: 1, unknown: 1, destroyed: 2 };
    function Uu(e, t, n, o, u, c) {
      t = ue(t), n = ue(n), o >>>= 0, u >>>= 0, c >>>= 0;
      var h = B(e >>> 0);
      if (e = {}, c) {
        var m = (d(), E)[c + 12 >>> 2 >>> 0];
        if (m) {
          var y = (d(), E)[c + 16 >>> 2 >>> 0];
          e.requiredFeatures = Array.from((d(), E).subarray(y >>> 2 >>> 0, y + 4 * m >>> 2 >>> 0), (L) => uo[L]);
        }
        if (m = (d(), E)[c + 20 >>> 2 >>> 0]) {
          let L = function(he, de, Qe, et = false) {
            de += Qe, (de = (d(), E)[de >>> 2 >>> 0]) == 4294967295 || et && de == 0 || (x[he] = de);
          }, q = function(he, de, Qe) {
            de += Qe, Qe = (d(), E)[de >>> 2 >>> 0];
            var et = (d(), E)[de + 4 >>> 2 >>> 0];
            Qe == 4294967295 && et == 4294967295 || (x[he] = mt(de));
          };
          var N = L, F = q;
          y = (d(), E)[m >>> 2 >>> 0];
          var x = {};
          L("maxTextureDimension1D", m, 4), L("maxTextureDimension2D", m, 8), L("maxTextureDimension3D", m, 12), L("maxTextureArrayLayers", m, 16), L("maxBindGroups", m, 20), L("maxBindGroupsPlusVertexBuffers", m, 24), L("maxBindingsPerBindGroup", m, 28), L("maxDynamicUniformBuffersPerPipelineLayout", m, 32), L("maxDynamicStorageBuffersPerPipelineLayout", m, 36), L("maxSampledTexturesPerShaderStage", m, 40), L("maxSamplersPerShaderStage", m, 44), L("maxStorageBuffersPerShaderStage", m, 48), L("maxStorageTexturesPerShaderStage", m, 52), L("maxUniformBuffersPerShaderStage", m, 56), L("minUniformBufferOffsetAlignment", m, 80), L("minStorageBufferOffsetAlignment", m, 84), q("maxUniformBufferBindingSize", m, 64), q("maxStorageBufferBindingSize", m, 72), L("maxVertexBuffers", m, 88), q("maxBufferSize", m, 96), L("maxVertexAttributes", m, 104), L("maxVertexBufferArrayStride", m, 108), L("maxInterStageShaderVariables", m, 112), L("maxColorAttachments", m, 116), L("maxColorAttachmentBytesPerSample", m, 120), L("maxComputeWorkgroupStorageSize", m, 124), L("maxComputeInvocationsPerWorkgroup", m, 128), L("maxComputeWorkgroupSizeX", m, 132), L("maxComputeWorkgroupSizeY", m, 136), L("maxComputeWorkgroupSizeZ", m, 140), L("maxComputeWorkgroupsPerDimension", m, 144), L("maxImmediateSize", m, 148, true), y !== 0 && (d(), "maxStorageBuffersInVertexStage" in GPUSupportedLimits.prototype && (L("maxStorageBuffersInVertexStage", y, 8), L("maxStorageTexturesInVertexStage", y, 12), L("maxStorageBuffersInFragmentStage", y, 16), L("maxStorageTexturesInFragmentStage", y, 20))), e.requiredLimits = x;
        }
        (m = (d(), E)[c + 24 >>> 2 >>> 0]) && (m = { label: Ie(m + 4) }, e.defaultQueue = m), e.label = Ie(c + 4);
      }
      z += 1, ht(t, h.requestDevice(e).then((L) => {
        --z, me(() => {
          fe[u >>> 0] = L.queue, fe[o >>> 0] = L, z += 1, ht(n, L.lost.then((q) => {
            me(() => {
              L.onuncapturederror = () => {
              };
              var he = P(), de = Ce(q.message);
              kr(n, Pu[q.reason], de), D(he);
            }), --z;
          })), L.onuncapturederror = (q) => {
            var he = 5;
            q.error instanceof GPUValidationError ? he = 2 : q.error instanceof GPUOutOfMemoryError ? he = 3 : q.error instanceof GPUInternalError && (he = 4);
            var de = P();
            q = Ce(q.error.message), Uo(o, he, q), D(de);
          }, "adapterInfo" in L || (L.adapterInfo = h.info), $r(t, 1, o, 0);
        });
      }, (L) => {
        --z, me(() => {
          var q = P(), he = Ce(L.message);
          $r(t, 3, o, he), n && kr(n, 4, he), D(q);
        });
      }));
    }
    function _u(e) {
      var t = B(e >>>= 0), n = Re[e];
      if (n) {
        for (var o = 0; o < n.length; ++o) n[o]();
        delete Re[e];
      }
      t.destroy();
    }
    function Ru(e, t, n) {
      n >>>= 0;
      var o = B(e >>>= 0);
      n == 4294967295 && (n = void 0);
      try {
        var u = o.getMappedRange(t >>> 0, n);
      } catch {
        return 0;
      }
      var c = jr(16, u.byteLength);
      return (d(), X).set(new Uint8Array(u), c >>> 0), Re[e].push(() => ve(c)), c;
    }
    function Nu(e, t, n) {
      n >>>= 0;
      var o = B(e >>>= 0);
      n == 4294967295 && (n = void 0);
      try {
        var u = o.getMappedRange(t >>> 0, n);
      } catch {
        return 0;
      }
      var c = jr(16, u.byteLength);
      return (d(), X).fill(0, c, u.byteLength), Re[e].push(() => {
        new Uint8Array(u).set((d(), X).subarray(c >>> 0, c + u.byteLength >>> 0)), ve(c);
      }), c;
    }
    function Wu(e, t, n, o, u) {
      e >>>= 0, t = ue(t), n = ue(n), u >>>= 0;
      var c = B(e);
      Re[e] = [], u == 4294967295 && (u = void 0), z += 1, ht(t, c.mapAsync(n, o >>> 0, u).then(() => {
        --z, me(() => {
          Fr(t, 1, 0);
        });
      }, (h) => {
        --z, me(() => {
          P();
          var m = Ce(h.message);
          Fr(t, h.name === "AbortError" ? 4 : h.name === "OperationError" ? 3 : 0, m), delete Re[e];
        });
      }));
    }
    function ku(e) {
      var t = B(e >>>= 0), n = Re[e];
      if (n) {
        for (var o = 0; o < n.length; ++o) n[o]();
        delete Re[e], t.unmap();
      }
    }
    function Fu(e) {
      delete fe[e >>> 0];
    }
    function Gu(e, t, n) {
      e >>>= 0, t >>>= 0, n >>>= 0;
      var o = !!(d(), E)[t + 32 >>> 2 >>> 0];
      t = { label: Ie(t + 4), usage: (d(), E)[t + 16 >>> 2 >>> 0], size: mt(t + 24), mappedAtCreation: o }, e = B(e);
      try {
        var u = e.createBuffer(t);
      } catch {
        return false;
      }
      return fe[n >>> 0] = u, o && (Re[n] = []), true;
    }
    function $u(e, t, n, o) {
      e >>>= 0, t = ue(t), o >>>= 0, n = Eu(n >>> 0), e = B(e), z += 1, ht(t, e.createComputePipelineAsync(n).then((u) => {
        --z, me(() => {
          fe[o >>> 0] = u, Wr(t, 1, o, 0);
        });
      }, (u) => {
        --z, me(() => {
          var c = P(), h = Ce(u.message);
          Wr(t, u.reason === "validation" ? 3 : u.reason === "internal" ? 4 : 0, o, h), D(c);
        });
      }));
    }
    function zu(e, t, n) {
      e >>>= 0, t >>>= 0, n >>>= 0;
      var o = (d(), E)[t >>> 2 >>> 0], u = (d(), I)[o + 4 >>> 2 >>> 0];
      t = { label: Ie(t + 4), code: "" }, u === 2 && (t.code = so(o + 8)), e = B(e).createShaderModule(t), fe[n >>> 0] = e;
    }
    var Vu = (e) => {
      (e = B(e)).onuncapturederror = null, e.destroy();
    };
    function ju(e, t) {
      t = ue(t), e = B(e >>> 0), z += 1, ht(t, e.popErrorScope().then((n) => {
        --z, me(() => {
          var o = 5;
          n ? n instanceof GPUValidationError ? o = 2 : n instanceof GPUOutOfMemoryError ? o = 3 : n instanceof GPUInternalError && (o = 4) : o = 1;
          var u = P(), c = n ? Ce(n.message) : 0;
          Gr(t, 1, o, c), D(u);
        });
      }, (n) => {
        --z, me(() => {
          var o = P(), u = Ce(n.message);
          Gr(t, 1, 5, u), D(o);
        });
      }));
    }
    function Hu(e, t, n, o) {
      if (t = ue(t), o >>>= 0, n >>>= 0) {
        var u = { featureLevel: Iu[(d(), I)[n + 4 >>> 2 >>> 0]], powerPreference: Lu[(d(), I)[n + 8 >>> 2 >>> 0]], forceFallbackAdapter: !!(d(), E)[n + 12 >>> 2 >>> 0] };
        (e = (d(), E)[n >>> 2 >>> 0]) !== 0 && (d(), u.Ye = !!(d(), E)[e + 8 >>> 2 >>> 0]);
      }
      "gpu" in navigator ? (z += 1, ht(t, navigator.gpu.requestAdapter(u).then((c) => {
        --z, me(() => {
          if (c) fe[o >>> 0] = c, St(t, 1, o, 0);
          else {
            var h = P(), m = Ce("WebGPU not available on this browser (requestAdapter returned null)");
            St(t, 3, o, m), D(h);
          }
        });
      }, (c) => {
        --z, me(() => {
          var h = P(), m = Ce(c.message);
          St(t, 4, o, m), D(h);
        });
      }))) : (u = P(), e = Ce("WebGPU not available on this browser (navigator.gpu is not available)"), St(t, 3, o, e), D(u));
    }
    function qu(e, t, n) {
      return e >>>= 0, t >>>= 0, n >>>= 0, Yn(async () => {
        var o = [];
        if (n) {
          var u = (d(), I)[n >>> 2 >>> 0];
          o.length = t + 1, o[t] = new Promise((m) => setTimeout(m, u, 0));
        } else o.length = t;
        for (var c = 0; c < t; ++c) {
          var h = mt(e + 8 * c);
          if (!(h in Gt)) return h;
          o[c] = Gt[h];
        }
        return o = await Promise.race(o), delete Gt[o], o;
      });
    }
    var _r, Rr = {}, lo = () => {
      if (!_r) {
        var e, t = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: (globalThis.navigator?.language ?? "C").replace("-", "_") + ".UTF-8", _: "./this.program" };
        for (e in Rr) Rr[e] === void 0 ? delete t[e] : t[e] = Rr[e];
        var n = [];
        for (e in t) n.push(`${e}=${t[e]}`);
        _r = n;
      }
      return _r;
    };
    function po(e, t) {
      if (i) return H(19, 1, e, t);
      e >>>= 0, t >>>= 0;
      var n, o = 0, u = 0;
      for (n of lo()) {
        var c = t + o;
        (d(), E)[e + u >>> 2 >>> 0] = c, o += Ue(n, c, 1 / 0) + 1, u += 4;
      }
      return 0;
    }
    function mo(e, t) {
      if (i) return H(20, 1, e, t);
      e >>>= 0, t >>>= 0;
      var n = lo();
      for (var o of ((d(), E)[e >>> 2 >>> 0] = n.length, e = 0, n)) e += _e(o) + 1;
      return (d(), E)[t >>> 2 >>> 0] = e, 0;
    }
    function ho(e) {
      return i ? H(21, 1, e) : 52;
    }
    function bo(e, t, n, o, u) {
      return i ? H(22, 1, e, t, n, o, u) : 52;
    }
    function go(e, t, n, o) {
      return i ? H(23, 1, e, t, n, o) : 52;
    }
    function yo(e, t, n, o) {
      return i ? H(24, 1, e, t, n, o) : 70;
    }
    var Yu = [null, [], []];
    function wo(e, t, n, o) {
      if (i) return H(25, 1, e, t, n, o);
      t >>>= 0, n >>>= 0, o >>>= 0;
      for (var u = 0, c = 0; c < n; c++) {
        var h = (d(), E)[t >>> 2 >>> 0], m = (d(), E)[t + 4 >>> 2 >>> 0];
        t += 8;
        for (var y = 0; y < m; y++) {
          var x = e, N = (d(), X)[h + y >>> 0], F = Yu[x];
          N === 0 || N === 10 ? ((x === 1 ? Y : O)(Bn(F)), F.length = 0) : F.push(N);
        }
        u += m;
      }
      return (d(), E)[o >>> 2 >>> 0] = u, 0;
    }
    function Ju(e) {
      return e >>> 0;
    }
    function Xu(e, t) {
      return io(B(e >>> 0).limits, t >>> 0), 1;
    }
    function Zu(e, t) {
      return B(e >>> 0).features.has(uo[t]);
    }
    function Ku(e) {
      return BigInt(B(e >>> 0).size);
    }
    function Qu(e) {
      return BigInt(B(e >>> 0).usage);
    }
    function ef(e, t) {
      if (e >>>= 0, t >>>= 0) {
        var n = Ie(t + 4);
        n = { label: n, timestampWrites: t = (t = (d(), E)[t + 12 >>> 2 >>> 0]) !== 0 ? { querySet: B((d(), E)[t + 4 >>> 2 >>> 0]), beginningOfPassWriteIndex: (d(), E)[t + 8 >>> 2 >>> 0], endOfPassWriteIndex: (d(), E)[t + 12 >>> 2 >>> 0] } : void 0 };
      }
      return t = B(e), e = Bo(0), n = t.beginComputePass(n), fe[e >>> 0] = n, e;
    }
    function tf(e, t, n, o) {
      n = ue(n), (o = ue(o)) == -1 && (o = void 0), (e = B(e >>> 0)).clearBuffer(B(t >>> 0), n, o);
    }
    function rf(e, t, n, o, u, c) {
      n = ue(n), u = ue(u), c = ue(c), B(e >>> 0).copyBufferToBuffer(B(t >>> 0), n, B(o >>> 0), u, c);
    }
    function nf(e) {
      var t = B(e >>> 0);
      return e = Io(0), t = t.finish(), fe[e >>> 0] = t, e;
    }
    function of(e, t, n, o, u, c) {
      c = ue(c), B(e >>> 0).resolveQuerySet(B(t >>> 0), n, o, B(u >>> 0), c);
    }
    function af(e, t, n, o) {
      B(e >>> 0).dispatchWorkgroups(t, n, o);
    }
    function sf(e, t, n) {
      n = ue(n), B(e >>> 0).dispatchWorkgroupsIndirect(B(t >>> 0), n);
    }
    function uf(e) {
      B(e >>> 0).end();
    }
    function ff(e, t, n, o, u) {
      o >>>= 0, u >>>= 0, e = B(e >>> 0), n = B(n >>> 0), o == 0 ? e.setBindGroup(t, n) : e.setBindGroup(t, n, (d(), E), u >>> 2, o);
    }
    function cf(e, t) {
      B(e >>> 0).setPipeline(B(t >>> 0));
    }
    function df(e, t, n) {
      B(e >>> 0).Xe(B(t >>> 0), n);
    }
    function lf(e, t) {
      function n(u) {
        var c = (d(), E)[u + 8 >>> 2 >>> 0], h = (d(), E)[u + 32 >>> 2 >>> 0], m = (d(), E)[u + 36 >>> 2 >>> 0], y = 0;
        return Ur(u, { 14: (x) => {
          y = (d(), E)[x + 8 >>> 2 >>> 0];
        } }), c ? ((h = mt(u + 24)) == -1 && (h = void 0), c = { buffer: B(c), offset: mt(u + 16), size: h }) : c = B(h || m || y), { binding: (d(), E)[u + 4 >>> 2 >>> 0], resource: c };
      }
      e >>>= 0, t = { label: Ie((t >>>= 0) + 4), layout: B((d(), E)[t + 12 >>> 2 >>> 0]), entries: (function(u, c) {
        for (var h = [], m = 0; m < u; ++m) h.push(n(c + 40 * m));
        return h;
      })((d(), E)[t + 16 >>> 2 >>> 0], (d(), E)[t + 20 >>> 2 >>> 0]) }, e = B(e);
      var o = xo(0);
      return ao(o, e.createBindGroup(t)), o;
    }
    function pf(e, t) {
      function n(y) {
        var x = (d(), E)[y + 4 >>> 2 >>> 0];
        if (x) return { type: xu[x], hasDynamicOffset: !!(d(), E)[y + 8 >>> 2 >>> 0], minBindingSize: mt(y + 16) };
      }
      function o(y) {
        if (y = (d(), E)[y + 4 >>> 2 >>> 0]) return { type: Ou[y] };
      }
      function u(y) {
        var x = (d(), E)[y + 4 >>> 2 >>> 0];
        if (x) return { sampleType: Du[x], viewDimension: co[(d(), I)[y + 8 >>> 2 >>> 0]], multisampled: !!(d(), E)[y + 12 >>> 2 >>> 0] };
      }
      function c(y) {
        var x = (d(), E)[y + 4 >>> 2 >>> 0];
        if (x) return { access: Mu[x], format: Cu[(d(), I)[y + 8 >>> 2 >>> 0]], viewDimension: co[(d(), I)[y + 12 >>> 2 >>> 0]] };
      }
      function h(y) {
        var x = { binding: (d(), E)[y + 4 >>> 2 >>> 0], visibility: (d(), E)[y + 8 >>> 2 >>> 0], buffer: n(y + 24), sampler: o(y + 48), texture: u(y + 56), storageTexture: c(y + 72) };
        return Ur(y, { 13: () => {
          x.externalTexture = {};
        } }), x;
      }
      e >>>= 0, t = { label: Ie((t >>>= 0) + 4), entries: (function(y, x) {
        for (var N = [], F = 0; F < y; ++F) N.push(h(x + 88 * F));
        return N;
      })((d(), E)[t + 12 >>> 2 >>> 0], (d(), E)[t + 16 >>> 2 >>> 0]) }, e = B(e);
      var m = Ao(0);
      return ao(m, e.createBindGroupLayout(t)), m;
    }
    function mf(e, t) {
      var n;
      return e >>>= 0, (t >>>= 0) && (n = { label: Ie(t + 4) }), t = B(e), e = Lo(0), n = t.createCommandEncoder(n), fe[e >>> 0] = n, e;
    }
    function hf(e, t) {
      e >>>= 0, t >>>= 0;
      for (var n = (d(), E)[t + 12 >>> 2 >>> 0], o = (d(), E)[t + 16 >>> 2 >>> 0], u = [], c = 0; c < n; ++c) u.push(B((d(), E)[o + 4 * c >>> 2 >>> 0]));
      return t = { label: Ie(t + 4), bindGroupLayouts: u, immediateSize: (d(), E)[t + 20 >>> 2 >>> 0] }, n = B(e), e = Oo(0), t = n.createPipelineLayout(t), fe[e >>> 0] = t, e;
    }
    function bf(e, t) {
      e >>>= 0, t >>>= 0, t = { type: Bu[(d(), I)[t + 12 >>> 2 >>> 0]], count: (d(), E)[t + 16 >>> 2 >>> 0] };
      var n = B(e);
      return e = Mo(0), t = n.createQuerySet(t), fe[e >>> 0] = t, e;
    }
    function gf(e, t) {
      return Su(B(e >>> 0).adapterInfo, t >>> 0), 1;
    }
    var yf = { "core-features-and-limits": 1, "depth-clip-control": 2, "depth32float-stencil8": 3, "texture-compression-bc": 4, "texture-compression-bc-sliced-3d": 5, "texture-compression-etc2": 6, "texture-compression-astc": 7, "texture-compression-astc-sliced-3d": 8, "timestamp-query": 9, "indirect-first-instance": 10, "shader-f16": 11, "rg11b10ufloat-renderable": 12, "bgra8unorm-storage": 13, "float32-filterable": 14, "float32-blendable": 15, "clip-distances": 16, "dual-source-blending": 17, subgroups: 18, "texture-formats-tier1": 19, "texture-formats-tier2": 20, "primitive-index": 21, "texture-component-swizzle": 22, "subgroup-size-control": 23, "chromium-experimental-unorm16-texture-formats": 327692, "chromium-experimental-multi-draw-indirect": 327729, "chromium-experimental-subgroup-matrix": 327732 };
    function wf(e, t) {
      t >>>= 0;
      var n = B(e >>> 0);
      e = Ke(4 * n.features.size);
      var o = 0, u = 0;
      for (let c of n.features) 0 <= (n = yf[c]) && ((d(), I)[e + o >>> 2 >>> 0] = n, o += 4, u++);
      (d(), E)[t + 4 >>> 2 >>> 0] = e, (d(), E)[t >>> 2 >>> 0] = u;
    }
    function Tf(e, t) {
      return io(B(e >>> 0).limits, t >>> 0), 1;
    }
    function vf(e, t) {
      B(e >>> 0).pushErrorScope(Au[t]);
    }
    function Ef(e, t, n) {
      t >>>= 0, n >>>= 0, e = B(e >>> 0), t = Array.from((d(), I).subarray(n >>> 2 >>> 0, n + 4 * t >>> 2 >>> 0), (o) => B(o)), e.submit(t);
    }
    function Sf(e, t, n, o, u) {
      n = ue(n), o >>>= 0, u >>>= 0, e = B(e >>> 0), t = B(t >>> 0), o = (d(), X).subarray(o >>> 0, o + u >>> 0), e.writeBuffer(t, n, o, 0, u);
    }
    i || (function() {
      for (var e = r.numThreads - 1; e--; ) vn();
      xe.push(async () => {
        var t = (async function() {
          if (!i) return Promise.all(ke.map(Tn));
        })();
        Be++, await t, --Be == 0 && re && (t = re, re = null, t());
      });
    })(), i || (Fe = new WebAssembly.Memory({ initial: 256, maximum: 65536, shared: true }), se()), r.wasmBinary && (v = r.wasmBinary), r.stackSave = () => P(), r.stackRestore = (e) => D(e), r.stackAlloc = (e) => Vt(e), r.setValue = function(e, t, n = "i8") {
      switch (n.endsWith("*") && (n = "*"), n) {
        case "i1":
        case "i8":
          (d(), Z)[e >>> 0] = t;
          break;
        case "i16":
          (d(), De)[e >>> 1 >>> 0] = t;
          break;
        case "i32":
          (d(), I)[e >>> 2 >>> 0] = t;
          break;
        case "i64":
          (d(), pe)[e >>> 3 >>> 0] = BigInt(t);
          break;
        case "float":
          (d(), R)[e >>> 2 >>> 0] = t;
          break;
        case "double":
          (d(), ae)[e >>> 3 >>> 0] = t;
          break;
        case "*":
          (d(), E)[e >>> 2 >>> 0] = t;
          break;
        default:
          we(`invalid type for setValue: ${n}`);
      }
    }, r.getValue = function(e, t = "i8") {
      switch (t.endsWith("*") && (t = "*"), t) {
        case "i1":
        case "i8":
          return (d(), Z)[e >>> 0];
        case "i16":
          return (d(), De)[e >>> 1 >>> 0];
        case "i32":
          return (d(), I)[e >>> 2 >>> 0];
        case "i64":
          return (d(), pe)[e >>> 3 >>> 0];
        case "float":
          return (d(), R)[e >>> 2 >>> 0];
        case "double":
          return (d(), ae)[e >>> 3 >>> 0];
        case "*":
          return (d(), E)[e >>> 2 >>> 0];
        default:
          we(`invalid type for getValue: ${t}`);
      }
    }, r.UTF8ToString = lt, r.stringToUTF8 = Ue, r.lengthBytesUTF8 = _e;
    var To, vo, Eo, Nr, zt, ve, Ke, So, xo, Ao, Io, Lo, Bo, Oo, Mo, Co, Do, Po, Wr, kr, Fr, Gr, St, $r, Uo, zr, _o, Ro, No, Vr, Wo, ko, jr, W, xt, Fo, D, Vt, P, Go, Hr, $o, zo, Vo, qr, jo, Ho, qo, Yo, Jo, Xo, Zo, Ko, Qo, ea, ta, ra, na, oa, aa, sa, ia, ua, fa, ca, da, la, pa, ma, ha, ba, ga, ya, wa, Ta, va, Ea, Sa, xa, Aa, Ia, La, Ba, Oa, Ma, Ca, Ne, xf = [Ye, Tr, xn, On, Mn, Cn, Dn, Pn, Un, _n, Rn, Nn, Wn, kn, Fn, Gn, Qn, eo, to, po, mo, ho, bo, go, yo, wo], Yr = { 1280444: (e, t, n, o, u) => {
      if (r === void 0 || !r.ed) return 1;
      if ((e = lt(Number(e >>> 0))).startsWith("./") && (e = e.substring(2)), !(e = r.ed.get(e))) return 2;
      if (t = Number(t >>> 0), n = Number(n >>> 0), o = Number(o >>> 0), t + n > e.byteLength) return 3;
      try {
        let c = e.subarray(t, t + n);
        switch (u) {
          case 0:
            (d(), X).set(c, o >>> 0);
            break;
          case 1:
            r.pe ? r.pe(o, c) : r.Re(o, c);
            break;
          default:
            return 4;
        }
        return 0;
      } catch {
        return 4;
      }
    }, 1281268: (e, t, n) => {
      r.re(e, (d(), X).subarray(t >>> 0, t + n >>> 0));
    }, 1281332: () => r.Pe(), 1281374: (e) => {
      r.qe(e);
    }, 1281411: () => typeof wasmOffsetConverter < "u" };
    function Af() {
      return typeof wasmOffsetConverter < "u";
    }
    function If2(e, t, n, o) {
      var u = P();
      try {
        return Ko(e, t, n, o);
      } catch (c) {
        if (D(u), c !== c + 0) throw c;
        W(1, 0);
      }
    }
    function Lf(e, t, n) {
      var o = P();
      try {
        return Jo(e, t, n);
      } catch (u) {
        if (D(o), u !== u + 0) throw u;
        W(1, 0);
      }
    }
    function Bf(e) {
      var t = P();
      try {
        jo(e);
      } catch (n) {
        if (D(t), n !== n + 0) throw n;
        W(1, 0);
      }
    }
    function Of(e, t) {
      var n = P();
      try {
        return qr(e, t);
      } catch (o) {
        if (D(n), o !== o + 0) throw o;
        W(1, 0);
      }
    }
    function Mf(e, t, n) {
      var o = P();
      try {
        Vo(e, t, n);
      } catch (u) {
        if (D(o), u !== u + 0) throw u;
        W(1, 0);
      }
    }
    function Cf(e, t) {
      var n = P();
      try {
        Qo(e, t);
      } catch (o) {
        if (D(n), o !== o + 0) throw o;
        W(1, 0);
      }
    }
    function Df(e, t, n, o, u, c, h) {
      var m = P();
      try {
        return Yo(e, t, n, o, u, c, h);
      } catch (y) {
        if (D(m), y !== y + 0) throw y;
        W(1, 0);
      }
    }
    function Pf(e, t, n, o, u, c) {
      var h = P();
      try {
        Ho(e, t, n, o, u, c);
      } catch (m) {
        if (D(h), m !== m + 0) throw m;
        W(1, 0);
      }
    }
    function Uf(e, t, n, o) {
      var u = P();
      try {
        Zo(e, t, n, o);
      } catch (c) {
        if (D(u), c !== c + 0) throw c;
        W(1, 0);
      }
    }
    function _f(e, t, n, o, u, c, h) {
      var m = P();
      try {
        ta(e, t, n, o, u, c, h);
      } catch (y) {
        if (D(m), y !== y + 0) throw y;
        W(1, 0);
      }
    }
    function Rf(e, t, n, o, u, c, h) {
      var m = P();
      try {
        ra(e, t, n, o, u, c, h);
      } catch (y) {
        if (D(m), y !== y + 0) throw y;
        W(1, 0);
      }
    }
    function Nf(e, t, n, o, u, c, h, m) {
      var y = P();
      try {
        la(e, t, n, o, u, c, h, m);
      } catch (x) {
        if (D(y), x !== x + 0) throw x;
        W(1, 0);
      }
    }
    function Wf(e, t, n, o, u, c, h, m, y, x, N, F) {
      var L = P();
      try {
        na(e, t, n, o, u, c, h, m, y, x, N, F);
      } catch (q) {
        if (D(L), q !== q + 0) throw q;
        W(1, 0);
      }
    }
    function kf(e, t, n, o, u) {
      var c = P();
      try {
        return ea(e, t, n, o, u);
      } catch (h) {
        if (D(c), h !== h + 0) throw h;
        W(1, 0);
      }
    }
    function Ff(e, t, n, o, u, c) {
      var h = P();
      try {
        pa(e, t, n, o, u, c);
      } catch (m) {
        if (D(h), m !== m + 0) throw m;
        W(1, 0);
      }
    }
    function Gf(e, t, n, o, u) {
      var c = P();
      try {
        qo(e, t, n, o, u);
      } catch (h) {
        if (D(c), h !== h + 0) throw h;
        W(1, 0);
      }
    }
    function $f(e, t, n, o, u, c, h, m) {
      var y = P();
      try {
        Xo(e, t, n, o, u, c, h, m);
      } catch (x) {
        if (D(y), x !== x + 0) throw x;
        W(1, 0);
      }
    }
    function zf(e) {
      var t = P();
      try {
        return ma(e);
      } catch (n) {
        if (D(t), n !== n + 0) throw n;
        W(1, 0);
      }
    }
    function Vf(e, t, n, o, u, c, h, m, y) {
      var x = P();
      try {
        aa(e, t, n, o, u, c, h, m, y);
      } catch (N) {
        if (D(x), N !== N + 0) throw N;
        W(1, 0);
      }
    }
    function jf(e, t, n) {
      var o = P();
      try {
        return ha(e, t, n);
      } catch (u) {
        if (D(o), u !== u + 0) throw u;
        W(1, 0);
      }
    }
    function Hf(e, t) {
      var n = P();
      try {
        return La(e, t);
      } catch (o) {
        if (D(n), o !== o + 0) throw o;
        return W(1, 0), 0n;
      }
    }
    function qf(e, t, n, o) {
      var u = P();
      try {
        return ba(e, t, n, o);
      } catch (c) {
        if (D(u), c !== c + 0) throw c;
        W(1, 0);
      }
    }
    function Yf(e) {
      var t = P();
      try {
        return oa(e);
      } catch (n) {
        if (D(t), n !== n + 0) throw n;
        return W(1, 0), 0n;
      }
    }
    function Jf(e, t, n, o) {
      var u = P();
      try {
        return ga(e, t, n, o);
      } catch (c) {
        if (D(u), c !== c + 0) throw c;
        W(1, 0);
      }
    }
    function Xf(e, t, n, o, u) {
      var c = P();
      try {
        return ya(e, t, n, o, u);
      } catch (h) {
        if (D(c), h !== h + 0) throw h;
        W(1, 0);
      }
    }
    function Zf(e, t, n, o, u, c) {
      var h = P();
      try {
        return wa(e, t, n, o, u, c);
      } catch (m) {
        if (D(h), m !== m + 0) throw m;
        W(1, 0);
      }
    }
    function Kf(e, t, n, o, u, c) {
      var h = P();
      try {
        return ca(e, t, n, o, u, c);
      } catch (m) {
        if (D(h), m !== m + 0) throw m;
        W(1, 0);
      }
    }
    function Qf(e, t, n, o, u, c) {
      var h = P();
      try {
        return Ta(e, t, n, o, u, c);
      } catch (m) {
        if (D(h), m !== m + 0) throw m;
        W(1, 0);
      }
    }
    function ec(e, t, n, o, u, c, h, m) {
      var y = P();
      try {
        return da(e, t, n, o, u, c, h, m);
      } catch (x) {
        if (D(y), x !== x + 0) throw x;
        W(1, 0);
      }
    }
    function tc(e, t, n, o, u) {
      var c = P();
      try {
        return va(e, t, n, o, u);
      } catch (h) {
        if (D(c), h !== h + 0) throw h;
        return W(1, 0), 0n;
      }
    }
    function rc(e, t, n, o) {
      var u = P();
      try {
        return Ea(e, t, n, o);
      } catch (c) {
        if (D(u), c !== c + 0) throw c;
        W(1, 0);
      }
    }
    function nc(e, t, n, o) {
      var u = P();
      try {
        return Sa(e, t, n, o);
      } catch (c) {
        if (D(u), c !== c + 0) throw c;
        W(1, 0);
      }
    }
    function oc(e, t, n, o, u, c, h, m, y, x, N, F) {
      var L = P();
      try {
        return xa(e, t, n, o, u, c, h, m, y, x, N, F);
      } catch (q) {
        if (D(L), q !== q + 0) throw q;
        W(1, 0);
      }
    }
    function ac(e, t, n, o, u, c, h, m, y, x, N) {
      var F = P();
      try {
        Aa(e, t, n, o, u, c, h, m, y, x, N);
      } catch (L) {
        if (D(F), L !== L + 0) throw L;
        W(1, 0);
      }
    }
    function sc(e, t, n, o, u, c, h, m, y, x, N, F, L, q, he, de) {
      var Qe = P();
      try {
        Ia(e, t, n, o, u, c, h, m, y, x, N, F, L, q, he, de);
      } catch (et) {
        if (D(Qe), et !== et + 0) throw et;
        W(1, 0);
      }
    }
    function ic(e, t, n) {
      var o = P();
      try {
        return ia(e, t, n);
      } catch (u) {
        if (D(o), u !== u + 0) throw u;
        return W(1, 0), 0n;
      }
    }
    function uc(e, t, n) {
      var o = P();
      try {
        return sa(e, t, n);
      } catch (u) {
        if (D(o), u !== u + 0) throw u;
        W(1, 0);
      }
    }
    function fc(e, t, n) {
      var o = P();
      try {
        return ua(e, t, n);
      } catch (u) {
        if (D(o), u !== u + 0) throw u;
        W(1, 0);
      }
    }
    function cc(e, t, n, o) {
      var u = P();
      try {
        fa(e, t, n, o);
      } catch (c) {
        if (D(u), c !== c + 0) throw c;
        W(1, 0);
      }
    }
    function jt() {
      if (0 < Be) re = jt;
      else if (i) C?.(r), wr();
      else {
        for (var e = xe; 0 < e.length; ) e.shift()(r);
        0 < Be ? re = jt : (r.calledRun = true, $ || (wr(), C?.(r)));
      }
    }
    return i || (Ne = await wt(), jt()), r.PTR_SIZE = 4, r.webgpuInit = (e) => {
      let t = /* @__PURE__ */ new WeakMap(), n, o, u = 1;
      r.webgpuRegisterDevice = (m) => {
        if (o !== void 0) throw Error("another WebGPU EP inference session is being created.");
        if (m) {
          var y = t.get(m);
          if (!y) {
            let x = ((N, F = 0) => {
              var L = Po(F);
              return F = Do(F, L), fe[L >>> 0] = N.queue, fe[F >>> 0] = N, F;
            })(m, y = Eo());
            y = [u++, y, x], t.set(m, y);
          }
          return n = m, o = y[0], y;
        }
        n = void 0, o = 0;
      };
      let c = /* @__PURE__ */ new Map();
      r.webgpuOnCreateSession = (m) => {
        if (o !== void 0) {
          var y = o;
          if (o = void 0, m) {
            let x = Nr(y);
            c.set(m, x), y === 0 && e(n ?? B(x));
          }
          n = void 0;
        }
      }, r.webgpuOnReleaseSession = (m) => {
        c.delete(m);
      };
      let h = /* @__PURE__ */ Symbol("gpuBufferMetadata");
      r.webgpuRegisterBuffer = (m, y, x) => {
        if (x) return m[h] = [x, NaN], x;
        if (x = m[h]) return x[1]++, x[0];
        if ((y = c.get(y)) === void 0) throw Error("Invalid session handle passed to webgpuRegisterBuffer");
        return y = ((N, F = 0) => (N.mapState === "unmapped" || we(), F = Co(F), fe[F >>> 0] = N, F))(m, y), m[h] = [y, 1], y;
      }, r.webgpuUnregisterBuffer = (m) => {
        let y = m[h];
        if (!y) throw Error("Buffer is not registered");
        y[1]--, y[1] === 0 && (So(y[0]), delete m[h]);
      }, r.webgpuGetBuffer = (m) => B(m), r.webgpuCreateDownloader = (m, y, x) => {
        if ((x = c.get(x)) === void 0) throw Error("Invalid session handle passed to webgpuRegisterBuffer");
        let N = B(x), F = 16 * Math.ceil(Number(y) / 16);
        return async () => {
          let L = N.createBuffer({ size: F, usage: 9 });
          try {
            let q = N.createCommandEncoder();
            return q.copyBufferToBuffer(m, 0, L, 0, F), N.queue.submit([q.finish()]), await L.mapAsync(GPUMapMode.READ), L.getMappedRange().slice(0, y);
          } finally {
            L.destroy();
          }
        };
      }, r.pe = (m, y) => {
        var x = y.buffer;
        let N = y.byteOffset, F = y.byteLength;
        if (y = 16 * Math.ceil(Number(F) / 16), m = B(m), !n) {
          var L = Nr(o);
          n = B(L);
        }
        let q = (L = n.createBuffer({ mappedAtCreation: true, size: y, usage: 6 })).getMappedRange();
        new Uint8Array(q).set(new Uint8Array(x, N, F)), L.unmap(), (x = n.createCommandEncoder()).copyBufferToBuffer(L, 0, m, 0, y), n.queue.submit([x.finish()]), L.destroy();
      };
    }, r.webnnInit = (e) => {
      let t = e[0];
      [r.Pe, r.qe, r.webnnEnsureTensor, r.re, r.webnnDownloadTensor, r.Oe, r.webnnEnableTraceEvent] = e.slice(1), r.webnnReleaseTensorId = r.qe, r.webnnUploadTensor = r.re, r.webnnRegisterMLContext = r.Oe, r.webnnOnRunStart = (n) => t.onRunStart(n), r.webnnOnRunEnd = t.onRunEnd.bind(t), r.webnnOnReleaseSession = (n) => {
        t.onReleaseSession(n);
      }, r.webnnCreateMLTensorDownloader = (n, o) => t.createMLTensorDownloader(n, o), r.webnnRegisterMLTensor = (n, o, u, c) => t.registerMLTensor(n, o, u, c), r.webnnCreateMLContext = (n) => t.createMLContext(n), r.webnnRegisterGraphInput = t.registerGraphInput.bind(t), r.webnnIsGraphInput = t.isGraphInput.bind(t), r.webnnRegisterGraphOutput = t.registerGraphOutput.bind(t), r.webnnIsGraphOutput = t.isGraphOutput.bind(t), r.webnnCreateTemporaryTensor = t.createTemporaryTensor.bind(t), r.webnnIsGraphInputOutputTypeSupported = t.isGraphInputOutputTypeSupported.bind(t);
    }, ne ? r : new Promise((e, t) => {
      C = e, _ = t;
    });
  }
  var yc;
  var wc;
  var ms = G(() => {
    "use strict";
    yc = ls, wc = globalThis.self?.name?.startsWith("em-pthread");
    wc && ls();
  });
  var gs;
  var an;
  var Tc;
  var ye;
  var ys;
  var on;
  var vc;
  var Ec;
  var ws;
  var Sc;
  var hs;
  var Ts;
  var bs;
  var vs;
  var Zt = G(() => {
    "use strict";
    Xt();
    gs = typeof location > "u" ? void 0 : location.origin, an = import_meta2.url > "file:" && import_meta2.url < "file;", Tc = () => {
      if (true) {
        if (an) {
          let a = URL;
          return new URL(new a("ort.webgpu.bundle.min.mjs", import_meta2.url).href, gs).href;
        }
        return import_meta2.url;
      }
    }, ye = Tc(), ys = () => {
      if (ye && !ye.startsWith("blob:")) return ye.substring(0, ye.lastIndexOf("/") + 1);
    }, on = (a, r) => {
      try {
        let s = r ?? ye;
        return (s ? new URL(a, s) : new URL(a)).origin === gs;
      } catch {
        return false;
      }
    }, vc = (a, r) => {
      let s = r ?? ye;
      try {
        return (s ? new URL(a, s) : new URL(a)).href;
      } catch {
        return;
      }
    }, Ec = (a, r) => `${r ?? "./"}${a}`, ws = async (a) => {
      let s = await (await fetch(a, { credentials: "same-origin" })).blob();
      return URL.createObjectURL(s);
    }, Sc = async (a) => (await import(
      /*webpackIgnore:true*/
      /*@vite-ignore*/
      a
    )).default, hs = (ds(), Ht(cs)).default, Ts = async () => {
      if (!ye) throw new Error("Failed to load proxy worker: cannot determine the script source URL.");
      if (on(ye)) return [void 0, hs()];
      let a = await ws(ye);
      return [a, hs(a)];
    }, bs = (ms(), Ht(ps)).default, vs = async (a, r, s, f) => {
      let i = bs && !(a || r);
      if (i) if (ye) i = on(ye) || f && !s;
      else if (f && !s) i = true;
      else throw new Error("cannot determine the script source URL.");
      if (i) return [void 0, bs];
      {
        let p = "ort-wasm-simd-threaded.asyncify.mjs", l = a ?? vc(p, r), b = s && l && !on(l, r), g = b ? await ws(l) : l ?? Ec(p, r);
        return [b ? g : void 0, await Sc(g)];
      }
    };
  });
  var sn;
  var un;
  var sr;
  var Es;
  var xc;
  var Ac;
  var Ic;
  var Kt;
  var j;
  var je = G(() => {
    "use strict";
    Zt();
    un = false, sr = false, Es = false, xc = () => {
      if (typeof SharedArrayBuffer > "u") return false;
      try {
        return typeof MessageChannel < "u" && new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)), WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11]));
      } catch {
        return false;
      }
    }, Ac = () => {
      try {
        return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 30, 1, 28, 0, 65, 0, 253, 15, 253, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 253, 186, 1, 26, 11]));
      } catch {
        return false;
      }
    }, Ic = () => {
      try {
        return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 19, 1, 17, 0, 65, 1, 253, 15, 65, 2, 253, 15, 65, 3, 253, 15, 253, 147, 2, 11]));
      } catch {
        return false;
      }
    }, Kt = async (a) => {
      if (un) return Promise.resolve();
      if (sr) throw new Error("multiple calls to 'initializeWebAssembly()' detected.");
      if (Es) throw new Error("previous call to 'initializeWebAssembly()' failed.");
      sr = true;
      let r = a.initTimeout, s = a.numThreads;
      if (a.simd !== false) {
        if (a.simd === "relaxed") {
          if (!Ic()) throw new Error("Relaxed WebAssembly SIMD is not supported in the current environment.");
        } else if (!Ac()) throw new Error("WebAssembly SIMD is not supported in the current environment.");
      }
      let f = xc();
      s > 1 && !f && (typeof self < "u" && !self.crossOriginIsolated && console.warn("env.wasm.numThreads is set to " + s + ", but this will not work unless you enable crossOriginIsolated mode. See https://web.dev/cross-origin-isolation-guide/ for more info."), console.warn("WebAssembly multi-threading is not supported in the current environment. Falling back to single-threading."), a.numThreads = s = 1);
      let i = a.wasmPaths, p = typeof i == "string" ? i : void 0, l = i?.mjs, b = l?.href ?? l, g = i?.wasm, w = g?.href ?? g, S = a.wasmBinary, [v, T] = await vs(b, p, s > 1, !!S || !!w), A = false, C = [];
      if (r > 0 && C.push(new Promise((_) => {
        setTimeout(() => {
          A = true, _();
        }, r);
      })), C.push(new Promise((_, k) => {
        let U = { numThreads: s };
        if (S) U.wasmBinary = S, U.locateFile = (M) => M;
        else if (w || p) U.locateFile = (M) => w ?? p + M;
        else if (b && b.indexOf("blob:") !== 0) U.locateFile = (M) => new URL(M, b).href;
        else if (v) {
          let M = ys();
          M && (U.locateFile = (Y) => M + Y);
        }
        T(U).then((M) => {
          sr = false, un = true, sn = M, _(), v && URL.revokeObjectURL(v);
        }, (M) => {
          sr = false, Es = true, k(M);
        });
      })), await Promise.race(C), A) throw new Error(`WebAssembly backend initializing failed due to timeout: ${r}ms`);
    }, j = () => {
      if (un && sn) return sn;
      throw new Error("WebAssembly is not initialized yet.");
    };
  });
  var be;
  var Bt;
  var V;
  var ir = G(() => {
    "use strict";
    je();
    be = (a, r) => {
      let s = j(), f = s.lengthBytesUTF8(a) + 1, i = s._malloc(f);
      return s.stringToUTF8(a, i, f), r.push(i), i;
    }, Bt = (a, r, s, f) => {
      if (typeof a == "object" && a !== null) {
        if (s.has(a)) throw new Error("Circular reference in options");
        s.add(a);
      }
      Object.entries(a).forEach(([i, p]) => {
        let l = r ? r + i : i;
        if (typeof p == "object") Bt(p, l + ".", s, f);
        else if (typeof p == "string" || typeof p == "number") f(l, p.toString());
        else if (typeof p == "boolean") f(l, p ? "1" : "0");
        else throw new Error(`Can't handle extra config type: ${typeof p}`);
      });
    }, V = (a) => {
      let r = j(), s = r.stackSave();
      try {
        let f = r.PTR_SIZE, i = r.stackAlloc(2 * f);
        r._OrtGetLastError(i, i + f);
        let p = Number(r.getValue(i, f === 4 ? "i32" : "i64")), l = r.getValue(i + f, "*"), b = l ? r.UTF8ToString(l) : "";
        throw new Error(`${a} ERROR_CODE: ${p}, ERROR_MESSAGE: ${b}`);
      } finally {
        r.stackRestore(s);
      }
    };
  });
  var Ss;
  var xs = G(() => {
    "use strict";
    je();
    ir();
    Ss = (a) => {
      let r = j(), s = 0, f = [], i = a || {};
      try {
        if (a?.logSeverityLevel === void 0) i.logSeverityLevel = 2;
        else if (typeof a.logSeverityLevel != "number" || !Number.isInteger(a.logSeverityLevel) || a.logSeverityLevel < 0 || a.logSeverityLevel > 4) throw new Error(`log severity level is not valid: ${a.logSeverityLevel}`);
        if (a?.logVerbosityLevel === void 0) i.logVerbosityLevel = 0;
        else if (typeof a.logVerbosityLevel != "number" || !Number.isInteger(a.logVerbosityLevel)) throw new Error(`log verbosity level is not valid: ${a.logVerbosityLevel}`);
        a?.terminate === void 0 && (i.terminate = false);
        let p = 0;
        return a?.tag !== void 0 && (p = be(a.tag, f)), s = r._OrtCreateRunOptions(i.logSeverityLevel, i.logVerbosityLevel, !!i.terminate, p), s === 0 && V("Can't create run options."), a?.extra !== void 0 && Bt(a.extra, "", /* @__PURE__ */ new WeakSet(), (l, b) => {
          let g = be(l, f), w = be(b, f);
          r._OrtAddRunConfigEntry(s, g, w) !== 0 && V(`Can't set a run config entry: ${l} - ${b}.`);
        }), [s, f];
      } catch (p) {
        throw s !== 0 && r._OrtReleaseRunOptions(s), f.forEach((l) => r._free(l)), p;
      }
    };
  });
  var Lc;
  var Bc;
  var Oc;
  var Ot;
  var We;
  var Mc;
  var As;
  var Is = G(() => {
    "use strict";
    je();
    ir();
    Lc = (a) => {
      switch (a) {
        case "disabled":
          return 0;
        case "basic":
          return 1;
        case "extended":
          return 2;
        case "layout":
          return 3;
        case "all":
          return 99;
        default:
          throw new Error(`unsupported graph optimization level: ${a}`);
      }
    }, Bc = (a) => {
      switch (a) {
        case "sequential":
          return 0;
        case "parallel":
          return 1;
        default:
          throw new Error(`unsupported execution mode: ${a}`);
      }
    }, Oc = (a) => {
      a.extra || (a.extra = {}), a.extra.session || (a.extra.session = {});
      let r = a.extra.session;
      r.use_ort_model_bytes_directly || (r.use_ort_model_bytes_directly = "1"), a.executionProviders && a.executionProviders.some((s) => (typeof s == "string" ? s : s.name) === "webgpu") && (a.enableMemPattern = false);
    }, Ot = (a, r, s, f) => {
      let i = be(r, f), p = be(s, f);
      j()._OrtAddSessionConfigEntry(a, i, p) !== 0 && V(`Can't set a session config entry: ${r} - ${s}.`);
    }, We = (a, r, s, f) => {
      let i = be(r, f), p = be(s, f);
      a.push([i, p]);
    }, Mc = async (a, r, s) => {
      let f = r.executionProviders;
      for (let i of f) {
        let p = typeof i == "string" ? i : i.name, l = [];
        switch (p) {
          case "webnn":
            if (p = "WEBNN", Ot(a, "session.disable_quant_qdq", "1", s), Ot(a, "session.disable_qdq_constant_folding", "1", s), typeof i != "string") {
              let T = i?.deviceType;
              T && Ot(a, "deviceType", T, s);
            }
            break;
          case "webgpu":
            {
              p = "WebGPU";
              let v;
              if (typeof i != "string") {
                let A = i;
                if (A.device) if (typeof GPUDevice < "u" && A.device instanceof GPUDevice) v = A.device;
                else throw new Error("Invalid GPU device set in WebGPU EP options.");
                let { enableGraphCapture: C } = r;
                if (typeof C == "boolean" && C && We(l, "enableGraphCapture", "1", s), typeof A.preferredLayout == "string" && We(l, "preferredLayout", A.preferredLayout, s), A.forceCpuNodeNames) {
                  let _ = Array.isArray(A.forceCpuNodeNames) ? A.forceCpuNodeNames : [A.forceCpuNodeNames];
                  We(l, "forceCpuNodeNames", _.join(`
`), s);
                }
                A.validationMode && We(l, "validationMode", A.validationMode, s), typeof A.enableMatmulFp32Accumulation == "boolean" && We(l, "enableMatmulFp32Accumulation", A.enableMatmulFp32Accumulation ? "1" : "0", s);
                for (let _ of ["storageBufferCacheMode", "uniformBufferCacheMode", "queryResolveBufferCacheMode", "defaultBufferCacheMode"]) {
                  let k = A[_];
                  if (k) {
                    if (k !== "disabled" && k !== "lazyRelease" && k !== "simple" && k !== "bucket") throw new Error(`${_} must be one of 'disabled', 'lazyRelease', 'simple' or 'bucket': ${k}`);
                    We(l, _, k, s);
                  }
                }
              }
              let T = j().webgpuRegisterDevice(v);
              if (T) {
                let [A, C, _] = T;
                We(l, "deviceId", A.toString(), s), We(l, "webgpuInstance", C.toString(), s), We(l, "webgpuDevice", _.toString(), s);
              }
            }
            break;
          case "wasm":
          case "cpu":
            continue;
          default:
            throw new Error(`not supported execution provider: ${p}`);
        }
        let b = be(p, s), g = l.length, w = 0, S = 0;
        if (g > 0) {
          w = j()._malloc(g * j().PTR_SIZE), s.push(w), S = j()._malloc(g * j().PTR_SIZE), s.push(S);
          for (let v = 0; v < g; v++) j().setValue(w + v * j().PTR_SIZE, l[v][0], "*"), j().setValue(S + v * j().PTR_SIZE, l[v][1], "*");
        }
        await j()._OrtAppendExecutionProvider(a, b, w, S, g) !== 0 && V(`Can't append execution provider: ${p}.`);
      }
    }, As = async (a) => {
      let r = j(), s = 0, f = [], i = a || {};
      Oc(i);
      try {
        let p = Lc(i.graphOptimizationLevel ?? "all"), l = Bc(i.executionMode ?? "sequential"), b = typeof i.logId == "string" ? be(i.logId, f) : 0, g = i.logSeverityLevel ?? 2;
        if (!Number.isInteger(g) || g < 0 || g > 4) throw new Error(`log severity level is not valid: ${g}`);
        let w = i.logVerbosityLevel ?? 0;
        if (!Number.isInteger(w) || w < 0 || w > 4) throw new Error(`log verbosity level is not valid: ${w}`);
        let S = typeof i.optimizedModelFilePath == "string" ? be(i.optimizedModelFilePath, f) : 0;
        if (s = r._OrtCreateSessionOptions(p, !!i.enableCpuMemArena, !!i.enableMemPattern, l, !!i.enableProfiling, 0, b, g, w, S), s === 0 && V("Can't create session options."), i.executionProviders && await Mc(s, i, f), i.enableGraphCapture !== void 0) {
          if (typeof i.enableGraphCapture != "boolean") throw new Error(`enableGraphCapture must be a boolean value: ${i.enableGraphCapture}`);
          Ot(s, "enableGraphCapture", i.enableGraphCapture.toString(), f);
        }
        if (i.freeDimensionOverrides) for (let [v, T] of Object.entries(i.freeDimensionOverrides)) {
          if (typeof v != "string") throw new Error(`free dimension override name must be a string: ${v}`);
          if (typeof T != "number" || !Number.isInteger(T) || T < 0) throw new Error(`free dimension override value must be a non-negative integer: ${T}`);
          let A = be(v, f);
          r._OrtAddFreeDimensionOverride(s, A, T) !== 0 && V(`Can't set a free dimension override: ${v} - ${T}.`);
        }
        return i.extra !== void 0 && Bt(i.extra, "", /* @__PURE__ */ new WeakSet(), (v, T) => {
          Ot(s, v, T, f);
        }), [s, f];
      } catch (p) {
        throw s !== 0 && r._OrtReleaseSessionOptions(s) !== 0 && V("Can't release session options."), f.forEach((l) => r._free(l)), p;
      }
    };
  });
  var He;
  var ur;
  var bt;
  var it;
  var Mt;
  var fr;
  var cr;
  var fn;
  var ut = G(() => {
    "use strict";
    He = (a) => {
      switch (a) {
        case "int8":
          return 3;
        case "uint8":
          return 2;
        case "bool":
          return 9;
        case "int16":
          return 5;
        case "uint16":
          return 4;
        case "int32":
          return 6;
        case "uint32":
          return 12;
        case "float16":
          return 10;
        case "float32":
          return 1;
        case "float64":
          return 11;
        case "string":
          return 8;
        case "int64":
          return 7;
        case "uint64":
          return 13;
        case "int4":
          return 22;
        case "uint4":
          return 21;
        default:
          throw new Error(`unsupported data type: ${a}`);
      }
    }, ur = (a) => {
      switch (a) {
        case 3:
          return "int8";
        case 2:
          return "uint8";
        case 9:
          return "bool";
        case 5:
          return "int16";
        case 4:
          return "uint16";
        case 6:
          return "int32";
        case 12:
          return "uint32";
        case 10:
          return "float16";
        case 1:
          return "float32";
        case 11:
          return "float64";
        case 8:
          return "string";
        case 7:
          return "int64";
        case 13:
          return "uint64";
        case 22:
          return "int4";
        case 21:
          return "uint4";
        default:
          throw new Error(`unsupported data type: ${a}`);
      }
    }, bt = (a, r) => {
      let s = [-1, 4, 1, 1, 2, 2, 4, 8, -1, 1, 2, 8, 4, 8, -1, -1, -1, -1, -1, -1, -1, 0.5, 0.5][a], f = typeof r == "number" ? r : r.reduce((i, p) => i * p, 1);
      return s > 0 ? Math.ceil(f * s) : void 0;
    }, it = (a) => {
      switch (a) {
        case "float16":
          return typeof Float16Array < "u" ? Float16Array : Uint16Array;
        case "float32":
          return Float32Array;
        case "uint8":
          return Uint8Array;
        case "int8":
          return Int8Array;
        case "uint16":
          return Uint16Array;
        case "int16":
          return Int16Array;
        case "int32":
          return Int32Array;
        case "bool":
          return Uint8Array;
        case "float64":
          return Float64Array;
        case "uint32":
          return Uint32Array;
        case "int64":
          return BigInt64Array;
        case "uint64":
          return BigUint64Array;
        default:
          throw new Error(`unsupported type: ${a}`);
      }
    }, Mt = (a) => {
      switch (a) {
        case "verbose":
          return 0;
        case "info":
          return 1;
        case "warning":
          return 2;
        case "error":
          return 3;
        case "fatal":
          return 4;
        default:
          throw new Error(`unsupported logging level: ${a}`);
      }
    }, fr = (a) => a === "float32" || a === "float16" || a === "int32" || a === "int64" || a === "uint32" || a === "uint8" || a === "bool" || a === "uint4" || a === "int4", cr = (a) => a === "float32" || a === "float16" || a === "int32" || a === "int64" || a === "uint32" || a === "uint64" || a === "int8" || a === "uint8" || a === "bool" || a === "uint4" || a === "int4", fn = (a) => {
      switch (a) {
        case "none":
          return 0;
        case "cpu":
          return 1;
        case "cpu-pinned":
          return 2;
        case "texture":
          return 3;
        case "gpu-buffer":
          return 4;
        case "ml-tensor":
          return 5;
        default:
          throw new Error(`unsupported data location: ${a}`);
      }
    };
  });
  var Ct;
  var cn = G(() => {
    "use strict";
    Xt();
    Ct = async (a) => {
      if (typeof a == "string") if (false) try {
        let { readFile: r } = Xr("node:fs/promises");
        return new Uint8Array(await r(a));
      } catch (r) {
        if (r.code === "ERR_FS_FILE_TOO_LARGE") {
          let { createReadStream: s } = Xr("node:fs"), f = s(a), i = [];
          for await (let p of f) i.push(p);
          return new Uint8Array(Buffer.concat(i));
        }
        throw r;
      }
      else {
        let r = await fetch(a);
        if (!r.ok) throw new Error(`failed to load external data file: ${a}`);
        let s = r.headers.get("Content-Length"), f = s ? parseInt(s, 10) : 0;
        if (f < 1073741824) return new Uint8Array(await r.arrayBuffer());
        {
          if (!r.body) throw new Error(`failed to load external data file: ${a}, no response body.`);
          let i = r.body.getReader(), p;
          try {
            p = new ArrayBuffer(f);
          } catch (b) {
            if (b instanceof RangeError) {
              let g = Math.ceil(f / 65536);
              p = new WebAssembly.Memory({ initial: g, maximum: g }).buffer;
            } else throw b;
          }
          let l = 0;
          for (; ; ) {
            let { done: b, value: g } = await i.read();
            if (b) break;
            let w = g.byteLength;
            new Uint8Array(p, l, w).set(g), l += w;
          }
          return new Uint8Array(p, 0, f);
        }
      }
      else return a instanceof Blob ? new Uint8Array(await a.arrayBuffer()) : a instanceof Uint8Array ? a : new Uint8Array(a);
    };
  });
  var Ls;
  var Bs = G(() => {
    "use strict";
    ut();
    Ls = (a, r) => new (it(r))(a);
  });
  var Cc;
  var Dc;
  var Os;
  var Ms;
  var Cs;
  var Pc;
  var le;
  var dn = G(() => {
    "use strict";
    ut();
    Cc = ["V", "I", "W", "E", "F"], Dc = (a, r) => {
      console.log(`[${Cc[a]},${(/* @__PURE__ */ new Date()).toISOString()}]${r}`);
    }, Cs = (a, r) => {
      Os = a, Ms = r;
    }, Pc = (a, r) => {
      let s = Mt(a), f = Mt(Os);
      s >= f && Dc(s, typeof r == "function" ? r() : r);
    }, le = (...a) => {
      Ms && Pc(...a);
    };
  });
  var Ps;
  var Uc;
  var Us;
  var _c;
  var Ds;
  var Rc;
  var _s;
  var dr;
  var lr;
  var ln;
  var Rs;
  var Ns = G(() => {
    "use strict";
    ut();
    dn();
    Ps = /* @__PURE__ */ new Map([["float32", 32], ["float16", 16], ["int32", 32], ["uint32", 32], ["int64", 64], ["uint64", 64], ["int8", 8], ["uint8", 8], ["int4", 4], ["uint4", 4]]), Uc = (a, r) => {
      if (r === "int32") return a;
      let s = Ps.get(r);
      if (!s) throw new Error(`WebNN backend does not support data type: ${r}`);
      let f = s / 8;
      if (a.byteLength % f !== 0) throw new Error(`Invalid Uint8Array length - must be a multiple of ${f}.`);
      let i = a.byteLength / f, p = new (it(r))(a.buffer, a.byteOffset, i);
      switch (r) {
        case "int64":
        case "uint64": {
          let l = new Int32Array(i);
          for (let b = 0; b < i; b++) {
            let g = p[b];
            if (g > 2147483647n || g < -2147483648n) throw new Error("Can not convert int64 data to int32 - value out of range.");
            l[b] = Number(g);
          }
          return new Uint8Array(l.buffer);
        }
        case "int8":
        case "uint8":
        case "uint32": {
          if (r === "uint32" && p.some((b) => b > 2147483647)) throw new Error("Can not convert uint32 data to int32 - value out of range.");
          let l = Int32Array.from(p, Number);
          return new Uint8Array(l.buffer);
        }
        default:
          throw new Error(`Unsupported data conversion from ${r} to 'int32'`);
      }
    }, Us = (a, r) => {
      if (r === "int32") return a;
      if (a.byteLength % 4 !== 0) throw new Error("Invalid Uint8Array length - must be a multiple of 4 (int32).");
      let s = a.byteLength / 4, f = new Int32Array(a.buffer, a.byteOffset, s);
      switch (r) {
        case "int64": {
          let i = BigInt64Array.from(f, BigInt);
          return new Uint8Array(i.buffer);
        }
        case "uint64": {
          if (f.some((p) => p < 0)) throw new Error("Can not convert int32 data to uin64 - negative value found.");
          let i = BigUint64Array.from(f, BigInt);
          return new Uint8Array(i.buffer);
        }
        case "int8": {
          if (f.some((p) => p < -128 || p > 127)) throw new Error("Can not convert int32 data to int8 - value out of range.");
          let i = Int8Array.from(f, Number);
          return new Uint8Array(i.buffer);
        }
        case "uint8": {
          if (f.some((i) => i < 0 || i > 255)) throw new Error("Can not convert int32 data to uint8 - value out of range.");
          return Uint8Array.from(f, Number);
        }
        case "uint32": {
          if (f.some((p) => p < 0)) throw new Error("Can not convert int32 data to uint32 - negative value found.");
          let i = Uint32Array.from(f, Number);
          return new Uint8Array(i.buffer);
        }
        default:
          throw new Error(`Unsupported data conversion from 'int32' to ${r}`);
      }
    }, _c = 1, Ds = () => _c++, Rc = /* @__PURE__ */ new Map([["int8", "int32"], ["uint8", "int32"], ["uint32", "int32"], ["int64", "int32"]]), _s = (a, r) => {
      let s = Ps.get(a);
      if (!s) throw new Error(`WebNN backend does not support data type: ${a}`);
      return r.length > 0 ? Math.ceil(r.reduce((f, i) => f * i) * s / 8) : 0;
    }, dr = class {
      constructor(r) {
        this.isDataConverted = false;
        let { sessionId: s, context: f, tensor: i, dataType: p, shape: l, fallbackDataType: b } = r;
        this.sessionId = s, this.mlContext = f, this.mlTensor = i, this.dataType = p, this.tensorShape = l, this.fallbackDataType = b;
      }
      get tensor() {
        return this.mlTensor;
      }
      get type() {
        return this.dataType;
      }
      get fallbackType() {
        return this.fallbackDataType;
      }
      get shape() {
        return this.tensorShape;
      }
      get byteLength() {
        return _s(this.dataType, this.tensorShape);
      }
      destroy() {
        le("verbose", () => "[WebNN] TensorWrapper.destroy"), this.mlTensor.destroy();
      }
      write(r) {
        this.mlContext.writeTensor(this.mlTensor, r);
      }
      async read(r) {
        if (this.fallbackDataType) {
          let s = await this.mlContext.readTensor(this.mlTensor), f = Us(new Uint8Array(s), this.dataType);
          if (r) {
            (r instanceof ArrayBuffer ? new Uint8Array(r) : new Uint8Array(r.buffer, r.byteOffset, r.byteLength)).set(f);
            return;
          } else return new Uint8Array(f).buffer;
        } else return r ? this.mlContext.readTensor(this.mlTensor, r) : this.mlContext.readTensor(this.mlTensor);
      }
      canReuseTensor(r, s, f) {
        return this.mlContext === r && this.dataType === s && this.tensorShape.length === f.length && this.tensorShape.every((i, p) => i === f[p]);
      }
      setIsDataConverted(r) {
        this.isDataConverted = r;
      }
    }, lr = class {
      constructor(r, s) {
        this.tensorManager = r;
        this.wrapper = s;
      }
      get tensorWrapper() {
        return this.wrapper;
      }
      releaseTensor() {
        this.tensorWrapper && (this.tensorManager.releaseTensor(this.tensorWrapper), this.wrapper = void 0);
      }
      async ensureTensor(r, s, f, i) {
        let p = this.tensorManager.getMLContext(r), l = this.tensorManager.getMLOpSupportLimits(r), b;
        if (!l?.input.dataTypes.includes(s)) {
          if (b = Rc.get(s), !b || !l?.input.dataTypes.includes(b)) throw new Error(`WebNN backend does not support data type: ${s}`);
          le("verbose", () => `[WebNN] TensorIdTracker.ensureTensor: fallback dataType from ${s} to ${b}`);
        }
        if (this.wrapper) {
          if (this.wrapper.canReuseTensor(p, s, f)) return this.wrapper.tensor;
          if (i) {
            if (this.wrapper.byteLength !== _s(s, f)) throw new Error("Unable to copy data to tensor with different size.");
            this.activeUpload = new Uint8Array(await this.wrapper.read());
          }
          this.tensorManager.releaseTensor(this.wrapper);
        }
        let g = typeof MLTensorUsage > "u" ? void 0 : MLTensorUsage.READ | MLTensorUsage.WRITE;
        return this.wrapper = await this.tensorManager.getCachedTensor(r, s, f, g, true, true, b), i && this.activeUpload && (this.wrapper.write(this.activeUpload), this.activeUpload = void 0), this.wrapper.tensor;
      }
      upload(r) {
        let s = r;
        if (this.wrapper) {
          if (this.wrapper.fallbackType) if (this.wrapper.fallbackType === "int32") s = Uc(r, this.wrapper.type), this.wrapper.setIsDataConverted(true);
          else throw new Error(`Unsupported fallback data type: ${this.wrapper.fallbackType}`);
          if (r.byteLength === this.wrapper.byteLength) {
            this.wrapper.write(s);
            return;
          } else le("verbose", () => "Data size does not match tensor size. Releasing tensor."), this.releaseTensor();
        }
        this.activeUpload ? this.activeUpload.set(s) : this.activeUpload = new Uint8Array(s);
      }
      async download(r) {
        if (this.activeUpload) {
          let s = this.wrapper?.isDataConverted ? Us(this.activeUpload, this.wrapper?.type) : this.activeUpload;
          if (r) {
            r instanceof ArrayBuffer ? new Uint8Array(r).set(s) : new Uint8Array(r.buffer, r.byteOffset, r.byteLength).set(s);
            return;
          } else return s.buffer;
        }
        if (!this.wrapper) throw new Error("Tensor has not been created.");
        return r ? this.wrapper.read(r) : this.wrapper.read();
      }
    }, ln = class {
      constructor(r) {
        this.backend = r;
        this.tensorTrackersById = /* @__PURE__ */ new Map();
        this.freeTensors = [];
        this.externalTensors = /* @__PURE__ */ new Set();
      }
      getMLContext(r) {
        let s = this.backend.getMLContext(r);
        if (!s) throw new Error("MLContext not found for session.");
        return s;
      }
      getMLOpSupportLimits(r) {
        return this.backend.getMLOpSupportLimits(r);
      }
      reserveTensorId() {
        let r = Ds();
        return this.tensorTrackersById.set(r, new lr(this)), r;
      }
      releaseTensorId(r) {
        let s = this.tensorTrackersById.get(r);
        s && (this.tensorTrackersById.delete(r), s.tensorWrapper && this.releaseTensor(s.tensorWrapper));
      }
      async ensureTensor(r, s, f, i, p) {
        le("verbose", () => `[WebNN] TensorManager.ensureTensor {tensorId: ${s}, dataType: ${f}, shape: ${i}, copyOld: ${p}}`);
        let l = this.tensorTrackersById.get(s);
        if (!l) throw new Error("Tensor not found.");
        return l.ensureTensor(r, f, i, p);
      }
      upload(r, s) {
        let f = this.tensorTrackersById.get(r);
        if (!f) throw new Error("Tensor not found.");
        f.upload(s);
      }
      async download(r, s) {
        le("verbose", () => `[WebNN] TensorManager.download {tensorId: ${r}, dstBuffer: ${s?.byteLength}}`);
        let f = this.tensorTrackersById.get(r);
        if (!f) throw new Error("Tensor not found.");
        return f.download(s);
      }
      releaseTensorsForSession(r) {
        for (let s of this.freeTensors) s.sessionId === r && s.destroy();
        this.freeTensors = this.freeTensors.filter((s) => s.sessionId !== r);
      }
      registerTensor(r, s, f, i) {
        let p = this.getMLContext(r), l = Ds(), b = new dr({ sessionId: r, context: p, tensor: s, dataType: f, shape: i });
        return this.tensorTrackersById.set(l, new lr(this, b)), this.externalTensors.add(b), l;
      }
      async getCachedTensor(r, s, f, i, p, l, b) {
        let g = this.getMLContext(r);
        for (let [S, v] of this.freeTensors.entries()) if (v.canReuseTensor(g, s, f)) {
          le("verbose", () => `[WebNN] Reusing tensor {dataType: ${s}, ${b ? `fallbackDataType: ${b},` : ""} shape: ${f}`);
          let T = this.freeTensors.splice(S, 1)[0];
          return T.sessionId = r, T;
        }
        le("verbose", () => `[WebNN] MLContext.createTensor {dataType: ${s}, ${b ? `fallbackDataType: ${b},` : ""} shape: ${f}}`);
        let w = await g.createTensor({ dataType: b ?? s, shape: f, dimensions: f, usage: i, writable: p, readable: l });
        return new dr({ sessionId: r, context: g, tensor: w, dataType: s, shape: f, fallbackDataType: b });
      }
      releaseTensor(r) {
        this.externalTensors.has(r) && this.externalTensors.delete(r), this.freeTensors.push(r);
      }
    }, Rs = (...a) => new ln(...a);
  });
  var Ws = {};
  At(Ws, { WebNNBackend: () => pn });
  var pr;
  var Nc;
  var pn;
  var ks = G(() => {
    "use strict";
    ut();
    je();
    Bs();
    Ns();
    dn();
    pr = /* @__PURE__ */ new Map([[1, "float32"], [10, "float16"], [6, "int32"], [12, "uint32"], [7, "int64"], [13, "uint64"], [22, "int4"], [21, "uint4"], [3, "int8"], [2, "uint8"], [9, "uint8"]]), Nc = (a, r) => {
      if (a === r) return true;
      if (a === void 0 || r === void 0) return false;
      let s = Object.keys(a).sort(), f = Object.keys(r).sort();
      return s.length === f.length && s.every((i, p) => i === f[p] && a[i] === r[i]);
    }, pn = class {
      constructor(r) {
        this.tensorManager = Rs(this);
        this.mlContextBySessionId = /* @__PURE__ */ new Map();
        this.sessionIdsByMLContext = /* @__PURE__ */ new Map();
        this.mlContextCache = [];
        this.sessionGraphInputs = /* @__PURE__ */ new Map();
        this.sessionGraphOutputs = /* @__PURE__ */ new Map();
        this.temporaryGraphInputs = [];
        this.temporaryGraphOutputs = [];
        this.temporarySessionTensorIds = /* @__PURE__ */ new Map();
        this.mlOpSupportLimitsBySessionId = /* @__PURE__ */ new Map();
        Cs(r.logLevel, !!r.debug);
      }
      get currentSessionId() {
        if (this.activeSessionId === void 0) throw new Error("No active session");
        return this.activeSessionId;
      }
      onRunStart(r) {
        le("verbose", () => `[WebNN] onRunStart {sessionId: ${r}}`), this.activeSessionId = r;
      }
      onRunEnd(r) {
        le("verbose", () => `[WebNN] onRunEnd {sessionId: ${r}}`);
        let s = this.temporarySessionTensorIds.get(r);
        if (s) {
          for (let f of s) le("verbose", () => `[WebNN] releasing temporary tensor {tensorId: ${f}}`), this.tensorManager.releaseTensorId(f);
          this.temporarySessionTensorIds.delete(r), this.activeSessionId = void 0;
        }
      }
      async createMLContext(r) {
        if (r instanceof GPUDevice) {
          let f = this.mlContextCache.findIndex((i) => i.gpuDevice === r);
          if (f !== -1) return this.mlContextCache[f].mlContext;
          {
            let i = await navigator.ml.createContext(r);
            return this.mlContextCache.push({ gpuDevice: r, mlContext: i }), i;
          }
        } else if (r === void 0) {
          let f = this.mlContextCache.findIndex((i) => i.options === void 0 && i.gpuDevice === void 0);
          if (f !== -1) return this.mlContextCache[f].mlContext;
          {
            let i = await navigator.ml.createContext();
            return this.mlContextCache.push({ mlContext: i }), i;
          }
        }
        let s = this.mlContextCache.findIndex((f) => Nc(f.options, r));
        if (s !== -1) return this.mlContextCache[s].mlContext;
        {
          let f = await navigator.ml.createContext(r);
          return this.mlContextCache.push({ options: r, mlContext: f }), f;
        }
      }
      registerMLContext(r, s) {
        this.mlContextBySessionId.set(r, s);
        let f = this.sessionIdsByMLContext.get(s);
        f || (f = /* @__PURE__ */ new Set(), this.sessionIdsByMLContext.set(s, f)), f.add(r), this.mlOpSupportLimitsBySessionId.has(r) || this.mlOpSupportLimitsBySessionId.set(r, s.opSupportLimits()), this.temporaryGraphInputs.length > 0 && (this.sessionGraphInputs.set(r, this.temporaryGraphInputs), this.temporaryGraphInputs = []), this.temporaryGraphOutputs.length > 0 && (this.sessionGraphOutputs.set(r, this.temporaryGraphOutputs), this.temporaryGraphOutputs = []);
      }
      onReleaseSession(r) {
        this.sessionGraphInputs.delete(r), this.sessionGraphOutputs.delete(r);
        let s = this.mlContextBySessionId.get(r);
        if (!s) return;
        this.tensorManager.releaseTensorsForSession(r), this.mlContextBySessionId.delete(r), this.mlOpSupportLimitsBySessionId.delete(r);
        let f = this.sessionIdsByMLContext.get(s);
        if (f.delete(r), f.size === 0) {
          this.sessionIdsByMLContext.delete(s);
          let i = this.mlContextCache.findIndex((p) => p.mlContext === s);
          i !== -1 && this.mlContextCache.splice(i, 1);
        }
      }
      getMLContext(r) {
        return this.mlContextBySessionId.get(r);
      }
      getMLOpSupportLimits(r) {
        return this.mlOpSupportLimitsBySessionId.get(r);
      }
      reserveTensorId() {
        return this.tensorManager.reserveTensorId();
      }
      releaseTensorId(r) {
        le("verbose", () => `[WebNN] releaseTensorId {tensorId: ${r}}`), this.tensorManager.releaseTensorId(r);
      }
      async ensureTensor(r, s, f, i, p) {
        let l = pr.get(f);
        if (!l) throw new Error(`Unsupported ONNX data type: ${f}`);
        return this.tensorManager.ensureTensor(r ?? this.currentSessionId, s, l, i, p);
      }
      async createTemporaryTensor(r, s, f) {
        le("verbose", () => `[WebNN] createTemporaryTensor {onnxDataType: ${s}, shape: ${f}}`);
        let i = pr.get(s);
        if (!i) throw new Error(`Unsupported ONNX data type: ${s}`);
        let p = this.tensorManager.reserveTensorId();
        await this.tensorManager.ensureTensor(r, p, i, f, false);
        let l = this.temporarySessionTensorIds.get(r);
        return l ? l.push(p) : this.temporarySessionTensorIds.set(r, [p]), p;
      }
      uploadTensor(r, s) {
        if (!j().shouldTransferToMLTensor) throw new Error("Trying to upload to a MLTensor while shouldTransferToMLTensor is false");
        le("verbose", () => `[WebNN] uploadTensor {tensorId: ${r}, data: ${s.byteLength}}`), this.tensorManager.upload(r, s);
      }
      async downloadTensor(r, s) {
        return this.tensorManager.download(r, s);
      }
      createMLTensorDownloader(r, s) {
        return async () => {
          let f = await this.tensorManager.download(r);
          return Ls(f, s);
        };
      }
      registerMLTensor(r, s, f, i) {
        let p = pr.get(f);
        if (!p) throw new Error(`Unsupported ONNX data type: ${f}`);
        let l = this.tensorManager.registerTensor(r, s, p, i);
        return le("verbose", () => `[WebNN] registerMLTensor {tensor: ${s}, dataType: ${p}, dimensions: ${i}} -> {tensorId: ${l}}`), l;
      }
      registerGraphInput(r) {
        this.temporaryGraphInputs.push(r);
      }
      registerGraphOutput(r) {
        this.temporaryGraphOutputs.push(r);
      }
      isGraphInput(r, s) {
        let f = this.sessionGraphInputs.get(r);
        return f ? f.includes(s) : false;
      }
      isGraphOutput(r, s) {
        let f = this.sessionGraphOutputs.get(r);
        return f ? f.includes(s) : false;
      }
      isGraphInputOutputTypeSupported(r, s, f = true) {
        let i = pr.get(He(s)), p = this.mlOpSupportLimitsBySessionId.get(r);
        return typeof i > "u" ? false : f ? !!p?.input.dataTypes.includes(i) : !!p?.output.dataTypes.includes(i);
      }
      flush() {
      }
    };
  });
  var Wc;
  var Qt;
  var er;
  var ft;
  var kc;
  var Fs;
  var Lt;
  var tr;
  var rr;
  var Gs;
  var nr;
  var or;
  var ar;
  var nn = G(() => {
    "use strict";
    Ve();
    xs();
    Is();
    ut();
    je();
    ir();
    cn();
    Wc = (a, r) => {
      j()._OrtInit(a, r) !== 0 && V("Can't initialize onnxruntime.");
    }, Qt = async (a) => {
      Wc(a.wasm.numThreads, Mt(a.logLevel));
    }, er = async (a, r) => {
      j().asyncInit?.();
      let s = a.webgpu.adapter;
      if (r === "webgpu") {
        if (typeof navigator > "u" || !navigator.gpu) throw new Error("WebGPU is not supported in current environment");
        if (s) {
          if (typeof s.limits != "object" || typeof s.features != "object" || typeof s.requestDevice != "function") throw new Error("Invalid GPU adapter set in `env.webgpu.adapter`. It must be a GPUAdapter object.");
        } else {
          let f = a.webgpu.powerPreference;
          if (f !== void 0 && f !== "low-power" && f !== "high-performance") throw new Error(`Invalid powerPreference setting: "${f}"`);
          let i = a.webgpu.forceFallbackAdapter;
          if (i !== void 0 && typeof i != "boolean") throw new Error(`Invalid forceFallbackAdapter setting: "${i}"`);
          if (s = await navigator.gpu.requestAdapter({ powerPreference: f, forceFallbackAdapter: i }), !s) throw new Error('Failed to get GPU adapter. You may need to enable flag "--enable-unsafe-webgpu" if you are using Chrome.');
        }
      }
      if (r === "webnn" && (typeof navigator > "u" || !navigator.ml)) throw new Error("WebNN is not supported in current environment");
      if (r === "webgpu" && j().webgpuInit((f) => {
        a.webgpu.device = f;
      }), r === "webnn") {
        let f = new (ks(), Ht(Ws)).WebNNBackend(a);
        j().webnnInit([f, () => f.reserveTensorId(), (i) => f.releaseTensorId(i), async (i, p, l, b, g) => f.ensureTensor(i, p, l, b, g), (i, p) => {
          f.uploadTensor(i, p);
        }, async (i, p) => f.downloadTensor(i, p), (i, p) => f.registerMLContext(i, p), !!a.trace]);
      }
    }, ft = /* @__PURE__ */ new Map(), kc = (a) => {
      let r = j(), s = r.stackSave();
      try {
        let f = r.PTR_SIZE, i = r.stackAlloc(2 * f);
        r._OrtGetInputOutputCount(a, i, i + f) !== 0 && V("Can't get session input/output count.");
        let l = f === 4 ? "i32" : "i64";
        return [Number(r.getValue(i, l)), Number(r.getValue(i + f, l))];
      } finally {
        r.stackRestore(s);
      }
    }, Fs = (a, r) => {
      let s = j(), f = s.stackSave(), i = 0;
      try {
        let p = s.PTR_SIZE, l = s.stackAlloc(2 * p);
        s._OrtGetInputOutputMetadata(a, r, l, l + p) !== 0 && V("Can't get session input/output metadata.");
        let g = Number(s.getValue(l, "*"));
        i = Number(s.getValue(l + p, "*"));
        let w = s.HEAP32[i / 4];
        if (w === 0) return [g, 0];
        let S = s.HEAPU32[i / 4 + 1], v = [];
        for (let T = 0; T < S; T++) {
          let A = Number(s.getValue(i + 8 + T * p, "*"));
          v.push(A !== 0 ? s.UTF8ToString(A) : Number(s.getValue(i + 8 + (T + S) * p, "*")));
        }
        return [g, w, v];
      } finally {
        s.stackRestore(f), i !== 0 && s._OrtFree(i);
      }
    }, Lt = (a) => {
      let r = j(), s = r._malloc(a.byteLength);
      if (s === 0) throw new Error(`Can't create a session. failed to allocate a buffer of size ${a.byteLength}.`);
      return r.HEAPU8.set(a, s), [s, a.byteLength];
    }, tr = async (a, r) => {
      let s, f, i = j();
      Array.isArray(a) ? [s, f] = a : a.buffer === i.HEAPU8.buffer ? [s, f] = [a.byteOffset, a.byteLength] : [s, f] = Lt(a);
      let p = 0, l = 0, b = 0, g = [], w = [], S = [];
      try {
        if ([l, g] = await As(r), r?.externalData && i.mountExternalData) {
          let O = [];
          for (let $ of r.externalData) {
            let oe = typeof $ == "string" ? $ : $.path, d = typeof $ == "string" ? $ : $.data;
            O.push(Ct(d).then((te) => {
              i.mountExternalData(oe, te);
            }));
          }
          await Promise.all(O);
        }
        for (let O of r?.executionProviders ?? []) if ((typeof O == "string" ? O : O.name) === "webnn") {
          if (i.shouldTransferToMLTensor = false, typeof O != "string") {
            let oe = O, d = oe?.context, te = oe?.gpuDevice, Z = oe?.deviceType, X = oe?.powerPreference;
            d ? i.currentContext = d : te ? i.currentContext = await i.webnnCreateMLContext(te) : i.currentContext = await i.webnnCreateMLContext({ deviceType: Z, powerPreference: X });
          } else i.currentContext = await i.webnnCreateMLContext();
          break;
        }
        p = await i._OrtCreateSession(s, f, l), i.webgpuOnCreateSession?.(p), p === 0 && V("Can't create a session."), i.jsepOnCreateSession?.(), i.currentContext && (i.webnnRegisterMLContext(p, i.currentContext), i.currentContext = void 0, i.shouldTransferToMLTensor = true);
        let [v, T] = kc(p), A = !!r?.enableGraphCapture, C = [], _ = [], k = [], U = [], M = [];
        for (let O = 0; O < v; O++) {
          let [$, oe, d] = Fs(p, O);
          $ === 0 && V("Can't get an input name."), w.push($);
          let te = i.UTF8ToString($);
          C.push(te), k.push(oe === 0 ? { name: te, isTensor: false } : { name: te, isTensor: true, type: ur(oe), shape: d });
        }
        for (let O = 0; O < T; O++) {
          let [$, oe, d] = Fs(p, O + v);
          $ === 0 && V("Can't get an output name."), S.push($);
          let te = i.UTF8ToString($);
          _.push(te), U.push(oe === 0 ? { name: te, isTensor: false } : { name: te, isTensor: true, type: ur(oe), shape: d });
          {
            if (A && r?.preferredOutputLocation === void 0) {
              M.push("gpu-buffer");
              continue;
            }
            let Z = typeof r?.preferredOutputLocation == "string" ? r.preferredOutputLocation : r?.preferredOutputLocation?.[te] ?? "cpu", X = i.webnnIsGraphOutput;
            if (Z === "cpu" && X && X(p, te)) {
              M.push("ml-tensor-cpu-output");
              continue;
            }
            if (Z !== "cpu" && Z !== "cpu-pinned" && Z !== "gpu-buffer" && Z !== "ml-tensor") throw new Error(`Not supported preferred output location: ${Z}.`);
            if (A && Z !== "gpu-buffer") throw new Error(`Not supported preferred output location: ${Z}. Only 'gpu-buffer' location is supported when enableGraphCapture is true.`);
            M.push(Z);
          }
        }
        let Y = null;
        return M.some((O) => O === "gpu-buffer" || O === "ml-tensor" || O === "ml-tensor-cpu-output") && (b = i._OrtCreateBinding(p), b === 0 && V("Can't create IO binding."), Y = { handle: b, outputPreferredLocations: M, outputPreferredLocationsEncoded: M.map((O) => O === "ml-tensor-cpu-output" ? "ml-tensor" : O).map((O) => fn(O)) }), ft.set(p, [p, w, S, Y, A, false]), [p, C, _, k, U];
      } catch (v) {
        throw w.forEach((T) => i._OrtFree(T)), S.forEach((T) => i._OrtFree(T)), b !== 0 && i._OrtReleaseBinding(b) !== 0 && V("Can't release IO binding."), p !== 0 && i._OrtReleaseSession(p) !== 0 && V("Can't release session."), v;
      } finally {
        i._free(s), l !== 0 && i._OrtReleaseSessionOptions(l) !== 0 && V("Can't release session options."), g.forEach((v) => i._free(v)), i.unmountExternalData?.();
      }
    }, rr = (a) => {
      let r = j(), s = ft.get(a);
      if (!s) throw new Error(`cannot release session. invalid session id: ${a}`);
      let [f, i, p, l, b] = s;
      l && (b && r._OrtClearBoundOutputs(l.handle) !== 0 && V("Can't clear bound outputs."), r._OrtReleaseBinding(l.handle) !== 0 && V("Can't release IO binding.")), r.jsepOnReleaseSession?.(a), r.webnnOnReleaseSession?.(a), r.webgpuOnReleaseSession?.(a), i.forEach((g) => r._OrtFree(g)), p.forEach((g) => r._OrtFree(g)), r._OrtReleaseSession(f) !== 0 && V("Can't release session."), ft.delete(a);
    }, Gs = async (a, r, s, f, i, p, l = false) => {
      if (!a) {
        r.push(0);
        return;
      }
      let b = j(), g = b.PTR_SIZE, w = a[0], S = a[1], v = a[3], T = v, A, C;
      if (w === "string" && (v === "gpu-buffer" || v === "ml-tensor")) throw new Error("String tensor is not supported on GPU.");
      if (l && v !== "gpu-buffer") throw new Error(`External buffer must be provided for input/output index ${p} when enableGraphCapture is true.`);
      if (v === "gpu-buffer") {
        let U = a[2].gpuBuffer;
        C = bt(He(w), S);
        {
          let M = b.webgpuRegisterBuffer;
          if (!M) throw new Error('Tensor location "gpu-buffer" is not supported without using WebGPU.');
          A = M(U, f);
        }
      } else if (v === "ml-tensor") {
        let U = a[2].mlTensor;
        C = bt(He(w), S);
        let M = b.webnnRegisterMLTensor;
        if (!M) throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');
        A = M(f, U, He(w), S);
      } else {
        let U = a[2];
        if (Array.isArray(U)) {
          C = g * U.length, A = b._malloc(C), s.push(A);
          for (let M = 0; M < U.length; M++) {
            if (typeof U[M] != "string") throw new TypeError(`tensor data at index ${M} is not a string`);
            b.setValue(A + M * g, be(U[M], s), "*");
          }
        } else {
          let M = b.webnnIsGraphInput, Y = b.webnnIsGraphOutput;
          if (w !== "string" && M && Y) {
            let O = b.UTF8ToString(i);
            if (M(f, O) || Y(f, O)) {
              let $ = He(w);
              C = bt($, S), T = "ml-tensor";
              let oe = b.webnnCreateTemporaryTensor, d = b.webnnUploadTensor;
              if (!oe || !d) throw new Error('Tensor location "ml-tensor" is not supported without using WebNN.');
              let te = await oe(f, $, S);
              d(te, new Uint8Array(U.buffer, U.byteOffset, U.byteLength)), A = te;
            } else C = U.byteLength, A = b._malloc(C), s.push(A), b.HEAPU8.set(new Uint8Array(U.buffer, U.byteOffset, C), A);
          } else C = U.byteLength, A = b._malloc(C), s.push(A), b.HEAPU8.set(new Uint8Array(U.buffer, U.byteOffset, C), A);
        }
      }
      let _ = b.stackSave(), k = b.stackAlloc(4 * S.length);
      try {
        S.forEach((M, Y) => b.setValue(k + Y * g, M, g === 4 ? "i32" : "i64"));
        let U = b._OrtCreateTensor(He(w), A, C, k, S.length, fn(T));
        U === 0 && V(`Can't create tensor for input/output. session=${f}, index=${p}.`), r.push(U);
      } finally {
        b.stackRestore(_);
      }
    }, nr = async (a, r, s, f, i, p) => {
      let l = j(), b = l.PTR_SIZE, g = ft.get(a);
      if (!g) throw new Error(`cannot run inference. invalid session id: ${a}`);
      let w = g[0], S = g[1], v = g[2], T = g[3], A = g[4], C = g[5], _ = r.length, k = f.length, U = 0, M = [], Y = [], O = [], $ = [], oe = [], d = l.stackSave(), te = l.stackAlloc(_ * b), Z = l.stackAlloc(_ * b), X = l.stackAlloc(k * b), De = l.stackAlloc(k * b);
      try {
        [U, M] = Ss(p), $e("wasm prepareInputOutputTensor");
        for (let R = 0; R < _; R++) await Gs(s[R], Y, $, a, S[r[R]], r[R], A);
        for (let R = 0; R < k; R++) await Gs(i[R], O, $, a, v[f[R]], _ + f[R], A);
        ze("wasm prepareInputOutputTensor");
        for (let R = 0; R < _; R++) l.setValue(te + R * b, Y[R], "*"), l.setValue(Z + R * b, S[r[R]], "*");
        for (let R = 0; R < k; R++) l.setValue(X + R * b, O[R], "*"), l.setValue(De + R * b, v[f[R]], "*");
        if (T && !C) {
          let { handle: R, outputPreferredLocations: ae, outputPreferredLocationsEncoded: pe } = T;
          if (S.length !== _) throw new Error(`input count from feeds (${_}) is expected to be always equal to model's input count (${S.length}).`);
          $e("wasm bindInputsOutputs");
          for (let J = 0; J < _; J++) {
            let ge = r[J];
            await l._OrtBindInput(R, S[ge], Y[J]) !== 0 && V(`Can't bind input[${J}] for session=${a}.`);
          }
          for (let J = 0; J < k; J++) {
            let ge = f[J];
            i[J]?.[3] ? (oe.push(O[J]), l._OrtBindOutput(R, v[ge], O[J], 0) !== 0 && V(`Can't bind pre-allocated output[${J}] for session=${a}.`)) : l._OrtBindOutput(R, v[ge], 0, pe[ge]) !== 0 && V(`Can't bind output[${J}] to ${ae[J]} for session=${a}.`);
          }
          ze("wasm bindInputsOutputs"), ft.set(a, [w, S, v, T, A, true]);
        }
        l.jsepOnRunStart?.(w), l.webnnOnRunStart?.(w);
        let K;
        T ? K = await l._OrtRunWithBinding(w, T.handle, k, X, U) : K = await l._OrtRun(w, Z, te, _, De, k, X, U), K !== 0 && V("failed to call OrtRun().");
        let I = [], E = [];
        $e("wasm ProcessOutputTensor");
        for (let R = 0; R < k; R++) {
          let ae = Number(l.getValue(X + R * b, "*"));
          if (ae === O[R] || oe.includes(O[R])) {
            I.push(i[R]), ae !== O[R] && l._OrtReleaseTensor(ae) !== 0 && V("Can't release tensor.");
            continue;
          }
          let pe = l.stackSave(), J = l.stackAlloc(4 * b), ge = false, ne, se = 0;
          try {
            l._OrtGetTensorData(ae, J, J + b, J + 2 * b, J + 3 * b) !== 0 && V(`Can't access output tensor data on index ${R}.`);
            let we = b === 4 ? "i32" : "i64", qe = Number(l.getValue(J, we));
            se = l.getValue(J + b, "*");
            let wt = l.getValue(J + b * 2, "*"), Tt = Number(l.getValue(J + b * 3, we)), Se = [];
            for (let re = 0; re < Tt; re++) Se.push(Number(l.getValue(wt + re * b, we)));
            l._OrtFree(wt) !== 0 && V("Can't free memory for tensor dims.");
            let xe = Se.reduce((re, Q) => re * Q, 1);
            ne = ur(qe);
            let Be = T?.outputPreferredLocations[f[R]];
            if (ne === "string") {
              if (Be === "gpu-buffer" || Be === "ml-tensor") throw new Error("String tensor is not supported on GPU.");
              let re = [];
              for (let Q = 0; Q < xe; Q++) {
                let z = l.getValue(se + Q * b, "*"), H = l.getValue(se + (Q + 1) * b, "*"), Ye = Q === xe - 1 ? void 0 : H - z;
                re.push(l.UTF8ToString(z, Ye));
              }
              I.push([ne, Se, re, "cpu"]);
            } else if (Be === "gpu-buffer" && xe > 0) {
              let re = l.webgpuGetBuffer;
              if (!re) throw new Error('preferredLocation "gpu-buffer" is not supported without using WebGPU.');
              let Q = re(se), z = bt(qe, xe);
              if (z === void 0 || !fr(ne)) throw new Error(`Unsupported data type: ${ne}`);
              ge = true;
              {
                l.webgpuRegisterBuffer(Q, a, se);
                let H = l.webgpuCreateDownloader(Q, z, a);
                I.push([ne, Se, { gpuBuffer: Q, download: async () => {
                  let Ye = await H();
                  return new (it(ne))(Ye);
                }, dispose: () => {
                  l._OrtReleaseTensor(ae) !== 0 && V("Can't release tensor.");
                } }, "gpu-buffer"]);
              }
            } else if (Be === "ml-tensor" && xe > 0) {
              let re = l.webnnEnsureTensor, Q = l.webnnIsGraphInputOutputTypeSupported;
              if (!re || !Q) throw new Error('preferredLocation "ml-tensor" is not supported without using WebNN.');
              if (bt(qe, xe) === void 0 || !cr(ne)) throw new Error(`Unsupported data type: ${ne}`);
              if (!Q(a, ne, false)) throw new Error(`preferredLocation "ml-tensor" for ${ne} output is not supported by current WebNN Context.`);
              let H = await re(a, se, qe, Se, false);
              ge = true, I.push([ne, Se, { mlTensor: H, download: l.webnnCreateMLTensorDownloader(se, ne), dispose: () => {
                l.webnnReleaseTensorId(se), l._OrtReleaseTensor(ae);
              } }, "ml-tensor"]);
            } else if (Be === "ml-tensor-cpu-output" && xe > 0) {
              let re = l.webnnCreateMLTensorDownloader(se, ne)(), Q = I.length;
              ge = true, E.push((async () => {
                let z = [Q, await re];
                return l.webnnReleaseTensorId(se), l._OrtReleaseTensor(ae), z;
              })()), I.push([ne, Se, [], "cpu"]);
            } else {
              let re = it(ne), Q = new re(xe);
              new Uint8Array(Q.buffer, Q.byteOffset, Q.byteLength).set(l.HEAPU8.subarray(se, se + Q.byteLength)), I.push([ne, Se, Q, "cpu"]);
            }
          } finally {
            l.stackRestore(pe), ne === "string" && se && l._free(se), ge || l._OrtReleaseTensor(ae);
          }
        }
        T && !A && (l._OrtClearBoundOutputs(T.handle) !== 0 && V("Can't clear bound outputs."), ft.set(a, [w, S, v, T, A, false]));
        for (let [R, ae] of await Promise.all(E)) I[R][2] = ae;
        return ze("wasm ProcessOutputTensor"), I;
      } finally {
        l.webnnOnRunEnd?.(w), l.stackRestore(d), s.forEach((K) => {
          K && K[3] === "gpu-buffer" && l.webgpuUnregisterBuffer(K[2].gpuBuffer);
        }), i.forEach((K) => {
          K && K[3] === "gpu-buffer" && l.webgpuUnregisterBuffer(K[2].gpuBuffer);
        }), Y.forEach((K) => l._OrtReleaseTensor(K)), O.forEach((K) => l._OrtReleaseTensor(K)), $.forEach((K) => l._free(K)), U !== 0 && l._OrtReleaseRunOptions(U), M.forEach((K) => l._free(K));
      }
    }, or = (a) => {
      let r = j(), s = ft.get(a);
      if (!s) throw new Error("invalid session id");
      let f = s[0], i = r._OrtEndProfiling(f);
      i === 0 && V("Can't get an profile file name."), r._OrtFree(i);
    }, ar = (a) => {
      let r = [];
      for (let s of a) {
        let f = s[2];
        !Array.isArray(f) && "buffer" in f && r.push(f.buffer);
      }
      return r;
    };
  });
  var ct;
  var Ee;
  var Dt;
  var hr;
  var br;
  var mr;
  var mn;
  var hn;
  var gt;
  var yt;
  var Gc;
  var $s;
  var zs;
  var Vs;
  var js;
  var Hs;
  var qs;
  var Ys;
  var bn = G(() => {
    "use strict";
    Ve();
    nn();
    je();
    Zt();
    ct = () => !!ee.wasm.proxy && typeof document < "u", Dt = false, hr = false, br = false, hn = /* @__PURE__ */ new Map(), gt = (a, r) => {
      let s = hn.get(a);
      s ? s.push(r) : hn.set(a, [r]);
    }, yt = () => {
      if (Dt || !hr || br || !Ee) throw new Error("worker not ready");
    }, Gc = (a) => {
      switch (a.data.type) {
        case "init-wasm":
          Dt = false, a.data.err ? (br = true, mn[1](a.data.err)) : (hr = true, mn[0]()), mr && (URL.revokeObjectURL(mr), mr = void 0);
          break;
        case "init-ep":
        case "copy-from":
        case "create":
        case "release":
        case "run":
        case "end-profiling": {
          let r = hn.get(a.data.type);
          a.data.err ? r.shift()[1](a.data.err) : r.shift()[0](a.data.out);
          break;
        }
        default:
      }
    }, $s = async () => {
      if (!hr) {
        if (Dt) throw new Error("multiple calls to 'initWasm()' detected.");
        if (br) throw new Error("previous call to 'initWasm()' failed.");
        if (Dt = true, ct()) return new Promise((a, r) => {
          Ee?.terminate(), Ts().then(([s, f]) => {
            try {
              Ee = f, Ee.onerror = (p) => r(p), Ee.onmessage = Gc, mn = [a, r];
              let i = { type: "init-wasm", in: ee };
              !i.in.wasm.wasmPaths && (s || an) && (i.in.wasm.wasmPaths = { wasm: new URL("ort-wasm-simd-threaded.asyncify.wasm", import_meta2.url).href }), Ee.postMessage(i), mr = s;
            } catch (i) {
              r(i);
            }
          }, r);
        });
        try {
          await Kt(ee.wasm), await Qt(ee), hr = true;
        } catch (a) {
          throw br = true, a;
        } finally {
          Dt = false;
        }
      }
    }, zs = async (a) => {
      if (ct()) return yt(), new Promise((r, s) => {
        gt("init-ep", [r, s]);
        let f = { type: "init-ep", in: { epName: a, env: ee } };
        Ee.postMessage(f);
      });
      await er(ee, a);
    }, Vs = async (a) => ct() ? (yt(), new Promise((r, s) => {
      gt("copy-from", [r, s]);
      let f = { type: "copy-from", in: { buffer: a } };
      Ee.postMessage(f, [a.buffer]);
    })) : Lt(a), js = async (a, r) => {
      if (ct()) {
        if (r?.preferredOutputLocation) throw new Error('session option "preferredOutputLocation" is not supported for proxy.');
        return yt(), new Promise((s, f) => {
          gt("create", [s, f]);
          let i = { type: "create", in: { model: a, options: { ...r } } }, p = [];
          a instanceof Uint8Array && p.push(a.buffer), Ee.postMessage(i, p);
        });
      } else return tr(a, r);
    }, Hs = async (a) => {
      if (ct()) return yt(), new Promise((r, s) => {
        gt("release", [r, s]);
        let f = { type: "release", in: a };
        Ee.postMessage(f);
      });
      rr(a);
    }, qs = async (a, r, s, f, i, p) => {
      if (ct()) {
        if (s.some((l) => l[3] !== "cpu")) throw new Error("input tensor on GPU is not supported for proxy.");
        if (i.some((l) => l)) throw new Error("pre-allocated output tensor is not supported for proxy.");
        return yt(), new Promise((l, b) => {
          gt("run", [l, b]);
          let g = s, w = { type: "run", in: { sessionId: a, inputIndices: r, inputs: g, outputIndices: f, options: p } };
          Ee.postMessage(w, ar(g));
        });
      } else return nr(a, r, s, f, i, p);
    }, Ys = async (a) => {
      if (ct()) return yt(), new Promise((r, s) => {
        gt("end-profiling", [r, s]);
        let f = { type: "end-profiling", in: a };
        Ee.postMessage(f);
      });
      or(a);
    };
  });
  var Js;
  var $c;
  var gr;
  var Xs = G(() => {
    "use strict";
    Ve();
    bn();
    ut();
    Xt();
    cn();
    Js = (a, r) => {
      switch (a.location) {
        case "cpu":
          return [a.type, a.dims, a.data, "cpu"];
        case "gpu-buffer":
          return [a.type, a.dims, { gpuBuffer: a.gpuBuffer }, "gpu-buffer"];
        case "ml-tensor":
          return [a.type, a.dims, { mlTensor: a.mlTensor }, "ml-tensor"];
        default:
          throw new Error(`invalid data location: ${a.location} for ${r()}`);
      }
    }, $c = (a) => {
      switch (a[3]) {
        case "cpu":
          return new Le(a[0], a[2], a[1]);
        case "gpu-buffer": {
          let r = a[0];
          if (!fr(r)) throw new Error(`not supported data type: ${r} for deserializing GPU tensor`);
          let { gpuBuffer: s, download: f, dispose: i } = a[2];
          return Le.fromGpuBuffer(s, { dataType: r, dims: a[1], download: f, dispose: i });
        }
        case "ml-tensor": {
          let r = a[0];
          if (!cr(r)) throw new Error(`not supported data type: ${r} for deserializing MLTensor tensor`);
          let { mlTensor: s, download: f, dispose: i } = a[2];
          return Le.fromMLTensor(s, { dataType: r, dims: a[1], download: f, dispose: i });
        }
        default:
          throw new Error(`invalid data location: ${a[3]}`);
      }
    }, gr = class {
      async fetchModelAndCopyToWasmMemory(r) {
        return Vs(await Ct(r));
      }
      async loadModel(r, s) {
        ot();
        let f;
        typeof r == "string" ? f = await this.fetchModelAndCopyToWasmMemory(r) : f = r, [this.sessionId, this.inputNames, this.outputNames, this.inputMetadata, this.outputMetadata] = await js(f, s), at();
      }
      async dispose() {
        return Hs(this.sessionId);
      }
      async run(r, s, f) {
        ot();
        let i = [], p = [];
        Object.entries(r).forEach((T) => {
          let A = T[0], C = T[1], _ = this.inputNames.indexOf(A);
          if (_ === -1) throw new Error(`invalid input '${A}'`);
          i.push(C), p.push(_);
        });
        let l = [], b = [];
        Object.entries(s).forEach((T) => {
          let A = T[0], C = T[1], _ = this.outputNames.indexOf(A);
          if (_ === -1) throw new Error(`invalid output '${A}'`);
          l.push(C), b.push(_);
        });
        let g = i.map((T, A) => Js(T, () => `input "${this.inputNames[p[A]]}"`)), w = l.map((T, A) => T ? Js(T, () => `output "${this.outputNames[b[A]]}"`) : null), S = await qs(this.sessionId, p, g, b, w, f), v = {};
        for (let T = 0; T < S.length; T++) v[this.outputNames[b[T]]] = l[T] ?? $c(S[T]);
        return at(), v;
      }
      startProfiling() {
      }
      endProfiling() {
        Ys(this.sessionId);
      }
    };
  });
  var Ks = {};
  At(Ks, { OnnxruntimeWebAssemblyBackend: () => yr, initializeFlags: () => Zs, wasmBackend: () => zc });
  var Zs;
  var yr;
  var zc;
  var Qs = G(() => {
    "use strict";
    Ve();
    bn();
    Xs();
    Zs = () => {
      (typeof ee.wasm.initTimeout != "number" || ee.wasm.initTimeout < 0) && (ee.wasm.initTimeout = 0);
      let a = ee.wasm.simd;
      if (typeof a != "boolean" && a !== void 0 && a !== "fixed" && a !== "relaxed" && (console.warn(`Property "env.wasm.simd" is set to unknown value "${a}". Reset it to \`false\` and ignore SIMD feature checking.`), ee.wasm.simd = false), typeof ee.wasm.proxy != "boolean" && (ee.wasm.proxy = false), typeof ee.wasm.trace != "boolean" && (ee.wasm.trace = false), typeof ee.wasm.numThreads != "number" || !Number.isInteger(ee.wasm.numThreads) || ee.wasm.numThreads <= 0) if (typeof self < "u" && !self.crossOriginIsolated) ee.wasm.numThreads = 1;
      else {
        let r = typeof navigator > "u" ? Xr("node:os").cpus().length : navigator.hardwareConcurrency;
        ee.wasm.numThreads = Math.min(4, Math.ceil((r || 1) / 2));
      }
    }, yr = class {
      async init(r) {
        Zs(), await $s(), await zs(r);
      }
      async createInferenceSessionHandler(r, s) {
        let f = new gr();
        return await f.loadModel(r, s), f;
      }
    }, zc = new yr();
  });
  Ve();
  Ve();
  Ve();
  var is = "1.31.0-dev.20260914-8d85527a0";
  var $l = rn;
  {
    let a = (Qs(), Ht(Ks)).wasmBackend;
    rt("webgpu", a, 5), rt("webnn", a, 5), rt("cpu", a, 10), rt("wasm", a, 10);
  }
  Object.defineProperty(ee.versions, "web", { value: is, enumerable: true });

  // node_modules/@huggingface/transformers/src/utils/cache/FileCache.js
  var import_node_fs3 = __toESM(require_node_fs(), 1);
  var import_node_path2 = __toESM(require_node_path(), 1);

  // node_modules/@huggingface/transformers/src/utils/hub/FileResponse.js
  var import_node_fs2 = __toESM(require_node_fs(), 1);
  var CONTENT_TYPE_MAP = {
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "text/javascript",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif"
  };
  var FileResponse = class _FileResponse {
    /**
     * Creates a new `FileResponse` object.
     * @param {string} filePath
     */
    constructor(filePath) {
      this.filePath = filePath;
      this.headers = new Headers();
      this.exists = import_node_fs2.default.existsSync(filePath);
      if (this.exists) {
        this.status = 200;
        this.statusText = "OK";
        let stats = import_node_fs2.default.statSync(filePath);
        this.headers.set("content-length", stats.size.toString());
        this.updateContentType();
        const stream = import_node_fs2.default.createReadStream(filePath);
        this.body = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk) => controller.enqueue(chunk));
            stream.on("end", () => controller.close());
            stream.on("error", (err) => controller.error(err));
          },
          cancel() {
            stream.destroy();
          }
        });
      } else {
        this.status = 404;
        this.statusText = "Not Found";
        this.body = null;
      }
    }
    /**
     * Updates the 'content-type' header property of the response based on the extension of
     * the file specified by the filePath property of the current object.
     * @returns {void}
     */
    updateContentType() {
      const extension = this.filePath.toString().split(".").pop().toLowerCase();
      this.headers.set("content-type", CONTENT_TYPE_MAP[extension] ?? "application/octet-stream");
    }
    /**
     * Clone the current FileResponse object.
     * @returns {FileResponse} A new FileResponse object with the same properties as the current object.
     */
    clone() {
      let response = new _FileResponse(this.filePath);
      response.exists = this.exists;
      response.status = this.status;
      response.statusText = this.statusText;
      response.headers = new Headers(this.headers);
      return response;
    }
    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with an ArrayBuffer containing the file's contents.
     * @returns {Promise<ArrayBuffer>} A Promise that resolves with an ArrayBuffer containing the file's contents.
     * @throws {Error} If the file cannot be read.
     */
    async arrayBuffer() {
      const data = await import_node_fs2.default.promises.readFile(this.filePath);
      return (
        /** @type {ArrayBuffer} */
        data.buffer
      );
    }
    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a Blob containing the file's contents.
     * @returns {Promise<Blob>} A Promise that resolves with a Blob containing the file's contents.
     * @throws {Error} If the file cannot be read.
     */
    async blob() {
      const data = await import_node_fs2.default.promises.readFile(this.filePath);
      return new Blob([
        /** @type {any} */
        data
      ], { type: this.headers.get("content-type") });
    }
    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a string containing the file's contents.
     * @returns {Promise<string>} A Promise that resolves with a string containing the file's contents.
     * @throws {Error} If the file cannot be read.
     */
    async text() {
      return await import_node_fs2.default.promises.readFile(this.filePath, "utf8");
    }
    /**
     * Reads the contents of the file specified by the filePath property and returns a Promise that
     * resolves with a parsed JavaScript object containing the file's contents.
     *
     * @returns {Promise<Object>} A Promise that resolves with a parsed JavaScript object containing the file's contents.
     * @throws {Error} If the file cannot be read.
     */
    async json() {
      return JSON.parse(await this.text());
    }
  };

  // node_modules/@huggingface/transformers/src/utils/random.js
  var Random = class {
    constructor(seed) {
      this._mt = new Uint32Array(624);
      this._idx = 625;
      this._gauss_next = null;
      this._random_fn = this.random.bind(this);
      this.seed(seed);
    }
    /**
     * Seeds this instance's PRNG.
     *
     * When called with a number, initializes the state deterministically from that value.
     * When called with no arguments (or `undefined`/`null`), seeds from OS entropy
     * via `crypto.getRandomValues`, matching Python's `random.seed()` behavior.
     *
     * @param {number} [n] The seed value. Omit to seed from OS entropy.
     */
    seed(n) {
      if (n === void 0 || n === null) {
        if (apis.IS_CRYPTO_AVAILABLE) {
          const buf = new Uint32Array(1);
          crypto.getRandomValues(buf);
          n = buf[0];
        } else {
          n = Date.now() >>> 0;
        }
      }
      const mt = this._mt;
      const u = (a, b) => Math.imul(a, b) >>> 0, key = [];
      for (let v = n || 0; v > 0; v = Math.floor(v / 4294967296)) key.push(v & 4294967295);
      if (!key.length) key.push(0);
      mt[0] = 19650218;
      for (let k = 1; k < 624; ++k) mt[k] = u(1812433253, mt[k - 1] ^ mt[k - 1] >>> 30) + k >>> 0;
      let i = 1, j2 = 0;
      for (let k = Math.max(624, key.length); k > 0; --k, ++i, ++j2) {
        if (i >= 624) {
          mt[0] = mt[623];
          i = 1;
        }
        if (j2 >= key.length) j2 = 0;
        mt[i] = (mt[i] ^ u(mt[i - 1] ^ mt[i - 1] >>> 30, 1664525)) + key[j2] + j2 >>> 0;
      }
      for (let k = 623; k > 0; --k, ++i) {
        if (i >= 624) {
          mt[0] = mt[623];
          i = 1;
        }
        mt[i] = (mt[i] ^ u(mt[i - 1] ^ mt[i - 1] >>> 30, 1566083941)) - i >>> 0;
      }
      mt[0] = 2147483648;
      this._idx = 624;
      this._gauss_next = null;
    }
    /**
     * Generates a random unsigned 32-bit integer.
     *
     * Performs the "twist" step when the state buffer is exhausted,
     * then applies the standard MT19937 tempering transform.
     *
     * @returns {number} A random integer in the range [0, 2^32 - 1].
     * @internal
     */
    _int32() {
      const mt = this._mt;
      if (this._idx >= 624) {
        for (let k = 0; k < 624; ++k) {
          const y2 = mt[k] & 2147483648 | mt[(k + 1) % 624] & 2147483647;
          mt[k] = (mt[(k + 397) % 624] ^ y2 >>> 1 ^ (y2 & 1 ? 2567483615 : 0)) >>> 0;
        }
        this._idx = 0;
      }
      let y = mt[this._idx++];
      y ^= y >>> 11;
      y ^= y << 7 & 2636928640;
      y ^= y << 15 & 4022730752;
      y ^= y >>> 18;
      return y >>> 0;
    }
    /**
     * Generates a random floating-point number in the half-open interval [0, 1).
     *
     * Combines two 32-bit integers (using 53 bits of precision) to produce
     * a uniformly distributed double, matching Python's `random.random()`.
     *
     * @returns {number} A random float in [0, 1).
     */
    random() {
      return ((this._int32() >>> 5) * 67108864 + (this._int32() >>> 6)) / 9007199254740992;
    }
    /**
     * Generates a random number from a Gaussian (normal) distribution.
     *
     * Uses the Box-Muller transform with a cached spare value,
     * matching Python's `random.gauss()` output for the same seed.
     *
     * @param {number} [mu=0] The mean of the distribution.
     * @param {number} [sigma=1] The standard deviation of the distribution.
     * @returns {number} A normally distributed random value.
     */
    gauss(mu = 0, sigma = 1) {
      let z = this._gauss_next;
      this._gauss_next = null;
      if (z === null) {
        const x2pi = this.random() * 2 * Math.PI, g2rad = Math.sqrt(-2 * Math.log(1 - this.random()));
        z = Math.cos(x2pi) * g2rad;
        this._gauss_next = Math.sin(x2pi) * g2rad;
      }
      return mu + z * sigma;
    }
    /**
     * Shuffles an array in-place using the Fisher-Yates algorithm.
     *
     * Uses rejection sampling via `getrandbits`-style bit masking to ensure
     * a uniform distribution, matching Python's `random.shuffle()`.
     *
     * @param {any[]} arr The array to shuffle in-place.
     */
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; --i) {
        const k = 32 - Math.clz32(i + 1);
        let r = this._int32() >>> 32 - k;
        while (r > i) r = this._int32() >>> 32 - k;
        const t = arr[i];
        arr[i] = arr[r];
        arr[r] = t;
      }
    }
    /**
     * Selects a single element from a weighted population.
     *
     * Matches Python's `random.choices(population, weights=weights, k=1)[0]`
     *
     * @param {any[]} population The array of items to choose from.
     * @param {number[]} weights An array of non-negative weights, one per population element.
     * @returns {*} A single randomly selected element from the population.
     */
    choices(population, weights) {
      return population[_weightedIndexWith(this._random_fn, weights)];
    }
  };
  function _weightedIndexWith(randomFn, weights) {
    let sum = 0;
    for (let i = 0; i < weights.length; ++i) sum += weights[i];
    let x = randomFn() * sum;
    for (let i = 0; i < weights.length; ++i) {
      x -= weights[i];
      if (x < 0) return i;
    }
    return weights.length - 1;
  }
  var _default = new Random();
  var random = Object.freeze({
    Random,
    seed: _default.seed.bind(_default),
    random: _default.random.bind(_default),
    gauss: _default.gauss.bind(_default),
    shuffle: _default.shuffle.bind(_default),
    choices: _default.choices.bind(_default)
  });
  var _weightedIndex = (weights) => _weightedIndexWith(random.random, weights);

  // node_modules/@huggingface/transformers/src/utils/cache/FileCache.js
  var rng = new Random();
  var FileCache = class {
    /**
     * Instantiate a `FileCache` object.
     * @param {string} path
     */
    constructor(path3) {
      this.path = path3;
    }
    /**
     * Checks whether the given request is in the cache.
     * @param {string} request
     * @returns {Promise<FileResponse | undefined>}
     */
    async match(request) {
      let filePath = import_node_path2.default.join(this.path, request);
      let file = new FileResponse(filePath);
      if (file.exists) {
        return file;
      } else {
        return void 0;
      }
    }
    /**
     * Adds the given response to the cache.
     * @param {string} request
     * @param {Response} response
     * @param {(data: {progress: number, loaded: number, total: number}) => void} [progress_callback] Optional.
     * The function to call with progress updates
     * @returns {Promise<void>}
     */
    async put(request, response, progress_callback = void 0) {
      const filePath = import_node_path2.default.join(this.path, request);
      const id = apis.IS_PROCESS_AVAILABLE ? process.pid : Date.now();
      const randomSuffix = rng._int32().toString(36);
      const tmpPath = filePath + `.tmp.${id}.${randomSuffix}`;
      try {
        const contentLength = response.headers.get("Content-Length");
        const total = parseInt(contentLength ?? "0");
        let loaded = 0;
        await import_node_fs3.default.promises.mkdir(import_node_path2.default.dirname(filePath), { recursive: true });
        const fileStream = import_node_fs3.default.createWriteStream(tmpPath);
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          await new Promise((resolve, reject) => {
            fileStream.write(value, (err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            });
          });
          loaded += value.length;
          const progress = total ? loaded / total * 100 : 0;
          progress_callback?.({ progress, loaded, total });
        }
        await new Promise((resolve, reject) => {
          fileStream.close((err) => err ? reject(err) : resolve());
        });
        await import_node_fs3.default.promises.rename(tmpPath, filePath);
      } catch (error) {
        try {
          await import_node_fs3.default.promises.unlink(tmpPath);
        } catch {
        }
        throw error;
      }
    }
    /**
     * Deletes the cache entry for the given request.
     * @param {string} request
     * @returns {Promise<boolean>} A Promise that resolves to `true` if the cache entry was deleted, `false` otherwise.
     */
    async delete(request) {
      let filePath = import_node_path2.default.join(this.path, request);
      try {
        await import_node_fs3.default.promises.unlink(filePath);
        return true;
      } catch (error) {
        return false;
      }
    }
    // TODO add the rest?
    // addAll(requests: RequestInfo[]): Promise<void>;
    // keys(request?: RequestInfo | URL, options?: CacheQueryOptions): Promise<ReadonlyArray<Request>>;
    // match(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<Response | undefined>;
    // matchAll(request?: RequestInfo | URL, options?: CacheQueryOptions): Promise<ReadonlyArray<Response>>;
  };

  // node_modules/@huggingface/transformers/src/utils/logger.js
  var logger = {
    /**
     * Log an error message. Only suppressed when logLevel is NONE.
     * @param  {...any} args - Arguments to log
     */
    error(...args) {
      if (env.logLevel <= LogLevel.ERROR) {
        console.error(...args);
      }
    },
    /**
     * Log a warning message. Shown when logLevel <= WARNING.
     * @param  {...any} args - Arguments to log
     */
    warn(...args) {
      if (env.logLevel <= LogLevel.WARNING) {
        console.warn(...args);
      }
    },
    /**
     * Log an info message. Shown when logLevel <= INFO.
     * @param  {...any} args - Arguments to log
     */
    info(...args) {
      if (env.logLevel <= LogLevel.INFO) {
        console.log(...args);
      }
    },
    /**
     * Log a debug message. Only shown when logLevel is DEBUG.
     * @param  {...any} args - Arguments to log
     */
    debug(...args) {
      if (env.logLevel <= LogLevel.DEBUG) {
        console.log(...args);
      }
    },
    /**
     * Log a message (alias for info). Shown when logLevel <= INFO.
     * @param  {...any} args - Arguments to log
     */
    log(...args) {
      this.info(...args);
    }
  };

  // node_modules/@huggingface/transformers/src/utils/cache/CrossOriginStorageCache.js
  var HASH_ALGORITHM = "SHA-256";
  var HASH_CACHE_NAME = "experimental_transformers-hash-cache";
  var makeHashDescriptor = (value) => ({ algorithm: HASH_ALGORITHM, value });
  var CrossOriginStorage = class {
    /** @type {Promise<Cache> | null} */
    #hashCache = null;
    /**
     * Returns (and lazily opens) the hash cache, reusing the same promise across concurrent callers.
     * @returns {Promise<Cache>}
     */
    _getHashCache = () => {
      this.#hashCache ??= caches.open(HASH_CACHE_NAME);
      return this.#hashCache;
    };
    /**
     * Returns whether the `navigator.crossOriginStorage` API is available in the current environment.
     * @returns {boolean}
     */
    static isAvailable = () => typeof navigator !== "undefined" && "crossOriginStorage" in navigator;
    /**
     * Looks up a cached response for the given URL by resolving its SHA-256 hash and requesting
     * the corresponding file handle from cross-origin storage.
     *
     * Implements `CacheInterface.match`.
     *
     * @param {string} request The URL of the resource to look up.
     * @returns {Promise<Response|undefined>} The cached `Response`, or `undefined` if not found.
     */
    match = async (request) => {
      const hashValue = await this._getFileHash(request);
      if (!hashValue) {
        return void 0;
      }
      try {
        const handle = await navigator.crossOriginStorage.requestFileHandle(makeHashDescriptor(hashValue));
        const blob = await handle.getFile();
        return new Response(blob, {
          headers: {
            "Content-Length": String(blob.size)
          }
        });
      } catch {
        return void 0;
      }
    };
    /**
     * Stores a response in cross-origin storage, keyed by its SHA-256 hash.
     *
     * For LFS-backed URLs the hash is resolved cheaply via `_getFileHash` (which checks
     * `HASH_CACHE_NAME` first, then falls back to fetching the Git LFS pointer file)
     * without reading the response body a second time.
     *
     * For non-LFS resources the hash is unknown upfront.  In that case the body is consumed
     * in the background: the stream is read to compute the content hash, the file is written
     * into cross-origin storage, and the computed hash is persisted to `HASH_CACHE_NAME`
     * so that future `match` calls can resolve the file without a network round-trip.
     *
     * Implements `CacheInterface.put`.
     *
     * @param {string} request The URL of the resource (used as the hash-cache key).
     * @param {Response} response The response whose body will be written to the cache.
     * @returns {Promise<void>}
     */
    put = async (request, response) => {
      const hashValue = await this._getFileHash(request);
      if (hashValue) {
        const blob = await response.blob();
        await this._storeBlobInCOS(blob, hashValue);
      } else {
        this._processAndStore(request, response.body);
      }
    };
    /**
     * Writes a blob into cross-origin storage using the given pre-computed hex hash string.
     *
     * @param {Blob} blob
     * @param {string} hashHex Hex-encoded SHA-256 hash of `blob`.
     * @returns {Promise<void>}
     */
    _storeBlobInCOS = async (blob, hashHex) => {
      const handle = await navigator.crossOriginStorage.requestFileHandle(makeHashDescriptor(hashHex), {
        create: true,
        origins: "*"
      });
      const writableStream = await handle.createWritable();
      await writableStream.write(blob);
      await writableStream.close();
    };
    /**
     * Background task for non-LFS resources: consumes `stream`, computes the SHA-256 hash
     * of the resulting blob, stores it in cross-origin storage, and persists the computed
     * hash to `HASH_CACHE_NAME` keyed by `request` so future `match` calls can resolve the
     * file without a network round-trip.
     *
     * Called fire-and-forget from `put` — errors are swallowed so failures never surface to
     * the caller.
     *
     * @param {string} request The original resource URL.
     * @param {ReadableStream} stream The response body stream to consume.
     * @returns {Promise<void>}
     */
    _processAndStore = async (request, stream) => {
      try {
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        const blob = new Blob(chunks);
        const hashHex = await this._getBlobHash(blob);
        await this._storeBlobInCOS(blob, hashHex);
        try {
          const hashCache = await this._getHashCache();
          await hashCache.put(request, new Response(hashHex));
        } catch {
        }
      } catch {
      }
    };
    /**
     * Deletes the cache entry for the given request.
     *
     * Removes the hash entry from `HASH_CACHE_NAME`. Note: cross-origin storage itself does not
     * expose a delete API, so only the local hash mapping is removed. For non-LFS URLs this
     * permanently prevents `match` from resolving the file. For LFS-backed URLs, `match` will
     * re-fetch the LFS pointer file on the next call and repopulate the hash cache automatically.
     *
     * Implements `CacheInterface.delete`.
     *
     * @param {string} request
     * @returns {Promise<boolean>} Resolves to `true` if the hash entry was deleted, `false` otherwise.
     */
    delete = async (request) => {
      try {
        const hashCache = await this._getHashCache();
        return await hashCache.delete(request);
      } catch {
        return false;
      }
    };
    /**
     * Resolves the SHA-256 hash for a given URL.
     *
     * Returns the cached hash immediately if one has been persisted to `HASH_CACHE_NAME`.
     * Otherwise falls back to `_getLfsFileHash` to retrieve the hash from the Hugging Face
     * LFS pointer file, persisting the result to `HASH_CACHE_NAME` for future lookups.
     *
     * Returns `null` if the hash cannot be determined (e.g. non-LFS URL with no cached entry).
     *
     * @param {string} url The resource URL to resolve a hash for.
     * @returns {Promise<string|null>} The hex-encoded SHA-256 hash, or `null` if unavailable.
     */
    _getFileHash = async (url2) => {
      try {
        const hashCache = await this._getHashCache();
        const cached = await hashCache.match(url2);
        if (cached) {
          return cached.text();
        }
        const hash = await this._getLfsFileHash(url2);
        if (hash) {
          await hashCache.put(url2, new Response(hash));
          return hash;
        }
        return null;
      } catch {
        return null;
      }
    };
    /**
     * Attempts to retrieve the SHA-256 hash for a Hugging Face resource URL from its raw
     * Git LFS pointer file.
     *
     * Only applicable to URLs containing `/resolve/` (i.e. Hugging Face resolved file URLs).
     * The `/resolve/` segment is rewritten to `/raw/` to fetch the LFS pointer directly.
     * Returns `null` for non-LFS URLs or when the network request fails.
     *
     * @see https://huggingface.co/docs/hub/en/storage-backends#xet
     * @param {string} url The resolved Hugging Face URL of the resource.
     * @returns {Promise<string|null>} The hex-encoded SHA-256 hash, or `null` if unavailable.
     */
    _getLfsFileHash = async (url2) => {
      if (!url2.includes("/resolve/")) {
        return null;
      }
      const rawUrl = url2.replace("/resolve/", "/raw/");
      try {
        const text = await fetch(rawUrl).then((r) => r.text());
        const match = text.match(/^oid sha256:([0-9a-f]+)$/m);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    };
    /**
     * Computes the SHA-256 hash of a `Blob`'s contents.
     *
     * @param {Blob} blob The blob to hash.
     * @returns {Promise<string>} The lowercase hex-encoded SHA-256 hash.
     */
    _getBlobHash = async (blob) => {
      const arrayBuffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest(HASH_ALGORITHM, arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
    };
  };

  // node_modules/@huggingface/transformers/src/utils/cache.js
  async function getCache(file_cache_dir = null) {
    let cache2 = null;
    if (env.useCustomCache) {
      if (!env.customCache) {
        throw Error("`env.useCustomCache=true`, but `env.customCache` is not defined.");
      }
      if (!env.customCache.match || !env.customCache.put) {
        throw new Error(
          "`env.customCache` must be an object which implements the `match` and `put` functions of the Web Cache API. For more information, see https://developer.mozilla.org/en-US/docs/Web/API/Cache"
        );
      }
      cache2 = env.customCache;
    }
    if (!cache2 && env.experimental_useCrossOriginStorage && CrossOriginStorage.isAvailable()) {
      cache2 = new CrossOriginStorage();
    }
    if (!cache2 && env.useBrowserCache) {
      if (typeof caches === "undefined") {
        throw Error("Browser cache is not available in this environment.");
      }
      try {
        cache2 = await caches.open(env.cacheKey);
      } catch (e) {
        logger.warn("An error occurred while opening the browser cache:", e);
      }
    }
    if (!cache2 && env.useFSCache) {
      if (!apis.IS_FS_AVAILABLE) {
        throw Error("File System Cache is not available in this environment.");
      }
      cache2 = new FileCache(file_cache_dir ?? env.cacheDir);
    }
    return cache2;
  }
  async function tryCache(cache2, ...names) {
    for (let name of names) {
      try {
        let result = await cache2.match(name);
        if (result) return result;
      } catch (e) {
        continue;
      }
    }
    return void 0;
  }

  // node_modules/@huggingface/transformers/src/backends/utils/cacheWasm.js
  async function loadAndCacheFile(url2) {
    const fileName = url2.split("/").pop();
    let cache2;
    try {
      cache2 = await getCache();
      if (cache2) {
        const result = await cache2.match(url2);
        if (result) {
          return result;
        }
      }
    } catch (error) {
      logger.warn(`Failed to load ${fileName} from cache:`, error);
    }
    const response = await env.fetch(url2);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${fileName}: ${response.status} ${response.statusText}`);
    }
    if (cache2) {
      try {
        await cache2.put(url2, response.clone());
      } catch (e) {
        logger.warn(`Failed to cache ${fileName}:`, e);
      }
    }
    return response;
  }
  async function loadWasmBinary(wasmURL) {
    const response = await loadAndCacheFile(wasmURL);
    if (!response || typeof response === "string") return null;
    try {
      return await response.arrayBuffer();
    } catch (error) {
      logger.warn("Failed to read WASM binary:", error);
      return null;
    }
  }
  async function loadWasmFactory(libURL) {
    if (apis.IS_SERVICE_WORKER_ENV || apis.IS_CHROME_AVAILABLE) {
      return libURL;
    }
    const response = await loadAndCacheFile(libURL);
    if (!response || typeof response === "string") return null;
    try {
      let code = await response.text();
      code = code.replaceAll("globalThis.process?.versions?.node", "false");
      const blob = new Blob([code], { type: "text/javascript" });
      return URL.createObjectURL(blob);
    } catch (error) {
      logger.warn("Failed to read WASM factory:", error);
      return null;
    }
  }

  // node_modules/@huggingface/transformers/src/utils/hub/constants.js
  var ERROR_MAPPING = {
    // 4xx errors (https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#client_error_responses)
    400: "Bad request error occurred while trying to load file",
    401: "Unauthorized access to file",
    403: "Forbidden access to file",
    404: "Could not locate file",
    408: "Request timeout error occurred while trying to load file",
    // 5xx errors (https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#server_error_responses)
    500: "Internal server error error occurred while trying to load file",
    502: "Bad gateway error occurred while trying to load file",
    503: "Service unavailable error occurred while trying to load file",
    504: "Gateway timeout error occurred while trying to load file"
  };
  var MAX_EXTERNAL_DATA_CHUNKS = 100;
  var REPO_ID_REGEX = /^(\b[\w\-.]+\b\/)?\b[\w\-.]{1,96}\b$/;

  // node_modules/@huggingface/transformers/src/utils/hub/utils.js
  var import_meta3 = {};
  function pathJoin(...parts) {
    parts = parts.map((part, index) => {
      if (index) {
        part = part.replace(new RegExp("^/"), "");
      }
      if (index !== parts.length - 1) {
        part = part.replace(new RegExp("/$"), "");
      }
      return part;
    });
    return parts.join("/");
  }
  function isValidUrl(string, protocols = null, validHosts = null) {
    let url2;
    try {
      url2 = new URL(string);
    } catch (_) {
      return false;
    }
    if (protocols && !protocols.includes(url2.protocol)) {
      return false;
    }
    if (validHosts && !validHosts.includes(url2.hostname)) {
      return false;
    }
    return true;
  }
  function isValidHfModelId(string) {
    if (!REPO_ID_REGEX.test(string)) return false;
    if (string.includes("..") || string.includes("--")) return false;
    if (string.endsWith(".git") || string.endsWith(".ipynb")) return false;
    return true;
  }
  function makePretrainedOptionsKey(model_id, options = {}, ...parts) {
    return JSON.stringify([
      model_id,
      options.revision ?? "main",
      options.cache_dir ?? null,
      options.local_files_only ?? false,
      ...parts
    ]);
  }
  var ModelFileNotFoundError = class extends Error {
    /**
     * @param {string} message The error message.
     * @param {Object} [options] Additional error information.
     * @param {number|null} [options.status=null] The HTTP status code, when the failure came from a Hub response.
     */
    constructor(message, { status = null } = {}) {
      super(message);
      this.name = "ModelFileNotFoundError";
      this.status = status;
    }
  };
  var NOT_FOUND_STATUSES = /* @__PURE__ */ new Set([401, 403, 404]);
  function handleError(status, remoteURL, fatal) {
    if (!fatal) {
      return null;
    }
    const message = ERROR_MAPPING[status] ?? `Error (${status}) occurred while trying to load file`;
    const fullMessage = `${message}: "${remoteURL}".`;
    if (NOT_FOUND_STATUSES.has(status)) {
      throw new ModelFileNotFoundError(fullMessage, { status });
    }
    throw Error(fullMessage);
  }
  async function readResponse(response, progress_callback, expectedSize) {
    const contentLength = response.headers.get("Content-Length");
    let total = contentLength ? parseInt(contentLength, 10) : expectedSize ?? 0;
    if (contentLength === null && !expectedSize) {
      logger.warn("Unable to determine content-length from response headers. Will expand buffer when needed.");
    }
    let buffer = new Uint8Array(total);
    let loaded = 0;
    const reader = response.body.getReader();
    async function read() {
      const { done, value } = await reader.read();
      if (done) return;
      const newLoaded = loaded + value.length;
      if (newLoaded > total) {
        total = newLoaded;
        const newBuffer = new Uint8Array(total);
        newBuffer.set(buffer);
        buffer = newBuffer;
      }
      buffer.set(value, loaded);
      loaded = newLoaded;
      const progress = loaded / total * 100;
      progress_callback({ progress, loaded, total });
      return read();
    }
    await read();
    return buffer;
  }
  function isBlobURL(url2) {
    return isValidUrl(url2, ["blob:"]);
  }
  function toAbsoluteURL(url2, { allowUnresolved = false } = {}) {
    let baseURL;
    if (typeof location !== "undefined" && location.href) {
      baseURL = location.href;
    } else if (typeof import_meta3 !== "undefined" && import_meta3.url) {
      baseURL = import_meta3.url;
    } else {
      return url2;
    }
    try {
      return new URL(url2, baseURL).href;
    } catch (error) {
      if (!allowUnresolved) {
        throw error;
      }
      return url2;
    }
  }

  // node_modules/onnxruntime-common/dist/esm/version.js
  var version = "1.30.0";

  // node_modules/onnxruntime-common/dist/esm/env-impl.js
  var logLevelValue = "warning";
  var env2 = {
    wasm: {},
    webgl: {},
    webgpu: {},
    versions: { common: version },
    set logLevel(value) {
      if (value === void 0) {
        return;
      }
      if (typeof value !== "string" || ["verbose", "info", "warning", "error", "fatal"].indexOf(value) === -1) {
        throw new Error(`Unsupported logging level: ${value}`);
      }
      logLevelValue = value;
    },
    get logLevel() {
      return logLevelValue;
    }
  };
  Object.defineProperty(env2, "logLevel", { enumerable: true });

  // node_modules/onnxruntime-common/dist/esm/tensor-conversion-impl.js
  var tensorToDataURL = (tensor, options) => {
    const canvas = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(1, 1);
    canvas.width = tensor.dims[3];
    canvas.height = tensor.dims[2];
    const pixels2DContext = canvas.getContext("2d");
    if (pixels2DContext != null) {
      let width;
      let height;
      if (options?.tensorLayout !== void 0 && options.tensorLayout === "NHWC") {
        width = tensor.dims[2];
        height = tensor.dims[3];
      } else {
        width = tensor.dims[3];
        height = tensor.dims[2];
      }
      const inputformat = options?.format !== void 0 ? options.format : "RGB";
      const norm = options?.norm;
      let normMean;
      let normBias;
      if (norm === void 0 || norm.mean === void 0) {
        normMean = [255, 255, 255, 255];
      } else {
        if (typeof norm.mean === "number") {
          normMean = [norm.mean, norm.mean, norm.mean, norm.mean];
        } else {
          normMean = [norm.mean[0], norm.mean[1], norm.mean[2], 0];
          if (norm.mean[3] !== void 0) {
            normMean[3] = norm.mean[3];
          }
        }
      }
      if (norm === void 0 || norm.bias === void 0) {
        normBias = [0, 0, 0, 0];
      } else {
        if (typeof norm.bias === "number") {
          normBias = [norm.bias, norm.bias, norm.bias, norm.bias];
        } else {
          normBias = [norm.bias[0], norm.bias[1], norm.bias[2], 0];
          if (norm.bias[3] !== void 0) {
            normBias[3] = norm.bias[3];
          }
        }
      }
      const stride = height * width;
      let rTensorPointer = 0, gTensorPointer = stride, bTensorPointer = stride * 2, aTensorPointer = -1;
      if (inputformat === "RGBA") {
        rTensorPointer = 0;
        gTensorPointer = stride;
        bTensorPointer = stride * 2;
        aTensorPointer = stride * 3;
      } else if (inputformat === "RGB") {
        rTensorPointer = 0;
        gTensorPointer = stride;
        bTensorPointer = stride * 2;
      } else if (inputformat === "RBG") {
        rTensorPointer = 0;
        bTensorPointer = stride;
        gTensorPointer = stride * 2;
      }
      for (let i = 0; i < height; i++) {
        for (let j2 = 0; j2 < width; j2++) {
          const R = (tensor.data[rTensorPointer++] - normBias[0]) * normMean[0];
          const G2 = (tensor.data[gTensorPointer++] - normBias[1]) * normMean[1];
          const B = (tensor.data[bTensorPointer++] - normBias[2]) * normMean[2];
          const A = aTensorPointer === -1 ? 255 : (tensor.data[aTensorPointer++] - normBias[3]) * normMean[3];
          pixels2DContext.fillStyle = "rgba(" + R + "," + G2 + "," + B + "," + A + ")";
          pixels2DContext.fillRect(j2, i, 1, 1);
        }
      }
      if ("toDataURL" in canvas) {
        return canvas.toDataURL();
      } else {
        throw new Error("toDataURL is not supported");
      }
    } else {
      throw new Error("Can not access image data");
    }
  };
  var tensorToImageData = (tensor, options) => {
    const pixels2DContext = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : new OffscreenCanvas(1, 1).getContext("2d");
    let image;
    if (pixels2DContext != null) {
      let width;
      let height;
      let channels;
      if (options?.tensorLayout !== void 0 && options.tensorLayout === "NHWC") {
        width = tensor.dims[2];
        height = tensor.dims[1];
        channels = tensor.dims[3];
      } else {
        width = tensor.dims[3];
        height = tensor.dims[2];
        channels = tensor.dims[1];
      }
      const inputformat = options !== void 0 ? options.format !== void 0 ? options.format : "RGB" : "RGB";
      const norm = options?.norm;
      let normMean;
      let normBias;
      if (norm === void 0 || norm.mean === void 0) {
        normMean = [255, 255, 255, 255];
      } else {
        if (typeof norm.mean === "number") {
          normMean = [norm.mean, norm.mean, norm.mean, norm.mean];
        } else {
          normMean = [norm.mean[0], norm.mean[1], norm.mean[2], 255];
          if (norm.mean[3] !== void 0) {
            normMean[3] = norm.mean[3];
          }
        }
      }
      if (norm === void 0 || norm.bias === void 0) {
        normBias = [0, 0, 0, 0];
      } else {
        if (typeof norm.bias === "number") {
          normBias = [norm.bias, norm.bias, norm.bias, norm.bias];
        } else {
          normBias = [norm.bias[0], norm.bias[1], norm.bias[2], 0];
          if (norm.bias[3] !== void 0) {
            normBias[3] = norm.bias[3];
          }
        }
      }
      const stride = height * width;
      if (options !== void 0) {
        if (options.format !== void 0 && channels === 4 && options.format !== "RGBA" || channels === 3 && options.format !== "RGB" && options.format !== "BGR") {
          throw new Error("Tensor format doesn't match input tensor dims");
        }
      }
      const step = 4;
      let rImagePointer = 0, gImagePointer = 1, bImagePointer = 2, aImagePointer = 3;
      let rTensorPointer = 0, gTensorPointer = stride, bTensorPointer = stride * 2, aTensorPointer = -1;
      if (inputformat === "RGBA") {
        rTensorPointer = 0;
        gTensorPointer = stride;
        bTensorPointer = stride * 2;
        aTensorPointer = stride * 3;
      } else if (inputformat === "RGB") {
        rTensorPointer = 0;
        gTensorPointer = stride;
        bTensorPointer = stride * 2;
      } else if (inputformat === "RBG") {
        rTensorPointer = 0;
        bTensorPointer = stride;
        gTensorPointer = stride * 2;
      }
      image = pixels2DContext.createImageData(width, height);
      for (let i = 0; i < height * width; rImagePointer += step, gImagePointer += step, bImagePointer += step, aImagePointer += step, i++) {
        image.data[rImagePointer] = (tensor.data[rTensorPointer++] - normBias[0]) * normMean[0];
        image.data[gImagePointer] = (tensor.data[gTensorPointer++] - normBias[1]) * normMean[1];
        image.data[bImagePointer] = (tensor.data[bTensorPointer++] - normBias[2]) * normMean[2];
        image.data[aImagePointer] = aTensorPointer === -1 ? 255 : (tensor.data[aTensorPointer++] - normBias[3]) * normMean[3];
      }
    } else {
      throw new Error("Can not access image data");
    }
    return image;
  };

  // node_modules/onnxruntime-common/dist/esm/tensor-factory-impl.js
  var bufferToTensor = (buffer, options) => {
    if (buffer === void 0) {
      throw new Error("Image buffer must be defined");
    }
    if (options.height === void 0 || options.width === void 0) {
      throw new Error("Image height and width must be defined");
    }
    if (options.tensorLayout === "NHWC") {
      throw new Error("NHWC Tensor layout is not supported yet");
    }
    const { height, width } = options;
    const norm = options.norm ?? { mean: 255, bias: 0 };
    let normMean;
    let normBias;
    if (typeof norm.mean === "number") {
      normMean = [norm.mean, norm.mean, norm.mean, norm.mean];
    } else {
      normMean = [norm.mean[0], norm.mean[1], norm.mean[2], norm.mean[3] ?? 255];
    }
    if (typeof norm.bias === "number") {
      normBias = [norm.bias, norm.bias, norm.bias, norm.bias];
    } else {
      normBias = [norm.bias[0], norm.bias[1], norm.bias[2], norm.bias[3] ?? 0];
    }
    const inputformat = options.format !== void 0 ? options.format : "RGBA";
    const outputformat = options.tensorFormat !== void 0 ? options.tensorFormat !== void 0 ? options.tensorFormat : "RGB" : "RGB";
    const stride = height * width;
    const float32Data = outputformat === "RGBA" ? new Float32Array(stride * 4) : new Float32Array(stride * 3);
    let step = 4, rImagePointer = 0, gImagePointer = 1, bImagePointer = 2, aImagePointer = 3;
    let rTensorPointer = 0, gTensorPointer = stride, bTensorPointer = stride * 2, aTensorPointer = -1;
    if (inputformat === "RGB") {
      step = 3;
      rImagePointer = 0;
      gImagePointer = 1;
      bImagePointer = 2;
      aImagePointer = -1;
    }
    if (outputformat === "RGBA") {
      aTensorPointer = stride * 3;
    } else if (outputformat === "RBG") {
      rTensorPointer = 0;
      bTensorPointer = stride;
      gTensorPointer = stride * 2;
    } else if (outputformat === "BGR") {
      bTensorPointer = 0;
      gTensorPointer = stride;
      rTensorPointer = stride * 2;
    }
    for (let i = 0; i < stride; i++, rImagePointer += step, bImagePointer += step, gImagePointer += step, aImagePointer += step) {
      float32Data[rTensorPointer++] = (buffer[rImagePointer] + normBias[0]) / normMean[0];
      float32Data[gTensorPointer++] = (buffer[gImagePointer] + normBias[1]) / normMean[1];
      float32Data[bTensorPointer++] = (buffer[bImagePointer] + normBias[2]) / normMean[2];
      if (aTensorPointer !== -1 && aImagePointer !== -1) {
        float32Data[aTensorPointer++] = (buffer[aImagePointer] + normBias[3]) / normMean[3];
      }
    }
    const outputTensor = outputformat === "RGBA" ? new Tensor("float32", float32Data, [1, 4, height, width]) : new Tensor("float32", float32Data, [1, 3, height, width]);
    return outputTensor;
  };
  var tensorFromImage = async (image, options) => {
    const isHTMLImageEle = typeof HTMLImageElement !== "undefined" && image instanceof HTMLImageElement;
    const isImageDataEle = typeof ImageData !== "undefined" && image instanceof ImageData;
    const isImageBitmap = typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap;
    const isString = typeof image === "string";
    let data;
    let bufferToTensorOptions = options ?? {};
    const createCanvas = () => {
      if (typeof document !== "undefined") {
        return document.createElement("canvas");
      } else if (typeof OffscreenCanvas !== "undefined") {
        return new OffscreenCanvas(1, 1);
      } else {
        throw new Error("Canvas is not supported");
      }
    };
    const createCanvasContext = (canvas) => {
      if (typeof HTMLCanvasElement !== "undefined" && canvas instanceof HTMLCanvasElement) {
        return canvas.getContext("2d");
      } else if (canvas instanceof OffscreenCanvas) {
        return canvas.getContext("2d");
      } else {
        return null;
      }
    };
    if (isHTMLImageEle) {
      const canvas = createCanvas();
      canvas.width = image.width;
      canvas.height = image.height;
      const pixels2DContext = createCanvasContext(canvas);
      if (pixels2DContext != null) {
        let height = image.height;
        let width = image.width;
        if (options !== void 0 && options.resizedHeight !== void 0 && options.resizedWidth !== void 0) {
          height = options.resizedHeight;
          width = options.resizedWidth;
        }
        if (options !== void 0) {
          bufferToTensorOptions = options;
          if (options.tensorFormat !== void 0) {
            throw new Error("Image input config format must be RGBA for HTMLImageElement");
          } else {
            bufferToTensorOptions.tensorFormat = "RGBA";
          }
          bufferToTensorOptions.height = height;
          bufferToTensorOptions.width = width;
        } else {
          bufferToTensorOptions.tensorFormat = "RGBA";
          bufferToTensorOptions.height = height;
          bufferToTensorOptions.width = width;
        }
        pixels2DContext.drawImage(image, 0, 0);
        data = pixels2DContext.getImageData(0, 0, width, height).data;
      } else {
        throw new Error("Can not access image data");
      }
    } else if (isImageDataEle) {
      let height;
      let width;
      if (options !== void 0 && options.resizedWidth !== void 0 && options.resizedHeight !== void 0) {
        height = options.resizedHeight;
        width = options.resizedWidth;
      } else {
        height = image.height;
        width = image.width;
      }
      if (options !== void 0) {
        bufferToTensorOptions = options;
      }
      bufferToTensorOptions.format = "RGBA";
      bufferToTensorOptions.height = height;
      bufferToTensorOptions.width = width;
      if (options !== void 0) {
        const tempCanvas = createCanvas();
        tempCanvas.width = width;
        tempCanvas.height = height;
        const pixels2DContext = createCanvasContext(tempCanvas);
        if (pixels2DContext != null) {
          pixels2DContext.putImageData(image, 0, 0);
          data = pixels2DContext.getImageData(0, 0, width, height).data;
        } else {
          throw new Error("Can not access image data");
        }
      } else {
        data = image.data;
      }
    } else if (isImageBitmap) {
      if (options === void 0) {
        throw new Error("Please provide image config with format for Imagebitmap");
      }
      const canvas = createCanvas();
      canvas.width = image.width;
      canvas.height = image.height;
      const pixels2DContext = createCanvasContext(canvas);
      if (pixels2DContext != null) {
        const height = image.height;
        const width = image.width;
        pixels2DContext.drawImage(image, 0, 0, width, height);
        data = pixels2DContext.getImageData(0, 0, width, height).data;
        bufferToTensorOptions.height = height;
        bufferToTensorOptions.width = width;
        return bufferToTensor(data, bufferToTensorOptions);
      } else {
        throw new Error("Can not access image data");
      }
    } else if (isString) {
      return new Promise((resolve, reject) => {
        const canvas = createCanvas();
        const context = createCanvasContext(canvas);
        if (!image || !context) {
          return reject();
        }
        const newImage = new Image();
        newImage.crossOrigin = "Anonymous";
        newImage.src = image;
        newImage.onload = () => {
          canvas.width = newImage.width;
          canvas.height = newImage.height;
          context.drawImage(newImage, 0, 0, canvas.width, canvas.height);
          const img = context.getImageData(0, 0, canvas.width, canvas.height);
          bufferToTensorOptions.height = canvas.height;
          bufferToTensorOptions.width = canvas.width;
          resolve(bufferToTensor(img.data, bufferToTensorOptions));
        };
      });
    } else {
      throw new Error("Input data provided is not supported - aborted tensor creation");
    }
    if (data !== void 0) {
      return bufferToTensor(data, bufferToTensorOptions);
    } else {
      throw new Error("Input data provided is not supported - aborted tensor creation");
    }
  };
  var tensorFromTexture = (texture, options) => {
    const { width, height, download, dispose } = options;
    const dims = [1, height, width, 4];
    return new Tensor({ location: "texture", type: "float32", texture, dims, download, dispose });
  };
  var tensorFromGpuBuffer = (gpuBuffer, options) => {
    const { dataType, dims, download, dispose } = options;
    return new Tensor({ location: "gpu-buffer", type: dataType ?? "float32", gpuBuffer, dims, download, dispose });
  };
  var tensorFromMLTensor = (mlTensor, options) => {
    const { dataType, dims, download, dispose } = options;
    return new Tensor({ location: "ml-tensor", type: dataType ?? "float32", mlTensor, dims, download, dispose });
  };
  var tensorFromPinnedBuffer = (type, buffer, dims) => new Tensor({ location: "cpu-pinned", type, data: buffer, dims: dims ?? [buffer.length] });

  // node_modules/onnxruntime-common/dist/esm/tensor-impl-type-mapping.js
  var NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP = /* @__PURE__ */ new Map([
    ["float32", Float32Array],
    ["uint8", Uint8Array],
    ["int8", Int8Array],
    ["uint16", Uint16Array],
    ["int16", Int16Array],
    ["int32", Int32Array],
    ["bool", Uint8Array],
    ["float64", Float64Array],
    ["uint32", Uint32Array],
    ["int4", Uint8Array],
    ["uint4", Uint8Array]
  ]);
  var NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP = /* @__PURE__ */ new Map([
    [Float32Array, "float32"],
    [Uint8Array, "uint8"],
    [Int8Array, "int8"],
    [Uint16Array, "uint16"],
    [Int16Array, "int16"],
    [Int32Array, "int32"],
    [Float64Array, "float64"],
    [Uint32Array, "uint32"]
  ]);
  var isTypedArrayChecked = false;
  var checkTypedArray = () => {
    if (!isTypedArrayChecked) {
      isTypedArrayChecked = true;
      const isBigInt64ArrayAvailable = typeof BigInt64Array !== "undefined" && BigInt64Array.from;
      const isBigUint64ArrayAvailable = typeof BigUint64Array !== "undefined" && BigUint64Array.from;
      const Float16Array2 = globalThis.Float16Array;
      const isFloat16ArrayAvailable = typeof Float16Array2 !== "undefined" && Float16Array2.from;
      if (isBigInt64ArrayAvailable) {
        NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.set("int64", BigInt64Array);
        NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.set(BigInt64Array, "int64");
      }
      if (isBigUint64ArrayAvailable) {
        NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.set("uint64", BigUint64Array);
        NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.set(BigUint64Array, "uint64");
      }
      if (isFloat16ArrayAvailable) {
        NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.set("float16", Float16Array2);
        NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.set(Float16Array2, "float16");
      } else {
        NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.set("float16", Uint16Array);
      }
    }
  };

  // node_modules/onnxruntime-common/dist/esm/tensor-utils-impl.js
  var calculateSize = (dims) => {
    let size = 1;
    for (let i = 0; i < dims.length; i++) {
      const dim = dims[i];
      if (typeof dim !== "number" || !Number.isSafeInteger(dim)) {
        throw new TypeError(`dims[${i}] must be an integer, got: ${dim}`);
      }
      if (dim < 0) {
        throw new RangeError(`dims[${i}] must be a non-negative integer, got: ${dim}`);
      }
      size *= dim;
    }
    return size;
  };
  var tensorReshape = (tensor, dims) => {
    switch (tensor.location) {
      case "cpu":
        return new Tensor(tensor.type, tensor.data, dims);
      case "cpu-pinned":
        return new Tensor({
          location: "cpu-pinned",
          data: tensor.data,
          type: tensor.type,
          dims
        });
      case "texture":
        return new Tensor({
          location: "texture",
          texture: tensor.texture,
          type: tensor.type,
          dims
        });
      case "gpu-buffer":
        return new Tensor({
          location: "gpu-buffer",
          gpuBuffer: tensor.gpuBuffer,
          type: tensor.type,
          dims
        });
      case "ml-tensor":
        return new Tensor({
          location: "ml-tensor",
          mlTensor: tensor.mlTensor,
          type: tensor.type,
          dims
        });
      default:
        throw new Error(`tensorReshape: tensor location ${tensor.location} is not supported`);
    }
  };

  // node_modules/onnxruntime-common/dist/esm/tensor-impl.js
  var Tensor = class {
    /**
     * implementation.
     */
    constructor(arg0, arg1, arg2) {
      checkTypedArray();
      let type;
      let dims;
      if (typeof arg0 === "object" && "location" in arg0) {
        this.dataLocation = arg0.location;
        type = arg0.type;
        dims = arg0.dims;
        switch (arg0.location) {
          case "cpu-pinned": {
            const expectedTypedArrayConstructor = NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.get(type);
            if (!expectedTypedArrayConstructor) {
              throw new TypeError(`unsupported type "${type}" to create tensor from pinned buffer`);
            }
            if (!(arg0.data instanceof expectedTypedArrayConstructor)) {
              throw new TypeError(`buffer should be of type ${expectedTypedArrayConstructor.name}`);
            }
            this.cpuData = arg0.data;
            break;
          }
          case "texture": {
            if (type !== "float32") {
              throw new TypeError(`unsupported type "${type}" to create tensor from texture`);
            }
            this.gpuTextureData = arg0.texture;
            this.downloader = arg0.download;
            this.disposer = arg0.dispose;
            break;
          }
          case "gpu-buffer": {
            if (type !== "float32" && type !== "float16" && type !== "int32" && type !== "int64" && type !== "uint32" && type !== "uint8" && type !== "bool" && type !== "uint4" && type !== "int4") {
              throw new TypeError(`unsupported type "${type}" to create tensor from gpu buffer`);
            }
            this.gpuBufferData = arg0.gpuBuffer;
            this.downloader = arg0.download;
            this.disposer = arg0.dispose;
            break;
          }
          case "ml-tensor": {
            if (type !== "float32" && type !== "float16" && type !== "int32" && type !== "int64" && type !== "uint32" && type !== "uint64" && type !== "int8" && type !== "uint8" && type !== "bool" && type !== "uint4" && type !== "int4") {
              throw new TypeError(`unsupported type "${type}" to create tensor from MLTensor`);
            }
            this.mlTensorData = arg0.mlTensor;
            this.downloader = arg0.download;
            this.disposer = arg0.dispose;
            break;
          }
          default:
            throw new Error(`Tensor constructor: unsupported location '${this.dataLocation}'`);
        }
      } else {
        let data;
        let maybeDims;
        if (typeof arg0 === "string") {
          type = arg0;
          maybeDims = arg2;
          if (arg0 === "string") {
            if (!Array.isArray(arg1)) {
              throw new TypeError("A string tensor's data must be a string array.");
            }
            data = arg1;
          } else {
            const typedArrayConstructor = NUMERIC_TENSOR_TYPE_TO_TYPEDARRAY_MAP.get(arg0);
            if (typedArrayConstructor === void 0) {
              throw new TypeError(`Unsupported tensor type: ${arg0}.`);
            }
            if (Array.isArray(arg1)) {
              if (arg0 === "float16" && typedArrayConstructor === Uint16Array || arg0 === "uint4" || arg0 === "int4") {
                throw new TypeError(`Creating a ${arg0} tensor from number array is not supported. Please use ${typedArrayConstructor.name} as data.`);
              } else if (arg0 === "uint64" || arg0 === "int64") {
                data = typedArrayConstructor.from(arg1, BigInt);
              } else {
                data = typedArrayConstructor.from(arg1);
              }
            } else if (arg1 instanceof typedArrayConstructor) {
              data = arg1;
            } else if (arg1 instanceof Uint8ClampedArray) {
              if (arg0 === "uint8") {
                data = Uint8Array.from(arg1);
              } else {
                throw new TypeError(`A Uint8ClampedArray tensor's data must be type of uint8`);
              }
            } else if (arg0 === "float16" && arg1 instanceof Uint16Array && typedArrayConstructor !== Uint16Array) {
              data = new globalThis.Float16Array(arg1.buffer, arg1.byteOffset, arg1.length);
            } else {
              throw new TypeError(`A ${type} tensor's data must be type of ${typedArrayConstructor}`);
            }
          }
        } else {
          maybeDims = arg1;
          if (Array.isArray(arg0)) {
            if (arg0.length === 0) {
              throw new TypeError("Tensor type cannot be inferred from an empty array.");
            }
            const firstElementType = typeof arg0[0];
            if (firstElementType === "string") {
              type = "string";
              data = arg0;
            } else if (firstElementType === "boolean") {
              type = "bool";
              data = Uint8Array.from(arg0);
            } else {
              throw new TypeError(`Invalid element type of data array: ${firstElementType}.`);
            }
          } else if (arg0 instanceof Uint8ClampedArray) {
            type = "uint8";
            data = Uint8Array.from(arg0);
          } else {
            const mappedType = NUMERIC_TENSOR_TYPEDARRAY_TO_TYPE_MAP.get(arg0.constructor);
            if (mappedType === void 0) {
              throw new TypeError(`Unsupported type for tensor data: ${arg0.constructor}.`);
            }
            type = mappedType;
            data = arg0;
          }
        }
        if (maybeDims === void 0) {
          maybeDims = [data.length];
        } else if (!Array.isArray(maybeDims)) {
          throw new TypeError("A tensor's dims must be a number array");
        }
        dims = maybeDims;
        this.cpuData = data;
        this.dataLocation = "cpu";
      }
      const size = calculateSize(dims);
      if (this.cpuData && size !== this.cpuData.length) {
        if ((type === "uint4" || type === "int4") && Math.ceil(size / 2) === this.cpuData.length) {
        } else {
          throw new Error(`Tensor's size(${size}) does not match data length(${this.cpuData.length}).`);
        }
      }
      this.type = type;
      this.dims = dims;
      this.size = size;
    }
    // #endregion
    // #region factory
    static async fromImage(image, options) {
      return tensorFromImage(image, options);
    }
    static fromTexture(texture, options) {
      return tensorFromTexture(texture, options);
    }
    static fromGpuBuffer(gpuBuffer, options) {
      return tensorFromGpuBuffer(gpuBuffer, options);
    }
    static fromMLTensor(mlTensor, options) {
      return tensorFromMLTensor(mlTensor, options);
    }
    static fromPinnedBuffer(type, buffer, dims) {
      return tensorFromPinnedBuffer(type, buffer, dims);
    }
    // #endregion
    // #region conversions
    toDataURL(options) {
      return tensorToDataURL(this, options);
    }
    toImageData(options) {
      return tensorToImageData(this, options);
    }
    // #endregion
    // #region properties
    get data() {
      this.ensureValid();
      if (!this.cpuData) {
        throw new Error("The data is not on CPU. Use `getData()` to download GPU data to CPU, or use `texture` or `gpuBuffer` property to access the GPU data directly.");
      }
      return this.cpuData;
    }
    get location() {
      return this.dataLocation;
    }
    get texture() {
      this.ensureValid();
      if (!this.gpuTextureData) {
        throw new Error("The data is not stored as a WebGL texture.");
      }
      return this.gpuTextureData;
    }
    get gpuBuffer() {
      this.ensureValid();
      if (!this.gpuBufferData) {
        throw new Error("The data is not stored as a WebGPU buffer.");
      }
      return this.gpuBufferData;
    }
    get mlTensor() {
      this.ensureValid();
      if (!this.mlTensorData) {
        throw new Error("The data is not stored as a WebNN MLTensor.");
      }
      return this.mlTensorData;
    }
    // #endregion
    // #region methods
    async getData(releaseData) {
      this.ensureValid();
      switch (this.dataLocation) {
        case "cpu":
        case "cpu-pinned":
          return this.data;
        case "texture":
        case "gpu-buffer":
        case "ml-tensor": {
          if (!this.downloader) {
            throw new Error("The current tensor is not created with a specified data downloader.");
          }
          if (this.isDownloading) {
            throw new Error("The current tensor is being downloaded.");
          }
          try {
            this.isDownloading = true;
            const data = await this.downloader();
            this.downloader = void 0;
            this.dataLocation = "cpu";
            this.cpuData = data;
            if (releaseData && this.disposer) {
              this.disposer();
              this.disposer = void 0;
            }
            return data;
          } finally {
            this.isDownloading = false;
          }
        }
        default:
          throw new Error(`cannot get data from location: ${this.dataLocation}`);
      }
    }
    dispose() {
      if (this.isDownloading) {
        throw new Error("The current tensor is being downloaded.");
      }
      if (this.disposer) {
        this.disposer();
        this.disposer = void 0;
      }
      this.cpuData = void 0;
      this.gpuTextureData = void 0;
      this.gpuBufferData = void 0;
      this.mlTensorData = void 0;
      this.downloader = void 0;
      this.isDownloading = void 0;
      this.dataLocation = "none";
    }
    // #endregion
    // #region tensor utilities
    ensureValid() {
      if (this.dataLocation === "none") {
        throw new Error("The tensor is disposed.");
      }
    }
    reshape(dims) {
      this.ensureValid();
      if (this.downloader || this.disposer) {
        throw new Error("Cannot reshape a tensor that owns GPU resource.");
      }
      return tensorReshape(this, dims);
    }
  };

  // node_modules/onnxruntime-common/dist/esm/tensor.js
  var Tensor2 = Tensor;

  // node_modules/@huggingface/transformers/src/backends/onnx.js
  var DEVICE_TO_EXECUTION_PROVIDER_MAPPING = Object.freeze({
    auto: null,
    // Auto-detect based on device and environment
    gpu: null,
    // Auto-detect GPU
    cpu: "cpu",
    // CPU
    wasm: "wasm",
    // WebAssembly
    webgpu: "webgpu",
    // WebGPU
    cuda: "cuda",
    // CUDA
    dml: "dml",
    // DirectML
    coreml: "coreml",
    // CoreML
    webnn: { name: "webnn", deviceType: "cpu" },
    // WebNN (default)
    "webnn-npu": { name: "webnn", deviceType: "npu" },
    // WebNN NPU
    "webnn-gpu": { name: "webnn", deviceType: "gpu" },
    // WebNN GPU
    "webnn-cpu": { name: "webnn", deviceType: "cpu" }
    // WebNN CPU
  });
  function getOnnxLogSeverityLevel(logLevel2) {
    if (logLevel2 <= LogLevel.DEBUG) {
      return 0;
    } else if (logLevel2 <= LogLevel.INFO) {
      return 2;
    } else if (logLevel2 <= LogLevel.WARNING) {
      return 3;
    } else if (logLevel2 <= LogLevel.ERROR) {
      return 3;
    } else {
      return 4;
    }
  }
  var ONNX_LOG_LEVEL_NAMES = {
    0: "verbose",
    1: "info",
    2: "warning",
    3: "error",
    4: "fatal"
  };
  var supportedDevices = [];
  var defaultDevices;
  var ONNX;
  var ORT_SYMBOL = /* @__PURE__ */ Symbol.for("onnxruntime");
  if (ORT_SYMBOL in globalThis) {
    ONNX = globalThis[ORT_SYMBOL];
  } else if (apis.IS_NODE_ENV) {
    ONNX = import_onnx_node.default;
    switch (process.platform) {
      case "win32":
        supportedDevices.push("dml");
        break;
      case "linux":
        if (process.arch === "x64") {
          supportedDevices.push("cuda");
        }
        break;
      case "darwin":
        supportedDevices.push("coreml");
        break;
    }
    supportedDevices.push("webgpu");
    supportedDevices.push("cpu");
    defaultDevices = ["cpu"];
  } else {
    ONNX = ort_webgpu_bundle_min_exports;
    if (apis.IS_WEBNN_AVAILABLE) {
      supportedDevices.push("webnn-npu", "webnn-gpu", "webnn-cpu", "webnn");
    }
    if (apis.IS_WEBGPU_AVAILABLE) {
      supportedDevices.push("webgpu");
    }
    supportedDevices.push("wasm");
    defaultDevices = ["wasm"];
  }
  var InferenceSession2 = ONNX.InferenceSession;
  function deviceToExecutionProviders(device = null) {
    if (!device) return defaultDevices;
    switch (device) {
      case "auto":
        return supportedDevices;
      case "gpu":
        return supportedDevices.filter((x) => ["webgpu", "cuda", "dml", "webnn-gpu"].includes(x));
    }
    if (supportedDevices.includes(device)) {
      return [DEVICE_TO_EXECUTION_PROVIDER_MAPPING[device] ?? device];
    }
    throw new Error(`Unsupported device: "${device}". Should be one of: ${supportedDevices.join(", ")}.`);
  }
  var webInitChain = Promise.resolve();
  var wasmLoadPromise = null;
  async function ensureWasmLoaded() {
    if (wasmLoadPromise) {
      return wasmLoadPromise;
    }
    const shouldUseWasmCache = env.useWasmCache && typeof ONNX_ENV?.wasm?.wasmPaths === "object" && ONNX_ENV?.wasm?.wasmPaths?.wasm && ONNX_ENV?.wasm?.wasmPaths?.mjs;
    if (!shouldUseWasmCache) {
      if (apis.IS_DENO_WEB_RUNTIME) {
        throw new Error(
          "env.useWasmCache=false is not supported in Deno's web runtime. Remove the useWasmCache override."
        );
      }
      wasmLoadPromise = Promise.resolve();
      return wasmLoadPromise;
    }
    wasmLoadPromise = (async () => {
      const urls = (
        /** @type {{ wasm: string, mjs: string }} */
        ONNX_ENV.wasm.wasmPaths
      );
      let wasmBinaryLoaded = false;
      await Promise.all([
        // Load and cache the WASM binary
        urls.wasm && !isBlobURL(urls.wasm) ? (async () => {
          try {
            const wasmBinary = await loadWasmBinary(toAbsoluteURL(urls.wasm));
            if (wasmBinary) {
              ONNX_ENV.wasm.wasmBinary = wasmBinary;
              wasmBinaryLoaded = true;
            }
          } catch (err) {
            logger.warn("Failed to pre-load WASM binary:", err);
          }
        })() : Promise.resolve(),
        // Load and cache the WASM factory as a blob URL
        urls.mjs && !isBlobURL(urls.mjs) ? (async () => {
          try {
            const wasmFactoryBlob = await loadWasmFactory(toAbsoluteURL(urls.mjs));
            if (wasmFactoryBlob) {
              ONNX_ENV.wasm.wasmPaths.mjs = wasmFactoryBlob;
            }
          } catch (err) {
            logger.warn("Failed to pre-load WASM factory:", err);
          }
        })() : Promise.resolve()
      ]);
      if (!wasmBinaryLoaded) {
        ONNX_ENV.wasm.wasmPaths.mjs = urls.mjs;
      }
    })();
    return wasmLoadPromise;
  }
  async function createInferenceSession(buffer_or_path, session_options, session_config) {
    await ensureWasmLoaded();
    const logSeverityLevel = getOnnxLogSeverityLevel(env.logLevel ?? LogLevel.WARNING);
    const load = () => InferenceSession2.create(buffer_or_path, {
      // Set default log severity level, but allow overriding through session options
      logSeverityLevel,
      ...session_options
    });
    const session = await (apis.IS_WEB_ENV ? webInitChain = webInitChain.then(load) : load());
    session.config = session_config;
    return session;
  }
  var webInferenceChain = Promise.resolve();
  async function runInferenceSession(session, ortFeed) {
    const run = () => session.run(ortFeed);
    return apis.IS_WEB_ENV ? webInferenceChain = webInferenceChain.then(run) : run();
  }
  function isONNXTensor(x) {
    return x instanceof ONNX.Tensor;
  }
  var ONNX_ENV = ONNX?.env;
  function isONNXProxy() {
    return ONNX_ENV?.wasm?.proxy;
  }
  if (ONNX_ENV) {
    let setLogLevel = function(logLevel2) {
      const severityLevel = getOnnxLogSeverityLevel(logLevel2);
      ONNX_ENV.logLevel = ONNX_LOG_LEVEL_NAMES[severityLevel];
    };
    if (ONNX_ENV.wasm) {
      if (
        // @ts-ignore Cannot find name 'ServiceWorkerGlobalScope'.ts(2304)
        !(typeof ServiceWorkerGlobalScope !== "undefined" && self instanceof ServiceWorkerGlobalScope) && ONNX_ENV.versions?.web && !ONNX_ENV.wasm.wasmPaths
      ) {
        const wasmPathPrefix = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ONNX_ENV.versions.web}/dist/`;
        let wasmPathSuffix = ".asyncify";
        if (apis.IS_SAFARI_BELOW_26 && !apis.IS_WEBGPU_AVAILABLE) {
          wasmPathSuffix = "";
        }
        ONNX_ENV.wasm.wasmPaths = {
          mjs: `${wasmPathPrefix}ort-wasm-simd-threaded${wasmPathSuffix}.mjs`,
          wasm: `${wasmPathPrefix}ort-wasm-simd-threaded${wasmPathSuffix}.wasm`
        };
      }
      ONNX_ENV.wasm.proxy = false;
    }
    if (ONNX_ENV.webgpu) {
      ONNX_ENV.webgpu.powerPreference = "high-performance";
    }
    setLogLevel(env.logLevel ?? LogLevel.WARNING);
    env.backends.onnx = {
      ...ONNX_ENV,
      setLogLevel
    };
  }

  // node_modules/@huggingface/transformers/src/utils/core.js
  function dispatchCallback(progress_callback, data) {
    if (progress_callback) progress_callback(data);
  }
  var DefaultProgressCallback = class extends Callable {
    /**
     * @param {ProgressCallback} callback The original callback.
     * @param {FilesLoadingMap} files_loading Mutable map storing per-file progress.
     */
    constructor(callback, files_loading) {
      super();
      this.callback = callback;
      this.files_loading = files_loading;
      this.loads = /* @__PURE__ */ new Map();
    }
    /**
     * @param {ProgressInfo} info
     */
    _call(info) {
      if (info.status === "progress") {
        this.files_loading[info.file] = {
          loaded: info.loaded,
          total: info.total
        };
        const loaded = Object.values(this.files_loading).reduce((acc, curr) => acc + curr.loaded, 0);
        const total = Object.values(this.files_loading).reduce((acc, curr) => acc + curr.total, 0);
        const progress = total > 0 ? loaded / total * 100 : 0;
        this.callback({
          status: "progress_total",
          name: info.name,
          progress,
          loaded,
          total,
          files: structuredClone(this.files_loading)
        });
      }
      this.callback(info);
    }
  };
  function isIntegralNumber(x) {
    return Number.isInteger(x) || typeof x === "bigint";
  }
  function mergeArrays(...arrs) {
    return Array.prototype.concat.apply([], arrs);
  }
  function pick(o, props) {
    return Object.assign(
      {},
      ...props.map((prop) => {
        if (o[prop] !== void 0) {
          return { [prop]: o[prop] };
        }
      })
    );
  }

  // node_modules/@huggingface/transformers/src/utils/lru_cache.js
  var LRUCache = class {
    /** @type {number} */
    #capacity;
    /** @type {Map<any, any>} */
    #cache;
    /**
     * Creates an LRUCache instance.
     * @param {number} capacity The maximum number of items the cache can hold.
     */
    constructor(capacity) {
      this.#capacity = capacity;
      this.#cache = /* @__PURE__ */ new Map();
    }
    /**
     * Retrieves the value associated with the given key and marks the key as recently used.
     * @param {any} key The key to retrieve.
     * @returns {any} The value associated with the key, or undefined if the key does not exist.
     */
    get(key) {
      if (!this.#cache.has(key)) return void 0;
      const value = this.#cache.get(key);
      this.#cache.delete(key);
      this.#cache.set(key, value);
      return value;
    }
    /**
     * Inserts or updates the key-value pair in the cache.
     * If the key already exists, it is updated and marked as recently used.
     * If the cache exceeds its capacity, the least recently used item is evicted.
     * @param {any} key The key to add or update.
     * @param {any} value The value to associate with the key.
     */
    put(key, value) {
      if (this.#cache.has(key)) {
        this.#cache.delete(key);
      }
      this.#cache.set(key, value);
      if (this.#cache.size > this.#capacity) {
        this.#cache.delete(this.#cache.keys().next().value);
      }
    }
    /**
     * Removes the entry for the given key from the cache.
     * @param {any} key The key to delete.
     * @returns {boolean} `true` if the entry existed and was removed, `false` otherwise.
     */
    delete(key) {
      return this.#cache.delete(key);
    }
    /**
     * Clears the cache.
     */
    clear() {
      this.#cache.clear();
    }
  };

  // node_modules/@huggingface/transformers/src/utils/memoize_promise.js
  var MAX_CACHE_SIZE = 100;
  var cache = new LRUCache(MAX_CACHE_SIZE);
  function memoizePromise(key, factory) {
    const cached = cache.get(key);
    if (cached !== void 0) {
      return cached;
    }
    const promise = factory().then(
      (value) => value,
      (err) => {
        cache.delete(key);
        return Promise.reject(err);
      }
    );
    cache.put(key, promise);
    return promise;
  }

  // node_modules/@huggingface/transformers/src/utils/model_registry/get_file_metadata.js
  async function fetch_file_head(urlOrPath) {
    if (!isValidUrl(urlOrPath, ["http:", "https:"])) {
      return null;
    }
    const headers = getFetchHeaders(urlOrPath);
    headers.set("Range", "bytes=0-0");
    return env.fetch(urlOrPath, { method: "GET", headers, cache: "no-store" });
  }
  function get_file_metadata(path_or_repo_id, filename, options = {}) {
    const key = makePretrainedOptionsKey(path_or_repo_id, options, filename);
    return memoizePromise(key, () => _get_file_metadata(path_or_repo_id, filename, options));
  }
  async function _get_file_metadata(path_or_repo_id, filename, options) {
    const cache2 = await getCache(options?.cache_dir);
    const { localPath, remoteURL, proposedCacheKey, validModelId } = buildResourcePaths(
      path_or_repo_id,
      filename,
      options,
      cache2
    );
    const cachedResponse = await checkCachedResource(cache2, localPath, proposedCacheKey);
    if (cachedResponse !== void 0 && typeof cachedResponse !== "string") {
      const size = cachedResponse.headers.get("content-length");
      const contentType = cachedResponse.headers.get("content-type");
      return {
        exists: true,
        size: size ? parseInt(size, 10) : void 0,
        contentType: contentType || void 0,
        fromCache: true
      };
    }
    if (env.allowLocalModels) {
      const isURL = isValidUrl(localPath, ["http:", "https:"]);
      if (!isURL) {
        try {
          const response = await getFile(localPath);
          if (typeof response !== "string" && response.status !== 404) {
            const size = response.headers.get("content-length");
            const contentType = response.headers.get("content-type");
            return {
              exists: true,
              size: size ? parseInt(size, 10) : void 0,
              contentType: contentType || void 0,
              fromCache: false
            };
          }
        } catch (e) {
        }
      }
    }
    if (env.allowRemoteModels && !options.local_files_only && validModelId) {
      const rangeResponse = await fetch_file_head(remoteURL);
      if (rangeResponse && rangeResponse.status >= 200 && rangeResponse.status < 300) {
        let size;
        const contentType = rangeResponse.headers.get("content-type");
        if (rangeResponse.status === 206) {
          const contentRange = rangeResponse.headers.get("content-range");
          if (contentRange) {
            const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
            if (match) {
              size = parseInt(match[1], 10);
            }
          }
        } else if (rangeResponse.status === 200) {
          try {
            await rangeResponse.body?.cancel();
          } catch (cancelError) {
          }
        }
        if (size === void 0) {
          const contentLength = rangeResponse.headers.get("content-length");
          size = contentLength ? parseInt(contentLength, 10) : void 0;
        }
        return {
          exists: true,
          size,
          contentType: contentType || void 0,
          fromCache: false
        };
      }
      if (rangeResponse && rangeResponse.status !== 404 && rangeResponse.status !== 416) {
        handleError(rangeResponse.status, remoteURL, true);
      }
    }
    return { exists: false, fromCache: false };
  }

  // node_modules/@huggingface/transformers/src/utils/hub.js
  async function getFile(urlOrPath) {
    if (env.useFS && !isValidUrl(urlOrPath, ["http:", "https:", "blob:"])) {
      return new FileResponse(
        urlOrPath instanceof URL ? urlOrPath.protocol === "file:" ? urlOrPath.pathname : urlOrPath.toString() : urlOrPath
      );
    } else {
      return env.fetch(urlOrPath, {
        headers: getFetchHeaders(urlOrPath)
      });
    }
  }
  function getFetchHeaders(urlOrPath) {
    const isNode = typeof process !== "undefined" && process?.release?.name === "node";
    const headers = new Headers();
    if (isNode) {
      const IS_CI = !!process.env?.TESTING_REMOTELY;
      const version2 = env.version;
      headers.set("User-Agent", `transformers.js/${version2}; is_ci/${IS_CI};`);
      const isHFURL = isValidUrl(urlOrPath, ["http:", "https:"], ["huggingface.co", "hf.co"]);
      if (isHFURL) {
        const token = process.env?.HF_TOKEN ?? process.env?.HF_ACCESS_TOKEN;
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }
    } else {
    }
    return headers;
  }
  function buildResourcePaths(path_or_repo_id, filename, options = {}, cache2 = null) {
    const revision = options.revision ?? "main";
    const requestURL = pathJoin(path_or_repo_id, filename);
    const validModelId = isValidHfModelId(path_or_repo_id);
    const localPath = validModelId ? pathJoin(env.localModelPath, requestURL) : requestURL;
    const remoteURL = pathJoin(
      env.remoteHost,
      env.remotePathTemplate.replaceAll("{model}", path_or_repo_id).replaceAll("{revision}", encodeURIComponent(revision)),
      filename
    );
    const proposedCacheKey = cache2 instanceof FileCache ? (
      // Choose cache key for filesystem cache
      // When using the main revision (default), we use the request URL as the cache key.
      // If a specific revision is requested, we account for this in the cache key.
      revision === "main" ? requestURL : pathJoin(path_or_repo_id, revision, filename)
    ) : remoteURL;
    return {
      requestURL,
      localPath,
      remoteURL,
      proposedCacheKey,
      validModelId
    };
  }
  async function checkCachedResource(cache2, localPath, proposedCacheKey) {
    if (!cache2) {
      return void 0;
    }
    return await tryCache(cache2, localPath, proposedCacheKey);
  }
  async function storeCachedResource(path_or_repo_id, filename, cache2, cacheKey, response, result, options = {}) {
    if (await cache2.match(cacheKey) !== void 0) {
      return;
    }
    if (typeof Cache !== "undefined" && cache2 instanceof Cache && !isValidUrl(toAbsoluteURL(cacheKey, { allowUnresolved: true }), ["http:", "https:"])) {
      return;
    }
    if (!result) {
      const wrapped_progress = options.progress_callback ? (data) => dispatchCallback(options.progress_callback, {
        status: "progress",
        name: path_or_repo_id,
        file: filename,
        ...data
      }) : void 0;
      await cache2.put(
        cacheKey,
        /** @type {Response} */
        response,
        wrapped_progress
      );
    } else if (typeof response !== "string") {
      const headers = new Headers(response.headers);
      headers.set("content-length", result.byteLength.toString());
      await cache2.put(
        cacheKey,
        new Response(
          /** @type {any} */
          result,
          {
            headers
          }
        )
      ).catch((err) => {
        logger.warn(`Unable to add response to browser cache: ${err}.`);
      });
    }
  }
  async function loadResourceFile(path_or_repo_id, filename, fatal = true, options = {}, return_path = false, cache2 = null) {
    const { requestURL, localPath, remoteURL, proposedCacheKey, validModelId } = buildResourcePaths(
      path_or_repo_id,
      filename,
      options,
      cache2
    );
    let cacheKey;
    let toCacheResponse = false;
    let response;
    response = await checkCachedResource(cache2, localPath, proposedCacheKey);
    const cacheHit = response !== void 0;
    if (cacheHit) {
      cacheKey = proposedCacheKey;
    } else {
      if (env.allowLocalModels) {
        const isURL = isValidUrl(requestURL, ["http:", "https:"]);
        if (!isURL) {
          try {
            response = await getFile(localPath);
            cacheKey = localPath;
          } catch (e) {
            logger.warn(`Unable to load from local path "${localPath}": "${e}"`);
          }
        } else if (options.local_files_only) {
          throw new Error(`\`local_files_only=true\`, but attempted to load a remote file from: ${requestURL}.`);
        } else if (!env.allowRemoteModels) {
          throw new Error(
            `\`env.allowRemoteModels=false\`, but attempted to load a remote file from: ${requestURL}.`
          );
        }
      }
      if (response === void 0 || typeof response !== "string" && response.status === 404) {
        if (options.local_files_only || !env.allowRemoteModels) {
          if (fatal) {
            throw new ModelFileNotFoundError(
              `\`local_files_only=true\` or \`env.allowRemoteModels=false\` and file was not found locally at "${localPath}".`
            );
          } else {
            return null;
          }
        }
        if (!validModelId) {
          throw new ModelFileNotFoundError(
            `Local file missing at "${localPath}" and download aborted due to invalid model ID "${path_or_repo_id}".`
          );
        }
        response = await getFile(remoteURL);
        if (response.status !== 200) {
          return handleError(response.status, remoteURL, fatal);
        }
        cacheKey = proposedCacheKey;
      }
      toCacheResponse = cache2 && // 1. A caching system is available
      typeof Response !== "undefined" && // 2. `Response` is defined (i.e., we are in a browser-like environment)
      response instanceof Response && // 3. result is a `Response` object (i.e., not a `FileResponse`)
      response.status === 200;
    }
    dispatchCallback(options.progress_callback, {
      status: "download",
      name: path_or_repo_id,
      file: filename
    });
    let result;
    if (apis.IS_NODE_ENV && return_path) {
    } else {
      let buffer;
      if (typeof response !== "string") {
        if (!options.progress_callback) {
          buffer = new Uint8Array(await response.arrayBuffer());
        } else if (cacheHit && // The item is being read from the cache
        typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent)) {
          buffer = new Uint8Array(await response.arrayBuffer());
          dispatchCallback(options.progress_callback, {
            status: "progress",
            name: path_or_repo_id,
            file: filename,
            progress: 100,
            loaded: buffer.length,
            total: buffer.length
          });
        } else {
          let expectedSize;
          const contentLength = response.headers.get("content-length");
          if (contentLength) {
            expectedSize = parseInt(contentLength, 10);
          } else {
            try {
              const metadata = await get_file_metadata(path_or_repo_id, filename, options);
              if (metadata.size) {
                expectedSize = metadata.size;
              }
            } catch (e) {
            }
          }
          buffer = await readResponse(
            response,
            (data) => {
              dispatchCallback(options.progress_callback, {
                status: "progress",
                name: path_or_repo_id,
                file: filename,
                ...data
              });
            },
            expectedSize
          );
        }
      }
      result = buffer;
    }
    if (
      // Only cache web responses
      // i.e., do not cache FileResponses (prevents duplication)
      toCacheResponse && cacheKey && typeof response !== "string"
    ) {
      await storeCachedResource(path_or_repo_id, filename, cache2, cacheKey, response, result, options);
    }
    if (apis.IS_NODE_ENV && return_path && options.progress_callback && typeof response !== "string") {
      const size = parseInt(response.headers.get("content-length"), 10) || 0;
      dispatchCallback(options.progress_callback, {
        status: "progress",
        name: path_or_repo_id,
        file: filename,
        progress: 100,
        loaded: size,
        total: size
      });
    }
    dispatchCallback(options.progress_callback, {
      status: "done",
      name: path_or_repo_id,
      file: filename
    });
    if (result) {
      if (!apis.IS_NODE_ENV && return_path) {
        throw new Error("Cannot return path in a browser environment.");
      }
      return result;
    }
    if (response instanceof FileResponse) {
      return response.filePath;
    }
    const cachedResponse = await cache2?.match(cacheKey);
    if (cachedResponse instanceof FileResponse) {
      return cachedResponse.filePath;
    } else if (cachedResponse instanceof Response) {
      return new Uint8Array(await cachedResponse.arrayBuffer());
    } else if (typeof cachedResponse === "string") {
      return cachedResponse;
    }
    throw new Error("Unable to get model file path or buffer.");
  }
  var INFLIGHT_LOADS = /* @__PURE__ */ new Map();
  async function getModelFile(path_or_repo_id, filename, fatal = true, options = {}, return_path = false) {
    if (!env.allowLocalModels) {
      if (options.local_files_only) {
        throw Error(
          "Invalid configuration detected: local models are disabled (`env.allowLocalModels=false`) but you have requested to only use local models (`local_files_only=true`)."
        );
      } else if (!env.allowRemoteModels) {
        throw Error(
          "Invalid configuration detected: both local and remote models are disabled. Fix by setting `env.allowLocalModels` or `env.allowRemoteModels` to `true`."
        );
      }
    }
    const key = makePretrainedOptionsKey(path_or_repo_id, options, filename, fatal, return_path);
    const { progress_callback } = options;
    const loads = progress_callback instanceof DefaultProgressCallback ? progress_callback.loads : INFLIGHT_LOADS;
    let pending = loads.get(key);
    if (!pending) {
      dispatchCallback(progress_callback, {
        status: "initiate",
        name: path_or_repo_id,
        file: filename
      });
      pending = getCache(options.cache_dir).then(
        (cache2) => loadResourceFile(path_or_repo_id, filename, fatal, options, return_path, cache2)
      );
      if (loads === INFLIGHT_LOADS) {
        pending = pending.finally(() => INFLIGHT_LOADS.delete(key));
      }
      loads.set(key, pending);
    }
    return await pending;
  }
  async function getModelText(modelPath, fileName, fatal = true, options = {}) {
    const buffer = await getModelFile(modelPath, fileName, fatal, options, false);
    if (buffer === null) {
      return null;
    }
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(
      /** @type {Uint8Array} */
      buffer
    );
  }
  async function getModelJSON(modelPath, fileName, fatal = true, options = {}) {
    const text = await getModelText(modelPath, fileName, fatal, options);
    if (text === null) {
      return {};
    }
    return JSON.parse(text);
  }

  // node_modules/@huggingface/transformers/src/configs.js
  async function loadConfig(pretrained_model_name_or_path, options) {
    return await getModelJSON(pretrained_model_name_or_path, "config.json", true, options);
  }
  function getNormalizedConfig(config) {
    const mapping = {};
    let init_normalized_config = {};
    switch (config.model_type) {
      // Sub-configs
      case "llava":
      case "paligemma":
      case "gemma3":
      case "florence2":
      case "llava_onevision":
      case "idefics3":
      case "granite_speech":
      case "ultravox":
      case "voxtral":
      case "voxtral_realtime":
      case "smolvlm":
      case "gemma3n":
      case "gemma4":
      case "lfm2_vl":
      case "chatterbox":
      case "lighton_ocr":
      case "glm_ocr":
      case "mistral3":
      case "qwen2_5_vl":
      case "qwen3_vl":
      case "qwen3_vl_moe":
        init_normalized_config = getNormalizedConfig(config.text_config);
        break;
      case "moondream1":
        init_normalized_config = getNormalizedConfig(config.phi_config);
        break;
      case "musicgen":
        init_normalized_config = getNormalizedConfig(config.decoder);
        break;
      case "multi_modality":
        init_normalized_config = getNormalizedConfig(config.language_config);
        break;
      // Decoder-only models
      case "gpt2":
      case "gptj":
      case "jais":
      case "codegen":
      case "gpt_bigcode":
        mapping["num_heads"] = "n_head";
        mapping["num_layers"] = "n_layer";
        mapping["hidden_size"] = "n_embd";
        break;
      case "gpt_neox":
      case "stablelm":
      case "opt":
      case "falcon":
      case "modernbert-decoder":
        mapping["num_heads"] = "num_attention_heads";
        mapping["num_layers"] = "num_hidden_layers";
        mapping["hidden_size"] = "hidden_size";
        break;
      case "gpt_oss":
      case "llama":
      case "llama4_text":
      case "nanochat":
      case "apertus":
      case "arcee":
      case "afmoe":
      case "lfm2":
      case "lfm2_moe":
      case "smollm3":
      case "olmo":
      case "olmo2":
      case "olmo3":
      case "mobilellm":
      case "granite":
      case "granitemoehybrid":
      case "cohere":
      case "cohere2":
      case "mistral":
      case "voxtral_realtime_text":
      case "voxtral_realtime_encoder":
      case "starcoder2":
      case "qwen2":
      case "qwen2_moe":
      case "qwen2_vl":
      case "qwen2_vl_text":
      case "qwen2_5_vl_text":
      case "qwen3_moe":
      case "qwen3_vl_text":
      case "qwen3_vl_moe_text":
      case "phi":
      case "phi3":
      case "phi3_v":
      case "llava_qwen2":
        mapping["num_heads"] = "num_key_value_heads";
        mapping["num_layers"] = "num_hidden_layers";
        mapping["hidden_size"] = "hidden_size";
        mapping["num_attention_heads"] = "num_attention_heads";
        mapping["dim_kv"] = "head_dim";
        break;
      case "qwen3":
      case "solar_open":
      case "glm_ocr_text":
      case "gemma":
      case "gemma2":
      case "vaultgemma":
      case "gemma3_text":
      case "gemma3n_text":
      case "gemma4_text":
      case "glm":
      case "helium":
      case "ernie4_5":
      case "hunyuan_v1_dense":
      case "falcon_h1":
      case "nemotron_h":
      case "ministral":
      case "ministral3":
        mapping["num_heads"] = "num_key_value_heads";
        mapping["num_layers"] = "num_hidden_layers";
        mapping["dim_kv"] = "head_dim";
        break;
      case "openelm":
        mapping["num_heads"] = "num_kv_heads";
        mapping["num_layers"] = "num_transformer_layers";
        mapping["dim_kv"] = "head_dim";
        break;
      case "gpt_neo":
      case "donut-swin":
        mapping["num_heads"] = "num_heads";
        mapping["num_layers"] = "num_layers";
        mapping["hidden_size"] = "hidden_size";
        break;
      case "bloom":
        mapping["num_heads"] = "n_head";
        mapping["num_layers"] = "n_layer";
        mapping["hidden_size"] = "hidden_size";
        break;
      case "mpt":
        mapping["num_heads"] = "n_heads";
        mapping["num_layers"] = "n_layers";
        mapping["hidden_size"] = "d_model";
        break;
      case "exaone":
        mapping["num_heads"] = "num_key_value_heads";
        mapping["num_layers"] = "num_layers";
        mapping["dim_kv"] = "head_dim";
        mapping["num_attention_heads"] = "num_attention_heads";
        break;
      case "youtu":
      case "deepseek_v3":
      case "deepseek_v4":
      case "glm_moe_dsa":
      case "mistral4":
        mapping["num_heads"] = "num_key_value_heads";
        mapping["num_layers"] = "num_hidden_layers";
        mapping["dim_kv"] = config.model_type === "deepseek_v4" ? "head_dim" : "qk_head_dim";
        mapping["num_attention_heads"] = "num_attention_heads";
        break;
      case "zaya":
        mapping["num_heads"] = "num_key_value_heads";
        mapping["num_layers"] = "num_hidden_layers";
        mapping["hidden_size"] = "hidden_size";
        mapping["dim_kv"] = "head_dim";
        mapping["num_attention_heads"] = "num_attention_heads";
        break;
      case "hrm_text":
        mapping["num_heads"] = "num_key_value_heads";
        mapping["num_layers"] = "num_hidden_layers";
        mapping["hidden_size"] = "hidden_size";
        mapping["dim_kv"] = "head_dim";
        mapping["num_attention_heads"] = "num_attention_heads";
        break;
      // Encoder-decoder models
      case "t5":
      case "mt5":
      case "longt5":
        mapping["num_decoder_layers"] = "num_decoder_layers";
        mapping["num_decoder_heads"] = "num_heads";
        mapping["decoder_dim_kv"] = "d_kv";
        mapping["num_encoder_layers"] = "num_layers";
        mapping["num_encoder_heads"] = "num_heads";
        mapping["encoder_dim_kv"] = "d_kv";
        break;
      case "bart":
      case "mbart":
      case "marian":
      case "whisper":
      case "lite-whisper":
      case "m2m_100":
      case "blenderbot":
      case "blenderbot-small":
      case "florence2_language":
        mapping["num_decoder_layers"] = "decoder_layers";
        mapping["num_decoder_heads"] = "decoder_attention_heads";
        mapping["decoder_hidden_size"] = "d_model";
        mapping["num_encoder_layers"] = "encoder_layers";
        mapping["num_encoder_heads"] = "encoder_attention_heads";
        mapping["encoder_hidden_size"] = "d_model";
        break;
      case "speecht5":
        mapping["num_decoder_layers"] = "decoder_layers";
        mapping["num_decoder_heads"] = "decoder_attention_heads";
        mapping["decoder_hidden_size"] = "hidden_size";
        mapping["num_encoder_layers"] = "encoder_layers";
        mapping["num_encoder_heads"] = "encoder_attention_heads";
        mapping["encoder_hidden_size"] = "hidden_size";
        break;
      case "trocr":
        mapping["num_encoder_layers"] = mapping["num_decoder_layers"] = "decoder_layers";
        mapping["num_encoder_heads"] = mapping["num_decoder_heads"] = "decoder_attention_heads";
        mapping["encoder_hidden_size"] = mapping["decoder_hidden_size"] = "d_model";
        break;
      case "musicgen_decoder":
        mapping["num_encoder_layers"] = mapping["num_decoder_layers"] = "num_hidden_layers";
        mapping["num_encoder_heads"] = mapping["num_decoder_heads"] = "num_attention_heads";
        mapping["encoder_hidden_size"] = mapping["decoder_hidden_size"] = "hidden_size";
        break;
      case "moonshine":
        mapping["num_decoder_layers"] = "decoder_num_hidden_layers";
        mapping["num_decoder_heads"] = "decoder_num_key_value_heads";
        mapping["num_encoder_layers"] = "encoder_num_hidden_layers";
        mapping["num_encoder_heads"] = "encoder_num_key_value_heads";
        mapping["encoder_hidden_size"] = mapping["decoder_hidden_size"] = "hidden_size";
        break;
      case "cohere_asr":
        mapping["num_decoder_layers"] = "num_hidden_layers";
        mapping["num_decoder_heads"] = "num_key_value_heads";
        mapping["decoder_hidden_size"] = "hidden_size";
        mapping["decoder_dim_kv"] = "head_dim";
        const {
          num_hidden_layers: num_encoder_layers,
          num_attention_heads: num_encoder_heads,
          hidden_size: encoder_hidden_size
        } = (
          /** @type {any} */
          config.encoder_config
        );
        init_normalized_config = {
          num_encoder_layers,
          num_encoder_heads,
          encoder_hidden_size,
          // @ts-expect-error TS2339
          encoder_dim_kv: config.head_dim
        };
        break;
      case "vision-encoder-decoder":
        const decoderConfig = getNormalizedConfig(config.decoder);
        const add_encoder_pkv = "num_decoder_layers" in decoderConfig;
        const result = pick(config, ["model_type", "is_encoder_decoder"]);
        if (add_encoder_pkv) {
          result.num_decoder_layers = decoderConfig.num_decoder_layers;
          result.num_decoder_heads = decoderConfig.num_decoder_heads;
          result.decoder_hidden_size = decoderConfig.decoder_hidden_size;
          result.num_encoder_layers = decoderConfig.num_encoder_layers;
          result.num_encoder_heads = decoderConfig.num_encoder_heads;
          result.encoder_hidden_size = decoderConfig.encoder_hidden_size;
        } else {
          result.num_layers = decoderConfig.num_layers;
          result.num_heads = decoderConfig.num_heads;
          result.hidden_size = decoderConfig.hidden_size;
        }
        return result;
    }
    const normalized_config = {
      ...init_normalized_config,
      ...pick(config, ["model_type", "multi_query", "is_encoder_decoder"])
    };
    for (const key in mapping) {
      normalized_config[key] = config[mapping[key]];
    }
    return normalized_config;
  }
  function getCacheNames(config, options) {
    if (!(config instanceof PretrainedConfig)) {
      config = new PretrainedConfig(config);
    }
    const pkv_prefix = options?.prefix ?? "past_key_values";
    const cache_prefix = pkv_prefix === "present" ? "present" : "past";
    const names = /* @__PURE__ */ new Set();
    if (["lfm2", "lfm2_moe"].includes(config.model_type)) {
      const { layer_types } = (
        /** @type {any} */
        config
      );
      for (let i = 0; i < layer_types.length; ++i) {
        if (layer_types[i] === "full_attention") {
          names.add(`${pkv_prefix}.${i}.key`);
          names.add(`${pkv_prefix}.${i}.value`);
        } else if (layer_types[i] === "conv") {
          names.add(`${cache_prefix}_conv.${i}`);
        } else {
          throw new Error(`Unsupported layer type: ${layer_types[i]}`);
        }
      }
      return names;
    } else if (["granitemoehybrid", "falcon_h1", "nemotron_h"].includes(config.model_type)) {
      const c = (
        /** @type {any} */
        config
      );
      const layer_types = c.layer_types ?? c.layers_block_type;
      const num_layers = c.num_hidden_layers ?? layer_types?.length;
      for (let i = 0; i < num_layers; ++i) {
        if (!layer_types || layer_types[i] === "mamba") {
          names.add(`${cache_prefix}_conv.${i}`);
          names.add(`${cache_prefix}_ssm.${i}`);
        }
        if (!layer_types || layer_types[i] === "attention") {
          names.add(`${pkv_prefix}.${i}.key`);
          names.add(`${pkv_prefix}.${i}.value`);
        }
      }
      return names;
    } else if (["qwen3_next", "qwen3_5_text", "qwen3_5_moe_text", "olmo_hybrid"].includes(config.model_type)) {
      const { layer_types } = (
        /** @type {any} */
        config
      );
      for (let i = 0; i < layer_types.length; ++i) {
        if (layer_types[i] === "full_attention") {
          names.add(`${pkv_prefix}.${i}.key`);
          names.add(`${pkv_prefix}.${i}.value`);
        } else if (layer_types[i] === "linear_attention") {
          if (config.model_type === "olmo_hybrid") {
            names.add(`${cache_prefix}_conv.${i}.key`);
            names.add(`${cache_prefix}_conv.${i}.value`);
            names.add(`${cache_prefix}_conv.${i}.query`);
          } else {
            names.add(`${cache_prefix}_conv.${i}`);
          }
          names.add(`${cache_prefix}_recurrent.${i}`);
        } else {
          throw new Error(`Unsupported layer type: ${layer_types[i]}`);
        }
      }
      return names;
    } else if (["gemma4", "gemma4_text"].includes(config.model_type)) {
      const c = (
        /** @type {any} */
        config.model_type === "gemma4" ? (
          /** @type {any} */
          config.text_config
        ) : config
      );
      const num_hidden_layers = c.num_hidden_layers;
      const num_kv_shared_layers = c.num_kv_shared_layers ?? 0;
      const num_kv_layers = num_hidden_layers - num_kv_shared_layers;
      for (let i = 0; i < num_kv_layers; ++i) {
        names.add(`${pkv_prefix}.${i}.key`);
        names.add(`${pkv_prefix}.${i}.value`);
      }
      return names;
    } else if (config.model_type === "deepseek_v4") {
      const { layer_types, num_hidden_layers } = (
        /** @type {any} */
        config
      );
      for (let i = 0; i < num_hidden_layers; ++i) {
        names.add(`${pkv_prefix}.${i}.key`);
        names.add(`${pkv_prefix}.${i}.value`);
        const layer_type = layer_types[i];
        if (layer_type === "compressed_sparse_attention") {
          names.add(`${cache_prefix}_compressor.${i}.kv`);
          names.add(`${cache_prefix}_compressor.${i}.gate`);
          names.add(`${cache_prefix}_indexer.${i}.kv`);
          names.add(`${cache_prefix}_indexer.${i}.gate`);
        } else if (layer_type === "heavily_compressed_attention") {
          names.add(`${cache_prefix}_compressor.${i}.kv`);
          names.add(`${cache_prefix}_compressor.${i}.gate`);
        } else if (layer_type && layer_type !== "sliding_attention") {
          throw new Error(`Unsupported layer type: ${layer_type}`);
        }
      }
      return names;
    } else if (config.model_type === "zaya") {
      const { num_hidden_layers, cca_time1 } = (
        /** @type {any} */
        config
      );
      const stride = cca_time1 ?? 1;
      for (let i = 0; i < num_hidden_layers; i += stride) {
        names.add(`${pkv_prefix}.${i}.key`);
        names.add(`${pkv_prefix}.${i}.value`);
        names.add(`${pkv_prefix}.${i}.conv_state`);
        names.add(`${pkv_prefix}.${i}.shift_state`);
      }
      return names;
    } else if (["lfm2_vl", "qwen3_5", "qwen3_5_moe", "voxtral_realtime"].includes(config.model_type)) {
      let subConfig;
      if (config.model_type === "voxtral_realtime" && options?.session_name === "audio_encoder") {
        subConfig = /** @type {any} */
        config.audio_config;
      } else {
        subConfig = /** @type {any} */
        config.text_config;
      }
      return getCacheNames(subConfig, options);
    }
    return getKeyValueNames(config, { prefix: pkv_prefix });
  }
  function getKeyValueNames(config, { prefix = "past_key_values" } = {}) {
    const names = /* @__PURE__ */ new Set();
    const normalized_config = config.normalized_config;
    if (normalized_config.is_encoder_decoder && "num_encoder_heads" in normalized_config && "num_decoder_heads" in normalized_config) {
      for (let i = 0; i < normalized_config.num_decoder_layers; ++i) {
        names.add(`${prefix}.${i}.encoder.key`);
        names.add(`${prefix}.${i}.encoder.value`);
        names.add(`${prefix}.${i}.decoder.key`);
        names.add(`${prefix}.${i}.decoder.value`);
      }
    } else if (normalized_config.multi_query) {
      for (let i = 0; i < normalized_config.num_layers; ++i) {
        names.add(`${prefix}.${i}.key_value`);
      }
    } else {
      for (let i = 0; i < normalized_config.num_layers; ++i) {
        names.add(`${prefix}.${i}.key`);
        names.add(`${prefix}.${i}.value`);
      }
    }
    return names;
  }
  var PretrainedConfig = class _PretrainedConfig {
    // NOTE: Typo in original
    /** @type {string|null} */
    model_type = null;
    /** @type {boolean} */
    is_encoder_decoder = false;
    /** @type {number} */
    max_position_embeddings;
    /** @type {TransformersJSConfig} */
    "transformers.js_config";
    /**
     * Create a new `PretrainedConfig` from a parsed `config.json` object.
     * @param {Object} configJSON The JSON of the config.
     */
    constructor(configJSON) {
      Object.assign(this, configJSON);
      this.normalized_config = getNormalizedConfig(this);
    }
    /**
     * Loads a pretrained config from the given `pretrained_model_name_or_path`.
     *
     * @param {string} pretrained_model_name_or_path The path to the pretrained config.
     * @param {PretrainedOptions} options Additional options for loading the config.
     * @throws {Error} Throws an error if the config.json is not found in the `pretrained_model_name_or_path`.
     *
     * @returns {Promise<PretrainedConfig>} A new instance of the `PretrainedConfig` class.
     */
    static async from_pretrained(pretrained_model_name_or_path, { progress_callback = null, config = null, cache_dir = null, local_files_only = false, revision = "main" } = {}) {
      if (config && !(config instanceof _PretrainedConfig)) {
        config = new _PretrainedConfig(config);
      }
      const data = config ?? await loadConfig(pretrained_model_name_or_path, {
        progress_callback,
        config,
        cache_dir,
        local_files_only,
        revision
      });
      return new this(data);
    }
  };
  var AutoConfig = class {
    /** @type {typeof PretrainedConfig.from_pretrained} */
    static async from_pretrained(...args) {
      return PretrainedConfig.from_pretrained(...args);
    }
  };

  // node_modules/@huggingface/transformers/src/utils/devices.js
  var DEVICE_TYPES = Object.freeze({
    auto: "auto",
    // Auto-detect based on device and environment
    gpu: "gpu",
    // Auto-detect GPU
    cpu: "cpu",
    // CPU
    wasm: "wasm",
    // WebAssembly
    webgpu: "webgpu",
    // WebGPU
    cuda: "cuda",
    // CUDA
    dml: "dml",
    // DirectML
    coreml: "coreml",
    // CoreML
    webnn: "webnn",
    // WebNN (default)
    "webnn-npu": "webnn-npu",
    // WebNN NPU
    "webnn-gpu": "webnn-gpu",
    // WebNN GPU
    "webnn-cpu": "webnn-cpu"
    // WebNN CPU
  });
  var DEFAULT_DEVICE = apis.IS_NODE_ENV ? "cpu" : "wasm";
  function selectDevice(deviceConfig, fileName, { warn } = {}) {
    if (!deviceConfig) return DEFAULT_DEVICE;
    if (typeof deviceConfig === "string") return deviceConfig;
    if (deviceConfig.hasOwnProperty(fileName)) return deviceConfig[fileName];
    if (warn) {
      warn(`device not specified for "${fileName}". Using the default device (${DEFAULT_DEVICE}).`);
    }
    return DEFAULT_DEVICE;
  }

  // node_modules/@huggingface/transformers/src/utils/dtypes.js
  var isWebGpuFp16Supported = /* @__PURE__ */ (function() {
    let cachedResult;
    return async function() {
      if (cachedResult === void 0) {
        if (!apis.IS_WEBGPU_AVAILABLE) {
          cachedResult = false;
        } else {
          try {
            const adapter = await navigator.gpu.requestAdapter();
            cachedResult = adapter.features.has("shader-f16");
          } catch (e) {
            cachedResult = false;
          }
        }
      }
      return cachedResult;
    };
  })();
  var DATA_TYPES = Object.freeze({
    auto: "auto",
    // Auto-detect based on environment
    fp32: "fp32",
    fp16: "fp16",
    q8: "q8",
    int8: "int8",
    uint8: "uint8",
    q4: "q4",
    bnb4: "bnb4",
    q4f16: "q4f16",
    // fp16 model with 4-bit block weight quantization
    q2: "q2",
    q2f16: "q2f16",
    // fp16 model with 2-bit block weight quantization
    q1: "q1",
    q1f16: "q1f16"
    // fp16 model with 1-bit block weight quantization
  });
  var DEFAULT_DEVICE_DTYPE = DATA_TYPES.fp32;
  var DEFAULT_DEVICE_DTYPE_MAPPING = Object.freeze({
    // NOTE: If not specified, will default to fp32
    [DEVICE_TYPES.wasm]: DATA_TYPES.q8
  });
  var DEFAULT_DTYPE_SUFFIX_MAPPING = Object.freeze({
    [DATA_TYPES.fp32]: "",
    [DATA_TYPES.fp16]: "_fp16",
    [DATA_TYPES.int8]: "_int8",
    [DATA_TYPES.uint8]: "_uint8",
    [DATA_TYPES.q8]: "_quantized",
    [DATA_TYPES.q4]: "_q4",
    [DATA_TYPES.q2]: "_q2",
    [DATA_TYPES.q1]: "_q1",
    [DATA_TYPES.q4f16]: "_q4f16",
    [DATA_TYPES.q2f16]: "_q2f16",
    [DATA_TYPES.q1f16]: "_q1f16",
    [DATA_TYPES.bnb4]: "_bnb4"
  });
  function selectDtype(dtype, fileName, selectedDevice, { configDtype = null, warn } = {}) {
    let resolved;
    let needsWarn = false;
    if (dtype && typeof dtype !== "string") {
      if (dtype.hasOwnProperty(fileName)) {
        resolved = dtype[fileName];
      } else {
        resolved = null;
        needsWarn = true;
      }
    } else {
      resolved = /** @type {string|null|undefined} */
      dtype;
    }
    let result;
    if (resolved === DATA_TYPES.auto) {
      if (configDtype) {
        const fallback = typeof configDtype === "string" ? configDtype : configDtype?.[fileName];
        if (fallback && fallback !== DATA_TYPES.auto && DATA_TYPES.hasOwnProperty(fallback)) {
          return (
            /** @type {DataType} */
            fallback
          );
        }
      }
      result = DEFAULT_DEVICE_DTYPE_MAPPING[selectedDevice] ?? DEFAULT_DEVICE_DTYPE;
    } else if (resolved && DATA_TYPES.hasOwnProperty(resolved)) {
      result = /** @type {DataType} */
      resolved;
    } else {
      result = DEFAULT_DEVICE_DTYPE_MAPPING[selectedDevice] ?? DEFAULT_DEVICE_DTYPE;
    }
    if (needsWarn && warn) {
      warn(
        `dtype not specified for "${fileName}". Using the default dtype (${result}) for this device (${selectedDevice}).`
      );
    }
    return result;
  }
  var DataTypeMap = Object.freeze({
    float32: Float32Array,
    // @ts-ignore ts(2552) Limited availability of Float16Array across browsers:
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float16Array
    float16: typeof Float16Array !== "undefined" ? Float16Array : Uint16Array,
    float64: Float64Array,
    string: Array,
    // string[]
    int8: Int8Array,
    uint8: Uint8Array,
    int16: Int16Array,
    uint16: Uint16Array,
    int32: Int32Array,
    uint32: Uint32Array,
    int64: BigInt64Array,
    uint64: BigUint64Array,
    bool: Uint8Array,
    uint4: Uint8Array,
    int4: Int8Array
  });

  // node_modules/@huggingface/transformers/src/utils/model-loader.js
  function resolveExternalDataFormat(config, fullName, fileName) {
    if (!config) return 0;
    if (typeof config === "object" && config !== null) {
      if (config.hasOwnProperty(fullName)) return +config[fullName];
      if (config.hasOwnProperty(fileName)) return +config[fileName];
      return 0;
    }
    return +config;
  }
  function getExternalDataChunkNames(fullName, numChunks) {
    const names = [];
    for (let i = 0; i < numChunks; ++i) {
      names.push(`${fullName}_data${i === 0 ? "" : "_" + i}`);
    }
    return names;
  }
  async function getCoreModelFile(pretrained_model_name_or_path, fileName, options, suffix) {
    const baseName = `${fileName}${suffix}.onnx`;
    const fullPath = `${options.subfolder ?? ""}/${baseName}`;
    return await getModelFile(pretrained_model_name_or_path, fullPath, true, options, apis.IS_NODE_ENV);
  }
  async function getModelDataFiles(pretrained_model_name_or_path, fileName, suffix, options, use_external_data_format, session_options = {}) {
    const baseName = `${fileName}${suffix}.onnx`;
    const return_path = apis.IS_NODE_ENV;
    let externalDataPromises = [];
    const num_chunks = resolveExternalDataFormat(use_external_data_format, baseName, fileName);
    if (num_chunks > 0) {
      if (num_chunks > MAX_EXTERNAL_DATA_CHUNKS) {
        throw new Error(
          `The number of external data chunks (${num_chunks}) exceeds the maximum allowed value (${MAX_EXTERNAL_DATA_CHUNKS}).`
        );
      }
      const chunkNames = getExternalDataChunkNames(baseName, num_chunks);
      for (const path3 of chunkNames) {
        const fullPath = `${options.subfolder ?? ""}/${path3}`;
        externalDataPromises.push(
          new Promise(async (resolve, reject) => {
            const data = await getModelFile(
              pretrained_model_name_or_path,
              fullPath,
              true,
              options,
              return_path
            );
            resolve(data instanceof Uint8Array ? { path: path3, data } : path3);
          })
        );
      }
    } else if (session_options.externalData !== void 0) {
      externalDataPromises = session_options.externalData.map(async (ext) => {
        if (typeof ext.data === "string") {
          const ext_buffer = await getModelFile(pretrained_model_name_or_path, ext.data, true, options);
          return { ...ext, data: ext_buffer };
        }
        return ext;
      });
    }
    return Promise.all(externalDataPromises);
  }

  // node_modules/@huggingface/transformers/src/utils/maths.js
  function permute_data(array, dims, axes) {
    const shape = new Array(axes.length);
    const stride = new Array(axes.length);
    for (let i = axes.length - 1, s = 1; i >= 0; --i) {
      stride[i] = s;
      shape[i] = dims[axes[i]];
      s *= shape[i];
    }
    const invStride = axes.map((_, i) => stride[axes.indexOf(i)]);
    const permutedData = new array.constructor(array.length);
    for (let i = 0; i < array.length; ++i) {
      let newIndex = 0;
      for (let j2 = dims.length - 1, k = i; j2 >= 0; --j2) {
        newIndex += k % dims[j2] * invStride[j2];
        k = Math.floor(k / dims[j2]);
      }
      permutedData[newIndex] = array[i];
    }
    return [permutedData, shape];
  }
  function softmax(arr) {
    const maxVal = max(arr)[0];
    const exps = arr.map((x) => Math.exp(x - maxVal));
    const sumExps = exps.reduce((acc, val) => acc + val, 0);
    const softmaxArr = exps.map((x) => x / sumExps);
    return (
      /** @type {T} */
      softmaxArr
    );
  }
  function min(arr) {
    if (arr.length === 0) throw Error("Array must not be empty");
    let min3 = arr[0];
    let indexOfMin = 0;
    for (let i = 1; i < arr.length; ++i) {
      if (arr[i] < min3) {
        min3 = arr[i];
        indexOfMin = i;
      }
    }
    return (
      /** @type {T extends bigint[]|BigTypedArray ? [bigint, number] : [number, number]} */
      [min3, indexOfMin]
    );
  }
  function max(arr) {
    if (arr.length === 0) throw Error("Array must not be empty");
    let max2 = arr[0];
    let indexOfMax = 0;
    for (let i = 1; i < arr.length; ++i) {
      if (arr[i] > max2) {
        max2 = arr[i];
        indexOfMax = i;
      }
    }
    return (
      /** @type {T extends bigint[]|BigTypedArray ? [bigint, number] : [number, number]} */
      [max2, indexOfMax]
    );
  }
  var uint16_to_float32 = /* @__PURE__ */ (function() {
    let float16LUT = null;
    return function(u16Array) {
      if (!float16LUT) {
        float16LUT = new Float32Array(65536);
        const buffer = new ArrayBuffer(4);
        const u32 = new Uint32Array(buffer);
        const f32 = new Float32Array(buffer);
        for (let i = 0; i < float16LUT.length; ++i) {
          let outBits = 0;
          const sign = (i & 32768) << 16;
          const exp = (i & 31744) >> 10;
          let mantissa = i & 1023;
          if (exp === 31) {
            outBits = sign | 2139095040 | mantissa << 13;
          } else if (exp === 0) {
            if (mantissa === 0) {
              outBits = sign;
            } else {
              let renormExp = 113;
              while ((mantissa & 1024) === 0) {
                mantissa <<= 1;
                --renormExp;
              }
              mantissa &= ~1024;
              outBits = sign | renormExp << 23 | mantissa << 13;
            }
          } else {
            outBits = sign | exp + 112 << 23 | mantissa << 13;
          }
          u32[0] = outBits;
          float16LUT[i] = f32[0];
        }
      }
      const length = u16Array.length;
      const lut = float16LUT;
      const out = new Float32Array(length);
      for (let i = 0; i < length; ++i) {
        out[i] = lut[u16Array[i]];
      }
      return out;
    };
  })();

  // node_modules/@huggingface/transformers/src/ops/registry.js
  var wrap = async (session_bytes, session_options, names) => {
    const session = await createInferenceSession(new Uint8Array(session_bytes), session_options);
    return (
      /** @type {any} */
      (async (inputs) => {
        const proxied = isONNXProxy();
        const ortFeed = Object.fromEntries(
          Object.entries(inputs).map(([k, v]) => [k, (proxied ? v.clone() : v).ort_tensor])
        );
        const outputs = await runInferenceSession(session, ortFeed);
        if (Array.isArray(names)) {
          return names.map((n) => new Tensor3(outputs[n]));
        } else {
          return new Tensor3(outputs[
            /** @type {string} */
            names
          ]);
        }
      })
    );
  };
  var TensorOpRegistry = class {
    static session_options = {
      // TODO: Allow for multiple execution providers
      // executionProviders: ['webgpu'],
    };
    static get nearest_interpolate_4d() {
      if (!this._nearest_interpolate_4d) {
        this._nearest_interpolate_4d = wrap(
          [
            8,
            10,
            18,
            0,
            58,
            129,
            1,
            10,
            41,
            10,
            1,
            120,
            10,
            0,
            10,
            0,
            10,
            1,
            115,
            18,
            1,
            121,
            34,
            6,
            82,
            101,
            115,
            105,
            122,
            101,
            42,
            18,
            10,
            4,
            109,
            111,
            100,
            101,
            34,
            7,
            110,
            101,
            97,
            114,
            101,
            115,
            116,
            160,
            1,
            3,
            18,
            1,
            114,
            90,
            31,
            10,
            1,
            120,
            18,
            26,
            10,
            24,
            8,
            1,
            18,
            20,
            10,
            3,
            18,
            1,
            98,
            10,
            3,
            18,
            1,
            99,
            10,
            3,
            18,
            1,
            104,
            10,
            3,
            18,
            1,
            119,
            90,
            15,
            10,
            1,
            115,
            18,
            10,
            10,
            8,
            8,
            7,
            18,
            4,
            10,
            2,
            8,
            4,
            98,
            31,
            10,
            1,
            121,
            18,
            26,
            10,
            24,
            8,
            1,
            18,
            20,
            10,
            3,
            18,
            1,
            98,
            10,
            3,
            18,
            1,
            99,
            10,
            3,
            18,
            1,
            104,
            10,
            3,
            18,
            1,
            119,
            66,
            2,
            16,
            21
          ],
          this.session_options,
          "y"
        );
      }
      return this._nearest_interpolate_4d;
    }
    static get bilinear_interpolate_4d() {
      if (!this._bilinear_interpolate_4d) {
        this._bilinear_interpolate_4d = wrap(
          [
            8,
            9,
            18,
            0,
            58,
            128,
            1,
            10,
            40,
            10,
            1,
            120,
            10,
            0,
            10,
            0,
            10,
            1,
            115,
            18,
            1,
            121,
            34,
            6,
            82,
            101,
            115,
            105,
            122,
            101,
            42,
            17,
            10,
            4,
            109,
            111,
            100,
            101,
            34,
            6,
            108,
            105,
            110,
            101,
            97,
            114,
            160,
            1,
            3,
            18,
            1,
            114,
            90,
            31,
            10,
            1,
            120,
            18,
            26,
            10,
            24,
            8,
            1,
            18,
            20,
            10,
            3,
            18,
            1,
            98,
            10,
            3,
            18,
            1,
            99,
            10,
            3,
            18,
            1,
            104,
            10,
            3,
            18,
            1,
            119,
            90,
            15,
            10,
            1,
            115,
            18,
            10,
            10,
            8,
            8,
            7,
            18,
            4,
            10,
            2,
            8,
            4,
            98,
            31,
            10,
            1,
            121,
            18,
            26,
            10,
            24,
            8,
            1,
            18,
            20,
            10,
            3,
            18,
            1,
            98,
            10,
            3,
            18,
            1,
            99,
            10,
            3,
            18,
            1,
            104,
            10,
            3,
            18,
            1,
            119,
            66,
            2,
            16,
            20
          ],
          this.session_options,
          "y"
        );
      }
      return this._bilinear_interpolate_4d;
    }
    static get bicubic_interpolate_4d() {
      if (!this._bicubic_interpolate_4d) {
        this._bicubic_interpolate_4d = wrap(
          [
            8,
            9,
            18,
            0,
            58,
            127,
            10,
            39,
            10,
            1,
            120,
            10,
            0,
            10,
            0,
            10,
            1,
            115,
            18,
            1,
            121,
            34,
            6,
            82,
            101,
            115,
            105,
            122,
            101,
            42,
            16,
            10,
            4,
            109,
            111,
            100,
            101,
            34,
            5,
            99,
            117,
            98,
            105,
            99,
            160,
            1,
            3,
            18,
            1,
            114,
            90,
            31,
            10,
            1,
            120,
            18,
            26,
            10,
            24,
            8,
            1,
            18,
            20,
            10,
            3,
            18,
            1,
            98,
            10,
            3,
            18,
            1,
            99,
            10,
            3,
            18,
            1,
            104,
            10,
            3,
            18,
            1,
            119,
            90,
            15,
            10,
            1,
            115,
            18,
            10,
            10,
            8,
            8,
            7,
            18,
            4,
            10,
            2,
            8,
            4,
            98,
            31,
            10,
            1,
            121,
            18,
            26,
            10,
            24,
            8,
            1,
            18,
            20,
            10,
            3,
            18,
            1,
            98,
            10,
            3,
            18,
            1,
            99,
            10,
            3,
            18,
            1,
            104,
            10,
            3,
            18,
            1,
            119,
            66,
            2,
            16,
            20
          ],
          this.session_options,
          "y"
        );
      }
      return this._bicubic_interpolate_4d;
    }
    static get matmul() {
      if (!this._matmul) {
        this._matmul = wrap(
          [
            8,
            9,
            18,
            0,
            58,
            55,
            10,
            17,
            10,
            1,
            97,
            10,
            1,
            98,
            18,
            1,
            99,
            34,
            6,
            77,
            97,
            116,
            77,
            117,
            108,
            18,
            1,
            114,
            90,
            9,
            10,
            1,
            97,
            18,
            4,
            10,
            2,
            8,
            1,
            90,
            9,
            10,
            1,
            98,
            18,
            4,
            10,
            2,
            8,
            1,
            98,
            9,
            10,
            1,
            99,
            18,
            4,
            10,
            2,
            8,
            1,
            66,
            2,
            16,
            20
          ],
          this.session_options,
          "c"
        );
      }
      return this._matmul;
    }
    static get stft() {
      if (!this._stft) {
        this._stft = wrap(
          [
            8,
            7,
            18,
            0,
            58,
            148,
            1,
            10,
            38,
            10,
            1,
            115,
            10,
            1,
            106,
            10,
            1,
            119,
            10,
            1,
            108,
            18,
            1,
            111,
            34,
            4,
            83,
            84,
            70,
            84,
            42,
            15,
            10,
            8,
            111,
            110,
            101,
            115,
            105,
            100,
            101,
            100,
            24,
            1,
            160,
            1,
            2,
            18,
            1,
            115,
            90,
            26,
            10,
            1,
            115,
            18,
            21,
            10,
            19,
            8,
            1,
            18,
            15,
            10,
            3,
            18,
            1,
            98,
            10,
            3,
            18,
            1,
            115,
            10,
            3,
            18,
            1,
            99,
            90,
            11,
            10,
            1,
            106,
            18,
            6,
            10,
            4,
            8,
            7,
            18,
            0,
            90,
            16,
            10,
            1,
            119,
            18,
            11,
            10,
            9,
            8,
            1,
            18,
            5,
            10,
            3,
            18,
            1,
            119,
            90,
            11,
            10,
            1,
            108,
            18,
            6,
            10,
            4,
            8,
            7,
            18,
            0,
            98,
            31,
            10,
            1,
            111,
            18,
            26,
            10,
            24,
            8,
            1,
            18,
            20,
            10,
            3,
            18,
            1,
            98,
            10,
            3,
            18,
            1,
            102,
            10,
            3,
            18,
            1,
            100,
            10,
            3,
            18,
            1,
            99,
            66,
            2,
            16,
            17
          ],
          this.session_options,
          "o"
        );
      }
      return this._stft;
    }
    static get rfft() {
      if (!this._rfft) {
        this._rfft = wrap(
          [
            8,
            9,
            58,
            93,
            10,
            33,
            10,
            1,
            120,
            10,
            0,
            10,
            1,
            97,
            18,
            1,
            121,
            34,
            3,
            68,
            70,
            84,
            42,
            15,
            10,
            8,
            111,
            110,
            101,
            115,
            105,
            100,
            101,
            100,
            24,
            1,
            160,
            1,
            2,
            18,
            1,
            100,
            90,
            19,
            10,
            1,
            120,
            18,
            14,
            10,
            12,
            8,
            1,
            18,
            8,
            10,
            0,
            10,
            0,
            10,
            2,
            8,
            1,
            90,
            11,
            10,
            1,
            97,
            18,
            6,
            10,
            4,
            8,
            7,
            18,
            0,
            98,
            19,
            10,
            1,
            121,
            18,
            14,
            10,
            12,
            8,
            1,
            18,
            8,
            10,
            0,
            10,
            0,
            10,
            2,
            8,
            2,
            66,
            2,
            16,
            20
          ],
          this.session_options,
          "y"
        );
      }
      return this._rfft;
    }
    static get top_k() {
      if (!this._top_k) {
        this._top_k = wrap(
          [
            8,
            10,
            18,
            0,
            58,
            73,
            10,
            18,
            10,
            1,
            120,
            10,
            1,
            107,
            18,
            1,
            118,
            18,
            1,
            105,
            34,
            4,
            84,
            111,
            112,
            75,
            18,
            1,
            116,
            90,
            9,
            10,
            1,
            120,
            18,
            4,
            10,
            2,
            8,
            1,
            90,
            15,
            10,
            1,
            107,
            18,
            10,
            10,
            8,
            8,
            7,
            18,
            4,
            10,
            2,
            8,
            1,
            98,
            9,
            10,
            1,
            118,
            18,
            4,
            10,
            2,
            8,
            1,
            98,
            9,
            10,
            1,
            105,
            18,
            4,
            10,
            2,
            8,
            7,
            66,
            2,
            16,
            21
          ],
          this.session_options,
          [
            /* Values */
            "v",
            /* Indices */
            "i"
          ]
        );
      }
      return this._top_k;
    }
    static get slice() {
      if (!this._slice) {
        this._slice = wrap(
          [
            8,
            7,
            18,
            0,
            58,
            96,
            10,
            25,
            10,
            1,
            120,
            10,
            1,
            115,
            10,
            1,
            101,
            10,
            1,
            97,
            10,
            1,
            116,
            18,
            1,
            121,
            34,
            5,
            83,
            108,
            105,
            99,
            101,
            18,
            1,
            114,
            90,
            9,
            10,
            1,
            120,
            18,
            4,
            10,
            2,
            8,
            1,
            90,
            9,
            10,
            1,
            115,
            18,
            4,
            10,
            2,
            8,
            7,
            90,
            9,
            10,
            1,
            101,
            18,
            4,
            10,
            2,
            8,
            7,
            90,
            9,
            10,
            1,
            97,
            18,
            4,
            10,
            2,
            8,
            7,
            90,
            9,
            10,
            1,
            116,
            18,
            4,
            10,
            2,
            8,
            7,
            98,
            9,
            10,
            1,
            121,
            18,
            4,
            10,
            2,
            8,
            1,
            66,
            2,
            16,
            13
          ],
          this.session_options,
          "y"
        );
      }
      return this._slice;
    }
  };

  // node_modules/@huggingface/transformers/src/utils/tensor.js
  var Tensor3 = class _Tensor {
    /**
     * Dimensions of the tensor.
     * @type {number[]}
     */
    get dims() {
      return this.ort_tensor.dims;
    }
    set dims(value) {
      this.ort_tensor.dims = value;
    }
    /**
     * Type of the tensor.
     * @type {DataType}
     */
    get type() {
      return this.ort_tensor.type;
    }
    /**
     * The data stored in the tensor.
     * @type {DataArray}
     */
    get data() {
      return this.ort_tensor.data;
    }
    /**
     * The number of elements in the tensor.
     * @type {number}
     */
    get size() {
      return this.ort_tensor.size;
    }
    /**
     * The location of the tensor data.
     * @type {string}
     */
    get location() {
      return this.ort_tensor.location;
    }
    ort_tensor;
    /**
     * Create a new Tensor, either from raw data or by wrapping an `onnxruntime` tensor:
     * - `new Tensor(dataType, data, dims)`, e.g. `new Tensor('float32', new Float32Array([1, 2, 3]), [3])`.
     * - `new Tensor(ortTensor)`.
     *
     * @param {[DataType, DataArray, number[]]|[ONNXTensor]} args
     */
    constructor(...args) {
      if (isONNXTensor(args[0])) {
        this.ort_tensor = /** @type {ONNXTensor} */
        args[0];
      } else {
        this.ort_tensor = new Tensor2(
          /** @type {DataType} */
          args[0],
          // @ts-expect-error ts(2769) Type 'number' is not assignable to type 'bigint'.
          /** @type {Exclude<import('./maths.js').AnyTypedArray, Uint8ClampedArray>} */
          args[1],
          args[2]
        );
      }
      return new Proxy(this, {
        get: (obj, key) => {
          if (typeof key === "string") {
            let index = Number(key);
            if (Number.isInteger(index)) {
              return obj._getitem(index);
            }
          }
          return obj[key];
        },
        set: (obj, key, value) => {
          return obj[key] = value;
        }
      });
    }
    /**
     * Releases the underlying ONNX Runtime tensor (e.g., GPU buffers). Do not use the tensor afterwards.
     */
    dispose() {
      this.ort_tensor.dispose();
    }
    /**
     * Returns an iterator object for iterating over the tensor data in row-major order.
     * If the tensor has more than one dimension, the iterator will yield subarrays.
     * @returns {Iterator<any>} An iterator object for iterating over the tensor data in row-major order.
     */
    *[Symbol.iterator]() {
      const [iterLength, ...iterDims] = this.dims;
      if (iterDims.length > 0) {
        const iterSize = iterDims.reduce((a, b) => a * b);
        for (let i = 0; i < iterLength; ++i) {
          yield this._subarray(i, iterSize, iterDims);
        }
      } else {
        yield* this.data;
      }
    }
    /**
     * Index into a Tensor object.
     * @param {number} index The index to access.
     * @returns {Tensor} The data at the specified index.
     * @private
     */
    _getitem(index) {
      const [iterLength, ...iterDims] = this.dims;
      index = safeIndex(index, iterLength);
      if (iterDims.length > 0) {
        const iterSize = iterDims.reduce((a, b) => a * b);
        return this._subarray(index, iterSize, iterDims);
      } else {
        return new _Tensor(this.type, [this.data[index]], iterDims);
      }
    }
    /**
     * @param {number} index
     * @param {number} iterSize
     * @param {any} iterDims
     * @returns {Tensor}
     */
    _subarray(index, iterSize, iterDims) {
      const o1 = index * iterSize;
      const o2 = (index + 1) * iterSize;
      const data = "subarray" in this.data ? this.data.subarray(o1, o2) : this.data.slice(o1, o2);
      return new _Tensor(this.type, data, iterDims);
    }
    /**
     * Returns the value of this tensor as a standard JavaScript Number. This only works
     * for tensors with one element. For other cases, see `Tensor.tolist()`.
     * @returns {number|bigint} The value of this tensor as a standard JavaScript Number.
     * @throws {Error} If the tensor has more than one element.
     */
    item() {
      const this_data = this.data;
      if (this_data.length !== 1) {
        throw new Error(`a Tensor with ${this_data.length} elements cannot be converted to Scalar`);
      }
      return this_data[0];
    }
    /**
     * Convert tensor data to a n-dimensional JS list
     * @returns {any[]}
     */
    tolist() {
      return reshape(this.data, this.dims);
    }
    /**
     * Return a new Tensor with the sigmoid function applied to each element.
     * @returns {Tensor} The tensor with the sigmoid function applied.
     */
    sigmoid() {
      return this.clone().sigmoid_();
    }
    /**
     * Applies the sigmoid function to the tensor in place.
     * @returns {Tensor} Returns `this`.
     */
    sigmoid_() {
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        this_data[i] = 1 / (1 + Math.exp(-this_data[i]));
      }
      return this;
    }
    /**
     * Return a new Tensor with a callback function applied to each element.
     * @param {Function} callback - The function to apply to each element. It should take three arguments:
     *                              the current element, its index, and the tensor's data array.
     * @returns {Tensor} A new Tensor with the callback function applied to each element.
     */
    map(callback) {
      return this.clone().map_(callback);
    }
    /**
     * Apply a callback function to each element of the tensor in place.
     * @param {Function} callback - The function to apply to each element. It should take three arguments:
     *                              the current element, its index, and the tensor's data array.
     * @returns {Tensor} Returns `this`.
     */
    map_(callback) {
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        this_data[i] = callback(this_data[i], i, this_data);
      }
      return this;
    }
    /**
     * Return a new Tensor with every element multiplied by a constant.
     * @param {number} val The value to multiply by.
     * @returns {Tensor} The new tensor.
     */
    mul(val) {
      return this.clone().mul_(val);
    }
    /**
     * Multiply the tensor by a constant in place.
     * @param {number} val The value to multiply by.
     * @returns {Tensor} Returns `this`.
     */
    mul_(val) {
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        this_data[i] *= val;
      }
      return this;
    }
    /**
     * Return a new Tensor with every element divided by a constant.
     * @param {number} val The value to divide by.
     * @returns {Tensor} The new tensor.
     */
    div(val) {
      return this.clone().div_(val);
    }
    /**
     * Divide the tensor by a constant in place.
     * @param {number} val The value to divide by.
     * @returns {Tensor} Returns `this`.
     */
    div_(val) {
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        this_data[i] /= val;
      }
      return this;
    }
    /**
     * Return a new Tensor with every element added by a constant.
     * @param {number} val The value to add by.
     * @returns {Tensor} The new tensor.
     */
    add(val) {
      return this.clone().add_(val);
    }
    /**
     * Add the tensor by a constant in place.
     * @param {number} val The value to add by.
     * @returns {Tensor} Returns `this`.
     */
    add_(val) {
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        this_data[i] += val;
      }
      return this;
    }
    /**
     * Return a new Tensor with every element subtracted by a constant.
     * @param {number} val The value to subtract by.
     * @returns {Tensor} The new tensor.
     */
    sub(val) {
      return this.clone().sub_(val);
    }
    /**
     * Subtract the tensor by a constant in place.
     * @param {number} val The value to subtract by.
     * @returns {Tensor} Returns `this`.
     */
    sub_(val) {
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        this_data[i] -= val;
      }
      return this;
    }
    /**
     * Return a new Tensor with the element-wise remainder of division by a constant.
     * Uses Python-style modulo signs (e.g. `-1 mod 2 = 1`) while preserving the tensor's dtype.
     * Negative divisors are unsupported for unsigned and boolean tensors.
     * This operation does not implement PyTorch's dtype promotion or scalar casting rules.
     * @param {number|bigint} val The divisor.
     * @returns {Tensor} The new tensor.
     */
    remainder(val) {
      return this.clone().remainder_(val);
    }
    /**
     * In-place version of @see {@link Tensor.remainder}
     * @param {number|bigint} val The divisor.
     * @returns {Tensor} Returns `this`.
     */
    remainder_(val) {
      const this_data = this.data;
      const is_bigint = this_data instanceof BigInt64Array || this_data instanceof BigUint64Array;
      const divisor = (
        /** @type {any} */
        is_bigint ? BigInt(val) : Number(val)
      );
      if ((divisor === 0 || divisor === 0n) && (this.type.includes("int") || this.type === "bool")) {
        throw new RangeError("Division by zero");
      }
      if (divisor < 0 && (this.type.startsWith("uint") || this.type === "bool")) {
        throw new RangeError("Negative divisors are not supported for unsigned or boolean tensors");
      }
      for (let i = 0; i < this_data.length; ++i) {
        const remainder = this_data[i] % divisor;
        const needs_shift = remainder < 0 && divisor > 0 || remainder > 0 && divisor < 0;
        this_data[i] = needs_shift ? remainder + divisor : remainder;
      }
      return this;
    }
    /**
     * Creates a deep copy of the current Tensor.
     * @returns {Tensor} A new Tensor with the same type, data, and dimensions as the original.
     */
    clone() {
      return new _Tensor(this.type, this.data.slice(), this.dims.slice());
    }
    /**
     * Performs a slice operation on the Tensor along specified dimensions.
     *
     * Consider a Tensor that has a dimension of [4, 7]:
     * ```
     * [ 1,  2,  3,  4,  5,  6,  7]
     * [ 8,  9, 10, 11, 12, 13, 14]
     * [15, 16, 17, 18, 19, 20, 21]
     * [22, 23, 24, 25, 26, 27, 28]
     * ```
     * We can slice against the two dims of row and column, for instance in this
     * case we can start at the second element, and return to the second last,
     * like this:
     * ```
     * tensor.slice([1, -1], [1, -1]);
     * ```
     * which would return:
     * ```
     * [  9, 10, 11, 12, 13 ]
     * [ 16, 17, 18, 19, 20 ]
     * ```
     *
     * @param {...(number|number[]|null)} slices The slice specifications for each dimension.
     * - If a number is given, then a single element is selected.
     * - If an array of two numbers is given, then a range of elements [start, end (exclusive)] is selected.
     * - If null is given, then the entire dimension is selected.
     * @returns {Tensor} A new Tensor containing the selected elements.
     * @throws {Error} If the slice input is invalid.
     */
    slice(...slices) {
      const newTensorDims = [];
      const newOffsets = [];
      for (let sliceIndex = 0; sliceIndex < this.dims.length; ++sliceIndex) {
        let slice2 = slices[sliceIndex];
        if (slice2 === null || slice2 === void 0) {
          newOffsets.push([0, this.dims[sliceIndex]]);
          newTensorDims.push(this.dims[sliceIndex]);
        } else if (typeof slice2 === "number") {
          slice2 = safeIndex(slice2, this.dims[sliceIndex], sliceIndex);
          newOffsets.push([slice2, slice2 + 1]);
        } else if (Array.isArray(slice2) && slice2.length === 2) {
          let [start, end] = slice2;
          start = start === null ? 0 : safeIndex(start, this.dims[sliceIndex], sliceIndex, false);
          end = end === null ? this.dims[sliceIndex] : safeIndex(end, this.dims[sliceIndex], sliceIndex, false);
          if (start > end) {
            throw new Error(`Invalid slice: ${slice2}`);
          }
          const offsets = [Math.max(start, 0), Math.min(end, this.dims[sliceIndex])];
          newOffsets.push(offsets);
          newTensorDims.push(offsets[1] - offsets[0]);
        } else {
          throw new Error(`Invalid slice: ${slice2}`);
        }
      }
      const newDims = newOffsets.map(([start, end]) => end - start);
      const newBufferSize = newDims.reduce((a, b) => a * b);
      const this_data = this.data;
      const data = new this_data.constructor(newBufferSize);
      const stride = this.stride();
      let isContiguous = true;
      for (let i = 1; i < newDims.length; ++i) {
        if (newOffsets[i][0] !== 0 || newOffsets[i][1] !== this.dims[i]) {
          isContiguous = false;
          break;
        }
      }
      if (isContiguous) {
        const start = newOffsets[0][0] * stride[0];
        const end = newOffsets[0][1] * stride[0];
        if (ArrayBuffer.isView(this_data)) {
          data.set(this_data.subarray(start, end));
        } else if (Array.isArray(this_data)) {
          const slicedData = this_data.slice(start, end);
          for (let i = 0; i < slicedData.length; ++i) {
            data[i] = slicedData[i];
          }
        } else {
          throw new Error("Unsupported data type for slicing");
        }
      } else {
        for (let i = 0; i < newBufferSize; ++i) {
          let originalIndex = 0;
          for (let j2 = newDims.length - 1, num = i; j2 >= 0; --j2) {
            const size = newDims[j2];
            originalIndex += (num % size + newOffsets[j2][0]) * stride[j2];
            num = Math.floor(num / size);
          }
          data[i] = this_data[originalIndex];
        }
      }
      return new _Tensor(this.type, data, newTensorDims);
    }
    /**
     * Return a permuted version of this Tensor, according to the provided dimensions.
     * @param  {...number} dims Dimensions to permute.
     * @returns {Tensor} The permuted tensor.
     */
    permute(...dims) {
      return permute(this, dims);
    }
    // TODO: implement transpose. For now (backwards compatibility), it's just an alias for permute()
    /** @type {Tensor['permute']} */
    transpose(...dims) {
      return this.permute(...dims);
    }
    /**
     * Returns the sum of each row of the input tensor in the given dimension dim.
     *
     * @param {number|null} [dim=null] The dimension or dimensions to reduce. If `null`, all dimensions are reduced.
     * @param {boolean} keepdim Whether the output tensor has `dim` retained or not.
     * @returns The summed tensor
     */
    sum(dim = null, keepdim = false) {
      return this.norm(1, dim, keepdim);
    }
    /**
     * Returns the matrix norm or vector norm of a given tensor.
     * @param {number|string} [p='fro'] The order of norm
     * @param {number|null} [dim=null] Specifies which dimension of the tensor to calculate the norm across.
     * If dim is None, the norm will be calculated across all dimensions of input.
     * @param {boolean} [keepdim=false] Whether the output tensors have dim retained or not.
     * @returns {Tensor} The norm of the tensor.
     */
    norm(p = "fro", dim = null, keepdim = false) {
      if (p === "fro") {
        p = 2;
      } else if (typeof p === "string") {
        throw Error(`Unsupported norm: ${p}`);
      }
      const this_data = this.data;
      const is_bigint = this_data instanceof BigInt64Array || this_data instanceof BigUint64Array;
      if (is_bigint && p !== 1) {
        throw Error(`Expected a floating point tensor as input. Got ${this.type}`);
      }
      let fn2, zero;
      if (is_bigint) {
        fn2 = (a, b) => a + b;
        zero = 0n;
      } else {
        fn2 = (a, b) => a + b ** p;
        zero = 0;
      }
      if (dim === null) {
        let val = this_data.reduce(fn2, zero);
        if (p !== 1) {
          val = val ** (1 / p);
        }
        return new _Tensor(this.type, [val], []);
      }
      const [type, result, resultDims] = reduce_helper(fn2, this, dim, keepdim);
      if (p !== 1) {
        for (let i = 0; i < result.length; ++i) {
          result[i] = result[i] ** (1 / p);
        }
      }
      return new _Tensor(type, result, resultDims);
    }
    /**
     * Performs `L_p` normalization of inputs over specified dimension. Operates in place.
     * @param {number} [p=2] The exponent value in the norm formulation
     * @param {number} [dim=1] The dimension to reduce
     * @returns {Tensor} `this` for operation chaining.
     */
    normalize_(p = 2, dim = 1) {
      dim = safeIndex(dim, this.dims.length);
      const norm = this.norm(p, dim, true);
      const this_data = this.data;
      const norm_data = norm.data;
      for (let i = 0; i < this_data.length; ++i) {
        let resultIndex = 0;
        for (let j2 = this.dims.length - 1, num = i, resultMultiplier = 1; j2 >= 0; --j2) {
          const size = this.dims[j2];
          if (j2 !== dim) {
            const index = num % size;
            resultIndex += index * resultMultiplier;
            resultMultiplier *= this.dims[j2];
          }
          num = Math.floor(num / size);
        }
        this_data[i] /= norm_data[resultIndex];
      }
      return this;
    }
    /**
     * Performs `L_p` normalization of inputs over specified dimension.
     * @param {number} [p=2] The exponent value in the norm formulation
     * @param {number} [dim=1] The dimension to reduce
     * @returns {Tensor} The normalized tensor.
     */
    normalize(p = 2, dim = 1) {
      return this.clone().normalize_(p, dim);
    }
    /**
     * Compute and return the stride of this tensor.
     * Stride is the jump necessary to go from one element to the next one in the specified dimension dim.
     * @returns {number[]} The stride of this tensor.
     */
    stride() {
      return dimsToStride(this.dims);
    }
    /**
     * Returns a tensor with all specified dimensions of input of size 1 removed.
     *
     * NOTE: The returned tensor shares the storage with the input tensor, so changing the contents of one will change the contents of the other.
     * If you would like a copy, use `tensor.clone()` before squeezing.
     *
     * @param {number|number[]|null} [dim=null] If given, the input will be squeezed only in the specified dimensions.
     * @returns {Tensor} The squeezed tensor
     */
    squeeze(dim = null) {
      return new _Tensor(this.type, this.data, calc_squeeze_dims(this.dims, dim));
    }
    /**
     * In-place version of @see {@link Tensor.squeeze}
     * @param {number|number[]|null} [dim=null] If given, the input will be squeezed only in the specified dimensions.
     * @returns {Tensor} `this`, with the specified dimensions of size 1 removed.
     */
    squeeze_(dim = null) {
      this.dims = calc_squeeze_dims(this.dims, dim);
      return this;
    }
    /**
     * Returns a new tensor with a dimension of size one inserted at the specified position.
     *
     * NOTE: The returned tensor shares the same underlying data with this tensor.
     *
     * @param {number} dim The index at which to insert the singleton dimension
     * @returns {Tensor} The unsqueezed tensor
     */
    unsqueeze(dim) {
      return new _Tensor(this.type, this.data, calc_unsqueeze_dims(this.dims, dim));
    }
    /**
     * In-place version of @see {@link Tensor.unsqueeze}
     * @type {Tensor['unsqueeze']}
     */
    unsqueeze_(dim) {
      this.dims = calc_unsqueeze_dims(this.dims, dim);
      return this;
    }
    /**
     * In-place version of @see {@link Tensor.flatten}
     * @param {number} [start_dim=0] the first dim to flatten
     * @param {number} [end_dim=-1] the last dim to flatten
     * @returns {Tensor} `this`, flattened along the specified dimensions.
     */
    flatten_(start_dim = 0, end_dim = -1) {
      end_dim = (end_dim + this.dims.length) % this.dims.length;
      let dimsToKeepBefore = this.dims.slice(0, start_dim);
      let dimsToFlatten = this.dims.slice(start_dim, end_dim + 1);
      let dimsToKeepAfter = this.dims.slice(end_dim + 1);
      this.dims = [...dimsToKeepBefore, dimsToFlatten.reduce((a, b) => a * b, 1), ...dimsToKeepAfter];
      return this;
    }
    /**
     * Flattens input by reshaping it into a one-dimensional tensor.
     * If `start_dim` or `end_dim` are passed, only dimensions starting with `start_dim`
     * and ending with `end_dim` are flattened. The order of elements in input is unchanged.
     * @param {number} start_dim the first dim to flatten
     * @param {number} end_dim the last dim to flatten
     * @returns {Tensor} The flattened tensor.
     */
    flatten(start_dim = 0, end_dim = -1) {
      return this.clone().flatten_(start_dim, end_dim);
    }
    /**
     * Returns a new tensor with the same data as the `self` tensor but of a different `shape`.
     * @param  {...number} dims the desired size
     * @returns {Tensor} The tensor with the same data but different shape
     */
    view(...dims) {
      let inferredIndex = -1;
      for (let i = 0; i < dims.length; ++i) {
        if (dims[i] === -1) {
          if (inferredIndex !== -1) {
            throw new Error("Only one dimension can be inferred");
          }
          inferredIndex = i;
        }
      }
      const this_data = this.data;
      if (inferredIndex !== -1) {
        const productOther = dims.reduce((product, curr, index) => {
          return index !== inferredIndex ? product * curr : product;
        }, 1);
        dims[inferredIndex] = this_data.length / productOther;
      }
      return new _Tensor(this.type, this_data, dims);
    }
    /**
     * In-place version of @see {@link Tensor.neg}
     * @returns {Tensor} `this`, with every element negated.
     */
    neg_() {
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        this_data[i] = -this_data[i];
      }
      return this;
    }
    /**
     * Returns a new tensor with the negative of the elements of this tensor.
     * @returns {Tensor} the output tensor.
     */
    neg() {
      return this.clone().neg_();
    }
    /**
     * Computes input > val element-wise.
     * @param {number} val The value to compare with.
     * @returns {Tensor} A boolean tensor that is `true` where input is greater than other and `false` elsewhere.
     */
    gt(val) {
      const mask = new Uint8Array(this.data.length);
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        mask[i] = this_data[i] > val ? 1 : 0;
      }
      return new _Tensor("bool", mask, this.dims);
    }
    /**
     * Computes input < val element-wise.
     * @param {number} val The value to compare with.
     * @returns {Tensor} A boolean tensor that is `true` where input is less than other and `false` elsewhere.
     */
    lt(val) {
      const mask = new Uint8Array(this.data.length);
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        mask[i] = this_data[i] < val ? 1 : 0;
      }
      return new _Tensor("bool", mask, this.dims);
    }
    /**
     * In-place version of @see {@link Tensor.clamp}
     * @type {Tensor['clamp']}
     */
    clamp_(min3, max2) {
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        this_data[i] = Math.min(Math.max(this_data[i], min3), max2);
      }
      return this;
    }
    /**
     * Clamps all elements in input into the range [ min, max ]
     * @param {number} min lower-bound of the range to be clamped to
     * @param {number} max upper-bound of the range to be clamped to
     * @returns {Tensor} the output tensor.
     */
    clamp(min3, max2) {
      return this.clone().clamp_(min3, max2);
    }
    /**
     * In-place version of @see {@link Tensor.round}
     */
    round_() {
      const this_data = this.data;
      for (let i = 0; i < this_data.length; ++i) {
        this_data[i] = Math.round(this_data[i]);
      }
      return this;
    }
    /**
     * Rounds elements of input to the nearest integer.
     * @returns {Tensor} the output tensor.
     */
    round() {
      return this.clone().round_();
    }
    /**
     * Returns the mean value of each row of this tensor in the given dimension `dim`.
     * @param {number|null} [dim=null] the dimension to reduce. If `null`, the mean of all elements is computed.
     * @param {boolean} [keepdim=false] whether the output tensor has `dim` retained or not.
     * @returns {Tensor} A new tensor with means taken along the specified dimension.
     */
    mean(dim = null, keepdim = false) {
      return mean(this, dim, keepdim);
    }
    /**
     * Returns the minimum value of each row of this tensor in the given dimension `dim`.
     * @param {number|null} [dim=null] the dimension to reduce. If `null`, the minimum of all elements is computed.
     * @param {boolean} [keepdim=false] whether the output tensor has `dim` retained or not.
     * @returns {Tensor} A new tensor with minimum values taken along the specified dimension.
     */
    min(dim = null, keepdim = false) {
      if (dim === null) {
        const val = min(this.data)[0];
        return new _Tensor(
          this.type,
          [val],
          [
            /* scalar */
          ]
        );
      }
      const [type, result, resultDims] = reduce_helper((a, b) => Math.min(a, b), this, dim, keepdim, Infinity);
      return new _Tensor(type, result, resultDims);
    }
    /**
     * Returns the maximum value of each row of this tensor in the given dimension `dim`.
     * @param {number|null} [dim=null] the dimension to reduce. If `null`, the maximum of all elements is computed.
     * @param {boolean} [keepdim=false] whether the output tensor has `dim` retained or not.
     * @returns {Tensor} A new tensor with maximum values taken along the specified dimension.
     */
    max(dim = null, keepdim = false) {
      if (dim === null) {
        const val = max(this.data)[0];
        return new _Tensor(
          this.type,
          [val],
          [
            /* scalar */
          ]
        );
      }
      const [type, result, resultDims] = reduce_helper((a, b) => Math.max(a, b), this, dim, keepdim, -Infinity);
      return new _Tensor(type, result, resultDims);
    }
    /**
     * Returns the index of the minimum value of all elements in this tensor.
     * @param {number|null} [dim=null] the dimension to reduce. Only `null` (reduce over all elements) is currently supported.
     * @param {boolean} [keepdim=false] whether the output tensor has `dim` retained or not.
     * @returns {Tensor} An `int64` scalar tensor containing the index of the minimum value.
     * @throws {Error} If `dim` is not `null`.
     */
    argmin(dim = null, keepdim = false) {
      if (dim !== null) {
        throw new Error("`dim !== null` not yet implemented.");
      }
      const index = min(this.data)[1];
      return new _Tensor("int64", [BigInt(index)], []);
    }
    /**
     * Returns the index of the maximum value of all elements in this tensor.
     * @param {number|null} [dim=null] the dimension to reduce. Only `null` (reduce over all elements) is currently supported.
     * @param {boolean} [keepdim=false] whether the output tensor has `dim` retained or not.
     * @returns {Tensor} An `int64` scalar tensor containing the index of the maximum value.
     * @throws {Error} If `dim` is not `null`.
     */
    argmax(dim = null, keepdim = false) {
      if (dim !== null) {
        throw new Error("`dim !== null` not yet implemented.");
      }
      const index = max(this.data)[1];
      return new _Tensor("int64", [BigInt(index)], []);
    }
    /**
     * Repeats this tensor along the specified dimensions.
     * @param {...number} repeats The number of times to repeat this tensor along each dimension.
     * @returns {Tensor} The repeated tensor.
     * @throws {Error} If the number of repeats is less than the number of dimensions.
     */
    repeat(...repeats) {
      if (repeats.length < this.dims.length) {
        throw new Error(
          `Number of dimensions of repeat dims (${repeats.length}) cannot be smaller than number of dimensions of tensor (${this.dims.length})`
        );
      }
      if (repeats.every((r) => r === 1)) {
        if (repeats.length === this.dims.length) {
          return this.clone();
        }
        const numPrependedDims2 = repeats.length - this.dims.length;
        const newDims = Array(numPrependedDims2).fill(1).concat(this.dims);
        return new _Tensor(this.type, this.data.slice(), newDims);
      }
      const numPrependedDims = repeats.length - this.dims.length;
      const expandedDims = Array(numPrependedDims).fill(1).concat(this.dims);
      const outputDims = expandedDims.map((dim, i) => dim * repeats[i]);
      const outputSize = outputDims.reduce((a, b) => a * b, 1);
      const this_data = this.data;
      const data = new this_data.constructor(outputSize);
      const inputStrides = dimsToStride(expandedDims);
      const outputStrides = dimsToStride(outputDims);
      for (let i = 0; i < outputSize; ++i) {
        let remaining = i;
        let inputIndex = 0;
        for (let d = 0; d < outputDims.length; ++d) {
          const outputCoord = Math.floor(remaining / outputStrides[d]);
          remaining = remaining % outputStrides[d];
          const inputCoord = outputCoord % expandedDims[d];
          inputIndex += inputCoord * inputStrides[d];
        }
        data[i] = this_data[inputIndex];
      }
      return new _Tensor(this.type, data, outputDims);
    }
    /**
     * Constructs a tensor by repeating the elements of input. The dims argument specifies the number of repetitions in each dimension.
     * @param  {...number} dims The number of repetitions per dimension.
     * @returns {Tensor} The tiled tensor.
     */
    tile(...dims) {
      if (dims.length < this.dims.length) {
        const numPrependedRepeats = this.dims.length - dims.length;
        dims = Array(numPrependedRepeats).fill(1).concat(dims);
      }
      return this.repeat(...dims);
    }
    /**
     * Performs Tensor dtype conversion.
     * @param {DataType} type The desired data type.
     * @returns {Tensor} The converted tensor.
     */
    to(type) {
      if (this.type === type) return this;
      if (!DataTypeMap.hasOwnProperty(type)) {
        throw new Error(`Unsupported type: ${type}`);
      }
      let map_fn;
      const is_source_bigint = ["int64", "uint64"].includes(this.type);
      const is_dest_bigint = ["int64", "uint64"].includes(type);
      if (is_source_bigint && !is_dest_bigint) {
        map_fn = Number;
      } else if (!is_source_bigint && is_dest_bigint) {
        if (["float16", "float32", "float64"].includes(this.type)) {
          map_fn = (x) => BigInt(Math.floor(x));
        } else {
          map_fn = BigInt;
        }
      } else if (this.type === "float16" && type == "float32" && this.data instanceof Uint16Array) {
        return new _Tensor(type, uint16_to_float32(this.data), this.dims);
      }
      return new _Tensor(
        type,
        // @ts-ignore - TypeScript can't verify .from() across union of TypedArray constructors
        DataTypeMap[type].from(this.data, map_fn),
        this.dims
      );
    }
  };
  function reshape(data, dimensions) {
    const totalElements = data.length;
    const dimensionSize = dimensions.length === 0 ? 1 : dimensions.reduce((a, b) => a * b);
    if (totalElements !== dimensionSize) {
      throw Error(`cannot reshape array of size ${totalElements} into shape (${dimensions})`);
    }
    let reshapedArray = data;
    for (let i = dimensions.length - 1; i >= 0; i--) {
      reshapedArray = reshapedArray.reduce(
        (acc, val) => {
          let lastArray = acc[acc.length - 1];
          if (lastArray.length < dimensions[i]) {
            lastArray.push(val);
          } else {
            acc.push([val]);
          }
          return acc;
        },
        [[]]
      );
    }
    return reshapedArray[0];
  }
  function permute(tensor, axes) {
    const [permutedData, shape] = permute_data(tensor.data, tensor.dims, axes);
    return new Tensor3(tensor.type, permutedData, shape);
  }
  async function topk(x, k) {
    const op = await TensorOpRegistry.top_k;
    if (k == null) {
      k = x.dims.at(-1);
    } else {
      k = Math.min(k, x.dims.at(-1));
    }
    return await op({
      x,
      k: new Tensor3("int64", [BigInt(k)], [1])
    });
  }
  function mean_pooling(last_hidden_state, attention_mask) {
    const lastHiddenStateData = last_hidden_state.data;
    const attentionMaskData = attention_mask.data;
    const shape = [last_hidden_state.dims[0], last_hidden_state.dims[2]];
    const returnedData = new lastHiddenStateData.constructor(shape[0] * shape[1]);
    const [batchSize, seqLength, embedDim] = last_hidden_state.dims;
    let outIndex = 0;
    for (let i = 0; i < batchSize; ++i) {
      const offset = i * embedDim * seqLength;
      for (let k = 0; k < embedDim; ++k) {
        let sum = 0;
        let count = 0;
        const attnMaskOffset = i * seqLength;
        const offset2 = offset + k;
        for (let j2 = 0; j2 < seqLength; ++j2) {
          const attn = Number(attentionMaskData[attnMaskOffset + j2]);
          count += attn;
          sum += lastHiddenStateData[offset2 + j2 * embedDim] * attn;
        }
        const avg = sum / count;
        returnedData[outIndex++] = avg;
      }
    }
    return new Tensor3(last_hidden_state.type, returnedData, shape);
  }
  function calc_squeeze_dims(dims, dim) {
    dims = dims.slice();
    if (dim === null) {
      dims = dims.filter((d) => d !== 1);
    } else if (typeof dim === "number") {
      if (dims[dim] === 1) {
        dims.splice(dim, 1);
      }
    } else if (Array.isArray(dim)) {
      dims = dims.filter((x, i) => {
        return x !== 1 || !dim.includes(i);
      });
    }
    return dims;
  }
  function calc_unsqueeze_dims(dims, dim) {
    dim = safeIndex(dim, dims.length + 1);
    dims = dims.slice();
    dims.splice(dim, 0, 1);
    return dims;
  }
  function safeIndex(index, size, dimension = null, boundsCheck = true) {
    if (index < -size || index >= size) {
      if (boundsCheck) {
        throw new Error(
          `IndexError: index ${index} is out of bounds for dimension${dimension === null ? "" : " " + dimension} with size ${size}`
        );
      } else {
        return index < -size ? 0 : size;
      }
    }
    if (index < 0) {
      index = (index % size + size) % size;
    }
    return index;
  }
  function cat(tensors, dim = 0) {
    dim = safeIndex(dim, tensors[0].dims.length);
    const resultDims = tensors[0].dims.slice();
    resultDims[dim] = tensors.reduce((a, b) => a + b.dims[dim], 0);
    const resultSize = resultDims.reduce((a, b) => a * b, 1);
    const result = new tensors[0].data.constructor(resultSize);
    const resultType = tensors[0].type;
    if (dim === 0) {
      let offset = 0;
      for (const tensor of tensors) {
        const tensorData = tensor.data;
        result.set(tensorData, offset);
        offset += tensorData.length;
      }
    } else {
      let currentDim = 0;
      for (let t = 0; t < tensors.length; ++t) {
        const { data, dims } = tensors[t];
        for (let i = 0; i < data.length; ++i) {
          let resultIndex = 0;
          for (let j2 = dims.length - 1, num = i, resultMultiplier = 1; j2 >= 0; --j2) {
            const size = dims[j2];
            let index = num % size;
            if (j2 === dim) {
              index += currentDim;
            }
            resultIndex += index * resultMultiplier;
            resultMultiplier *= resultDims[j2];
            num = Math.floor(num / size);
          }
          result[resultIndex] = data[i];
        }
        currentDim += dims[dim];
      }
    }
    return new Tensor3(resultType, result, resultDims);
  }
  function reduce_helper(callbackfn, input, dim, keepdim = false, initialValue = null) {
    const inputData = input.data;
    const inputDims = input.dims;
    dim = safeIndex(dim, inputDims.length);
    const resultDims = inputDims.slice();
    resultDims[dim] = 1;
    const result = new inputData.constructor(inputData.length / inputDims[dim]);
    if (initialValue !== null) {
      result.fill(initialValue);
    }
    for (let i = 0; i < inputData.length; ++i) {
      let resultIndex = 0;
      for (let j2 = inputDims.length - 1, num = i, resultMultiplier = 1; j2 >= 0; --j2) {
        const size = inputDims[j2];
        if (j2 !== dim) {
          const index = num % size;
          resultIndex += index * resultMultiplier;
          resultMultiplier *= resultDims[j2];
        }
        num = Math.floor(num / size);
      }
      result[resultIndex] = callbackfn(result[resultIndex], inputData[i], i, resultIndex);
    }
    if (!keepdim) resultDims.splice(dim, 1);
    return [input.type, result, resultDims];
  }
  function mean(input, dim = null, keepdim = false) {
    const inputDims = input.dims;
    const inputData = (
      /** @type {Float32Array} */
      input.data
    );
    if (dim === null) {
      const val = inputData.reduce((a, b) => a + b, 0);
      return new Tensor3(
        input.type,
        [val / inputData.length],
        [
          /* scalar */
        ]
      );
    }
    dim = safeIndex(dim, inputDims.length);
    const [type, result, resultDims] = reduce_helper((a, b) => a + b, input, dim, keepdim);
    if (inputDims[dim] !== 1) {
      for (let i = 0; i < result.length; ++i) {
        result[i] /= inputDims[dim];
      }
    }
    return new Tensor3(type, result, resultDims);
  }
  function dimsToStride(dims) {
    const stride = new Array(dims.length);
    for (let i = dims.length - 1, s2 = 1; i >= 0; --i) {
      stride[i] = s2;
      s2 *= dims[i];
    }
    return stride;
  }
  function fullHelper(size, fill_value, dtype, cls) {
    const numElements = size.reduce((a, b) => a * b, 1);
    return new Tensor3(dtype, new cls(numElements).fill(fill_value), size);
  }
  function full(size, fill_value) {
    let dtype;
    let typedArrayCls;
    if (typeof fill_value === "number") {
      dtype = "float32";
      typedArrayCls = Float32Array;
    } else if (typeof fill_value === "bigint") {
      dtype = "int64";
      typedArrayCls = BigInt64Array;
    } else if (typeof fill_value === "boolean") {
      dtype = "bool";
      typedArrayCls = Uint8Array;
    } else {
      throw new Error(`Unsupported data type: ${typeof fill_value}`);
    }
    return fullHelper(size, fill_value, dtype, typedArrayCls);
  }
  function full_like(tensor, fill_value) {
    return full(tensor.dims, fill_value);
  }
  function ones(size) {
    return fullHelper(size, 1n, "int64", BigInt64Array);
  }
  function ones_like(tensor) {
    return ones(tensor.dims);
  }
  function zeros(size) {
    return fullHelper(size, 0n, "int64", BigInt64Array);
  }
  function zeros_like(tensor) {
    return zeros(tensor.dims);
  }

  // node_modules/@huggingface/transformers/src/models/session.js
  async function getSession(pretrained_model_name_or_path, fileName, options, cache_config = false, session_name = void 0) {
    let custom_config = options.config?.["transformers.js_config"] ?? {};
    const selectedDevice = (
      /** @type {import("../utils/devices.js").DeviceType} */
      selectDevice(options.device ?? custom_config.device, fileName, {
        warn: (msg) => logger.info(msg)
      })
    );
    const executionProviders = deviceToExecutionProviders(selectedDevice);
    const device_config = custom_config.device_config ?? {};
    if (device_config.hasOwnProperty(selectedDevice)) {
      custom_config = {
        ...custom_config,
        ...device_config[selectedDevice]
      };
    }
    const selectedDtype = (
      /** @type {import("../utils/dtypes.js").DataType} */
      selectDtype(options.dtype ?? custom_config.dtype, fileName, selectedDevice, {
        configDtype: custom_config.dtype,
        warn: (msg) => logger.info(msg)
      })
    );
    if (!DEFAULT_DTYPE_SUFFIX_MAPPING.hasOwnProperty(selectedDtype)) {
      throw new Error(`Invalid dtype: ${selectedDtype}. Should be one of: ${Object.keys(DATA_TYPES).join(", ")}`);
    } else if (selectedDevice === "webgpu" && // NOTE: Currently, we assume that the Native WebGPU EP always supports fp16. In future, we will add a check for this.
    !apis.IS_NODE_ENV && selectedDtype === DATA_TYPES.fp16 && !await isWebGpuFp16Supported()) {
      throw new Error(`The device (${selectedDevice}) does not support fp16.`);
    }
    const suffix = DEFAULT_DTYPE_SUFFIX_MAPPING[selectedDtype];
    const session_options = { ...options.session_options };
    session_options.executionProviders ??= executionProviders;
    const free_dimension_overrides = custom_config.free_dimension_overrides;
    if (free_dimension_overrides) {
      session_options.freeDimensionOverrides ??= free_dimension_overrides;
    } else if (selectedDevice.startsWith("webnn") && !session_options.freeDimensionOverrides) {
      logger.warn(
        `WebNN does not currently support dynamic shapes and requires 'free_dimension_overrides' to be set in config.json, preferably as a field within config["transformers.js_config"]["device_config"]["${selectedDevice}"]. When 'free_dimension_overrides' is not set, you may experience significant performance degradation.`
      );
    }
    const bufferOrPathPromise = getCoreModelFile(pretrained_model_name_or_path, fileName, options, suffix);
    const use_external_data_format = options.use_external_data_format ?? custom_config.use_external_data_format;
    const externalData = await getModelDataFiles(
      pretrained_model_name_or_path,
      fileName,
      suffix,
      options,
      use_external_data_format,
      session_options
    );
    if (externalData.length > 0 && (!apis.IS_NODE_ENV || externalData.some((data) => typeof data !== "string"))) {
      session_options.externalData = externalData;
    }
    if (cache_config && selectedDevice === "webgpu") {
      const names = getCacheNames(options.config, {
        prefix: "present",
        session_name
      });
      if (names.size > 0 && !isONNXProxy()) {
        const preferredOutputLocation = {};
        for (const key of names) {
          preferredOutputLocation[key] = "gpu-buffer";
        }
        session_options.preferredOutputLocation = preferredOutputLocation;
      }
    }
    const buffer_or_path = await bufferOrPathPromise;
    const session_config = {
      dtype: selectedDtype,
      device: selectedDevice
    };
    return { buffer_or_path, session_options, session_config };
  }
  async function constructSessions(pretrained_model_name_or_path, names, options, cache_sessions = void 0) {
    return Object.fromEntries(
      await Promise.all(
        Object.keys(names).map(async (name) => {
          const cache_config = cache_sessions?.[name] ?? false;
          const { buffer_or_path, session_options, session_config } = await getSession(
            pretrained_model_name_or_path,
            names[name],
            options,
            cache_config,
            name
          );
          const session = await createInferenceSession(buffer_or_path, session_options, session_config);
          return [name, session];
        })
      )
    );
  }
  function replaceTensors(obj) {
    for (let prop in obj) {
      if (isONNXTensor(obj[prop])) {
        obj[prop] = new Tensor3(obj[prop]);
      } else if (typeof obj[prop] === "object") {
        replaceTensors(obj[prop]);
      }
    }
    return obj;
  }
  async function sessionRun(session, inputs) {
    const checkedInputs = validateInputs(session, inputs);
    try {
      const ortFeed = Object.fromEntries(
        Object.entries(checkedInputs).map(([k, v]) => {
          const tensor = (
            /** @type {any} */
            v.ort_tensor
          );
          if (apis.IS_NODE_ENV) {
            if (typeof Float16Array !== "undefined" && tensor.cpuData instanceof Float16Array) {
              tensor.cpuData = new Uint16Array(tensor.cpuData.buffer);
            }
          }
          return [k, tensor];
        })
      );
      const output = await runInferenceSession(session, ortFeed);
      return replaceTensors(output);
    } catch (e) {
      const formatted = Object.fromEntries(
        Object.entries(checkedInputs).map(([k, tensor]) => {
          const unpacked = {
            type: tensor.type,
            dims: tensor.dims,
            location: tensor.location
          };
          if (unpacked.location !== "gpu-buffer") {
            unpacked.data = tensor.data;
          }
          return [k, unpacked];
        })
      );
      logger.error(`An error occurred during model execution: "${e}".`);
      logger.error("Inputs given to model:", formatted);
      throw e;
    }
  }
  function validateInputs(session, inputs) {
    const checkedInputs = /* @__PURE__ */ Object.create(null);
    const missingInputs = [];
    for (const inputName of session.inputNames) {
      const tensor = inputs[inputName];
      if (!(tensor instanceof Tensor3)) {
        missingInputs.push(inputName);
        continue;
      }
      checkedInputs[inputName] = isONNXProxy() ? tensor.clone() : tensor;
    }
    if (missingInputs.length > 0) {
      throw new Error(
        `An error occurred during model execution: "Missing the following inputs: ${missingInputs.join(", ")}.`
      );
    }
    const numInputsProvided = Object.keys(inputs).length;
    const numInputsNeeded = session.inputNames.length;
    if (numInputsProvided > numInputsNeeded) {
      let ignored = Object.keys(inputs).filter((inputName) => !session.inputNames.includes(inputName));
      logger.warn(
        `WARNING: Too many inputs were provided (${numInputsProvided} > ${numInputsNeeded}). The following inputs will be ignored: "${ignored.join(", ")}".`
      );
    }
    return checkedInputs;
  }

  // node_modules/@huggingface/transformers/src/utils/constants.js
  var GITHUB_ISSUE_URL = "https://github.com/huggingface/transformers.js/issues/new/choose";

  // node_modules/@huggingface/transformers/src/generation/logits_process.js
  var LogitsProcessor = class extends Callable {
    /**
     * Apply the processor to the input logits.
     *
     * @abstract
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits to process.
     * @throws {Error} Throws an error if `_call` is not implemented in the subclass.
     */
    _call(input_ids, logits) {
      throw Error("`_call` should be implemented in a subclass");
    }
  };
  var LogitsWarper = class extends Callable {
    /**
     * Apply the processor to the input logits.
     *
     * @abstract
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits to process.
     * @throws {Error} Throws an error if `_call` is not implemented in the subclass.
     */
    _call(input_ids, logits) {
      throw Error("`_call` should be implemented in a subclass");
    }
  };
  var LogitsProcessorList = class extends Callable {
    /**
     * Constructs a new instance of `LogitsProcessorList`.
     */
    constructor() {
      super();
      this.processors = [];
    }
    /**
     * Adds a new logits processor to the list.
     *
     * @param {LogitsProcessor} item The logits processor function to add.
     */
    push(item) {
      this.processors.push(item);
    }
    /**
     * Adds multiple logits processors to the list.
     *
     * @param {LogitsProcessor[]} items The logits processor functions to add.
     */
    extend(items) {
      this.processors.push(...items);
    }
    /**
     * Applies all logits processors in the list to a batch of logits, modifying them in-place.
     *
     * @param {bigint[][]} input_ids The input IDs for the language model.
     * @param {Tensor} logits
     */
    _call(input_ids, logits) {
      let toReturn = logits;
      for (const processor of this.processors) {
        toReturn = processor(input_ids, toReturn);
      }
      return toReturn;
    }
    [Symbol.iterator]() {
      return this.processors.values();
    }
  };
  var ForcedBOSTokenLogitsProcessor = class extends LogitsProcessor {
    /**
     * Create a ForcedBOSTokenLogitsProcessor.
     * @param {number} bos_token_id The ID of the beginning-of-sequence token to be forced.
     */
    constructor(bos_token_id) {
      super();
      this.bos_token_id = bos_token_id;
    }
    /**
     * Apply the BOS token forcing to the logits.
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits.
     * @returns {Tensor} The logits with BOS token forcing.
     */
    _call(input_ids, logits) {
      for (let i = 0; i < input_ids.length; ++i) {
        if (input_ids[i].length === 1) {
          const batch_logits_data = (
            /** @type {Float32Array} */
            logits[i].data
          );
          batch_logits_data.fill(-Infinity);
          batch_logits_data[this.bos_token_id] = 0;
        }
      }
      return logits;
    }
  };
  var ForcedEOSTokenLogitsProcessor = class extends LogitsProcessor {
    /**
     * Create a ForcedEOSTokenLogitsProcessor.
     * @param {number} max_length The maximum length of the sequence to be generated.
     * @param {number|number[]} eos_token_id The ID or IDs of the *end-of-sequence* token.
     */
    constructor(max_length, eos_token_id) {
      super();
      this.max_length = max_length;
      this.eos_token_id = Array.isArray(eos_token_id) ? eos_token_id : [eos_token_id];
    }
    /**
     * Apply the processor to input_ids and logits.
     *
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits tensor.
     */
    _call(input_ids, logits) {
      for (let i = 0; i < input_ids.length; ++i) {
        if (input_ids[i].length === this.max_length - 1) {
          const batch_logits_data = (
            /** @type {Float32Array} */
            logits[i].data
          );
          batch_logits_data.fill(-Infinity);
          for (const eos_token of this.eos_token_id) {
            batch_logits_data[eos_token] = 0;
          }
        }
      }
      return logits;
    }
  };
  var SuppressTokensLogitsProcessor = class extends LogitsProcessor {
    /**
     * Create a SuppressTokensLogitsProcessor.
     * @param {number[]} suppress_tokens The IDs of the tokens to suppress.
     */
    constructor(suppress_tokens) {
      super();
      this.suppress_tokens = suppress_tokens;
    }
    /**
     * Suppress the specified tokens by setting their logits to -Infinity.
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits.
     * @returns {Tensor} The modified logits.
     */
    _call(input_ids, logits) {
      for (let i = 0; i < input_ids.length; ++i) {
        const batch_logits_data = (
          /** @type {Float32Array} */
          logits[i].data
        );
        for (const token_id of this.suppress_tokens) {
          batch_logits_data[token_id] = -Infinity;
        }
      }
      return logits;
    }
  };
  var SuppressTokensAtBeginLogitsProcessor = class extends LogitsProcessor {
    /**
     * Create a SuppressTokensAtBeginLogitsProcessor.
     * @param {number[]} begin_suppress_tokens The IDs of the tokens to suppress.
     * @param {number} begin_index The number of tokens to generate before suppressing tokens.
     */
    constructor(begin_suppress_tokens, begin_index) {
      super();
      this.begin_suppress_tokens = begin_suppress_tokens;
      this.begin_index = begin_index;
    }
    /**
     * Apply the BOS token forcing to the logits.
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits.
     * @returns {Tensor} The logits with BOS token forcing.
     */
    _call(input_ids, logits) {
      for (let i = 0; i < input_ids.length; ++i) {
        if (input_ids[i].length === this.begin_index) {
          const batch_logits_data = (
            /** @type {Float32Array} */
            logits[i].data
          );
          for (const token_id of this.begin_suppress_tokens) {
            batch_logits_data[token_id] = -Infinity;
          }
        }
      }
      return logits;
    }
  };
  var NoRepeatNGramLogitsProcessor = class extends LogitsProcessor {
    /**
     * Create a NoRepeatNGramLogitsProcessor.
     * @param {number} no_repeat_ngram_size The no-repeat n-gram size. All n-grams of this size can only occur once.
     */
    constructor(no_repeat_ngram_size) {
      super();
      this.no_repeat_ngram_size = no_repeat_ngram_size;
    }
    /**
     * Generate n-grams from a sequence of token IDs.
     * @param {bigint[]} prevInputIds List of previous input IDs.
     * @returns {Map<string, number[]>} Map of generated n-grams
     */
    getNgrams(prevInputIds) {
      const curLen = prevInputIds.length;
      const ngrams = [];
      for (let j2 = 0; j2 < curLen + 1 - this.no_repeat_ngram_size; ++j2) {
        const ngram = [];
        for (let k = 0; k < this.no_repeat_ngram_size; ++k) {
          ngram.push(prevInputIds[j2 + k]);
        }
        ngrams.push(ngram.map(Number));
      }
      const generatedNgram = /* @__PURE__ */ new Map();
      for (const ngram of ngrams) {
        const prevNgram = ngram.slice(0, ngram.length - 1);
        const prevNgramKey = JSON.stringify(prevNgram);
        const prevNgramValue = generatedNgram.get(prevNgramKey) ?? [];
        prevNgramValue.push(ngram[ngram.length - 1]);
        generatedNgram.set(prevNgramKey, prevNgramValue);
      }
      return generatedNgram;
    }
    /**
     * Generate n-grams from a sequence of token IDs.
     * @param {Map<string, number[]>} bannedNgrams Map of banned n-grams
     * @param {bigint[]} prevInputIds List of previous input IDs.
     * @returns {number[]} Map of generated n-grams
     */
    getGeneratedNgrams(bannedNgrams, prevInputIds) {
      const ngramIdx = prevInputIds.slice(prevInputIds.length + 1 - this.no_repeat_ngram_size, prevInputIds.length);
      const banned = bannedNgrams.get(JSON.stringify(ngramIdx.map(Number))) ?? [];
      return banned;
    }
    /**
     * Calculate banned n-gram tokens
     * @param {bigint[]} prevInputIds List of previous input IDs.
     * @returns {number[]} Map of generated n-grams
     */
    calcBannedNgramTokens(prevInputIds) {
      const bannedTokens = [];
      if (prevInputIds.length + 1 < this.no_repeat_ngram_size) {
        return bannedTokens;
      } else {
        const generatedNgrams = this.getNgrams(prevInputIds);
        const bannedTokens2 = this.getGeneratedNgrams(generatedNgrams, prevInputIds);
        return bannedTokens2;
      }
    }
    /**
     * Apply the no-repeat n-gram processor to the logits.
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits.
     * @returns {Tensor} The logits with no-repeat n-gram processing.
     */
    _call(input_ids, logits) {
      for (let i = 0; i < input_ids.length; ++i) {
        const batch_logits_data = (
          /** @type {Float32Array} */
          logits[i].data
        );
        const bannedTokens = this.calcBannedNgramTokens(input_ids[i]);
        for (const token of bannedTokens) {
          batch_logits_data[token] = -Infinity;
        }
      }
      return logits;
    }
  };
  var RepetitionPenaltyLogitsProcessor = class extends LogitsProcessor {
    /**
     * Create a RepetitionPenaltyLogitsProcessor.
     * @param {number} penalty Penalty applied to repeated tokens.
     * - 1.0 means no penalty. Above 1.0 penalizes previously generated tokens.
     * - Between 0.0 and 1.0 rewards previously generated tokens.
     */
    constructor(penalty) {
      super();
      this.penalty = penalty;
    }
    /**
     * Apply the repetition penalty to the logits.
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits.
     * @returns {Tensor} The logits with repetition penalty processing.
     */
    _call(input_ids, logits) {
      for (let i = 0; i < input_ids.length; ++i) {
        const batch_logits_data = (
          /** @type {Float32Array} */
          logits[i].data
        );
        for (const input_id of new Set(input_ids[i])) {
          const token = Number(input_id);
          if (batch_logits_data[token] < 0) {
            batch_logits_data[token] *= this.penalty;
          } else {
            batch_logits_data[token] /= this.penalty;
          }
        }
      }
      return logits;
    }
  };
  var MinLengthLogitsProcessor = class extends LogitsProcessor {
    /**
     * Create a MinLengthLogitsProcessor.
     * @param {number} min_length The minimum length below which the score of `eos_token_id` is set to negative infinity.
     * @param {number|number[]} eos_token_id The ID or IDs of the end-of-sequence token.
     */
    constructor(min_length, eos_token_id) {
      super();
      this.min_length = min_length;
      this.eos_token_id = Array.isArray(eos_token_id) ? eos_token_id : [eos_token_id];
    }
    /**
     * Apply logit processor.
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits.
     * @returns {Tensor} The processed logits.
     */
    _call(input_ids, logits) {
      for (let i = 0; i < input_ids.length; ++i) {
        if (input_ids[i].length < this.min_length) {
          const batch_logits_data = (
            /** @type {Float32Array} */
            logits[i].data
          );
          for (const eos_token of this.eos_token_id) {
            batch_logits_data[eos_token] = -Infinity;
          }
        }
      }
      return logits;
    }
  };
  var MinNewTokensLengthLogitsProcessor = class extends LogitsProcessor {
    /**
     * Create a MinNewTokensLengthLogitsProcessor.
     * @param {number} prompt_length_to_skip The input tokens length.
     * @param {number} min_new_tokens The minimum *new* tokens length below which the score of `eos_token_id` is set to negative infinity.
     * @param {number|number[]} eos_token_id The ID or IDs of the end-of-sequence token.
     */
    constructor(prompt_length_to_skip, min_new_tokens, eos_token_id) {
      super();
      this.prompt_length_to_skip = prompt_length_to_skip;
      this.min_new_tokens = min_new_tokens;
      this.eos_token_id = Array.isArray(eos_token_id) ? eos_token_id : [eos_token_id];
    }
    /**
     * Apply logit processor.
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits.
     * @returns {Tensor} The processed logits.
     */
    _call(input_ids, logits) {
      for (let i = 0; i < input_ids.length; ++i) {
        const new_tokens_length = input_ids[i].length - this.prompt_length_to_skip;
        if (new_tokens_length < this.min_new_tokens) {
          const batch_logits_data = (
            /** @type {Float32Array} */
            logits[i].data
          );
          for (const eos_token of this.eos_token_id) {
            batch_logits_data[eos_token] = -Infinity;
          }
        }
      }
      return logits;
    }
  };
  var NoBadWordsLogitsProcessor = class extends LogitsProcessor {
    /**
     * Create a `NoBadWordsLogitsProcessor`.
     * @param {number[][]} bad_words_ids List of token ID sequences that are not allowed to be generated.
     * @param {number|number[]} eos_token_id The ID of the *end-of-sequence* token. Optionally, use a list to set multiple *end-of-sequence* tokens.
     */
    constructor(bad_words_ids, eos_token_id) {
      super();
      this.bad_words_ids = bad_words_ids;
      this.eos_token_id = Array.isArray(eos_token_id) ? eos_token_id : [eos_token_id];
    }
    /**
     * Apply logit processor.
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits.
     * @returns {Tensor} The processed logits.
     */
    _call(input_ids, logits) {
      for (let i = 0; i < input_ids.length; ++i) {
        const batch_logits_data = (
          /** @type {Float32Array} */
          logits[i].data
        );
        const ids = input_ids[i];
        for (const bad_word_ids of this.bad_words_ids) {
          if (ids.length < bad_word_ids.length - 1) continue;
          let mark = true;
          for (let j2 = 1; j2 <= bad_word_ids.length - 1; ++j2) {
            if (bad_word_ids.at(-j2 - 1) != ids.at(-j2)) {
              mark = false;
              break;
            }
          }
          if (mark) {
            batch_logits_data[bad_word_ids.at(-1)] = -Infinity;
          }
        }
      }
      return logits;
    }
  };
  var ClassifierFreeGuidanceLogitsProcessor = class extends LogitsProcessor {
    /**
     * Create a `ClassifierFreeGuidanceLogitsProcessor`.
     * @param {number} guidance_scale The guidance scale for classifier-free guidance (CFG). CFG is enabled by setting `guidance_scale > 1`.
     * Higher guidance scale encourages the model to generate samples that are more closely tied to the input
     * prompt, usually at the expense of poorer quality.
     */
    constructor(guidance_scale) {
      super();
      if (guidance_scale <= 1) {
        throw new Error(
          `Require guidance scale >1 to use the classifier-free guidance processor, got guidance scale ${guidance_scale}.`
        );
      }
      this.guidance_scale = guidance_scale;
    }
    /**
     * Apply logit processor.
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits.
     * @returns {Tensor} The processed logits.
     */
    _call(input_ids, logits) {
      if (logits.dims[0] !== 2 * input_ids.length) {
        throw new Error(
          `Logits should have twice the batch size of the input ids, the first half of batches corresponding to the conditional inputs, and the second half of batches corresponding to the unconditional inputs. Got batch size ${logits.dims[0]} for the logits and ${input_ids.length} for the input ids.`
        );
      }
      const unguided_bsz = input_ids.length;
      const cond_logits = logits.slice([0, unguided_bsz], null);
      const uncond_logits = logits.slice([unguided_bsz, logits.dims[0]], null);
      for (let i = 0; i < uncond_logits.data.length; ++i) {
        uncond_logits.data[i] += (cond_logits.data[i] - uncond_logits.data[i]) * this.guidance_scale;
      }
      return uncond_logits;
    }
  };
  var TemperatureLogitsWarper = class extends LogitsWarper {
    /**
     * Create a `TemperatureLogitsWarper`.
     * @param {number} temperature Strictly positive float value used to modulate the logits distribution.
     * A value smaller than `1` decreases randomness (and vice versa), with `0` being equivalent to shifting
     * all probability mass to the most likely token.
     */
    constructor(temperature) {
      super();
      if (typeof temperature !== "number" || temperature <= 0) {
        let errorMessage = `\`temperature\` (=${temperature}) must be a strictly positive float, otherwise your next token scores will be invalid.`;
        if (temperature === 0) {
          errorMessage += " If you're looking for greedy decoding strategies, set `do_sample=false`.";
        }
      }
      this.temperature = temperature;
    }
    /**
     * Apply logit warper.
     * @param {bigint[][]} input_ids The input IDs.
     * @param {Tensor} logits The logits.
     * @returns {Tensor} The processed logits.
     */
    _call(input_ids, logits) {
      const batch_logits_data = (
        /** @type {Float32Array} */
        logits.data
      );
      for (let i = 0; i < batch_logits_data.length; ++i) {
        batch_logits_data[i] /= this.temperature;
      }
      return logits;
    }
  };

  // node_modules/@huggingface/transformers/src/generation/configuration_utils.js
  var GenerationConfig = class {
    // Parameters that control the length of the output
    /**
     * The maximum length the generated tokens can have.
     * Corresponds to the length of the input prompt + `max_new_tokens`.
     * Its effect is overridden by `max_new_tokens`, if also set.
     * @type {number}
     * @default 20
     */
    max_length = 20;
    /**
     * The maximum number of tokens to generate, ignoring the number of tokens in the prompt.
     * @type {number}
     * @default null
     */
    max_new_tokens = null;
    /**
     * The minimum length of the sequence to be generated.
     * Corresponds to the length of the input prompt + `min_new_tokens`.
     * Its effect is overridden by `min_new_tokens`, if also set.
     * @type {number}
     * @default 0
     */
    min_length = 0;
    /**
     * The minimum number of tokens to generate, ignoring the number of tokens in the prompt.
     * @type {number}
     * @default null
     */
    min_new_tokens = null;
    /**
     * Controls the stopping condition for beam-based methods, like beam-search. It accepts the following values:
     * - `true`, where the generation stops as soon as there are `num_beams` complete candidates;
     * - `false`, where a heuristic is applied and the generation stops when it is very unlikely to find better candidates;
     * - `"never"`, where the beam search procedure only stops when there cannot be better candidates (canonical beam search algorithm).
     * @type {boolean|"never"}
     * @default false
     */
    early_stopping = false;
    /**
     * The maximum time, in seconds, allowed for generation.
     * Generation will still finish the current pass after the allocated time has passed.
     * @type {number}
     * @default null
     */
    max_time = null;
    // Parameters that control the generation strategy used
    /**
     * Whether to use sampling; use greedy decoding otherwise.
     * @type {boolean}
     * @default false
     */
    do_sample = false;
    /**
     * Number of beams for beam search. 1 means no beam search.
     * @type {number}
     * @default 1
     */
    num_beams = 1;
    /**
     * Number of groups to divide `num_beams` into to encourage diversity among different groups of beams.
     * See [this paper](https://huggingface.co/papers/1610.02424) for more details.
     * @type {number}
     * @default 1
     */
    num_beam_groups = 1;
    /**
     * Balance model confidence against the degeneration penalty during contrastive search decoding.
     * @type {number}
     * @default null
     */
    penalty_alpha = null;
    /**
     * Whether the model should reuse past key/value states, when supported, to speed up decoding.
     * @type {boolean}
     * @default true
     */
    use_cache = true;
    // Parameters for manipulation of the model output logits
    /**
     * The value used to modulate the next token probabilities.
     * @type {number}
     * @default 1.0
     */
    temperature = 1;
    /**
     * The number of highest-probability vocabulary tokens to keep for top-k filtering.
     * @type {number}
     * @default 50
     */
    top_k = 50;
    /**
     * If set to a float below 1, only the smallest set of most probable tokens with probabilities that add up to `top_p` or higher are kept for generation.
     * @type {number}
     * @default 1.0
     */
    top_p = 1;
    /**
     * Local typicality measures how similar the conditional probability of predicting a target token next is to the expected conditional probability of predicting a random token next, given the partial text already generated.
     * If set to a float below 1, the smallest set of the most locally typical tokens with probabilities that add up to `typical_p` or higher are kept for generation.
     * See [this paper](https://huggingface.co/papers/2202.00666) for more details.
     * @type {number}
     * @default 1.0
     */
    typical_p = 1;
    /**
     * If set to a float strictly between 0 and 1, only tokens with a conditional probability greater than `epsilon_cutoff` will be sampled.
     * In the paper, suggested values range from 3e-4 to 9e-4, depending on the size of the model.
     * See [Truncation Sampling as Language Model Desmoothing](https://huggingface.co/papers/2210.15191) for more details.
     * @type {number}
     * @default 0.0
     */
    epsilon_cutoff = 0;
    /**
     * Eta sampling is a hybrid of locally typical sampling and epsilon sampling.
     * If set to a float strictly between 0 and 1, a token is only considered if it is greater than either `eta_cutoff` or `sqrt(eta_cutoff) * exp(-entropy(softmax(next_token_logits)))`.
     * The latter term is intuitively the expected next token probability, scaled by `sqrt(eta_cutoff)`. In the paper, suggested values range from 3e-4 to 2e-3, depending on the size of the model.
     * See [Truncation Sampling as Language Model Desmoothing](https://huggingface.co/papers/2210.15191) for more details.
     * @type {number}
     * @default 0.0
     */
    eta_cutoff = 0;
    /**
     * This value is subtracted from a beam's score if it generates the same token as any beam from another group at a particular time.
     * Note that `diversity_penalty` is only effective if `group beam search` is enabled.
     * @type {number}
     * @default 0.0
     */
    diversity_penalty = 0;
    /**
     * Penalty applied to repeated tokens. 1.0 means no penalty.
     * See [this paper](https://huggingface.co/papers/1909.05858) for more details.
     * @type {number}
     * @default 1.0
     */
    repetition_penalty = 1;
    /**
     * Penalty applied to sequences that are not in the original input.
     * 1.0 means no penalty.
     * @type {number}
     * @default 1.0
     */
    encoder_repetition_penalty = 1;
    /**
     * Exponential penalty applied to sequence length during beam-based generation.
     * It is applied as an exponent to the sequence length, which in turn is used to divide the score of the sequence.
     * Since the score is the log likelihood of the sequence (i.e. negative), `length_penalty` > 0.0 promotes longer sequences, while `length_penalty` < 0.0 encourages shorter sequences.
     * @type {number}
     * @default 1.0
     */
    length_penalty = 1;
    /**
     * If set to an integer greater than 0, all n-grams of that size can only occur once.
     * @type {number}
     * @default 0
     */
    no_repeat_ngram_size = 0;
    /**
     * List of token IDs that are not allowed to be generated.
     * In order to get the token IDs of the words that should not appear in the generated text, use
     * `tokenizer(bad_words, { add_prefix_space: true, add_special_tokens: false }).input_ids`.
     * @type {number[][]}
     * @default null
     */
    bad_words_ids = null;
    /**
     * List of token IDs that must be generated.
     * If given a `number[][]`, this is treated as a simple list of words that must be included, the opposite of `bad_words_ids`.
     * If given `number[][][]`, this triggers a [disjunctive constraint](https://github.com/huggingface/transformers/issues/14081), which allows different forms of each word.
     * @type {number[][]|number[][][]}
     * @default null
     */
    force_words_ids = null;
    /**
     * Whether to renormalize the logits after applying all the logits processors or warpers (including the custom ones).
     * It's highly recommended to set this flag to `true` because search algorithms assume the score logits are normalized, but some logit processors or warpers break the normalization.
     * @type {boolean}
     * @default false
     */
    renormalize_logits = false;
    /**
     * Custom constraints that guide generation to include certain tokens as defined by `Constraint` objects.
     * @type {Object[]}
     * @default null
     */
    constraints = null;
    /**
     * The ID of the token to force as the first generated token after the `decoder_start_token_id`.
     * Useful for multilingual models like mBART where the first generated token needs to be the target language token.
     * @type {number}
     * @default null
     */
    forced_bos_token_id = null;
    /**
     * The ID of the token to force as the last generated token when `max_length` is reached.
     * Optionally, use a list to set multiple *end-of-sequence* tokens.
     * @type {number|number[]}
     * @default null
     */
    forced_eos_token_id = null;
    /**
     * Whether to remove possible *nan* and *inf* outputs of the model to prevent the generation method from crashing. Note that using `remove_invalid_values` can slow down generation.
     * @type {boolean}
     */
    remove_invalid_values = false;
    /**
     * This tuple adds an exponentially increasing length penalty after a certain number of tokens have been generated.
     * The tuple consists of: `(start_index, decay_factor)` where `start_index` indicates where the penalty starts and `decay_factor` represents the factor of exponential decay.
     * @type {[number, number]}
     * @default null
     */
    exponential_decay_length_penalty = null;
    /**
     * A list of tokens to suppress during generation.
     * The `SuppressTokens` logit processor sets their log probabilities to `-inf` so that they are not sampled.
     * @type {number[]}
     * @default null
     */
    suppress_tokens = null;
    /**
     * Streamer used to yield generated text incrementally.
     * @type {import('./streamers.js').TextStreamer}
     * @default null
     */
    streamer = null;
    /**
     * A list of tokens to suppress at the beginning of the generation.
     * The `SuppressBeginTokens` logit processor sets their log probabilities to `-inf` so that they are not sampled.
     * @type {number[]}
     * @default null
     */
    begin_suppress_tokens = null;
    /**
     * A list of integer pairs that maps generation indices to token indices that will be forced before sampling.
     * For example, `[[1, 123]]` means the second generated token will always be a token of index 123.
     * @type {[number, number][]}
     * @default null
     */
    forced_decoder_ids = null;
    /**
     * The guidance scale for classifier-free guidance (CFG). CFG is enabled by setting `guidance_scale > 1`.
     * Higher guidance scale encourages the model to generate samples that are more closely tied to the input
     * prompt, usually at the expense of poorer quality.
     * @type {number}
     * @default null
     */
    guidance_scale = null;
    // Parameters that define the output variables of `generate`
    /**
     * The number of independently computed returned sequences for each element in the batch.
     * @type {number}
     * @default 1
     */
    num_return_sequences = 1;
    /**
     * Whether to return attention tensors from all attention layers.
     * See `attentions` under returned tensors for more details.
     * @type {boolean}
     * @default false
     */
    output_attentions = false;
    /**
     * Whether to return the hidden states of all layers.
     * See `hidden_states` under returned tensors for more details.
     * @type {boolean}
     * @default false
     */
    output_hidden_states = false;
    /**
     * Whether to return the prediction scores.
     * See `scores` under returned tensors for more details.
     * @type {boolean}
     * @default false
     */
    output_scores = false;
    /**
     * Whether to return a `ModelOutput` instead of a plain tuple.
     * @type {boolean}
     * @default false
     */
    return_dict_in_generate = false;
    // Special tokens that can be used at generation time
    /**
     * The ID of the *padding* token.
     * @type {number}
     * @default null
     */
    pad_token_id = null;
    /**
     * The ID of the *beginning-of-sequence* token.
     * @type {number}
     * @default null
     */
    bos_token_id = null;
    /**
     * The ID of the *end-of-sequence* token.
     * Optionally, use a list to set multiple *end-of-sequence* tokens.
     * @type {number|number[]}
     * @default null
     */
    eos_token_id = null;
    // Generation parameters exclusive to encoder-decoder models
    /**
     * If set to an integer greater than 0, all n-grams of that size that occur in the `encoder_input_ids` cannot occur in the `decoder_input_ids`.
     * @type {number}
     * @default 0
     */
    encoder_no_repeat_ngram_size = 0;
    /**
     * If an encoder-decoder model starts decoding with a token other than *bos*, the ID of that token.
     * @type {number}
     * @default null
     */
    decoder_start_token_id = null;
    // Wild card
    /**
     * Additional generation kwargs forwarded to the model's `generate` function.
     * Kwargs that are not present in `generate`'s signature are used in the model forward pass.
     * @type {Object}
     * @default {}
     */
    generation_kwargs = {};
    /**
     *
     * @param {GenerationConfig|import('../configs.js').PretrainedConfig} config
     */
    constructor(config) {
      Object.assign(this, pick(config, Object.getOwnPropertyNames(this)));
    }
  };

  // node_modules/@huggingface/transformers/src/generation/stopping_criteria.js
  var StoppingCriteria = class extends Callable {
    /**
     *
     * @param {number[][]} input_ids (`number[][]` of shape `(batch_size, sequence_length)`):
     * Indices of input sequence tokens in the vocabulary.
     * @param {number[][]} scores (`number[][]` of shape `(batch_size, config.vocab_size)`):
     * Prediction scores of a language modeling head. These can be scores for each vocabulary token before SoftMax
     * or scores for each vocabulary token after SoftMax.
     * @returns {boolean[]} A list of booleans indicating whether each sequence should be stopped.
     */
    _call(input_ids, scores) {
      throw Error("StoppingCriteria needs to be subclassed");
    }
  };
  var StoppingCriteriaList = class _StoppingCriteriaList extends Callable {
    /**
     * Constructs a new instance of `StoppingCriteriaList`.
     */
    constructor() {
      super();
      this.criteria = [];
    }
    /**
     * Adds a new stopping criterion to the list.
     *
     * @param {StoppingCriteria} item The stopping criterion to add.
     */
    push(item) {
      this.criteria.push(item);
    }
    /**
     * Adds multiple stopping criteria to the list.
     *
     * @param {StoppingCriteria|StoppingCriteriaList|StoppingCriteria[]} items The stopping criteria to add.
     */
    extend(items) {
      if (items instanceof _StoppingCriteriaList) {
        items = items.criteria;
      } else if (items instanceof StoppingCriteria) {
        items = [items];
      }
      this.criteria.push(...items);
    }
    _call(input_ids, scores) {
      const is_done = new Array(input_ids.length).fill(false);
      for (const criterion of this.criteria) {
        const criterion_done = criterion(input_ids, scores);
        for (let i = 0; i < is_done.length; ++i) {
          is_done[i] ||= criterion_done[i];
        }
      }
      return is_done;
    }
    [Symbol.iterator]() {
      return this.criteria.values();
    }
  };
  var MaxLengthCriteria = class extends StoppingCriteria {
    /**
     *
     * @param {number} max_length The maximum length that the output sequence can have in number of tokens.
     * @param {number} [max_position_embeddings=null] The maximum model length, as defined by the model's `config.max_position_embeddings` attribute.
     */
    constructor(max_length, max_position_embeddings = null) {
      super();
      this.max_length = max_length;
      this.max_position_embeddings = max_position_embeddings;
    }
    _call(input_ids) {
      return input_ids.map((ids) => ids.length >= this.max_length);
    }
  };
  var EosTokenCriteria = class extends StoppingCriteria {
    /**
     *
     * @param {number|number[]} eos_token_id The ID of the *end-of-sequence* token.
     * Optionally, use a list to set multiple *end-of-sequence* tokens.
     */
    constructor(eos_token_id) {
      super();
      if (!Array.isArray(eos_token_id)) {
        eos_token_id = [eos_token_id];
      }
      this.eos_token_id = eos_token_id;
    }
    /**
     *
     * @param {number[][]} input_ids
     * @param {number[][]} scores
     * @returns {boolean[]}
     */
    _call(input_ids, scores) {
      return input_ids.map((ids) => {
        const last = ids.at(-1);
        return this.eos_token_id.some((eos_id) => last == eos_id);
      });
    }
  };

  // node_modules/@huggingface/transformers/src/generation/logits_sampler.js
  var LogitsSampler = class extends Callable {
    /**
     * Creates a new Sampler object with the specified generation config.
     * @param {GenerationConfig} generation_config The generation config.
     */
    constructor(generation_config) {
      super();
      this.generation_config = generation_config;
    }
    /**
     * Executes the sampler, using the specified logits.
     * @param {Tensor} logits
     * @returns {Promise<[bigint, number][]>}
     */
    async _call(logits) {
      return this.sample(logits);
    }
    /**
     * Abstract method for sampling the logits.
     * @param {Tensor} logits
     * @throws {Error} If not implemented in subclass.
     * @returns {Promise<[bigint, number][]>}
     */
    async sample(logits) {
      throw Error("sample should be implemented in subclasses.");
    }
    /**
     * Returns the specified logits as an array, with temperature applied.
     * @param {Tensor} logits
     * @param {number} index
     * @returns {Float32Array}
     */
    getLogits(logits, index) {
      let vocabSize = logits.dims.at(-1);
      let logs = (
        /** @type {Float32Array} */
        logits.data
      );
      if (index === -1) {
        logs = logs.slice(-vocabSize);
      } else {
        let startIndex = index * vocabSize;
        logs = logs.slice(startIndex, startIndex + vocabSize);
      }
      return logs;
    }
    /**
     * Selects an item randomly based on the specified probabilities.
     * @param {Float32Array} probabilities An array of probabilities to use for selection.
     * @returns {number} The index of the selected item.
     */
    randomSelect(probabilities) {
      return _weightedIndex(probabilities);
    }
    /**
     * Returns a Sampler object based on the specified options.
     * @param {GenerationConfig} generation_config An object containing options for the sampler.
     * @returns {LogitsSampler} A Sampler object.
     */
    static getSampler(generation_config) {
      if (generation_config.do_sample) {
        return new MultinomialSampler(generation_config);
      } else if (generation_config.num_beams > 1) {
        return new BeamSearchSampler(generation_config);
      } else {
        if (generation_config.num_return_sequences > 1) {
          throw Error(
            `num_return_sequences has to be 1 when doing greedy search, but is ${generation_config.num_return_sequences}.`
          );
        }
        return new GreedySampler(generation_config);
      }
    }
  };
  var GreedySampler = class extends LogitsSampler {
    /**
     * Sample the maximum probability of a given logits tensor.
     * @param {Tensor} logits
     * @returns {Promise<[bigint, number][]>} An array with a single tuple, containing the index of the maximum value and a meaningless score (since this is a greedy search).
     */
    async sample(logits) {
      const argmax = max(logits.data)[1];
      return [[BigInt(argmax), 0]];
    }
  };
  var MultinomialSampler = class extends LogitsSampler {
    /**
     * Sample from the logits.
     * @param {Tensor} logits
     * @returns {Promise<[bigint, number][]>}
     */
    async sample(logits) {
      let k = logits.dims.at(-1);
      if (this.generation_config.top_k > 0) {
        k = Math.min(this.generation_config.top_k, k);
      }
      const [v, i] = await topk(logits, k);
      const probabilities = softmax(
        /** @type {Float32Array} */
        v.data
      );
      return Array.from({ length: this.generation_config.num_beams }, () => {
        const sampledIndex = this.randomSelect(probabilities);
        return [
          i.data[sampledIndex],
          // token id
          Math.log(probabilities[sampledIndex])
          // score
        ];
      });
    }
  };
  var BeamSearchSampler = class extends LogitsSampler {
    /**
     * Sample from the logits.
     * @param {Tensor} logits
     * @returns {Promise<[bigint, number][]>}
     */
    async sample(logits) {
      let k = logits.dims.at(-1);
      if (this.generation_config.top_k > 0) {
        k = Math.min(this.generation_config.top_k, k);
      }
      const [v, i] = await topk(logits, k);
      const probabilities = softmax(
        /** @type {Float32Array} */
        v.data
      );
      return Array.from({ length: this.generation_config.num_beams }, (_, x) => {
        return [
          i.data[x],
          // token id
          Math.log(probabilities[x])
          // score
        ];
      });
    }
  };

  // node_modules/@huggingface/transformers/src/cache_utils.js
  var _DynamicCache = class {
    /**
     * Create a DynamicCache, optionally pre-populated with entries.
     * @param {Record<string, Tensor>} [entries] Initial name→Tensor mappings.
     */
    constructor(entries) {
      if (!entries) return;
      for (const key in entries) {
        if (key in this) {
          throw new TypeError(`Key "${key}" conflicts with an existing property on DynamicCache`);
        }
        const value = entries[key];
        if (!(value instanceof Tensor3)) {
          throw new TypeError(`Expected a Tensor for key "${key}", got ${typeof value}`);
        }
        this[key] = value;
      }
    }
    /**
     * Get the cached sequence length. This requires at least one attention cache entry to be present.
     * @returns {number} The past sequence length.
     */
    get_seq_length() {
      const self2 = (
        /** @type {any} */
        this
      );
      if (Object.keys(self2).length === 0) {
        return 0;
      }
      for (const name in self2) {
        if (name.startsWith("past_key_values.")) {
          return self2[name].dims.at(-2);
        }
      }
      throw new Error("Unable to determine sequence length from the cache.");
    }
    /**
     * Update the cache in-place with new entries, disposing replaced GPU tensors.
     * @param {Record<string, Tensor>} newEntries The new name → Tensor mappings.
     */
    update(newEntries) {
      for (const key in newEntries) {
        const oldValue = this[key];
        const newValue = newEntries[key];
        if (oldValue && oldValue !== newValue && oldValue.location === "gpu-buffer") {
          oldValue.dispose();
        }
        this[key] = newValue;
      }
    }
    /**
     * Dispose all contained tensors whose data resides on the GPU.
     * Returns a promise that resolves when all disposals are complete.
     * @returns {Promise<void>} Promise that resolves when all GPU tensors are disposed.
     */
    async dispose() {
      const promises = [];
      for (
        const t of
        /** @type {Tensor[]} */
        Object.values(this)
      ) {
        if (t.location === "gpu-buffer") {
          promises.push(t.dispose());
        }
      }
      await Promise.all(promises);
    }
  };
  var DynamicCache = (
    /** @type {new (entries?: Record<string, Tensor>) => DynamicCache} */
    /** @type {unknown} */
    _DynamicCache
  );

  // node_modules/@huggingface/transformers/src/models/session_config.js
  var MODEL_TYPES = {
    EncoderOnly: 0,
    EncoderDecoder: 1,
    Seq2Seq: 2,
    Vision2Seq: 3,
    DecoderOnly: 4,
    DecoderOnlyWithoutHead: 5,
    MaskGeneration: 6,
    ImageTextToText: 7,
    Musicgen: 8,
    MultiModality: 9,
    Phi3V: 10,
    AudioTextToText: 11,
    AutoEncoder: 12,
    ImageAudioTextToText: 13,
    Supertonic: 14,
    Chatterbox: 15,
    VoxtralRealtime: 16,
    MultimodalEncoder: 17
  };
  var MODEL_SESSION_CONFIG = {
    [MODEL_TYPES.DecoderOnly]: {
      sessions: (config, options) => ({ model: options.model_file_name ?? "model" }),
      cache_sessions: { model: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.DecoderOnlyWithoutHead]: {
      sessions: (config, options) => ({ model: options.model_file_name ?? "model" })
    },
    [MODEL_TYPES.Seq2Seq]: {
      sessions: () => ({ model: "encoder_model", decoder_model_merged: "decoder_model_merged" }),
      cache_sessions: { decoder_model_merged: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.Vision2Seq]: {
      sessions: () => ({ model: "encoder_model", decoder_model_merged: "decoder_model_merged" }),
      cache_sessions: { decoder_model_merged: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.Musicgen]: {
      sessions: () => ({
        model: "text_encoder",
        decoder_model_merged: "decoder_model_merged",
        encodec_decode: "encodec_decode"
      }),
      cache_sessions: { decoder_model_merged: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.EncoderDecoder]: {
      sessions: () => ({ model: "encoder_model", decoder_model_merged: "decoder_model_merged" }),
      cache_sessions: { decoder_model_merged: true }
    },
    [MODEL_TYPES.MaskGeneration]: {
      sessions: () => ({ model: "vision_encoder", prompt_encoder_mask_decoder: "prompt_encoder_mask_decoder" })
    },
    [MODEL_TYPES.ImageTextToText]: {
      text_only_sessions: { embed_tokens: "embed_tokens", decoder_model_merged: "decoder_model_merged" },
      sessions: (config, options, textOnly) => {
        const s = { ...MODEL_SESSION_CONFIG[MODEL_TYPES.ImageTextToText].text_only_sessions };
        if (!textOnly) s["vision_encoder"] = "vision_encoder";
        if (config.is_encoder_decoder) s["model"] = "encoder_model";
        return s;
      },
      cache_sessions: { decoder_model_merged: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.AudioTextToText]: {
      text_only_sessions: { embed_tokens: "embed_tokens", decoder_model_merged: "decoder_model_merged" },
      sessions: (config, options, textOnly) => {
        const s = { ...MODEL_SESSION_CONFIG[MODEL_TYPES.AudioTextToText].text_only_sessions };
        if (!textOnly) s["audio_encoder"] = "audio_encoder";
        return s;
      },
      cache_sessions: { decoder_model_merged: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.ImageAudioTextToText]: {
      text_only_sessions: { embed_tokens: "embed_tokens", decoder_model_merged: "decoder_model_merged" },
      sessions: (config, options, textOnly) => {
        const s = { ...MODEL_SESSION_CONFIG[MODEL_TYPES.ImageAudioTextToText].text_only_sessions };
        if (!textOnly) {
          s["audio_encoder"] = "audio_encoder";
          s["vision_encoder"] = "vision_encoder";
        }
        return s;
      },
      cache_sessions: { decoder_model_merged: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.Phi3V]: {
      sessions: () => ({
        prepare_inputs_embeds: "prepare_inputs_embeds",
        model: "model",
        vision_encoder: "vision_encoder"
      }),
      cache_sessions: { model: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.MultiModality]: {
      sessions: () => ({
        prepare_inputs_embeds: "prepare_inputs_embeds",
        model: "language_model",
        lm_head: "lm_head",
        gen_head: "gen_head",
        gen_img_embeds: "gen_img_embeds",
        image_decode: "image_decode"
      }),
      cache_sessions: { model: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.AutoEncoder]: {
      sessions: () => ({ encoder_model: "encoder_model", decoder_model: "decoder_model" })
    },
    [MODEL_TYPES.Supertonic]: {
      sessions: () => ({
        text_encoder: "text_encoder",
        latent_denoiser: "latent_denoiser",
        voice_decoder: "voice_decoder"
      })
    },
    [MODEL_TYPES.Chatterbox]: {
      sessions: () => ({
        embed_tokens: "embed_tokens",
        speech_encoder: "speech_encoder",
        model: "language_model",
        conditional_decoder: "conditional_decoder"
      }),
      cache_sessions: { model: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.VoxtralRealtime]: {
      text_only_sessions: { embed_tokens: "embed_tokens", decoder_model_merged: "decoder_model_merged" },
      sessions: (config, options, textOnly) => {
        const s = { ...MODEL_SESSION_CONFIG[MODEL_TYPES.VoxtralRealtime].text_only_sessions };
        if (!textOnly) s["audio_encoder"] = "audio_encoder";
        return s;
      },
      cache_sessions: { decoder_model_merged: true, audio_encoder: true },
      optional_configs: { generation_config: "generation_config.json" }
    },
    [MODEL_TYPES.MultimodalEncoder]: {
      // The vision and audio encoders are only loaded when the config has their `vision_config` / `audio_config`
      sessions: (config, options) => ({
        model: options.model_file_name ?? "model",
        ...config.vision_config && { vision_encoder: "vision_encoder" },
        ...config.audio_config && { audio_encoder: "audio_encoder" }
      })
    },
    default: {
      sessions: (config, options) => ({ model: options.model_file_name ?? "model" })
    }
  };
  function getSessionsConfig(modelType, config, options = {}) {
    const typeConfig = MODEL_SESSION_CONFIG[modelType] ?? MODEL_SESSION_CONFIG.default;
    return {
      sessions: typeConfig.sessions(config, options, options.textOnly ?? false),
      cache_sessions: typeConfig.cache_sessions,
      optional_configs: typeConfig.optional_configs
    };
  }

  // node_modules/@huggingface/transformers/src/utils/model_registry/resolve_model_type.js
  function resolve_model_type(config, { warn = true } = {}) {
    const architectures = (
      /** @type {string[]} */
      config.architectures || []
    );
    for (const arch of architectures) {
      const mappedType = MODEL_TYPE_MAPPING.get(arch);
      if (mappedType !== void 0) {
        return mappedType;
      }
    }
    if (config.model_type) {
      const mappedType = MODEL_TYPE_MAPPING.get(config.model_type);
      if (mappedType !== void 0) {
        return mappedType;
      }
      for (const mapping of Object.values(MODEL_MAPPING_NAMES)) {
        if (mapping.has(config.model_type)) {
          const resolved = MODEL_TYPE_MAPPING.get(mapping.get(config.model_type));
          if (resolved !== void 0) {
            return resolved;
          }
        }
      }
    }
    if (warn) {
      const archList = architectures.length > 0 ? architectures.join(", ") : "(none)";
      logger.warn(
        `[resolve_model_type] Architecture(s) not found in MODEL_TYPE_MAPPING: [${archList}] for model type '${config.model_type}'. Falling back to EncoderOnly (single model.onnx file). If you encounter issues, please report at: ${GITHUB_ISSUE_URL}`
      );
    }
    return MODEL_TYPES.EncoderOnly;
  }

  // node_modules/@huggingface/transformers/src/utils/model_registry/get_model_files.js
  function get_config(modelId, { config = null, cache_dir = null, local_files_only = false, revision = "main" } = {}) {
    if (config !== null) {
      return AutoConfig.from_pretrained(modelId, { config, cache_dir, local_files_only, revision });
    }
    const key = makePretrainedOptionsKey(modelId, { cache_dir, local_files_only, revision });
    return memoizePromise(
      key,
      () => AutoConfig.from_pretrained(modelId, { config, cache_dir, local_files_only, revision })
    );
  }
  async function get_model_files(modelId, { config = null, dtype: overrideDtype = null, device: overrideDevice = null, model_file_name = null } = {}) {
    config = await get_config(modelId, { config });
    const files = [
      // Add config.json (always loaded)
      "config.json"
    ];
    const custom_config = config["transformers.js_config"] ?? {};
    const use_external_data_format = custom_config.use_external_data_format;
    const subfolder = "onnx";
    const rawDevice = overrideDevice ?? custom_config.device;
    let dtype = overrideDtype ?? custom_config.dtype;
    const modelType = resolve_model_type(config);
    const add_model_file = (fileName, baseName = null) => {
      baseName = baseName ?? fileName;
      const selectedDevice = selectDevice(rawDevice, fileName);
      const selectedDtype = selectDtype(dtype, fileName, selectedDevice);
      const suffix = DEFAULT_DTYPE_SUFFIX_MAPPING[selectedDtype] ?? "";
      const fullName = `${baseName}${suffix}.onnx`;
      const fullPath = subfolder ? `${subfolder}/${fullName}` : fullName;
      files.push(fullPath);
      const num_chunks = resolveExternalDataFormat(use_external_data_format, fullName, fileName);
      for (const dataFileName of getExternalDataChunkNames(fullName, num_chunks)) {
        const dataFilePath = subfolder ? `${subfolder}/${dataFileName}` : dataFileName;
        files.push(dataFilePath);
      }
    };
    const { sessions, optional_configs } = getSessionsConfig(modelType, config, { model_file_name });
    for (const [sessionKey, baseName] of Object.entries(sessions)) {
      add_model_file(sessionKey, baseName);
    }
    if (optional_configs) {
      for (const configFile of Object.values(optional_configs)) {
        files.push(configFile);
      }
    }
    return files;
  }

  // node_modules/@huggingface/transformers/src/models/modeling_utils.js
  var MODEL_MAPPING_NAMES = null;
  function toI64Tensor(items) {
    if (items instanceof Tensor3) {
      return items;
    }
    if (items.length === 0) {
      throw Error("items must be non-empty");
    }
    if (Array.isArray(items[0])) {
      if (items.some((x) => x.length !== items[0].length)) {
        throw Error(
          "Unable to create tensor, you should probably activate truncation and/or padding with 'padding=True' and/or 'truncation=True' to have batched tensors with the same length."
        );
      }
      return new Tensor3("int64", BigInt64Array.from(items.flat().map((x) => BigInt(x))), [
        items.length,
        items[0].length
      ]);
    } else {
      return new Tensor3("int64", BigInt64Array.from(items.map((x) => BigInt(x))), [1, items.length]);
    }
  }
  function boolTensor(value) {
    return new Tensor3("bool", [value], [1]);
  }
  var MODEL_RUNTIME_CONFIG = {
    [MODEL_TYPES.DecoderOnly]: {
      can_generate: true,
      forward: decoder_forward,
      prepare_inputs: decoder_prepare_inputs_for_generation
    },
    [MODEL_TYPES.DecoderOnlyWithoutHead]: {
      can_generate: false,
      forward: decoder_forward,
      prepare_inputs: decoder_prepare_inputs_for_generation
    },
    [MODEL_TYPES.Seq2Seq]: {
      can_generate: true,
      forward: seq2seq_forward,
      prepare_inputs: encoder_decoder_prepare_inputs_for_generation
    },
    [MODEL_TYPES.Vision2Seq]: {
      can_generate: true,
      forward: seq2seq_forward,
      prepare_inputs: encoder_decoder_prepare_inputs_for_generation
    },
    [MODEL_TYPES.Musicgen]: {
      can_generate: true,
      forward: seq2seq_forward
    },
    [MODEL_TYPES.EncoderDecoder]: {
      can_generate: false,
      forward: seq2seq_forward
    },
    [MODEL_TYPES.ImageTextToText]: {
      can_generate: true,
      forward: image_text_to_text_forward,
      prepare_inputs: multimodal_text_to_text_prepare_inputs_for_generation
    },
    [MODEL_TYPES.AudioTextToText]: {
      can_generate: true,
      forward: audio_text_to_text_forward,
      prepare_inputs: multimodal_text_to_text_prepare_inputs_for_generation
    },
    [MODEL_TYPES.ImageAudioTextToText]: {
      can_generate: true,
      prepare_inputs: multimodal_text_to_text_prepare_inputs_for_generation
    },
    [MODEL_TYPES.Phi3V]: {
      can_generate: true,
      prepare_inputs: multimodal_text_to_text_prepare_inputs_for_generation
    },
    [MODEL_TYPES.MultiModality]: {
      can_generate: true
    },
    [MODEL_TYPES.AutoEncoder]: {
      can_generate: false,
      forward: auto_encoder_forward
    },
    [MODEL_TYPES.Chatterbox]: {
      can_generate: true,
      forward: encoder_forward
    },
    [MODEL_TYPES.VoxtralRealtime]: {
      can_generate: true,
      prepare_inputs: decoder_prepare_inputs_for_generation
    },
    default: {
      can_generate: false,
      forward: encoder_forward
    }
  };
  function resolveTypeConfig(modelName, config) {
    let modelType = MODEL_TYPE_MAPPING.get(modelName);
    let textOnly = false;
    const nativeArch = config?.architectures?.[0];
    if (nativeArch && nativeArch !== modelName && modelName?.endsWith("ForCausalLM") && nativeArch.endsWith("ForConditionalGeneration")) {
      const nativeType = MODEL_TYPE_MAPPING.get(nativeArch);
      if (nativeType !== void 0) {
        modelType = nativeType;
        textOnly = true;
      }
    }
    const runtimeConfig = MODEL_RUNTIME_CONFIG[modelType] ?? MODEL_RUNTIME_CONFIG.default;
    const sessionConfig = MODEL_SESSION_CONFIG[modelType] ?? MODEL_SESSION_CONFIG.default;
    return { typeConfig: { ...runtimeConfig, ...sessionConfig }, textOnly, modelType };
  }
  var MODEL_TYPE_MAPPING = /* @__PURE__ */ new Map();
  var MODEL_CLASS_TO_NAME_MAPPING = /* @__PURE__ */ new Map();
  var PreTrainedModel = class extends Callable {
    main_input_name = "input_ids";
    forward_params = ["input_ids", "attention_mask"];
    _return_dict_in_generate_keys = null;
    /**
     * Create a model from configuration and inference sessions.
     * @param {import('../configs.js').PretrainedConfig} config The model configuration.
     * @param {Record<string, any>} sessions The inference sessions for the model.
     * @param {Record<string, Object>} configs Additional configuration files (e.g., generation_config.json).
     */
    constructor(config, sessions, configs) {
      super();
      this.config = config;
      this.sessions = sessions;
      this.configs = configs;
      const modelName = MODEL_CLASS_TO_NAME_MAPPING.get(this.constructor);
      const { typeConfig } = resolveTypeConfig(modelName, config);
      this.can_generate = typeConfig.can_generate;
      this._forward = typeConfig.forward;
      this._prepare_inputs_for_generation = typeConfig.prepare_inputs;
      if (this.can_generate) {
        this.forward_params.push("past_key_values");
      }
      this.custom_config = this.config["transformers.js_config"] ?? {};
    }
    /**
     * Disposes of all the ONNX sessions that were created during inference.
     * @returns {Promise<void[]>} Resolves after each session has been released.
     * @todo Use https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
     */
    async dispose() {
      const promises = [];
      for (const session of Object.values(this.sessions)) {
        promises.push(session.release?.());
      }
      return await Promise.all(promises);
    }
    /**
     * Instantiate one of the model classes of the library from a pretrained model.
     *
     * The model class to instantiate is selected based on the `model_type` property of the config object
     * (either passed as an argument or loaded from `pretrained_model_name_or_path` if possible)
     *
     * @param {string} pretrained_model_name_or_path The name or path of the pretrained model. Can be either:
     * - A string, the *model ID* of a pretrained model hosted inside a model repo on huggingface.co.
     *   Valid model IDs can be located at the root level, like `bert-base-uncased`, or namespaced under a
     *   user or organization name, like `dbmdz/bert-base-german-cased`.
     * - A path to a *directory* containing model weights, e.g., `./my_model_directory/`.
     * @param {import('../utils/hub.js').PretrainedModelOptions} options Additional options for loading the model.
     *
     * @returns {Promise<PreTrainedModel>} A model instance with ready inference sessions.
     */
    static async from_pretrained(pretrained_model_name_or_path, {
      progress_callback = null,
      config = null,
      cache_dir = null,
      local_files_only = false,
      revision = "main",
      model_file_name = null,
      subfolder = "onnx",
      device = null,
      dtype = null,
      use_external_data_format = null,
      session_options = {}
    } = {}) {
      const options = {
        progress_callback,
        config,
        cache_dir,
        local_files_only,
        revision,
        model_file_name,
        subfolder,
        device,
        dtype,
        use_external_data_format,
        session_options
      };
      const modelName = MODEL_CLASS_TO_NAME_MAPPING.get(this);
      config = options.config = await AutoConfig.from_pretrained(pretrained_model_name_or_path, options);
      const { typeConfig, textOnly, modelType } = resolveTypeConfig(modelName, config);
      if (modelType === void 0) {
        const type = modelName ?? config?.model_type;
        if (type !== "custom") {
          logger.warn(
            `Model type for '${type}' not found, assuming encoder-only architecture. Please report this at ${GITHUB_ISSUE_URL}.`
          );
        }
      }
      if (progress_callback && !(progress_callback instanceof DefaultProgressCallback)) {
        const files_loading = {};
        try {
          const expected_files = await get_model_files(pretrained_model_name_or_path, {
            config,
            dtype,
            device,
            model_file_name
          });
          const metadata = await Promise.all(
            expected_files.map((file) => get_file_metadata(pretrained_model_name_or_path, file, options))
          );
          metadata.forEach((m, i) => {
            if (m.exists) {
              const isAlreadyLoaded = expected_files[i] === "config.json";
              files_loading[expected_files[i]] = {
                loaded: isAlreadyLoaded ? m.size ?? 0 : 0,
                total: m.size ?? 0
              };
            }
          });
        } catch (e) {
          logger.warn(`Unable to fetch model file metadata for total progress tracking: ${e}`);
        }
        if (Object.keys(files_loading).length > 0) {
          options.progress_callback = new DefaultProgressCallback(progress_callback, files_loading);
        }
      }
      const sessions = typeConfig.sessions(config, options, textOnly);
      const promises = [
        constructSessions(pretrained_model_name_or_path, sessions, options, typeConfig.cache_sessions)
      ];
      if (typeConfig.optional_configs) {
        promises.push(get_optional_configs(pretrained_model_name_or_path, typeConfig.optional_configs, options));
      }
      const info = await Promise.all(promises);
      return new this(config, ...info);
    }
    /**
     * Runs the model with the provided inputs.
     * @param {Object} model_inputs Object containing input tensors.
     * @returns {Promise<Object>} Object containing output tensors.
     */
    async _call(model_inputs) {
      return await this.forward(model_inputs);
    }
    /**
     * Run the model's forward pass.
     * @param {Object} model_inputs The input data to the model in the format specified in the ONNX model.
     * @returns {Promise<Object>} The output data from the model in the format specified in the ONNX model.
     */
    async forward(model_inputs) {
      return await this._forward(this, model_inputs);
    }
    /**
     * Get the model's generation config, if it exists.
     * @returns {GenerationConfig|null} The model's generation config if it exists, otherwise `null`.
     */
    get generation_config() {
      return this.configs?.generation_config ?? null;
    }
    /**
     * @param {GenerationConfig} generation_config
     * @param {number} input_ids_seq_length The starting sequence length for the input ids.
     * @returns {LogitsProcessorList}
     * @private
     */
    _get_logits_processor(generation_config, input_ids_seq_length, logits_processor = null) {
      const processors = new LogitsProcessorList();
      if (generation_config.repetition_penalty !== null && generation_config.repetition_penalty !== 1) {
        processors.push(new RepetitionPenaltyLogitsProcessor(generation_config.repetition_penalty));
      }
      if (generation_config.no_repeat_ngram_size !== null && generation_config.no_repeat_ngram_size > 0) {
        processors.push(new NoRepeatNGramLogitsProcessor(generation_config.no_repeat_ngram_size));
      }
      if (generation_config.bad_words_ids !== null) {
        processors.push(
          new NoBadWordsLogitsProcessor(generation_config.bad_words_ids, generation_config.eos_token_id)
        );
      }
      if (generation_config.min_length !== null && generation_config.eos_token_id !== null && generation_config.min_length > 0) {
        processors.push(new MinLengthLogitsProcessor(generation_config.min_length, generation_config.eos_token_id));
      }
      if (generation_config.min_new_tokens !== null && generation_config.eos_token_id !== null && generation_config.min_new_tokens > 0) {
        processors.push(
          new MinNewTokensLengthLogitsProcessor(
            input_ids_seq_length,
            generation_config.min_new_tokens,
            generation_config.eos_token_id
          )
        );
      }
      if (generation_config.forced_bos_token_id !== null) {
        processors.push(new ForcedBOSTokenLogitsProcessor(generation_config.forced_bos_token_id));
      }
      if (generation_config.forced_eos_token_id !== null) {
        processors.push(
          new ForcedEOSTokenLogitsProcessor(generation_config.max_length, generation_config.forced_eos_token_id)
        );
      }
      if (generation_config.suppress_tokens !== null) {
        processors.push(new SuppressTokensLogitsProcessor(generation_config.suppress_tokens));
      }
      if (generation_config.begin_suppress_tokens !== null) {
        const begin_index = input_ids_seq_length > 1 || generation_config.forced_bos_token_id === null ? input_ids_seq_length : input_ids_seq_length + 1;
        processors.push(
          new SuppressTokensAtBeginLogitsProcessor(generation_config.begin_suppress_tokens, begin_index)
        );
      }
      if (generation_config.guidance_scale !== null && generation_config.guidance_scale > 1) {
        processors.push(new ClassifierFreeGuidanceLogitsProcessor(generation_config.guidance_scale));
      }
      if (generation_config.temperature === 0 && generation_config.do_sample) {
        logger.warn(
          "`do_sample` changed to false because `temperature: 0` implies greedy sampling (always selecting the most likely token), which is incompatible with `do_sample: true`."
        );
        generation_config.do_sample = false;
      }
      if (generation_config.do_sample) {
        if (generation_config.temperature !== null && generation_config.temperature !== 1) {
          processors.push(new TemperatureLogitsWarper(generation_config.temperature));
        }
      }
      if (logits_processor !== null) {
        processors.extend(logits_processor);
      }
      return processors;
    }
    /**
     * This function merges multiple generation configs together to form a final generation config to be used by the model for text generation.
     * It first creates an empty `GenerationConfig` object, then it applies the model's own `generation_config` property to it. Finally, if a `generation_config` object was passed in the arguments, it overwrites the corresponding properties in the final config with those of the passed config object.
     * @param {GenerationConfig|null} generation_config A `GenerationConfig` object containing generation parameters.
     * @param {Object} kwargs Additional generation parameters to be used in place of those in the `generation_config` object.
     * @returns {GenerationConfig} The final generation config object to be used by the model for text generation.
     */
    _prepare_generation_config(generation_config, kwargs, cls = GenerationConfig) {
      const config = { ...this.config };
      for (const key of ["decoder", "generator", "text_config"]) {
        if (key in config) {
          Object.assign(config, config[key]);
        }
      }
      const gen_config = new cls(config);
      Object.assign(gen_config, this.generation_config ?? {});
      if (generation_config) {
        Object.assign(gen_config, generation_config);
      }
      if (kwargs) {
        Object.assign(gen_config, pick(kwargs, Object.getOwnPropertyNames(gen_config)));
      }
      return gen_config;
    }
    /**
     *
     * @param {GenerationConfig} generation_config
     * @param {import('../generation/stopping_criteria.js').StoppingCriteria|import('../generation/stopping_criteria.js').StoppingCriteria[]|StoppingCriteriaList} [stopping_criteria=null]
     */
    _get_stopping_criteria(generation_config, stopping_criteria = null) {
      const criteria = new StoppingCriteriaList();
      if (generation_config.max_length !== null) {
        criteria.push(
          new MaxLengthCriteria(generation_config.max_length, this.config.max_position_embeddings ?? null)
        );
      }
      if (generation_config.eos_token_id !== null) {
        criteria.push(new EosTokenCriteria(generation_config.eos_token_id));
      }
      if (stopping_criteria) {
        criteria.extend(stopping_criteria);
      }
      return criteria;
    }
    /**
     * Confirms that the model class is compatible with generation.
     * If not, raises an exception that points to the right class to use.
     */
    _validate_model_class() {
      if (!this.can_generate) {
        const generate_compatible_mappings = [
          MODEL_MAPPING_NAMES.MODEL_FOR_CAUSAL_LM_MAPPING_NAMES,
          // MODEL_MAPPING_NAMES.MODEL_FOR_CAUSAL_IMAGE_MODELING_MAPPING, // TODO
          MODEL_MAPPING_NAMES.MODEL_FOR_VISION_2_SEQ_MAPPING_NAMES,
          MODEL_MAPPING_NAMES.MODEL_FOR_SEQ_TO_SEQ_CAUSAL_LM_MAPPING_NAMES,
          MODEL_MAPPING_NAMES.MODEL_FOR_SPEECH_SEQ_2_SEQ_MAPPING_NAMES
        ].filter(Boolean);
        const modelName = MODEL_CLASS_TO_NAME_MAPPING.get(this.constructor);
        const generate_compatible_classes = /* @__PURE__ */ new Set();
        const modelType = this.config.model_type;
        for (const model_mapping of generate_compatible_mappings) {
          const supported_models = model_mapping?.get(modelType);
          if (supported_models) {
            generate_compatible_classes.add(supported_models);
          }
        }
        let errorMessage = `The current model class (${modelName}) is not compatible with \`.generate()\`, as it doesn't have a language model head.`;
        if (generate_compatible_classes.size > 0) {
          errorMessage += ` Please use the following class instead: ${[...generate_compatible_classes].join(", ")}`;
        }
        throw Error(errorMessage);
      }
    }
    prepare_inputs_for_generation(...args) {
      if (!this._prepare_inputs_for_generation) {
        throw new Error("prepare_inputs_for_generation is not implemented for this model.");
      }
      return this._prepare_inputs_for_generation(this, ...args);
    }
    /**
     *
     * @param {Object} inputs
     * @param {bigint[][]} inputs.generated_input_ids
     * @param {Object} inputs.outputs
     * @param {Object} inputs.model_inputs
     * @param {boolean} inputs.is_encoder_decoder
     * @returns {Object} The updated model inputs for the next generation iteration.
     */
    _update_model_kwargs_for_generation({ generated_input_ids, outputs, model_inputs, is_encoder_decoder }) {
      model_inputs["past_key_values"] = getPastKeyValues(outputs, model_inputs.past_key_values);
      model_inputs["input_ids"] = new Tensor3("int64", generated_input_ids.flat(), [generated_input_ids.length, 1]);
      if (!is_encoder_decoder) {
        model_inputs.attention_mask = cat(
          [model_inputs.attention_mask, ones([model_inputs.attention_mask.dims[0], 1])],
          1
        );
      } else if ("decoder_attention_mask" in model_inputs) {
        model_inputs.decoder_attention_mask = cat(
          [model_inputs.decoder_attention_mask, ones([model_inputs.decoder_attention_mask.dims[0], 1])],
          1
        );
      }
      model_inputs["position_ids"] = null;
      return model_inputs;
    }
    /**
     * This function extracts the model-specific `inputs` for generation.
     * @param {Object} params
     * @param {Tensor} [params.inputs=null]
     * @param {number} [params.bos_token_id=null]
     * @param {Record<string, Tensor|number[]>} [params.model_kwargs]
     * @returns {{inputs_tensor: Tensor, model_inputs: Record<string, Tensor> & {past_key_values?: DynamicCache}, model_input_name: string}} The model-specific inputs for generation.
     */
    _prepare_model_inputs({ inputs, bos_token_id, model_kwargs }) {
      const model_inputs = pick(model_kwargs, this.forward_params);
      const input_name = this.main_input_name;
      if (input_name in model_inputs) {
        if (inputs) {
          throw new Error(
            "`inputs`: {inputs}` were passed alongside {input_name} which is not allowed. Make sure to either pass {inputs} or {input_name}=..."
          );
        }
      } else {
        model_inputs[input_name] = inputs;
      }
      const inputs_tensor = model_inputs[input_name];
      return { inputs_tensor, model_inputs, model_input_name: input_name };
    }
    async _prepare_encoder_decoder_kwargs_for_generation({
      inputs_tensor,
      model_inputs,
      model_input_name,
      generation_config
    }) {
      if (this.sessions["model"].inputNames.includes("inputs_embeds") && !model_inputs.inputs_embeds && "_prepare_inputs_embeds" in this) {
        const { input_ids, pixel_values, attention_mask, ...kwargs } = model_inputs;
        const prepared_inputs = await this._prepare_inputs_embeds(model_inputs);
        model_inputs = {
          ...kwargs,
          ...pick(prepared_inputs, ["inputs_embeds", "attention_mask"])
        };
      }
      let { last_hidden_state } = await encoder_forward(this, model_inputs);
      if (generation_config.guidance_scale !== null && generation_config.guidance_scale > 1) {
        last_hidden_state = cat([last_hidden_state, full_like(last_hidden_state, 0)], 0);
        if ("attention_mask" in model_inputs) {
          model_inputs["attention_mask"] = cat(
            [model_inputs["attention_mask"], zeros_like(model_inputs["attention_mask"])],
            0
          );
        }
      } else if (model_inputs.decoder_input_ids) {
        const decoder_input_ids_batch_size = toI64Tensor(model_inputs.decoder_input_ids).dims[0];
        if (decoder_input_ids_batch_size !== last_hidden_state.dims[0]) {
          if (last_hidden_state.dims[0] !== 1) {
            throw new Error(
              `The encoder outputs have a different batch size (${last_hidden_state.dims[0]}) than the decoder inputs (${decoder_input_ids_batch_size}).`
            );
          }
          last_hidden_state = cat(
            Array.from({ length: decoder_input_ids_batch_size }, () => last_hidden_state),
            0
          );
        }
      }
      model_inputs["encoder_outputs"] = last_hidden_state;
      return model_inputs;
    }
    /**
     * Prepares `decoder_input_ids` for generation with encoder-decoder models
     * @param {*} param0
     */
    _prepare_decoder_input_ids_for_generation({
      batch_size,
      model_input_name,
      model_kwargs,
      decoder_start_token_id,
      bos_token_id,
      generation_config
    }) {
      let { decoder_input_ids, ...model_inputs } = model_kwargs;
      if (!(decoder_input_ids instanceof Tensor3)) {
        if (!decoder_input_ids) {
          decoder_start_token_id ??= bos_token_id;
          if (this.config.model_type === "musicgen") {
            decoder_input_ids = Array.from(
              {
                // @ts-expect-error TS2339
                length: batch_size * this.config.decoder.num_codebooks
              },
              () => [decoder_start_token_id]
            );
          } else if (Array.isArray(decoder_start_token_id)) {
            if (decoder_start_token_id.length !== batch_size) {
              throw new Error(
                `\`decoder_start_token_id\` expected to have length ${batch_size} but got ${decoder_start_token_id.length}`
              );
            }
            decoder_input_ids = decoder_start_token_id;
          } else {
            decoder_input_ids = Array.from(
              {
                length: batch_size
              },
              () => [decoder_start_token_id]
            );
          }
        } else if (!Array.isArray(decoder_input_ids[0])) {
          decoder_input_ids = Array.from(
            {
              length: batch_size
            },
            () => decoder_input_ids
          );
        }
        decoder_input_ids = toI64Tensor(decoder_input_ids);
      }
      model_inputs["decoder_attention_mask"] = ones_like(decoder_input_ids);
      return { input_ids: decoder_input_ids, model_inputs };
    }
    /**
     * Generate token sequences with a language-modeling head.
     * @param {import('../generation/parameters.js').GenerationFunctionParameters} options
     * @returns {Promise<ModelOutput|Tensor>} The output of the model, which can contain the generated token ids, attentions, and scores.
     */
    async generate({
      inputs = null,
      generation_config = null,
      logits_processor = null,
      stopping_criteria = null,
      streamer = null,
      // inputs_attention_mask = null,
      ...kwargs
    }) {
      this._validate_model_class();
      generation_config = this._prepare_generation_config(generation_config, kwargs);
      let { inputs_tensor, model_inputs, model_input_name } = this._prepare_model_inputs({
        inputs,
        model_kwargs: (
          /** @type {Record<string, Tensor|number[]>} */
          kwargs
        )
      });
      const is_encoder_decoder = this.config.is_encoder_decoder;
      if (!is_encoder_decoder) {
      } else if (!("encoder_outputs" in model_inputs)) {
        model_inputs = await this._prepare_encoder_decoder_kwargs_for_generation({
          inputs_tensor,
          model_inputs,
          model_input_name,
          generation_config
        });
      }
      let input_ids;
      if (is_encoder_decoder) {
        ({ input_ids, model_inputs } = this._prepare_decoder_input_ids_for_generation({
          batch_size: model_inputs[model_input_name].dims.at(0),
          model_input_name,
          model_kwargs: model_inputs,
          decoder_start_token_id: generation_config.decoder_start_token_id,
          bos_token_id: generation_config.bos_token_id,
          generation_config
        }));
      } else {
        input_ids = model_inputs[model_input_name];
      }
      let input_ids_length = input_ids.dims.at(-1);
      if (generation_config.max_new_tokens !== null) {
        generation_config.max_length = input_ids_length + generation_config.max_new_tokens;
      }
      const prepared_logits_processor = this._get_logits_processor(
        generation_config,
        input_ids_length,
        logits_processor
      );
      const prepared_stopping_criteria = this._get_stopping_criteria(generation_config, stopping_criteria);
      const numInputs = model_inputs[model_input_name].dims.at(0);
      const sampler = LogitsSampler.getSampler(generation_config);
      const scores = new Array(numInputs).fill(0);
      const all_input_ids = input_ids.tolist();
      if (streamer) {
        streamer.put(all_input_ids);
      }
      let outputs;
      let attentions = {};
      let return_dict_items = {};
      while (true) {
        model_inputs = this.prepare_inputs_for_generation(all_input_ids, model_inputs, generation_config);
        outputs = await this.forward(model_inputs);
        if (generation_config.return_dict_in_generate) {
          if (generation_config.output_attentions) {
            const token_attentions = getAttentions(outputs);
            for (const key in token_attentions) {
              if (!(key in attentions)) {
                attentions[key] = [];
              }
              attentions[key].push(token_attentions[key]);
            }
          } else if (this._return_dict_in_generate_keys) {
            Object.assign(return_dict_items, pick(outputs, this._return_dict_in_generate_keys));
          }
        }
        const logits = outputs.logits.slice(null, -1, null).to("float32");
        const next_tokens_scores = prepared_logits_processor(all_input_ids, logits);
        const generated_input_ids = [];
        for (let batch_idx = 0; batch_idx < next_tokens_scores.dims.at(0); ++batch_idx) {
          const logs = next_tokens_scores[batch_idx];
          const sampledTokens = await sampler(logs);
          for (const [newTokenId, logProb] of sampledTokens) {
            const bigint = BigInt(newTokenId);
            scores[batch_idx] += logProb;
            all_input_ids[batch_idx].push(bigint);
            generated_input_ids.push([bigint]);
            break;
          }
        }
        if (streamer) {
          streamer.put(generated_input_ids);
        }
        const stop = prepared_stopping_criteria(all_input_ids);
        if (stop.every((x) => x)) {
          break;
        }
        model_inputs = this._update_model_kwargs_for_generation({
          generated_input_ids,
          outputs,
          model_inputs,
          is_encoder_decoder
        });
      }
      if (streamer) {
        streamer.end();
      }
      const sequences = new Tensor3("int64", all_input_ids.flat(), [all_input_ids.length, all_input_ids[0].length]);
      const past_key_values = getPastKeyValues(outputs, model_inputs.past_key_values);
      const cachedTensors = new Set(Object.values(past_key_values));
      for (const tensor of Object.values(outputs)) {
        if (tensor.location === "gpu-buffer" && !cachedTensors.has(tensor)) {
          tensor.dispose();
        }
      }
      const keepCacheAlive = "past_key_values" in kwargs || generation_config.return_dict_in_generate;
      if (!keepCacheAlive) {
        await past_key_values.dispose();
      }
      if (generation_config.return_dict_in_generate) {
        return {
          sequences,
          past_key_values,
          ...attentions,
          ...return_dict_items
          // TODO:
          // scores,
          // logits,
        };
      }
      return sequences;
    }
    /**
     * Helper function to select valid inputs and run through the appropriate encoder (vision, text, audio) based on the input type.
     * @param {string} sessionName
     * @param {Record<string, Tensor>} inputs
     * @param {string} outputName
     * @private
     */
    async _encode_input(sessionName, inputs, outputName) {
      if (!Object.hasOwn(this.sessions, sessionName)) {
        throw new Error(`Model does not have a ${sessionName} session.`);
      }
      const session = this.sessions[sessionName];
      const output = await sessionRun(session, pick(inputs, session.inputNames));
      return output[outputName];
    }
    /**
     * Encode image inputs into features for multimodal generation.
     * @param {any} inputs Vision encoder inputs.
     * @returns {Promise<any>} Image features.
     * @internal
     */
    async encode_image(inputs) {
      return this._encode_input("vision_encoder", inputs, "image_features");
    }
    /**
     * Encode token ids into embeddings for multimodal generation.
     * @param {any} inputs Text encoder inputs.
     * @returns {Promise<any>} Text embeddings.
     * @internal
     */
    async encode_text(inputs) {
      return this._encode_input("embed_tokens", inputs, "inputs_embeds");
    }
    /**
     * Encode audio inputs into features for multimodal generation.
     * @param {any} inputs Audio encoder inputs.
     * @returns {Promise<any>} Audio features.
     * @internal
     */
    async encode_audio(inputs) {
      return this._encode_input("audio_encoder", inputs, "audio_features");
    }
  };
  async function seq2seq_forward(self2, model_inputs) {
    let { encoder_outputs, input_ids, decoder_input_ids, decoder_attention_mask, ...other_decoder_inputs } = model_inputs;
    if (!encoder_outputs) {
      const encoder_inputs = pick(model_inputs, self2.sessions["model"].inputNames);
      encoder_outputs = (await encoder_forward(self2, encoder_inputs)).last_hidden_state;
    }
    other_decoder_inputs.input_ids = decoder_input_ids;
    other_decoder_inputs.encoder_hidden_states = encoder_outputs;
    if (self2.sessions["decoder_model_merged"].inputNames.includes("encoder_attention_mask")) {
      other_decoder_inputs.encoder_attention_mask = model_inputs.attention_mask;
    }
    if (decoder_attention_mask && !other_decoder_inputs.attention_mask) {
      other_decoder_inputs.attention_mask = decoder_attention_mask;
    }
    return await decoder_forward(self2, other_decoder_inputs, true);
  }
  async function encoder_forward(self2, model_inputs) {
    const session = self2.sessions["model"];
    const encoderFeeds = pick(model_inputs, session.inputNames);
    if (session.inputNames.includes("inputs_embeds") && !encoderFeeds.inputs_embeds) {
      if (!model_inputs.input_ids) {
        throw new Error("Both `input_ids` and `inputs_embeds` are missing in the model inputs.");
      }
      encoderFeeds.inputs_embeds = await self2.encode_text({ input_ids: model_inputs.input_ids });
    }
    if (session.inputNames.includes("token_type_ids") && !encoderFeeds.token_type_ids) {
      if (!encoderFeeds.input_ids) {
        throw new Error("Both `input_ids` and `token_type_ids` are missing in the model inputs.");
      }
      encoderFeeds.token_type_ids = zeros_like(encoderFeeds.input_ids);
    }
    if (session.inputNames.includes("pixel_mask") && !encoderFeeds.pixel_mask) {
      if (!encoderFeeds.pixel_values) {
        throw new Error("Both `pixel_values` and `pixel_mask` are missing in the model inputs.");
      }
      const dims = encoderFeeds.pixel_values.dims;
      encoderFeeds.pixel_mask = ones([dims[0], dims[2], dims[3]]);
    }
    return await sessionRun(session, encoderFeeds);
  }
  async function auto_encoder_forward(self2, model_inputs) {
    const encoded = await self2.encode(model_inputs);
    const decoded = await self2.decode(encoded);
    return decoded;
  }
  function getPastKeyValues(decoderResults, pastKeyValues) {
    const pkvs = /* @__PURE__ */ Object.create(null);
    for (const name in decoderResults) {
      if (name.startsWith("present")) {
        const newName = name.replace("present_ssm", "past_ssm").replace("present_conv", "past_conv").replace("present_recurrent", "past_recurrent").replace("present_compressor", "past_compressor").replace("present_indexer", "past_indexer").replace("present", "past_key_values");
        const is_encoder_pkv = name.includes("encoder");
        if (is_encoder_pkv && pastKeyValues) {
          pkvs[newName] = pastKeyValues[newName];
        } else {
          pkvs[newName] = decoderResults[name];
        }
      }
    }
    if (pastKeyValues) {
      pastKeyValues.update(pkvs);
      return pastKeyValues;
    }
    return new DynamicCache(pkvs);
  }
  function getAttentions(model_output) {
    const attentions = {};
    for (const attnName of ["cross_attentions", "encoder_attentions", "decoder_attentions"]) {
      for (const name in model_output) {
        if (name.startsWith(attnName)) {
          if (!(attnName in attentions)) {
            attentions[attnName] = [];
          }
          attentions[attnName].push(model_output[name]);
        }
      }
    }
    return attentions;
  }
  function resolveCacheShape(metadataShape, symbols) {
    return metadataShape.map((d) => {
      if (typeof d === "number") return d;
      return symbols[d] ?? 0;
    });
  }
  function addPastKeyValues(self2, decoderFeeds, pastKeyValues) {
    if (pastKeyValues && Object.keys(pastKeyValues).length > 0) {
      Object.assign(decoderFeeds, pastKeyValues);
      return pastKeyValues;
    }
    const session = self2.sessions["decoder_model_merged"] ?? self2.sessions["model"];
    const batch_size = (decoderFeeds[self2.main_input_name] ?? decoderFeeds.attention_mask)?.dims?.[0] ?? 1;
    const names = getCacheNames(self2.config);
    const num_heads = self2.config?.normalized_config?.num_heads;
    const symbols = { batch_size };
    if (typeof num_heads === "number") {
      symbols["batch_size x num_heads"] = batch_size * num_heads;
    }
    const entries = /* @__PURE__ */ Object.create(null);
    for (const meta of session.inputMetadata) {
      if (!names.has(meta.name)) continue;
      const shape = resolveCacheShape(meta.shape, symbols);
      const size = shape.reduce((a, b) => a * b, 1);
      const cls = DataTypeMap[meta.type];
      const t = new Tensor3(meta.type, new cls(size), shape);
      decoderFeeds[meta.name] = t;
      entries[meta.name] = t;
    }
    if (pastKeyValues) {
      pastKeyValues.update(entries);
      return pastKeyValues;
    }
    return new DynamicCache(entries);
  }
  function setNumLogitsToKeep(self2, model_inputs, value) {
    if (model_inputs.num_logits_to_keep) return;
    const session = self2.sessions["decoder_model_merged"] ?? self2.sessions["model"];
    if (session?.inputNames.includes("num_logits_to_keep")) {
      model_inputs.num_logits_to_keep = new Tensor3("int64", [value], []);
    }
  }
  async function decoder_forward(self2, model_inputs, is_encoder_decoder = false) {
    const session = self2.sessions[is_encoder_decoder ? "decoder_model_merged" : "model"];
    const { past_key_values, ...new_model_inputs } = model_inputs;
    if (session.inputNames.includes("use_cache_branch")) {
      new_model_inputs.use_cache_branch = boolTensor(
        past_key_values != null && Object.keys(past_key_values).length > 0
      );
    }
    if (session.inputNames.includes("position_ids") && new_model_inputs.attention_mask && !new_model_inputs.position_ids) {
      const start_index = ["paligemma", "gemma3_text", "gemma3"].includes(self2.config.model_type) ? 1 : 0;
      new_model_inputs.position_ids = create_position_ids(new_model_inputs, past_key_values, start_index);
    }
    setNumLogitsToKeep(self2, new_model_inputs, 0n);
    addPastKeyValues(self2, new_model_inputs, past_key_values);
    const fixed = pick(new_model_inputs, session.inputNames);
    return await sessionRun(session, fixed);
  }
  async function generic_text_to_text_forward(self2, {
    // Generic parameters:
    encode_function,
    merge_function,
    modality_input_names,
    modality_output_name,
    // Produced by the tokenizer/processor:
    input_ids = null,
    attention_mask = null,
    // Used during generation:
    position_ids = null,
    inputs_embeds = null,
    past_key_values = null,
    // Generic generation parameters
    generation_config = null,
    logits_processor = null,
    num_logits_to_keep = null,
    // Additional parameters
    ...kwargs
  }) {
    if (!inputs_embeds) {
      inputs_embeds = await self2.encode_text({ input_ids, ...kwargs });
      const modality_values = pick(kwargs, modality_input_names);
      if (Object.keys(modality_values).length > 0) {
        if (input_ids.dims[1] !== 1) {
          const modality_features = await encode_function({
            // Pass the modality values under its expected key.
            // The caller knows whether this is audio or image.
            ...modality_values,
            ...kwargs
          });
          ({ inputs_embeds, attention_mask } = merge_function({
            [modality_output_name]: modality_features,
            inputs_embeds,
            input_ids,
            attention_mask
          }));
        } else if (past_key_values && input_ids.dims[1] === 1) {
          const target_length = input_ids.dims[1];
          const past_length = past_key_values.get_seq_length();
          attention_mask = cat(
            [
              ones([input_ids.dims[0], past_length]),
              attention_mask.slice(null, [attention_mask.dims[1] - target_length, attention_mask.dims[1]])
            ],
            1
          );
        }
      }
    }
    if (!position_ids) {
      if (
        // Handle special case for qwen vl models
        [
          "qwen2_vl",
          "qwen2_vl_text",
          "qwen2_5_vl",
          "qwen2_5_vl_text",
          "qwen3_vl",
          "qwen3_vl_text",
          "qwen3_vl_moe",
          "qwen3_vl_moe_text",
          "qwen3_5",
          "qwen3_5_text",
          "qwen3_5_moe",
          "qwen3_5_moe_text",
          "glm_ocr",
          "glm_ocr_text"
        ].includes(self2.config.model_type)
      ) {
        const { image_grid_thw, video_grid_thw } = kwargs;
        [position_ids] = self2.get_rope_index(input_ids, image_grid_thw, video_grid_thw, attention_mask);
      }
    }
    const outputs = await decoder_forward(
      self2,
      {
        inputs_embeds,
        past_key_values,
        attention_mask,
        position_ids,
        generation_config,
        logits_processor,
        num_logits_to_keep
      },
      true
    );
    return outputs;
  }
  async function audio_text_to_text_forward(self2, params) {
    return await generic_text_to_text_forward(self2, {
      ...params,
      modality_input_names: ["audio_values", "input_features"],
      modality_output_name: "audio_features",
      encode_function: self2.encode_audio.bind(self2),
      merge_function: self2._merge_input_ids_with_audio_features.bind(self2)
    });
  }
  async function image_text_to_text_forward(self2, params) {
    return await generic_text_to_text_forward(self2, {
      ...params,
      modality_input_names: ["pixel_values"],
      modality_output_name: "image_features",
      encode_function: self2.encode_image.bind(self2),
      merge_function: self2._merge_input_ids_with_image_features.bind(self2)
    });
  }
  function cumsum_masked_fill(attention_mask, start_index = 0) {
    const [bz, seq_len] = attention_mask.dims;
    const attn_mask_data = attention_mask.data;
    const data = new BigInt64Array(attn_mask_data.length);
    for (let i = 0; i < bz; ++i) {
      const start = i * seq_len;
      let sum = BigInt(start_index);
      for (let j2 = 0; j2 < seq_len; ++j2) {
        const index = start + j2;
        if (attn_mask_data[index] === 0n) {
          data[index] = BigInt(1);
        } else {
          data[index] = sum;
          sum += attn_mask_data[index];
        }
      }
    }
    return { data, dims: attention_mask.dims };
  }
  function create_position_ids(model_inputs, past_key_values = null, start_index = 0) {
    const { input_ids, inputs_embeds, attention_mask } = model_inputs;
    const { data, dims } = cumsum_masked_fill(attention_mask, start_index);
    let position_ids = new Tensor3("int64", data, dims);
    if (past_key_values) {
      const offset = -(input_ids ?? inputs_embeds).dims.at(1);
      position_ids = position_ids.slice(null, [offset, null]);
    }
    return position_ids;
  }
  function decoder_prepare_inputs_for_generation(self2, input_ids, model_inputs, generation_config) {
    const past_length = model_inputs.past_key_values ? model_inputs.past_key_values.get_seq_length() : 0;
    setNumLogitsToKeep(self2, model_inputs, 1n);
    if (!model_inputs.attention_mask) {
      let dims;
      for (const key of ["input_ids", "inputs_embeds", "position_ids"]) {
        if (model_inputs[key]) {
          dims = model_inputs[key].dims;
          break;
        }
      }
      if (!dims) {
        throw new Error("attention_mask is not provided, and unable to infer its shape from model inputs.");
      }
      model_inputs.attention_mask = ones([dims[0], past_length + dims[1]]);
    }
    if (model_inputs.past_key_values) {
      const { input_ids: input_ids2, attention_mask } = model_inputs;
      if (attention_mask && attention_mask.dims[1] > input_ids2.dims[1]) {
      } else if (past_length < input_ids2.dims[1]) {
        model_inputs.input_ids = input_ids2.slice(null, [past_length, null]);
      } else {
      }
    }
    return model_inputs;
  }
  function encoder_decoder_prepare_inputs_for_generation(self2, input_ids, model_inputs, generation_config) {
    if (model_inputs.past_key_values) {
      input_ids = input_ids.map((x) => [x.at(-1)]);
    }
    setNumLogitsToKeep(self2, model_inputs, 1n);
    return {
      ...model_inputs,
      decoder_input_ids: toI64Tensor(input_ids)
    };
  }
  function multimodal_text_to_text_prepare_inputs_for_generation(self2, ...args) {
    if (self2.config.is_encoder_decoder) {
      return encoder_decoder_prepare_inputs_for_generation(self2, ...args);
    } else {
      return decoder_prepare_inputs_for_generation(self2, ...args);
    }
  }
  async function get_optional_configs(pretrained_model_name_or_path, names, options) {
    return Object.fromEntries(
      await Promise.all(
        Object.keys(names).map(async (name) => {
          const config = await getModelJSON(pretrained_model_name_or_path, names[name], false, options);
          return [name, config];
        })
      )
    );
  }

  // node_modules/@huggingface/transformers/src/models/bert/modeling_bert.js
  var BertPreTrainedModel = class extends PreTrainedModel {
  };
  var BertModel = class extends BertPreTrainedModel {
  };

  // node_modules/@huggingface/tokenizers/dist/tokenizers.mjs
  var DictionarySplitter = class {
    /**
     * @param dictionary The dictionary of words to use for splitting.
     */
    constructor(dictionary) {
      this.trie = this._build_trie(dictionary);
    }
    /**
     * Builds a trie from the given dictionary.
     * @param dictionary The dictionary of words to build the trie from.
     * @returns The root node of the trie.
     * @private
     */
    _build_trie(dictionary) {
      const trie = /* @__PURE__ */ Object.create(null);
      for (const word of dictionary) {
        let node = trie;
        for (let i = 0; i < word.length; ++i) {
          const char = word[i];
          node = node[char] ??= /* @__PURE__ */ Object.create(null);
        }
        node.end = word;
      }
      return trie;
    }
    /**
     * Splits the input text into tokens based on the dictionary.
     * @param text The input text to split.
     * @returns An array of tokens.
     */
    split(text) {
      const result = [];
      const n = text.length;
      let start = 0;
      let i = 0;
      while (i < n) {
        let node = this.trie;
        let match = null;
        let j2 = i;
        while (j2 < n && (node = node[text[j2]])) {
          if (node.end) {
            match = node.end;
          }
          ++j2;
        }
        if (match) {
          if (i > start) {
            result.push(text.slice(start, i));
          }
          result.push(match);
          i += match.length;
          start = i;
        } else {
          ++i;
        }
      }
      if (start < n) {
        result.push(text.slice(start));
      }
      return result;
    }
  };
  var DictionarySplitter_default = DictionarySplitter;
  var AddedToken = class {
    /**
     * Creates a new instance of AddedToken.
     * @param config Added token configuration object.
     */
    constructor(config) {
      this.content = config.content;
      this.id = config.id;
      this.single_word = config.single_word ?? false;
      this.lstrip = config.lstrip ?? false;
      this.rstrip = config.rstrip ?? false;
      this.special = config.special ?? false;
      this.normalized = config.normalized ?? !this.special;
    }
  };
  var AddedToken_default = AddedToken;
  var compile_unicode_regexp = (source, flags) => {
    try {
      return new RegExp(source, flags);
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      const property_names = /* @__PURE__ */ new Map();
      const rewritten = source.replace(
        /(\\[pP])\{([^}=]+)\}/g,
        (text, p, n, offset) => {
          let preceding_backslashes = 0;
          for (let i = offset - 1; i >= 0 && source[i] === "\\"; --i) {
            ++preceding_backslashes;
          }
          if (preceding_backslashes % 2 === 1) return text;
          let property_name = property_names.get(n);
          if (property_name === void 0) {
            try {
              new RegExp(`\\p{${n}}`, "u");
              property_name = n;
            } catch {
              property_name = `Script=${n}`;
            }
            property_names.set(n, property_name);
          }
          return `${p}{${property_name}}`;
        }
      );
      if (rewritten === source) throw error;
      try {
        return new RegExp(rewritten, flags);
      } catch {
        throw error;
      }
    }
  };
  var clean_up_tokenization = (text) => text.replace(/ \./g, ".").replace(/ \?/g, "?").replace(/ \!/g, "!").replace(/ ,/g, ",").replace(/ \' /g, "'").replace(/ n't/g, "n't").replace(/ 'm/g, "'m").replace(/ 's/g, "'s").replace(/ 've/g, "'ve").replace(/ 're/g, "'re");
  var create_pattern = (pattern, invert = true) => {
    if (pattern.Regex !== void 0) {
      const regex = rewrite_oniguruma_to_js(
        normalize_bloom_split_char_class(pattern.Regex)
      );
      return compile_unicode_regexp(regex, "gu");
    } else if (pattern.String !== void 0) {
      const escaped = escape_reg_exp(pattern.String);
      return new RegExp(invert ? escaped : `(${escaped})`, "gu");
    } else {
      console.warn("Unknown pattern type:", pattern);
      return null;
    }
  };
  var UNICODE_WORD_CHARS_IN_CLASS = "\\p{Alphabetic}\\p{M}\\p{Nd}\\p{Pc}";
  var UNICODE_WORD_CHARS = `${UNICODE_WORD_CHARS_IN_CLASS}\\u00B2\\u00B3\\u00B9\\u00BC-\\u00BE`;
  var UNICODE_WORD_CLASS = `[${UNICODE_WORD_CHARS}]`;
  var UNICODE_NON_WORD_CLASS = `[^${UNICODE_WORD_CHARS}]`;
  var UNICODE_WORD_BOUNDARY = `(?:(?<!${UNICODE_WORD_CLASS})(?=${UNICODE_WORD_CLASS})|(?<=${UNICODE_WORD_CLASS})(?!${UNICODE_WORD_CLASS}))`;
  var UNICODE_NON_WORD_BOUNDARY = `(?:(?<!${UNICODE_WORD_CLASS})(?!${UNICODE_WORD_CLASS})|(?<=${UNICODE_WORD_CLASS})(?=${UNICODE_WORD_CLASS}))`;
  var LINE_START_ANCHOR = "(?:(?<![\\s\\S])|(?<=\\n))";
  var LINE_END_ANCHOR = "(?:(?=\\n)|(?![\\s\\S]))";
  var HEX_DIGIT_CHARS = "0-9A-Fa-f";
  var ESCAPE_REWRITES = /* @__PURE__ */ new Map([
    ["A", "(?<![\\s\\S])"],
    ["z", "(?![\\s\\S])"],
    ["Z", "(?=\\n?(?![\\s\\S]))"],
    // \Z permits a single optional final \n (not \r\n)
    ["h", `[${HEX_DIGIT_CHARS}]`],
    ["H", `[^${HEX_DIGIT_CHARS}]`],
    ["w", UNICODE_WORD_CLASS],
    ["W", UNICODE_NON_WORD_CLASS],
    ["d", "\\p{Nd}"],
    ["D", "\\P{Nd}"],
    ["s", "\\p{White_Space}"],
    // JS \s wrongly adds U+FEFF and misses \x85
    ["S", "\\P{White_Space}"],
    ["b", UNICODE_WORD_BOUNDARY],
    ["B", UNICODE_NON_WORD_BOUNDARY],
    ["a", "\\x07"],
    ["e", "\\x1B"]
  ]);
  var CLASS_ESCAPE_REWRITES = /* @__PURE__ */ new Map([
    ["h", HEX_DIGIT_CHARS],
    ["w", UNICODE_WORD_CHARS_IN_CLASS],
    ["d", "\\p{Nd}"],
    ["D", "\\P{Nd}"],
    ["s", "\\p{White_Space}"],
    ["S", "\\P{White_Space}"],
    ["a", "\\x07"],
    ["e", "\\x1B"]
  ]);
  var CLASS_COMPLEMENT_ALTERNATIVES = /* @__PURE__ */ new Map([
    ["W", `[^${UNICODE_WORD_CHARS_IN_CLASS}]`],
    ["H", `[^${HEX_DIGIT_CHARS}]`]
  ]);
  var RAW_WHITESPACE_ESCAPES = /* @__PURE__ */ new Map([
    ["\n", "\\n"],
    ["\r", "\\r"],
    ["	", "\\t"],
    ["\f", "\\f"],
    ["\v", "\\v"]
  ]);
  var POSIX_CLASS_FRAGMENTS = /* @__PURE__ */ new Map([
    ["alpha", "\\p{Alphabetic}"],
    ["alnum", "\\p{Alphabetic}\\p{Nd}"],
    ["digit", "\\p{Nd}"],
    ["lower", "\\p{Lowercase}"],
    ["upper", "\\p{Uppercase}"],
    ["space", "\\p{White_Space}"],
    ["blank", "\\t\\p{Zs}"],
    ["punct", "\\p{P}\\p{S}"],
    ["cntrl", "\\p{Cc}"],
    ["word", UNICODE_WORD_CHARS_IN_CLASS],
    ["xdigit", HEX_DIGIT_CHARS]
  ]);
  var JS_SYNTAX_CHARS = "^$\\.*+?()[]{}|/";
  var GROUP_PREFIX_RE = /^\(\?(?:<[=!]|<[A-Za-z_][A-Za-z0-9_]*>|[:=!>])/;
  var BRACED_ESCAPE_RE = /^\\([pPxu])\{([^}]*)\}/;
  var QUANTIFIER_BRACE_RE = /^\{(\d+(?:,\d*)?|,\d+)\}/;
  var POSIX_BRACKET_RE = /^\[:(\^?)(\p{Alphabetic}+):\]/u;
  var EMPTY_NEGATED_POSIX_BRACKET_RE = /^\[:\^:\]/;
  var UNSUPPORTED_POSIX_BRACKET_RE = /^\[(?:\.[^\]]*\.\]|=[^\]]*=\])/;
  var FIXED_WIDTH_ESCAPE_RE = /^(?:\\x[0-9A-Fa-f]{2}|\\u[0-9A-Fa-f]{4}|\\c[A-Za-z])/;
  var is_ascii_letter = (char) => char >= "A" && char <= "Z" || char >= "a" && char <= "z";
  var character_at = (text, index) => String.fromCodePoint(text.codePointAt(index));
  var get_ascii_folded_hex_atom = (hex) => {
    if (!/^[0-9A-Fa-f]{1,8}$/.test(hex)) return null;
    const code_point = Number.parseInt(hex, 16);
    if (code_point > 127) return null;
    const letter = String.fromCharCode(code_point);
    return is_ascii_letter(letter) ? `[${letter.toLowerCase()}${letter.toUpperCase()}]` : null;
  };
  var normalize_bloom_split_char_class = (regex) => regex.replace(/\[\^\(\\s\|\[([^\]]+)\]\)\]/g, "[^()|\\s$1]");
  var ANY_CODE_POINT = "[\\s\\S]";
  var MAX_CHARACTER_CLASS_NESTING_DEPTH = 256;
  var create_character_class_operand = () => ({
    fragment: "",
    alternatives: [],
    tail: null,
    contains_complex_set: false
  });
  var throw_character_class_range_error = (index) => {
    throw new SyntaxError(
      `Unsupported range with a set-valued character-class operand at index ${index}`
    );
  };
  var add_character_class_atom = (operand, atom, index, contains_complex_set = true) => {
    if (operand.tail === "range") throw_character_class_range_error(index);
    operand.alternatives.push(atom);
    operand.tail = "set";
    operand.contains_complex_set = operand.contains_complex_set || contains_complex_set;
  };
  var append_character_class_fragment = (operand, fragment, set_valued = false, index = -1) => {
    if (set_valued && operand.tail === "range") {
      throw_character_class_range_error(index);
    }
    if (operand.tail === "range") {
      operand.fragment += fragment;
      operand.tail = "complete_range";
      return;
    }
    operand.fragment += fragment;
    operand.tail = set_valued ? "set" : "scalar";
    operand.contains_complex_set = operand.contains_complex_set || set_valued;
  };
  var rewrite_character_class_escape = (regex, index, operand) => {
    const braced = BRACED_ESCAPE_RE.exec(regex.slice(index));
    if (braced) {
      const [text, kind, body] = braced;
      if (kind === "P" && body === "Word") {
        add_character_class_atom(
          operand,
          `[^${UNICODE_WORD_CHARS_IN_CLASS}]`,
          index
        );
      } else {
        const replacement2 = kind === "x" ? `\\u{${body}}` : kind === "p" && body === "Word" ? UNICODE_WORD_CHARS_IN_CLASS : text;
        append_character_class_fragment(
          operand,
          replacement2,
          kind === "p" || kind === "P",
          index
        );
      }
      return index + text.length;
    }
    const fixed_width = FIXED_WIDTH_ESCAPE_RE.exec(regex.slice(index));
    if (fixed_width) {
      append_character_class_fragment(operand, fixed_width[0]);
      return index + fixed_width[0].length;
    }
    if (index + 1 >= regex.length) {
      throw new SyntaxError(
        `Unterminated escape in character class at index ${index}`
      );
    }
    const next = character_at(regex, index + 1);
    const next_end = index + 1 + next.length;
    const raw_whitespace = RAW_WHITESPACE_ESCAPES.get(next);
    if (raw_whitespace !== void 0) {
      append_character_class_fragment(operand, raw_whitespace);
      return next_end;
    }
    const complement = CLASS_COMPLEMENT_ALTERNATIVES.get(next);
    if (complement !== void 0) {
      add_character_class_atom(operand, complement, index);
      return next_end;
    }
    const rewrite = CLASS_ESCAPE_REWRITES.get(next);
    let replacement;
    let set_valued = false;
    if (rewrite !== void 0) {
      replacement = rewrite;
      set_valued = next !== "a" && next !== "e";
    } else if (/[A-Za-z0-9]/.test(next)) {
      replacement = `\\${next}`;
    } else if (JS_SYNTAX_CHARS.includes(next) || next === "-") {
      replacement = `\\${next}`;
    } else {
      replacement = next;
    }
    append_character_class_fragment(operand, replacement, set_valued, index);
    return next_end;
  };
  var compile_character_set_union = (pieces) => {
    if (pieces.length === 1) return pieces[0];
    return `(?:(?=(?:${pieces.join("|")}))${ANY_CODE_POINT})`;
  };
  var compile_character_class_operand = (operand) => {
    const pieces = operand.fragment.length === 0 ? operand.alternatives : [`[${operand.fragment}]`, ...operand.alternatives];
    return compile_character_set_union(pieces);
  };
  var get_ascii_fold_additions = (positive_atom) => {
    const membership = compile_unicode_regexp(`^(?:${positive_atom})$`, "u");
    let additions = "";
    for (let offset = 0; offset < 26; ++offset) {
      const upper = String.fromCharCode(65 + offset);
      const lower = String.fromCharCode(97 + offset);
      const has_upper = membership.test(upper);
      const has_lower = membership.test(lower);
      if (has_upper !== has_lower) additions += has_upper ? lower : upper;
    }
    return additions;
  };
  var parse_character_class = (regex, start, ascii_fold, apply_ascii_fold = true, nesting_depth = 1) => {
    if (nesting_depth > MAX_CHARACTER_CLASS_NESTING_DEPTH) {
      throw new SyntaxError(
        `Maximum character-class nesting depth of ${MAX_CHARACTER_CLASS_NESTING_DEPTH} exceeded at index ${start}`
      );
    }
    let i = start + 1;
    const negated = regex[i] === "^";
    if (negated) ++i;
    const first_content_index = i;
    const operands = [create_character_class_operand()];
    let operand = operands[0];
    let contains_nested_negated_complex_set = false;
    while (i < regex.length) {
      const char = character_at(regex, i);
      if (char === "\\") {
        i = rewrite_character_class_escape(regex, i, operand);
        continue;
      }
      if (char === "]") {
        if (i === first_content_index) {
          append_character_class_fragment(operand, "\\]");
          ++i;
          continue;
        }
        if (operand.tail === null) {
          if (operands.length > 1) {
            throw new SyntaxError(
              `Malformed character-class intersection with an empty operand at index ${i}`
            );
          }
          throw new SyntaxError(`Empty character class at index ${start}`);
        }
        const contains_complex_set = operands.some(
          (candidate) => candidate.contains_complex_set
        );
        if (negated && operands.length > 1 && contains_nested_negated_complex_set) {
          throw new SyntaxError(
            `Unsupported outer-negated character-class intersection with a nested negated class containing a Unicode property, POSIX class, or shorthand at index ${start}`
          );
        }
        const first_atom = compile_character_class_operand(operands[0]);
        let positive_atom = first_atom;
        if (operands.length > 1) {
          let lookaheads = "";
          for (let j2 = 1; j2 < operands.length; ++j2) {
            lookaheads += `(?=${compile_character_class_operand(operands[j2])})`;
          }
          positive_atom = `(?:${lookaheads}${first_atom})`;
        }
        const is_direct_class = operands.length === 1 && operand.alternatives.length === 0;
        let direct_fragment = operand.fragment;
        if (ascii_fold && apply_ascii_fold) {
          const additions = get_ascii_fold_additions(positive_atom);
          if (additions.length > 0) {
            if (is_direct_class) {
              direct_fragment += additions;
              positive_atom = `[${direct_fragment}]`;
            } else {
              positive_atom = compile_character_set_union([
                positive_atom,
                `[${additions}]`
              ]);
            }
          }
        }
        const atom = negated ? is_direct_class ? `[^${direct_fragment}]` : `(?:(?!${positive_atom})${ANY_CODE_POINT})` : positive_atom;
        return {
          atom,
          end: i + 1,
          negated,
          contains_complex_set,
          contains_nested_negated_complex_set
        };
      }
      if (regex.startsWith("&&", i)) {
        if (operand.tail === null) {
          throw new SyntaxError(
            `Malformed character-class intersection with an empty operand at index ${i}`
          );
        }
        operand = create_character_class_operand();
        operands.push(operand);
        i += 2;
        continue;
      }
      if (char === "[") {
        const suffix = regex.slice(i);
        if (EMPTY_NEGATED_POSIX_BRACKET_RE.test(suffix)) {
          throw new SyntaxError(
            `Malformed empty negated POSIX character class at index ${i}`
          );
        }
        const posix = POSIX_BRACKET_RE.exec(suffix);
        if (posix) {
          const [, posix_negated, name] = posix;
          const fragment = POSIX_CLASS_FRAGMENTS.get(name);
          if (fragment === void 0) {
            throw new SyntaxError(
              `Unsupported POSIX character class "${name}" at index ${i}`
            );
          }
          if (ascii_fold && posix_negated && (name === "lower" || name === "upper")) {
            throw new SyntaxError(
              `Unsupported negated POSIX ${name} class inside an inline case-insensitive group`
            );
          }
          if (posix_negated) {
            add_character_class_atom(operand, `[^${fragment}]`, i);
          } else {
            append_character_class_fragment(operand, fragment, true, i);
          }
          i += posix[0].length;
          continue;
        }
        if (UNSUPPORTED_POSIX_BRACKET_RE.test(suffix)) {
          throw new SyntaxError(
            `Unsupported POSIX collating or equivalence bracket expression at index ${i}`
          );
        }
        const nested = parse_character_class(
          regex,
          i,
          ascii_fold,
          false,
          nesting_depth + 1
        );
        add_character_class_atom(
          operand,
          nested.atom,
          i,
          nested.contains_complex_set
        );
        contains_nested_negated_complex_set ||= nested.contains_nested_negated_complex_set || nested.negated && nested.contains_complex_set;
        i = nested.end;
        continue;
      }
      if (char === "-") {
        const is_terminal_literal = regex[i + 1] === "]" || regex.startsWith("&&", i + 1);
        if (operand.tail === "set" && !is_terminal_literal) {
          throw_character_class_range_error(i);
        }
        if (operand.tail === null || operand.tail === "range" || operand.tail === "complete_range" || is_terminal_literal) {
          append_character_class_fragment(operand, "\\-");
        } else {
          operand.fragment += "-";
          operand.tail = "range";
        }
        ++i;
        continue;
      }
      append_character_class_fragment(
        operand,
        char === "^" && operand.fragment.length === 0 ? "\\^" : char
      );
      i += char.length;
    }
    throw new SyntaxError(
      `${operands.length > 1 ? "Unterminated character-class intersection" : "Unterminated character class"} at index ${start}`
    );
  };
  var rewrite_oniguruma_to_js = (regex) => {
    let out = "";
    let atom_start = -1;
    let last_was_quantifier = false;
    let ascii_fold = false;
    const group_states = [];
    const emit_atom = (text) => {
      atom_start = out.length;
      out += text;
      last_was_quantifier = false;
    };
    for (let i = 0; i < regex.length; ) {
      const char = character_at(regex, i);
      if (char === "\\") {
        const braced = BRACED_ESCAPE_RE.exec(regex.slice(i));
        if (braced) {
          const [text, kind, body] = braced;
          let replacement2 = text;
          if (kind === "x") {
            const code_point_escape = `\\u{${body}}`;
            replacement2 = ascii_fold ? get_ascii_folded_hex_atom(body) ?? code_point_escape : code_point_escape;
          } else if (body === "Word") {
            replacement2 = kind === "p" ? UNICODE_WORD_CLASS : UNICODE_NON_WORD_CLASS;
          }
          emit_atom(replacement2);
          i += text.length;
          continue;
        }
        const fixed_width = FIXED_WIDTH_ESCAPE_RE.exec(regex.slice(i));
        if (fixed_width) {
          const text = fixed_width[0];
          const replacement2 = ascii_fold && text[1] !== "c" ? get_ascii_folded_hex_atom(text.slice(2)) ?? text : text;
          emit_atom(replacement2);
          i += text.length;
          continue;
        }
        if (i + 1 >= regex.length) {
          out += char;
          break;
        }
        const next = character_at(regex, i + 1);
        i += 1 + next.length;
        if (next === "G") {
          continue;
        }
        const raw_whitespace = RAW_WHITESPACE_ESCAPES.get(next);
        if (raw_whitespace !== void 0) {
          emit_atom(raw_whitespace);
          continue;
        }
        const rewrite = ESCAPE_REWRITES.get(next);
        let replacement;
        if (rewrite !== void 0) {
          replacement = rewrite;
        } else if (/[A-Za-z0-9]/.test(next)) {
          replacement = `\\${next}`;
        } else if (JS_SYNTAX_CHARS.includes(next)) {
          replacement = `\\${next}`;
        } else {
          replacement = next;
        }
        emit_atom(replacement);
        continue;
      }
      switch (char) {
        case "[": {
          const parsed = parse_character_class(regex, i, ascii_fold);
          emit_atom(parsed.atom);
          i = parsed.end;
          continue;
        }
        case "]":
          emit_atom("\\]");
          ++i;
          continue;
        case ".":
          emit_atom("[^\\n]");
          ++i;
          continue;
        case "^":
          emit_atom(LINE_START_ANCHOR);
          ++i;
          continue;
        case "$":
          emit_atom(LINE_END_ANCHOR);
          ++i;
          continue;
        case "(": {
          const inline_case_insensitive = regex.startsWith("(?i:", i);
          const source_prefix = inline_case_insensitive ? "(?i:" : GROUP_PREFIX_RE.exec(regex.slice(i))?.[0] ?? "(";
          const output_prefix = inline_case_insensitive ? "(?:" : source_prefix === "(?>" ? "(?:" : source_prefix;
          group_states.push([out.length, ascii_fold]);
          if (inline_case_insensitive) ascii_fold = true;
          out += output_prefix;
          last_was_quantifier = false;
          i += source_prefix.length;
          continue;
        }
        case ")":
          out += char;
          [atom_start, ascii_fold] = group_states.pop() ?? [-1, false];
          last_was_quantifier = false;
          ++i;
          continue;
        case "|":
          out += char;
          atom_start = -1;
          last_was_quantifier = false;
          ++i;
          continue;
        case "{": {
          const quant = QUANTIFIER_BRACE_RE.exec(regex.slice(i));
          if (!quant || atom_start < 0) {
            emit_atom("\\{");
            ++i;
            continue;
          }
          const body = quant[1].startsWith(",") ? `0${quant[1]}` : quant[1];
          i += quant[0].length;
          const following = regex[i];
          if (following === "+" || following === "*") {
            out = `${out.slice(0, atom_start)}(?:${out.slice(atom_start)}{${body}})${following}`;
            ++i;
          } else {
            out += `{${body}}`;
          }
          last_was_quantifier = true;
          continue;
        }
        case "}":
          emit_atom("\\}");
          ++i;
          continue;
        case "+":
          if (last_was_quantifier) {
            ++i;
            continue;
          }
          out += char;
          last_was_quantifier = true;
          ++i;
          continue;
        case "*":
        case "?":
          out += char;
          last_was_quantifier = true;
          ++i;
          continue;
        default:
          emit_atom(
            ascii_fold && is_ascii_letter(char) ? `[${char.toLowerCase()}${char.toUpperCase()}]` : char
          );
          i += char.length;
          continue;
      }
    }
    return out;
  };
  var escape_reg_exp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var fuse_unk = (arr, tokens_to_ids, unk_token_id) => {
    const fused = [];
    let i = 0;
    while (i < arr.length) {
      fused.push(arr[i]);
      const token_id = tokens_to_ids.get(arr[i]) ?? unk_token_id;
      if (token_id !== unk_token_id) {
        ++i;
        continue;
      }
      while (++i < arr.length && (tokens_to_ids.get(arr[i]) ?? unk_token_id) === unk_token_id) {
        if (tokens_to_ids.get(fused.at(-1)) !== unk_token_id) {
          fused[fused.length - 1] += arr[i];
        }
      }
    }
    return fused;
  };
  var is_chinese_char = (cp) => cp >= 19968 && cp <= 40959 || cp >= 13312 && cp <= 19903 || cp >= 131072 && cp <= 173791 || cp >= 173824 && cp <= 177983 || cp >= 177984 && cp <= 178207 || cp >= 178208 && cp <= 183983 || cp >= 63744 && cp <= 64255 || cp >= 194560 && cp <= 195103;
  var is_integral_number = (x) => Number.isInteger(x) || typeof x === "bigint";
  var len = (s) => {
    let length = 0;
    for (const c of s) ++length;
    return length;
  };
  var lowercase_and_remove_accents = (text) => remove_accents(text.toLowerCase());
  var merge_arrays = (...arrs) => Array.prototype.concat.apply([], arrs);
  var object_to_map = (obj) => new Map(Object.entries(obj));
  var regex_split = (text, regex) => {
    const result = [];
    let prev = 0;
    for (const match of text.matchAll(regex)) {
      const full_match = match[0];
      if (prev < match.index) {
        result.push(text.slice(prev, match.index));
      }
      if (full_match.length > 0) {
        result.push(full_match);
      }
      prev = match.index + full_match.length;
    }
    if (prev < text.length) {
      result.push(text.slice(prev));
    }
    return result;
  };
  var remove_accents = (text) => text.replace(/\p{M}/gu, "");
  var validate_object = (obj, name, required_keys = []) => {
    if (!obj || Array.isArray(obj) || typeof obj !== "object") {
      return `${name} must be a valid object`;
    }
    for (const key of required_keys) {
      if (!(key in obj)) {
        return `${name} must contain a "${key}" property`;
      }
    }
    return null;
  };
  var whitespace_split = (text) => text.match(/\S+/g) || [];
  var Callable2 = class {
    /**
     * Creates a new instance of the Callable class.
     */
    constructor() {
      const closure = function(...args) {
        return closure._call(...args);
      };
      return Object.setPrototypeOf(closure, new.target.prototype);
    }
  };
  var Callable_default = Callable2;
  var Normalizer = class extends Callable_default {
    /**
     * @param config The configuration object for the normalizer.
     */
    constructor(config) {
      super();
      this.config = config;
    }
    /**
     * Alias for {@link Normalizer#normalize}.
     * @param text The text to normalize.
     * @returns The normalized text.
     */
    _call(text) {
      return this.normalize(text);
    }
  };
  var Normalizer_default = Normalizer;
  var BertNormalizer = class extends Normalizer_default {
    /**
     * Adds whitespace around any CJK (Chinese, Japanese, or Korean) character in the input text.
     *
     * @param text The input text to tokenize.
     * @returns The tokenized text with whitespace added around CJK characters.
     */
    tokenize_chinese_chars(text) {
      const output = [];
      for (let i = 0; i < text.length; ++i) {
        const char = text[i];
        const cp = char.charCodeAt(0);
        if (is_chinese_char(cp)) {
          output.push(" ");
          output.push(char);
          output.push(" ");
        } else {
          output.push(char);
        }
      }
      return output.join("");
    }
    /**
     * Strips accents from the given text.
     * @param text The text to strip accents from.
     * @returns The text with accents removed.
     */
    strip_accents(text) {
      return text.normalize("NFD").replace(/\p{Mn}/gu, "");
    }
    /**
     * Checks whether `char` is a control character.
     * @param char The character to check.
     * @returns Whether `char` is a control character.
     */
    is_control(char) {
      switch (char) {
        case "	":
        case "\n":
        case "\r":
          return false;
        default:
          return /^\p{Cc}|\p{Cf}|\p{Co}|\p{Cs}$/u.test(char);
      }
    }
    /**
     * Performs invalid character removal and whitespace cleanup on text.
     * @param text The text to clean.
     * @returns The cleaned text.
     */
    clean_text(text) {
      const output = [];
      for (const char of text) {
        const cp = char.charCodeAt(0);
        if (cp === 0 || cp === 65533 || this.is_control(char)) {
          continue;
        }
        if (/^\s$/.test(char)) {
          output.push(" ");
        } else {
          output.push(char);
        }
      }
      return output.join("");
    }
    /**
     * Normalizes the given text based on the configuration.
     * @param text The text to normalize.
     * @returns The normalized text.
     */
    normalize(text) {
      if (this.config.clean_text) {
        text = this.clean_text(text);
      }
      if (this.config.handle_chinese_chars) {
        text = this.tokenize_chinese_chars(text);
      }
      if (this.config.lowercase) {
        text = text.toLowerCase();
        if (this.config.strip_accents !== false) {
          text = this.strip_accents(text);
        }
      } else if (this.config.strip_accents) {
        text = this.strip_accents(text);
      }
      return text;
    }
  };
  var BertNormalizer_default = BertNormalizer;
  var Precompiled = class extends Normalizer_default {
    /**
     * Create a new instance of Precompiled normalizer.
     * @param config The configuration object.
     */
    constructor(config) {
      super(config);
      this.charsmap = config.precompiled_charsmap ?? null;
    }
    /**
     * Normalizes the given text by applying the precompiled charsmap.
     * @param text The text to normalize.
     * @returns The normalized text.
     */
    normalize(text) {
      text = text.replace(
        /[\u0001-\u0008\u000B\u000E-\u001F\u007F\u008F\u009F]/gm,
        ""
      );
      text = text.replace(
        /[\u0009\u000A\u000C\u000D\u00A0\u1680\u2000-\u200F\u2028\u2029\u202F\u205F\u2581\u3000\uFEFF\uFFFD]/gm,
        " "
      );
      if (text.includes("\uFF5E")) {
        const parts = text.split("\uFF5E");
        text = parts.map((part) => part.normalize("NFKC")).join("\uFF5E");
      } else {
        text = text.normalize("NFKC");
      }
      return text;
    }
  };
  var Precompiled_default = Precompiled;
  var Sequence = class extends Normalizer_default {
    /**
     * Create a new instance of NormalizerSequence.
     * @param config The configuration object.
     */
    constructor(config) {
      super(config);
      this.normalizers = (config.normalizers ?? []).map(
        (x) => create_normalizer_default(x)
      );
    }
    /**
     * Apply a sequence of Normalizers to the input text.
     * @param text The text to normalize.
     * @returns The normalized text.
     */
    normalize(text) {
      return this.normalizers.reduce((t, normalizer) => {
        return normalizer ? normalizer.normalize(t) : t;
      }, text);
    }
  };
  var Sequence_default = Sequence;
  var Replace = class extends Normalizer_default {
    /**
     * @param config The configuration object for the normalizer.
     */
    constructor(config) {
      super(config);
      this.pattern = create_pattern(this.config.pattern ?? {});
    }
    /**
     * Normalize the input text by replacing the pattern with the content.
     * @param text The input text to be normalized.
     * @returns The normalized text after replacing the pattern with the content.
     */
    normalize(text) {
      return this.pattern === null ? text : text.replaceAll(this.pattern, this.config.content ?? "");
    }
  };
  var Replace_default = Replace;
  var UnicodeNormalizer = class extends Normalizer_default {
    constructor() {
      super(...arguments);
      this.form = "NFC";
    }
    /**
     * Normalize the input text by applying Unicode normalization.
     * @param text The input text to be normalized.
     * @returns The normalized text.
     */
    normalize(text) {
      text = text.normalize(this.form);
      return text;
    }
  };
  var UnicodeNormalizer_default = UnicodeNormalizer;
  var NFC = class extends UnicodeNormalizer_default {
    constructor() {
      super(...arguments);
      this.form = "NFC";
    }
  };
  var NFC_default = NFC;
  var NFD = class extends UnicodeNormalizer_default {
    constructor() {
      super(...arguments);
      this.form = "NFD";
    }
  };
  var NFD_default = NFD;
  var NFKC = class extends UnicodeNormalizer_default {
    constructor() {
      super(...arguments);
      this.form = "NFKC";
    }
  };
  var NFKC_default = NFKC;
  var NFKD = class extends UnicodeNormalizer_default {
    constructor() {
      super(...arguments);
      this.form = "NFKD";
    }
  };
  var NFKD_default = NFKD;
  var Strip = class extends Normalizer_default {
    /**
     * Strip leading and/or trailing whitespace from the input text.
     * @param text The input text.
     * @returns The normalized text.
     */
    normalize(text) {
      if (this.config.strip_left && this.config.strip_right) {
        text = text.trim();
      } else {
        if (this.config.strip_left) {
          text = text.trimStart();
        }
        if (this.config.strip_right) {
          text = text.trimEnd();
        }
      }
      return text;
    }
  };
  var Strip_default = Strip;
  var StripAccents = class extends Normalizer_default {
    /**
     * Remove all accents from the text.
     * @param text The input text.
     * @returns The normalized text without accents.
     */
    normalize(text) {
      return remove_accents(text);
    }
  };
  var StripAccents_default = StripAccents;
  var Lowercase = class extends Normalizer_default {
    /**
     * Lowercases the input string.
     * @param {string} text The text to normalize.
     * @returns {string} The normalized text.
     */
    normalize(text) {
      return text.toLowerCase();
    }
  };
  var Lowercase_default = Lowercase;
  var Prepend = class extends Normalizer_default {
    /**
     * Prepends the input string.
     * @param text The text to normalize.
     * @returns The normalized text.
     */
    normalize(text) {
      text = this.config.prepend + text;
      return text;
    }
  };
  var Prepend_default = Prepend;
  function create_normalizer(config) {
    if (config === null) return null;
    switch (config.type) {
      case "BertNormalizer":
        return new BertNormalizer_default(config);
      case "Precompiled":
        return new Precompiled_default(config);
      case "Sequence":
        return new Sequence_default(config);
      case "Replace":
        return new Replace_default(config);
      case "NFC":
        return new NFC_default(config);
      case "NFD":
        return new NFD_default(config);
      case "NFKC":
        return new NFKC_default(config);
      case "NFKD":
        return new NFKD_default(config);
      case "Strip":
        return new Strip_default(config);
      case "StripAccents":
        return new StripAccents_default(config);
      case "Lowercase":
        return new Lowercase_default(config);
      case "Prepend":
        return new Prepend_default(config);
      default:
        throw new Error(`Unknown Normalizer type: ${config.type}`);
    }
  }
  var create_normalizer_default = create_normalizer;
  var PreTokenizer = class extends Callable_default {
    /**
     * Tokenizes the given text into pre-tokens.
     * @param text The text or array of texts to pre-tokenize.
     * @param options Additional options for the pre-tokenization logic.
     * @returns An array of pre-tokens.
     */
    pre_tokenize(text, options) {
      return (Array.isArray(text) ? text.map((x) => this.pre_tokenize_text(x, options)) : this.pre_tokenize_text(text, options)).flat();
    }
    /**
     * Alias for {@link PreTokenizer#pre_tokenize}.
     * @param text The text or array of texts to pre-tokenize.
     * @param options Additional options for the pre-tokenization logic.
     * @returns An array of pre-tokens.
     */
    _call(text, options) {
      return this.pre_tokenize(text, options);
    }
  };
  var PreTokenizer_default = PreTokenizer;
  var BYTES_TO_UNICODE = (() => {
    const bs2 = [
      ...Array.from(
        { length: "~".charCodeAt(0) - "!".charCodeAt(0) + 1 },
        (_, i) => i + "!".charCodeAt(0)
      ),
      ...Array.from(
        { length: "\xAC".charCodeAt(0) - "\xA1".charCodeAt(0) + 1 },
        (_, i) => i + "\xA1".charCodeAt(0)
      ),
      ...Array.from(
        { length: "\xFF".charCodeAt(0) - "\xAE".charCodeAt(0) + 1 },
        (_, i) => i + "\xAE".charCodeAt(0)
      )
    ];
    const cs2 = bs2.slice();
    let n = 0;
    for (let b = 0; b < 256; ++b) {
      if (!bs2.includes(b)) {
        bs2.push(b);
        cs2.push(256 + n);
        n += 1;
      }
    }
    const ccs = cs2.map((n2) => String.fromCharCode(n2));
    return Object.fromEntries(bs2.map((b, i) => [b, ccs[i]]));
  })();
  var reverse_dictionary = (data) => Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]));
  var UNICODE_TO_BYTES = reverse_dictionary(BYTES_TO_UNICODE);
  var PUNCTUATION_REGEX = "\\p{P}\\u0021-\\u002F\\u003A-\\u0040\\u005B-\\u0060\\u007B-\\u007E";
  var ByteLevel = class extends PreTokenizer_default {
    /**
     * Creates a new instance of the `ByteLevelPreTokenizer` class.
     * @param config The configuration object.
     */
    constructor(config) {
      super();
      this.config = config;
      this.add_prefix_space = this.config.add_prefix_space ?? false;
      this.trim_offsets = this.config.trim_offsets ?? false;
      this.use_regex = this.config.use_regex ?? true;
      this.pattern = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
      this.byte_encoder = BYTES_TO_UNICODE;
      this.text_encoder = new TextEncoder();
    }
    /**
     * Tokenizes a single piece of text using byte-level tokenization.
     * @param text The text to tokenize.
     * @param options Additional options for the pre-tokenization logic.
     * @returns An array of tokens.
     */
    pre_tokenize_text(text, options) {
      if (this.add_prefix_space && !text.startsWith(" ")) {
        text = " " + text;
      }
      const tokens = this.use_regex ? text.match(this.pattern) || [] : [text];
      return tokens.map(
        (token) => Array.from(
          this.text_encoder.encode(token),
          (byte) => this.byte_encoder[byte]
        ).join("")
      );
    }
  };
  var ByteLevel_default = ByteLevel;
  var Whitespace = class extends PreTokenizer_default {
    /**
     * Pre-tokenizes the input text by splitting it on word boundaries.
     * @param text The text to be pre-tokenized.
     * @param options Additional options for the pre-tokenization logic.
     * @returns An array of tokens produced by splitting the input text on whitespace.
     */
    pre_tokenize_text(text, options) {
      return text.match(/\w+|[^\w\s]+/g) || [];
    }
  };
  var Whitespace_default = Whitespace;
  var Metaspace = class extends PreTokenizer_default {
    /**
     * @param config The configuration object for the MetaspacePreTokenizer.
     */
    constructor(config) {
      super();
      this.replacement = config.replacement ?? "\u2581";
      this.str_rep = config.str_rep || this.replacement;
      this.prepend_scheme = config.prepend_scheme ?? "always";
    }
    /**
     * This method takes a string, replaces spaces with the replacement character,
     * adds a prefix space if requested, and returns a new list of tokens.
     * @param text The text to pre-tokenize.
     * @param options The options for the pre-tokenization.
     * @returns A new list of pre-tokenized tokens.
     */
    pre_tokenize_text(text, options) {
      const { section_index = void 0 } = options ?? {};
      let normalized = text.replaceAll(" ", this.str_rep);
      if (
        // We add a prefix space if:
        //  (1) The normalized token does not already start with the replacement character.
        !normalized.startsWith(this.replacement) && // and (2) either:
        //  (a) prepend_scheme is 'always'
        //  (b) prepend_scheme is 'first' and this is the first section
        (this.prepend_scheme === "always" || this.prepend_scheme === "first" && section_index === 0)
      ) {
        normalized = this.str_rep + normalized;
      }
      return [normalized];
    }
  };
  var Metaspace_default = Metaspace;
  var Split = class extends PreTokenizer_default {
    /**
     * @param config The configuration options for the pre-tokenizer.
     */
    constructor(config) {
      super();
      this.config = config;
      this.pattern = create_pattern(
        this.config.pattern ?? {},
        this.config.invert ?? true
      );
    }
    /**
     * Tokenizes text by splitting it using the given pattern.
     * @param text The text to tokenize.
     * @returns An array of tokens.
     */
    pre_tokenize_text(text) {
      if (this.pattern === null) {
        return [];
      }
      if (this.config.invert) {
        return (text.match(this.pattern) || []).filter((x) => x);
      } else if (this.config.behavior?.toLowerCase() === "removed") {
        return text.split(this.pattern).filter((x) => x);
      } else {
        return regex_split(text, this.pattern);
      }
    }
  };
  var Split_default = Split;
  var Punctuation = class extends PreTokenizer_default {
    /**
     * @param config The configuration options for the pre-tokenizer.
     */
    constructor(config) {
      super();
      this.config = config;
      this.pattern = new RegExp(
        `[^${PUNCTUATION_REGEX}]+|[${PUNCTUATION_REGEX}]+`,
        "gu"
      );
    }
    /**
     * Tokenizes text by splitting it using the given pattern.
     * @param text The text to tokenize.
     * @returns An array of tokens.
     */
    pre_tokenize_text(text) {
      return text.match(this.pattern) || [];
    }
  };
  var Punctuation_default = Punctuation;
  var Digits = class extends PreTokenizer_default {
    /**
     * @param config The configuration options for the pre-tokenizer.
     */
    constructor(config) {
      super();
      this.config = config;
      const digit_pattern = `[^\\d]+|\\d${this.config.individual_digits ? "" : "+"}`;
      this.pattern = new RegExp(digit_pattern, "gu");
    }
    /**
     * Tokenizes text by splitting it using the given pattern.
     * @param text The text to tokenize.
     * @returns An array of tokens.
     */
    pre_tokenize_text(text) {
      return text.match(this.pattern) || [];
    }
  };
  var Digits_default = Digits;
  var BertPreTokenizer = class extends PreTokenizer_default {
    /**
     * A PreTokenizer that splits text into wordpieces using a basic tokenization scheme
     * similar to that used in the original implementation of BERT.
     */
    constructor() {
      super();
      this.pattern = new RegExp(
        `[^\\s${PUNCTUATION_REGEX}]+|[${PUNCTUATION_REGEX}]`,
        "gu"
      );
    }
    /**
     * Tokenizes a single text using the BERT pre-tokenization scheme.
     *
     * @param text The text to tokenize.
     * @param options Additional options for the pre-tokenization logic.
     * @returns An array of tokens.
     */
    pre_tokenize_text(text, options) {
      return text.trim().match(this.pattern) || [];
    }
  };
  var BertPreTokenizer_default = BertPreTokenizer;
  var Replace2 = class extends PreTokenizer_default {
    /**
     * @param config The configuration options for the pre-tokenizer.
     */
    constructor(config) {
      super();
      this.config = config;
      this.pattern = create_pattern(this.config.pattern ?? {});
      this.content = this.config.content ?? "";
    }
    /**
     * Pre-tokenizes the input text by replacing certain characters.
     * @param text The text to be pre-tokenized.
     * @returns An array of tokens produced by replacing certain characters.
     */
    pre_tokenize_text(text) {
      if (this.pattern === null) {
        return [text];
      }
      return [text.replaceAll(this.pattern, this.config.content ?? "")];
    }
  };
  var Replace_default2 = Replace2;
  var Sequence2 = class extends PreTokenizer_default {
    /**
     * Creates an instance of PreTokenizerSequence.
     * @param config The configuration object for the pre-tokenizer sequence.
     */
    constructor(config) {
      super();
      this.tokenizers = (config.pretokenizers ?? []).map(
        (x) => create_pre_tokenizer_default(x)
      );
    }
    /**
     * Applies each pre-tokenizer in the sequence to the input text in turn.
     * @param text The text to pre-tokenize.
     * @param options Additional options for the pre-tokenization logic.
     * @returns The pre-tokenized text.
     */
    pre_tokenize_text(text, options) {
      return this.tokenizers.reduce(
        (pre_tokenized_text, tokenizer2) => {
          return tokenizer2 ? tokenizer2.pre_tokenize(pre_tokenized_text, options) : pre_tokenized_text;
        },
        [text]
      );
    }
  };
  var Sequence_default2 = Sequence2;
  var WhitespaceSplit = class extends PreTokenizer_default {
    /**
     * Pre-tokenizes the input text by splitting it on whitespace characters.
     * @param text The text to be pre-tokenized.
     * @returns An array of tokens produced by splitting the input text on whitespace.
     */
    pre_tokenize_text(text) {
      return whitespace_split(text);
    }
  };
  var WhitespaceSplit_default = WhitespaceSplit;
  var FixedLength = class extends PreTokenizer_default {
    /**
     * @param config The configuration options for the pre-tokenizer.
     */
    constructor(config) {
      super();
      this.config = config;
      this._length = config.length;
    }
    /**
     * Pre-tokenizes the input text by splitting it into fixed-length tokens.
     * @param text The text to be pre-tokenized.
     * @returns An array of tokens produced by splitting the input text into fixed-length tokens.
     */
    pre_tokenize_text(text) {
      const tokens = [];
      for (let i = 0; i < text.length; i += this._length) {
        tokens.push(text.slice(i, i + this._length));
      }
      return tokens;
    }
  };
  var FixedLength_default = FixedLength;
  function create_pre_tokenizer(config) {
    if (config === null) return null;
    switch (config.type) {
      case "BertPreTokenizer":
        return new BertPreTokenizer_default();
      case "Sequence":
        return new Sequence_default2(config);
      case "Whitespace":
        return new Whitespace_default();
      case "WhitespaceSplit":
        return new WhitespaceSplit_default();
      case "Metaspace":
        return new Metaspace_default(config);
      case "ByteLevel":
        return new ByteLevel_default(config);
      case "Split":
        return new Split_default(config);
      case "Punctuation":
        return new Punctuation_default(config);
      case "Digits":
        return new Digits_default(config);
      case "Replace":
        return new Replace_default2(config);
      case "FixedLength":
        return new FixedLength_default(config);
      default:
        throw new Error(`Unknown PreTokenizer type: ${config.type}`);
    }
  }
  var create_pre_tokenizer_default = create_pre_tokenizer;
  var TokenizerModel = class extends Callable_default {
    /**
     * Creates a new instance of TokenizerModel.
     * @param config The configuration object for the TokenizerModel.
     */
    constructor(config) {
      super();
      this.config = config;
      this.vocab = [];
      this.tokens_to_ids = /* @__PURE__ */ new Map();
      this.unk_token_id = void 0;
      this.unk_token = void 0;
      this.end_of_word_suffix = void 0;
      this.fuse_unk = this.config.fuse_unk ?? false;
    }
    /**
     * Internal function to call the TokenizerModel instance.
     * @param tokens The tokens to encode.
     * @returns The encoded tokens.
     */
    _call(tokens) {
      let result = this.encode(tokens);
      if (this.fuse_unk) {
        result = fuse_unk(result, this.tokens_to_ids, this.unk_token_id);
      }
      return result;
    }
  };
  var TokenizerModel_default = TokenizerModel;
  var WordPieceTokenizer = class extends TokenizerModel_default {
    /**
     * @param config The configuration object.
     */
    constructor(config) {
      super(config);
      this.max_input_chars_per_word = 100;
      this.tokens_to_ids = object_to_map(config.vocab);
      this.unk_token_id = this.tokens_to_ids.get(config.unk_token);
      this.unk_token = config.unk_token;
      this.max_input_chars_per_word = config.max_input_chars_per_word ?? 100;
      this.vocab = new Array(this.tokens_to_ids.size);
      for (const [key, value] of this.tokens_to_ids) {
        this.vocab[value] = key;
      }
    }
    /**
     * Encodes an array of tokens using WordPiece encoding.
     * @param tokens The tokens to encode.
     * @returns An array of encoded tokens.
     */
    encode(tokens) {
      const output_tokens = [];
      for (const token of tokens) {
        const chars = [...token];
        if (chars.length > this.max_input_chars_per_word) {
          output_tokens.push(this.unk_token);
          continue;
        }
        let is_unknown = false;
        let start = 0;
        const sub_tokens = [];
        while (start < chars.length) {
          let end = chars.length;
          let current_substring = null;
          while (start < end) {
            let substr = chars.slice(start, end).join("");
            if (start > 0) {
              substr = this.config.continuing_subword_prefix + substr;
            }
            if (this.tokens_to_ids.has(substr)) {
              current_substring = substr;
              break;
            }
            --end;
          }
          if (current_substring === null) {
            is_unknown = true;
            break;
          }
          sub_tokens.push(current_substring);
          start = end;
        }
        if (is_unknown) {
          output_tokens.push(this.unk_token);
        } else {
          output_tokens.push(...sub_tokens);
        }
      }
      return output_tokens;
    }
  };
  var WordPiece_default = WordPieceTokenizer;
  var CharTrieNode = class _CharTrieNode {
    /**
     * Create a new CharTrieNode.
     * @param is_leaf Whether the node is a leaf node or not.
     * @param children A map containing the node's children, where the key is a character and the value is a `CharTrieNode`.
     */
    constructor(is_leaf, children) {
      this.is_leaf = is_leaf;
      this.children = children;
    }
    /**
     * Returns a new `CharTrieNode` instance with default values.
     * @returns A new `CharTrieNode` instance with `is_leaf` set to `false` and an empty `children` map.
     */
    static default() {
      return new _CharTrieNode(false, /* @__PURE__ */ new Map());
    }
  };
  var CharTrie = class {
    constructor() {
      this.root = CharTrieNode.default();
    }
    /**
     * Adds one or more `texts` to the trie.
     * @param texts The strings to add to the trie.
     */
    extend(texts) {
      for (const text of texts) {
        this.push(text);
      }
    }
    /**
     * Adds text to the trie.
     * @param text The string to add to the trie.
     */
    push(text) {
      let node = this.root;
      for (const ch of text) {
        let child = node.children.get(ch);
        if (child === void 0) {
          child = CharTrieNode.default();
          node.children.set(ch, child);
        }
        node = child;
      }
      node.is_leaf = true;
    }
    /**
     * Searches the trie for stored strings that match `chars` starting at `start`.
     * @param chars The input characters to search.
     * @param start The index to start searching from.
     * @yields Each stored string that is a prefix of `chars` starting at `start`.
     */
    *common_prefix_search(chars, start = 0) {
      let node = this.root;
      if (node === void 0) return;
      let prefix = "";
      for (let i = start; i < chars.length; ++i) {
        const ch = chars[i];
        prefix += ch;
        node = node.children.get(ch);
        if (node === void 0) return;
        if (node.is_leaf) {
          yield prefix;
        }
      }
    }
  };
  var CharTrie_default = CharTrie;
  var TokenLatticeNode = class _TokenLatticeNode {
    /**
     * Represents a node in a token lattice for a given sentence.
     * @param token_id The ID of the token associated with this node.
     * @param node_id The ID of this node.
     * @param pos The starting position of the token in the sentence.
     * @param length The length of the token.
     * @param score The score associated with the token.
     */
    constructor(token_id, node_id, pos, length, score) {
      this.token_id = token_id;
      this.node_id = node_id;
      this.pos = pos;
      this.length = length;
      this.score = score;
      this.prev = null;
      this.backtrace_score = 0;
    }
    /**
     * Returns a clone of this node.
     * @returns A clone of this node.
     */
    clone() {
      const n = new _TokenLatticeNode(
        this.token_id,
        this.node_id,
        this.pos,
        this.length,
        this.score
      );
      n.prev = this.prev;
      n.backtrace_score = this.backtrace_score;
      return n;
    }
  };
  var TokenLattice = class {
    /**
     * Creates a new TokenLattice instance.
     *
     * @param sentence The input sentence to be tokenized.
     * @param bos_token_id The beginning-of-sequence token ID.
     * @param eos_token_id The end-of-sequence token ID.
     */
    constructor(sentence, bos_token_id, eos_token_id) {
      this.chars = Array.from(sentence);
      this.len = this.chars.length;
      this.bos_token_id = bos_token_id;
      this.eos_token_id = eos_token_id;
      this.nodes = [];
      this.begin_nodes = Array.from(
        { length: this.len + 1 },
        () => []
      );
      this.end_nodes = Array.from({ length: this.len + 1 }, () => []);
      const bos = new TokenLatticeNode(this.bos_token_id ?? 0, 0, 0, 0, 0);
      const eos = new TokenLatticeNode(
        this.eos_token_id ?? 0,
        1,
        this.len,
        0,
        0
      );
      this.nodes.push(bos.clone());
      this.nodes.push(eos.clone());
      this.begin_nodes[this.len].push(eos);
      this.end_nodes[0].push(bos);
    }
    /**
     * Inserts a new token node into the token lattice.
     *
     * @param pos The starting position of the token.
     * @param length The length of the token.
     * @param score The score of the token.
     * @param token_id The token ID of the token.
     */
    insert(pos, length, score, token_id) {
      const node_id = this.nodes.length;
      const node = new TokenLatticeNode(token_id, node_id, pos, length, score);
      this.begin_nodes[pos].push(node);
      this.end_nodes[pos + length].push(node);
      this.nodes.push(node);
    }
    /**
     * Implements the Viterbi algorithm to compute the most likely sequence of tokens.
     *
     * @returns The most likely sequence of tokens.
     */
    viterbi() {
      const len2 = this.len;
      let pos = 0;
      while (pos <= len2) {
        if (this.begin_nodes[pos].length == 0) {
          return [];
        }
        for (let rnode of this.begin_nodes[pos]) {
          rnode.prev = null;
          let best_score = 0;
          let best_node = null;
          for (let lnode of this.end_nodes[pos]) {
            const score = lnode.backtrace_score + rnode.score;
            if (best_node === null || score > best_score) {
              best_node = lnode.clone();
              best_score = score;
            }
          }
          if (best_node !== null) {
            rnode.prev = best_node;
            rnode.backtrace_score = best_score;
          } else {
            return [];
          }
        }
        ++pos;
      }
      const results = [];
      const root = this.begin_nodes[len2][0];
      const prev = root.prev;
      if (prev === null) {
        return [];
      }
      let node = prev.clone();
      while (node.prev !== null) {
        results.push(node.clone());
        const n = node.clone();
        node = n.prev.clone();
      }
      results.reverse();
      return results;
    }
    /**
     * Get the text piece for a given node.
     * @param node The node to get the piece for.
     * @returns The array of nodes representing the most likely sequence of tokens.
     */
    piece(node) {
      return this.chars.slice(node.pos, node.pos + node.length).join("");
    }
    /**
     * @returns The most likely sequence of tokens.
     */
    tokens() {
      const nodes = this.viterbi();
      return nodes.map((x) => this.piece(x));
    }
    /**
     * @returns The most likely sequence of token ids.
     */
    token_ids() {
      const nodes = this.viterbi();
      return nodes.map((x) => x.token_id);
    }
  };
  var TokenLattice_default = TokenLattice;
  function min2(arr) {
    if (arr.length === 0) throw new Error("Array must not be empty");
    let min_value = arr[0];
    let index_of_min = 0;
    for (let i = 1; i < arr.length; ++i) {
      if (arr[i] < min_value) {
        min_value = arr[i];
        index_of_min = i;
      }
    }
    return [min_value, index_of_min];
  }
  var Unigram = class extends TokenizerModel_default {
    /**
     * Create a new Unigram tokenizer model.
     * @param config The configuration object for the Unigram model.
     * @param eos_token
     */
    constructor(config, eos_token) {
      super(config);
      const vocab_size = config.vocab.length;
      this.vocab = new Array(vocab_size);
      this.scores = new Array(vocab_size);
      for (let i = 0; i < vocab_size; ++i) {
        [this.vocab[i], this.scores[i]] = config.vocab[i];
      }
      this.unk_token_id = config.unk_id;
      this.unk_token = this.vocab[config.unk_id];
      this.tokens_to_ids = new Map(this.vocab.map((x, i) => [x, i]));
      this.bos_token = " ";
      this.bos_token_id = this.tokens_to_ids.get(this.bos_token);
      this.eos_token = eos_token;
      this.eos_token_id = this.tokens_to_ids.get(this.eos_token);
      this.unk_token = this.vocab[this.unk_token_id];
      this.min_score = min2(this.scores)[0];
      this.unk_score = this.min_score - 10;
      this.scores[this.unk_token_id] = this.unk_score;
      this.trie = new CharTrie_default();
      this.trie.extend(this.vocab);
      this.fuse_unk = true;
    }
    /**
     * Populates lattice nodes.
     * @param lattice The token lattice to populate with nodes.
     */
    populate_nodes(lattice) {
      const chars = lattice.chars;
      const mblen = 1;
      let begin_pos = 0;
      while (begin_pos < chars.length) {
        let has_single_node = false;
        const prefixed_tokens = this.trie.common_prefix_search(chars, begin_pos);
        for (const token of prefixed_tokens) {
          const token_id = this.tokens_to_ids.get(token);
          const token_score = this.scores[token_id];
          const n = len(token);
          lattice.insert(begin_pos, n, token_score, token_id);
          if (!has_single_node && n === mblen) {
            has_single_node = true;
          }
        }
        if (!has_single_node) {
          lattice.insert(begin_pos, mblen, this.unk_score, this.unk_token_id);
        }
        begin_pos += mblen;
      }
    }
    /**
     * Encodes an array of tokens into an array of subtokens using the unigram model.
     *
     * @param normalized The normalized string.
     * @returns An array of subtokens obtained by encoding the input tokens using the unigram model.
     */
    tokenize(normalized) {
      const lattice = new TokenLattice_default(
        normalized,
        this.bos_token_id,
        this.eos_token_id
      );
      this.populate_nodes(lattice);
      return lattice.tokens();
    }
    /**
     * Encodes an array of tokens using Unigram encoding.
     * @param tokens The tokens to encode.
     * @returns An array of encoded tokens.
     */
    encode(tokens) {
      const to_return = [];
      for (const token of tokens) {
        const tokenized = this.tokenize(token);
        to_return.push(...tokenized);
      }
      return to_return;
    }
  };
  var Unigram_default = Unigram;
  var PriorityQueue = class {
    /**
     * Create a new PriorityQueue.
     * @param comparator Comparator function to determine priority. Defaults to a MaxHeap.
     * @param max_size Maximum size of the queue. Defaults to Infinity.
     */
    constructor(comparator = (a, b) => a > b, max_size = Infinity) {
      this._heap = [];
      this._comparator = comparator;
      this._max_size = max_size;
    }
    /**
     * The size of the queue
     */
    get size() {
      return this._heap.length;
    }
    /**
     * Check if the queue is empty.
     * @returns `true` if the queue is empty, `false` otherwise.
     */
    is_empty() {
      return this.size === 0;
    }
    /**
     * Return the element with the highest priority in the queue.
     * @returns The highest priority element in the queue.
     */
    peek() {
      return this._heap[0];
    }
    /**
     * Add one or more elements to the queue.
     * @param values The values to push into the queue.
     * @returns The new size of the queue.
     */
    push(...values) {
      return this.extend(values);
    }
    /**
     * Add multiple elements to the queue.
     * @param values The values to push into the queue.
     * @returns The new size of the queue.
     */
    extend(values) {
      for (const value of values) {
        if (this.size < this._max_size) {
          this._heap.push(value);
          this._sift_up();
        } else {
          const smallest = this._smallest();
          if (this._comparator(value, this._heap[smallest])) {
            this._heap[smallest] = value;
            this._sift_up_from(smallest);
          }
        }
      }
      return this.size;
    }
    /**
     * Remove and return the element with the highest priority in the queue.
     * @returns The element with the highest priority in the queue.
     */
    pop() {
      const popped_value = this.peek();
      const bottom = this.size - 1;
      if (bottom > 0) {
        this._swap(0, bottom);
      }
      this._heap.pop();
      this._sift_down();
      return popped_value;
    }
    /**
     * Replace the element with the highest priority in the queue with a new value.
     * @param value The new value.
     * @returns The replaced value.
     */
    replace(value) {
      const replaced_value = this.peek();
      this._heap[0] = value;
      this._sift_down();
      return replaced_value;
    }
    /**
     * Compute the index for the parent of the node at index `i`.
     * @param i The index of the node to get the parent of.
     * @returns The index of the parent node.
     * @private
     */
    _parent(i) {
      return (i + 1 >>> 1) - 1;
    }
    /**
     * Compute the index for the left child of the node at index `i`.
     * @param i The index of the node to get the left child of.
     * @returns The index of the left child.
     * @private
     */
    _left(i) {
      return (i << 1) + 1;
    }
    /**
     * Compute the index for the right child of the node at index `i`.
     * @param i The index of the node to get the right child of.
     * @returns The index of the right child.
     * @private
     */
    _right(i) {
      return i + 1 << 1;
    }
    /**
     * Check if the element at index `i` is greater than the element at index `j`.
     * @param i The index of the first element to compare.
     * @param j The index of the second element to compare.
     * @returns `true` if the element at index `i` is greater than the element at index `j`, `false` otherwise.
     * @private
     */
    _greater(i, j2) {
      return this._comparator(this._heap[i], this._heap[j2]);
    }
    /**
     * Swap the elements at indices `i` and `j`.
     * @param i The index of the first element to swap.
     * @param j The index of the second element to swap.
     * @private
     */
    _swap(i, j2) {
      const temp = this._heap[i];
      this._heap[i] = this._heap[j2];
      this._heap[j2] = temp;
    }
    /**
     * Maintain the heap property by updating positions in the heap,
     * starting at the last element and moving up the heap.
     * @private
     */
    _sift_up() {
      this._sift_up_from(this.size - 1);
    }
    /**
     * Helper function to sift up from a given node.
     * @param node The index of the node to start sifting up from.
     */
    _sift_up_from(node) {
      while (node > 0 && this._greater(node, this._parent(node))) {
        this._swap(node, this._parent(node));
        node = this._parent(node);
      }
    }
    /**
     * Maintain the heap property by updating positions in the heap,
     * starting at the first element and moving down the heap.
     * @private
     */
    _sift_down() {
      let node = 0;
      while (this._left(node) < this.size && this._greater(this._left(node), node) || this._right(node) < this.size && this._greater(this._right(node), node)) {
        const max_child = this._right(node) < this.size && this._greater(this._right(node), this._left(node)) ? this._right(node) : this._left(node);
        this._swap(node, max_child);
        node = max_child;
      }
    }
    /**
     * Get the index of the smallest element in the heap. Since we use an array-based heap,
     * the index can be computed without needing to traverse the heap.
     * @private
     */
    _smallest() {
      return 2 ** Math.floor(Math.log2(this.size)) - 1;
    }
  };
  var PriorityQueue_default = PriorityQueue;
  var LRUCache2 = class {
    /**
     * Creates an LRUCache instance.
     * @param capacity The maximum number of items the cache can hold.
     */
    constructor(capacity) {
      this.capacity = capacity;
      this.cache = /* @__PURE__ */ new Map();
    }
    /**
     * Retrieves the value associated with the given key and marks the key as recently used.
     * @param key The key to retrieve.
     * @returns The value associated with the key, or undefined if the key does not exist.
     */
    get(key) {
      if (!this.cache.has(key)) return void 0;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    /**
     * Inserts or updates the key-value pair in the cache.
     * If the key already exists, it is updated and marked as recently used.
     * If the cache exceeds its capacity, the least recently used item is evicted.
     * @param key The key to add or update.
     * @param value The value to associate with the key.
     */
    put(key, value) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
      }
      this.cache.set(key, value);
      if (this.cache.size > this.capacity) {
        this.cache.delete(this.cache.keys().next().value);
      }
    }
    /**
     * Clears the cache.
     */
    clear() {
      this.cache.clear();
    }
  };
  var LRUCache_default = LRUCache2;
  var BPE = class extends TokenizerModel_default {
    /**
     * Create a BPE instance.
     * @param config The configuration object for BPE.
     */
    constructor(config) {
      super(config);
      this.tokens_to_ids = object_to_map(config.vocab);
      this.unk_token_id = this.tokens_to_ids.get(config.unk_token);
      this.unk_token = config.unk_token;
      this.vocab = new Array(this.tokens_to_ids.size);
      for (const [key, value] of this.tokens_to_ids) {
        this.vocab[value] = key;
      }
      const use_new_merge_format = Array.isArray(config.merges[0]);
      this.merges = use_new_merge_format ? config.merges : config.merges.map(
        (x) => x.split(" ", 2)
      );
      this.bpe_ranks = new Map(this.merges.map((x, i) => [JSON.stringify(x), i]));
      this.end_of_word_suffix = config.end_of_word_suffix;
      this.continuing_subword_suffix = config.continuing_subword_suffix ?? null;
      this.byte_fallback = this.config.byte_fallback ?? false;
      if (this.byte_fallback) {
        this.text_encoder = new TextEncoder();
      }
      this.ignore_merges = this.config.ignore_merges ?? false;
      this.max_length_to_cache = 256;
      this.cache_capacity = 1e4;
      this.cache = new LRUCache_default(this.cache_capacity);
    }
    /**
     * Clears the cache.
     */
    clear_cache() {
      this.cache.clear();
    }
    /**
     * Apply Byte-Pair-Encoding (BPE) to a given token. Efficient heap-based priority
     * queue implementation adapted from https://github.com/belladoreai/llama-tokenizer-js.
     * @param token The token to encode.
     * @returns The BPE encoded tokens.
     */
    bpe(token) {
      if (token.length === 0) {
        return [];
      }
      const cached = this.cache.get(token);
      if (cached !== void 0) {
        return cached;
      }
      const word = Array.from(token);
      if (this.end_of_word_suffix) {
        word[word.length - 1] += this.end_of_word_suffix;
      }
      let result = [];
      if (word.length > 1) {
        const queue = new PriorityQueue_default((a, b) => a.score < b.score);
        let starting_node = {
          token: word[0],
          bias: 0,
          prev: null,
          next: null
        };
        let previous_node = starting_node;
        for (let i = 1; i < word.length; ++i) {
          const current_node = {
            bias: i / word.length,
            // Add fractional component to break ties
            token: word[i],
            prev: previous_node,
            next: null
          };
          previous_node.next = current_node;
          this.add_node(queue, previous_node);
          previous_node = current_node;
        }
        while (!queue.is_empty()) {
          const node = queue.pop();
          if (node.deleted || !node.next || node.next.deleted) continue;
          node.deleted = true;
          node.next.deleted = true;
          if (node.prev) {
            const new_previous_node = { ...node.prev };
            node.prev.deleted = true;
            node.prev = new_previous_node;
            if (new_previous_node.prev) {
              new_previous_node.prev.next = new_previous_node;
            } else {
              starting_node = new_previous_node;
            }
          }
          const merged = {
            token: node.token + node.next.token,
            bias: node.bias,
            prev: node.prev,
            next: node.next.next
          };
          if (merged.prev) {
            merged.prev.next = merged;
            this.add_node(queue, merged.prev);
          } else {
            starting_node = merged;
          }
          if (merged.next) {
            merged.next.prev = merged;
            this.add_node(queue, merged);
          }
        }
        for (let current_node = starting_node; current_node !== null; current_node = current_node.next) {
          result.push(current_node.token);
        }
      } else {
        result = word;
      }
      if (this.continuing_subword_suffix) {
        for (let i = 0; i < result.length - 1; ++i) {
          result[i] += this.continuing_subword_suffix;
        }
      }
      if (token.length < this.max_length_to_cache) {
        this.cache.put(token, result);
      }
      return result;
    }
    /**
     * Helper function to add a node to the priority queue.
     * @param queue
     * @param node
     */
    add_node(queue, node) {
      const rank = this.bpe_ranks.get(
        JSON.stringify([node.token, node.next.token])
      );
      if (rank !== void 0) {
        node.score = rank + node.bias;
        queue.push(node);
      }
    }
    /**
     * Encodes the input sequence of tokens using the BPE algorithm and returns the resulting subword tokens.
     * @param tokens The input sequence of tokens to encode.
     * @returns The resulting subword tokens after applying the BPE algorithm to the input sequence of tokens.
     */
    encode(tokens) {
      const output_tokens = [];
      for (const token of tokens) {
        if (this.ignore_merges && this.tokens_to_ids.has(token)) {
          output_tokens.push(token);
          continue;
        }
        const bpe_token_list = this.bpe(token);
        for (const t of bpe_token_list) {
          if (this.tokens_to_ids.has(t)) {
            output_tokens.push(t);
          } else if (this.byte_fallback) {
            const byte_tokens = Array.from(this.text_encoder.encode(t)).map(
              (x) => `<0x${x.toString(16).toUpperCase().padStart(2, "0")}>`
            );
            if (byte_tokens.every((x) => this.tokens_to_ids.has(x))) {
              output_tokens.push(...byte_tokens);
            } else if (this.unk_token != null) {
              output_tokens.push(this.unk_token);
            }
          } else if (this.unk_token != null) {
            output_tokens.push(this.unk_token);
          }
        }
      }
      return output_tokens;
    }
  };
  var BPE_default = BPE;
  var Legacy = class extends TokenizerModel_default {
    /**
     * Create a Legacy tokenizer model instance.
     * @param config The configuration object for Legacy tokenizer model.
     * @param more_config Additional configuration object for the Legacy tokenizer model.
     */
    constructor(config, more_config) {
      super(config);
      const vocab = config.vocab;
      this.tokens_to_ids = object_to_map(
        more_config.target_lang ? vocab[more_config.target_lang] : vocab
      );
      this.bos_token = more_config.bos_token;
      this.bos_token_id = this.tokens_to_ids.get(this.bos_token);
      this.eos_token = more_config.eos_token;
      this.eos_token_id = this.tokens_to_ids.get(this.eos_token);
      this.pad_token = more_config.pad_token;
      this.pad_token_id = this.tokens_to_ids.get(this.pad_token);
      this.unk_token = more_config.unk_token;
      this.unk_token_id = this.tokens_to_ids.get(this.unk_token);
      this.vocab = new Array(this.tokens_to_ids.size);
      for (const [key, value] of this.tokens_to_ids) {
        this.vocab[value] = key;
      }
    }
    encode(tokens) {
      return tokens;
    }
  };
  var Legacy_default = Legacy;
  function create_tokenizer_model(model_config, config) {
    switch (model_config.type) {
      case "WordPiece":
        return new WordPiece_default(model_config);
      case "Unigram":
        return new Unigram_default(model_config, config.eos_token);
      case "BPE":
        return new BPE_default(model_config);
      default:
        if (model_config.vocab) {
          if (Array.isArray(model_config.vocab)) {
            return new Unigram_default(model_config, config.eos_token);
          } else if (Object.hasOwn(model_config, "continuing_subword_prefix") && Object.hasOwn(model_config, "unk_token")) {
            if (Object.hasOwn(model_config, "merges")) {
              return new BPE_default(model_config);
            } else {
              return new WordPiece_default(model_config);
            }
          } else {
            return new Legacy_default(model_config, {
              target_lang: config.target_lang,
              bos_token: config.bos_token,
              eos_token: config.eos_token,
              pad_token: config.pad_token,
              unk_token: config.unk_token
            });
          }
        }
        throw new Error(
          `Unknown TokenizerModel type: ${model_config?.type}`
        );
    }
  }
  var create_tokenizer_model_default = create_tokenizer_model;
  var PostProcessor = class extends Callable_default {
    /**
     * @param config The configuration for the post-processor.
     */
    constructor(config) {
      super();
      this.config = config;
    }
    /**
     * Alias for {@link PostProcessor#post_process}.
     * @param tokens The text or array of texts to post-process.
     * @param args Additional arguments required by the post-processing logic.
     * @returns The post-processed tokens.
     */
    _call(tokens, ...args) {
      return this.post_process(tokens, ...args);
    }
  };
  var PostProcessor_default = PostProcessor;
  var TemplateProcessing = class extends PostProcessor_default {
    /**
     * Replaces special tokens in the template with actual tokens.
     * @param tokens The list of tokens for the first sequence.
     * @param tokens_pair The list of tokens for the second sequence (optional).
     * @param add_special_tokens Whether to add the special tokens to the beginning and end of the input.
     * @returns An object containing the list of tokens with the special tokens replaced with actual tokens.
     */
    post_process(tokens, tokens_pair = null, add_special_tokens = true) {
      const type = tokens_pair === null ? this.config.single : this.config.pair;
      let processed_tokens = [];
      let types = [];
      for (const item of type) {
        if ("SpecialToken" in item) {
          if (add_special_tokens) {
            processed_tokens.push(item.SpecialToken.id);
            types.push(item.SpecialToken.type_id);
          }
        } else if ("Sequence" in item) {
          if (item.Sequence.id === "A") {
            processed_tokens = merge_arrays(processed_tokens, tokens);
            types = merge_arrays(
              types,
              new Array(tokens.length).fill(item.Sequence.type_id)
            );
          } else if (item.Sequence.id === "B") {
            processed_tokens = merge_arrays(processed_tokens, tokens_pair);
            types = merge_arrays(
              types,
              new Array(tokens_pair.length).fill(item.Sequence.type_id)
            );
          }
        }
      }
      return { tokens: processed_tokens, token_type_ids: types };
    }
  };
  var TemplateProcessing_default = TemplateProcessing;
  var ByteLevel2 = class extends PostProcessor_default {
    /**
     * Post process the given tokens.
     * @param tokens The list of tokens for the first sequence.
     * @param tokens_pair The list of tokens for the second sequence (optional).
     * @returns An object containing the post-processed tokens.
     */
    post_process(tokens, tokens_pair = null) {
      return { tokens, tokens_pair };
    }
  };
  var ByteLevel_default2 = ByteLevel2;
  var BertProcessing = class extends PostProcessor_default {
    /**
     * @param config The configuration for the post-processor.
     * @param config.cls The special tokens to add to the beginning of the input.
     * @param config.sep The special tokens to add to the end of the input.
     */
    constructor(config) {
      super(config);
      this.sep = config.sep;
      this.cls = config.cls;
    }
    /**
     * Adds the special tokens to the beginning and end of the input.
     * @param tokens The input tokens.
     * @param tokens_pair An optional second set of input tokens.
     * @param add_special_tokens Whether to add the special tokens to the beginning and end of the input.
     * @returns The post-processed tokens with the special tokens added to the beginning and end.
     */
    post_process(tokens, tokens_pair = null, add_special_tokens = true) {
      if (add_special_tokens) {
        tokens = merge_arrays([this.cls[0]], tokens, [this.sep[0]]);
      }
      let token_type_ids = new Array(tokens.length).fill(0);
      if (tokens_pair) {
        const middle = [];
        const after = add_special_tokens ? [this.sep[0]] : [];
        tokens = merge_arrays(tokens, middle, tokens_pair, after);
        token_type_ids = merge_arrays(
          token_type_ids,
          new Array(tokens_pair.length + middle.length + after.length).fill(1)
        );
      }
      return { tokens, token_type_ids };
    }
  };
  var BertProcessing_default = BertProcessing;
  var RobertaProcessing = class extends PostProcessor_default {
    /**
     * @param config The configuration for the post-processor.
     * @param config.cls The special tokens to add to the beginning of the input.
     * @param config.sep The special tokens to add to the end of the input.
     */
    constructor(config) {
      super(config);
      this.sep = config.sep;
      this.cls = config.cls;
    }
    /**
     * Adds the special tokens to the beginning and end of the input.
     * @param tokens The input tokens.
     * @param tokens_pair An optional second set of input tokens.
     * @param add_special_tokens Whether to add the special tokens to the beginning and end of the input.
     * @returns The post-processed tokens with the special tokens added to the beginning and end.
     */
    post_process(tokens, tokens_pair, add_special_tokens = true) {
      if (add_special_tokens) {
        tokens = merge_arrays([this.cls[0]], tokens, [this.sep[0]]);
      }
      let token_type_ids = new Array(tokens.length).fill(0);
      if (tokens_pair) {
        const middle = add_special_tokens ? [this.sep[0]] : [];
        const after = add_special_tokens ? [this.sep[0]] : [];
        tokens = merge_arrays(tokens, middle, tokens_pair, after);
        token_type_ids = merge_arrays(
          token_type_ids,
          new Array(tokens_pair.length + middle.length + after.length).fill(1)
        );
      }
      return { tokens, token_type_ids };
    }
  };
  var RobertaProcessing_default = RobertaProcessing;
  var Sequence3 = class extends PostProcessor_default {
    /**
     * Creates a new instance of Sequence post-processor.
     * @param config The configuration object.
     */
    constructor(config) {
      super(config);
      this.processors = (config.processors ?? []).map((x) => create_post_processor_default(x));
    }
    /**
     * Post process the given tokens.
     * @param tokens The list of tokens for the first sequence.
     * @param tokens_pair The list of tokens for the second sequence (optional).
     * @param add_special_tokens Whether to add the special tokens to the beginning and end of the input.
     * @returns An object containing the post-processed tokens.
     */
    post_process(tokens, tokens_pair = null, add_special_tokens = true) {
      let processed_tokens = { tokens, tokens_pair };
      for (const processor of this.processors) {
        processed_tokens = processor.post_process(
          processed_tokens.tokens,
          processed_tokens.tokens_pair,
          add_special_tokens
        );
      }
      return processed_tokens;
    }
  };
  var Sequence_default3 = Sequence3;
  function create_post_processor(config) {
    if (config === null) return null;
    switch (config.type) {
      case "TemplateProcessing":
        return new TemplateProcessing_default(config);
      case "ByteLevel":
        return new ByteLevel_default2(config);
      case "BertProcessing":
        return new BertProcessing_default(config);
      case "RobertaProcessing":
        return new RobertaProcessing_default(config);
      case "Sequence":
        return new Sequence_default3(config);
      default:
        throw new Error(`Unknown PostProcessor type: ${config.type}`);
    }
  }
  var create_post_processor_default = create_post_processor;
  var Decoder = class extends Callable_default {
    /**
     * Creates an instance of `Decoder`.
     * @param config The configuration object.
     **/
    constructor(config) {
      super();
      this.config = config;
      this.added_tokens = [];
      this.end_of_word_suffix = null;
      this.trim_offsets = "trim_offsets" in config ? config.trim_offsets : false;
    }
    /**
     * Calls the `decode` method.
     *
     * @param tokens The list of tokens.
     * @returns The decoded string.
     */
    _call(tokens) {
      return this.decode(tokens);
    }
    /**
     * Decodes a list of tokens.
     * @param tokens The list of tokens.
     * @returns The decoded string.
     */
    decode(tokens) {
      return this.decode_chain(tokens).join("");
    }
  };
  var Decoder_default = Decoder;
  var ByteLevel3 = class extends Decoder_default {
    /**
     * Create a `ByteLevelDecoder` object.
     */
    constructor(config) {
      super(config);
      this.byte_decoder = UNICODE_TO_BYTES;
      this.text_decoder = new TextDecoder("utf-8", {
        fatal: false,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ignoreBOM: true
      });
      this.end_of_word_suffix = null;
    }
    /**
     * Convert an array of tokens to string by decoding each byte.
     * @param tokens Array of tokens to be decoded.
     * @returns The decoded string.
     */
    convert_tokens_to_string(tokens) {
      const text = tokens.join("");
      const byte_array = new Uint8Array(
        [...text].map((c) => this.byte_decoder[c])
      );
      return this.text_decoder.decode(byte_array);
    }
    decode_chain(tokens) {
      const sub_texts = [];
      let current_sub_text = [];
      for (const token of tokens) {
        if (this.added_tokens.find((x) => x.content === token) !== void 0) {
          if (current_sub_text.length > 0) {
            sub_texts.push(this.convert_tokens_to_string(current_sub_text));
            current_sub_text = [];
          }
          sub_texts.push(token);
        } else {
          current_sub_text.push(token);
        }
      }
      if (current_sub_text.length > 0) {
        sub_texts.push(this.convert_tokens_to_string(current_sub_text));
      }
      return sub_texts;
    }
  };
  var ByteLevel_default3 = ByteLevel3;
  var WordPiece = class extends Decoder_default {
    /**
     * Creates a new instance of WordPieceDecoder.
     * @param config The configuration object.
     */
    constructor(config) {
      super(config);
      this.cleanup = config.cleanup;
    }
    decode_chain(tokens) {
      return tokens.map((token, i) => {
        if (i !== 0) {
          const prefix = this.config.prefix;
          if (prefix && token.startsWith(prefix)) {
            token = token.replace(prefix, "");
          } else {
            token = " " + token;
          }
        }
        if (this.cleanup) {
          token = clean_up_tokenization(token);
        }
        return token;
      });
    }
  };
  var WordPiece_default2 = WordPiece;
  var Metaspace2 = class extends Decoder_default {
    /**
     * Constructs a new MetaspaceDecoder object.
     * @param config The configuration object for the MetaspaceDecoder.
     */
    constructor(config) {
      super(config);
      this.replacement = config.replacement ?? "\u2581";
    }
    decode_chain(tokens) {
      const result = [];
      for (let i = 0; i < tokens.length; ++i) {
        let normalized = tokens[i].replaceAll(this.replacement, " ");
        if (i == 0 && normalized.startsWith(" ")) {
          normalized = normalized.substring(1);
        }
        result.push(normalized);
      }
      return result;
    }
  };
  var Metaspace_default2 = Metaspace2;
  var BPE2 = class extends Decoder_default {
    constructor(config) {
      super(config);
      this.suffix = config.suffix ?? "";
    }
    decode_chain(tokens) {
      return tokens.map((token, i) => {
        return token.replaceAll(this.suffix, i === tokens.length - 1 ? "" : " ");
      });
    }
  };
  var BPE_default2 = BPE2;
  var CTC = class extends Decoder_default {
    constructor(config) {
      super(config);
      this.pad_token = config.pad_token ?? "";
      this.word_delimiter_token = config.word_delimiter_token ?? "";
      this.cleanup = config.cleanup;
    }
    /**
     * Converts a connectionist-temporal-classification (CTC) output tokens into a single string.
     * @param tokens Array of tokens to be decoded.
     * @returns The decoded string.
     */
    convert_tokens_to_string(tokens) {
      if (tokens.length === 0) return "";
      const grouped_tokens = [tokens[0]];
      for (let i = 1; i < tokens.length; ++i) {
        if (tokens[i] !== grouped_tokens.at(-1)) {
          grouped_tokens.push(tokens[i]);
        }
      }
      const filtered_tokens = grouped_tokens.filter(
        (token) => token !== this.pad_token
      );
      let text = filtered_tokens.join("");
      if (this.cleanup) {
        text = clean_up_tokenization(text).replaceAll(this.word_delimiter_token, " ").trim();
      }
      return text;
    }
    decode_chain(tokens) {
      return [this.convert_tokens_to_string(tokens)];
    }
  };
  var CTC_default = CTC;
  var Sequence4 = class extends Decoder_default {
    /**
     * Creates a new instance of DecoderSequence.
     * @param config The configuration object.
     */
    constructor(config) {
      super(config);
      this.decoders = (config.decoders ?? []).map((x) => create_decoder_default(x));
    }
    decode_chain(tokens) {
      return this.decoders.reduce((toks, decoder) => {
        return decoder.decode_chain(toks);
      }, tokens);
    }
  };
  var Sequence_default4 = Sequence4;
  var Replace3 = class extends Decoder_default {
    /**
     * @param config The configuration object for the decoder.
     */
    constructor(config) {
      super(config);
      this.pattern = create_pattern(this.config.pattern);
    }
    decode_chain(tokens) {
      const content = this.config.content ?? "";
      const pattern = this.pattern;
      return pattern === null ? tokens : tokens.map((token) => token.replaceAll(pattern, content));
    }
  };
  var Replace_default3 = Replace3;
  var Fuse = class extends Decoder_default {
    decode_chain(tokens) {
      return [tokens.join("")];
    }
  };
  var Fuse_default = Fuse;
  var Strip2 = class extends Decoder_default {
    constructor(config) {
      super(config);
      this.content = config.content ?? "";
      this.start = config.start ?? 0;
      this.stop = config.stop ?? 0;
    }
    decode_chain(tokens) {
      return tokens.map((token) => {
        let start_cut = 0;
        for (let i = 0; i < this.start; ++i) {
          if (token[i] === this.content) {
            start_cut = i + 1;
            continue;
          } else {
            break;
          }
        }
        let stop_cut = token.length;
        for (let i = 0; i < this.stop; ++i) {
          const index = token.length - i - 1;
          if (token[index] === this.content) {
            stop_cut = index;
            continue;
          } else {
            break;
          }
        }
        return token.slice(start_cut, stop_cut);
      });
    }
  };
  var Strip_default2 = Strip2;
  var ByteFallback = class extends Decoder_default {
    constructor(config) {
      super(config);
      this.text_decoder = new TextDecoder();
    }
    decode_chain(tokens) {
      const new_tokens = [];
      let previous_byte_tokens = [];
      for (const token of tokens) {
        let bytes = null;
        if (token.length === 6 && token.startsWith("<0x") && token.endsWith(">")) {
          const byte = parseInt(token.slice(3, 5), 16);
          if (!isNaN(byte)) {
            bytes = byte;
          }
        }
        if (bytes !== null) {
          previous_byte_tokens.push(bytes);
        } else {
          if (previous_byte_tokens.length > 0) {
            const string = this.text_decoder.decode(
              Uint8Array.from(previous_byte_tokens)
            );
            new_tokens.push(string);
            previous_byte_tokens = [];
          }
          new_tokens.push(token);
        }
      }
      if (previous_byte_tokens.length > 0) {
        const string = this.text_decoder.decode(
          Uint8Array.from(previous_byte_tokens)
        );
        new_tokens.push(string);
        previous_byte_tokens = [];
      }
      return new_tokens;
    }
  };
  var ByteFallback_default = ByteFallback;
  function create_decoder(config) {
    if (config === null) return null;
    switch (config.type) {
      case "ByteLevel":
        return new ByteLevel_default3(config);
      case "WordPiece":
        return new WordPiece_default2(config);
      case "Metaspace":
        return new Metaspace_default2(config);
      case "BPEDecoder":
        return new BPE_default2(config);
      case "CTC":
        return new CTC_default(config);
      case "Sequence":
        return new Sequence_default4(config);
      case "Replace":
        return new Replace_default3(config);
      case "Fuse":
        return new Fuse_default(config);
      case "Strip":
        return new Strip_default2(config);
      case "ByteFallback":
        return new ByteFallback_default(config);
      default:
        throw new Error(`Unknown Decoder type: ${config.type}`);
    }
  }
  var create_decoder_default = create_decoder;
  var Tokenizer = class {
    constructor(tokenizer2, config) {
      const tokenizer_error = validate_object(tokenizer2, "Tokenizer", [
        "model",
        "decoder",
        "post_processor",
        "pre_tokenizer",
        "normalizer"
      ]);
      if (tokenizer_error) {
        throw new Error(tokenizer_error);
      }
      const config_error = validate_object(config, "Config");
      if (config_error) {
        throw new Error(config_error);
      }
      this.tokenizer = tokenizer2;
      this.config = config;
      this.normalizer = create_normalizer_default(this.tokenizer.normalizer);
      this.pre_tokenizer = create_pre_tokenizer_default(this.tokenizer.pre_tokenizer);
      this.model = create_tokenizer_model_default(this.tokenizer.model, this.config);
      this.post_processor = create_post_processor_default(this.tokenizer.post_processor);
      this.decoder = create_decoder_default(this.tokenizer.decoder);
      this.special_tokens = [];
      this.all_special_ids = [];
      this.added_tokens = [];
      const unnormalized_contents = [];
      const normalized_contents = [];
      this.added_tokens_map = /* @__PURE__ */ new Map();
      for (const added_token of this.tokenizer.added_tokens) {
        const token = new AddedToken_default(added_token);
        this.added_tokens.push(token);
        this.model.tokens_to_ids.set(token.content, token.id);
        this.model.vocab[token.id] = token.content;
        if (token.special) {
          this.special_tokens.push(token.content);
          this.all_special_ids.push(token.id);
        }
        this.added_tokens_map.set(token.content, token);
        if (token.normalized && this.normalizer !== null) {
          const normalized_content = this.normalizer(token.content);
          normalized_contents.push(normalized_content);
          this.added_tokens_map.set(normalized_content, token);
        } else {
          unnormalized_contents.push(token.content);
        }
      }
      (this.config.additional_special_tokens ?? []).forEach((token) => {
        if (!this.special_tokens.includes(token)) this.special_tokens.push(token);
      });
      if (this.decoder) {
        this.decoder.added_tokens = this.added_tokens;
        this.decoder.end_of_word_suffix = this.model.end_of_word_suffix;
      }
      this.splitter_unnormalized = new DictionarySplitter_default(unnormalized_contents);
      this.splitter_normalized = new DictionarySplitter_default(normalized_contents);
      this.remove_space = this.config.remove_space;
      this.clean_up_tokenization_spaces = this.config.clean_up_tokenization_spaces ?? true;
      this.do_lowercase_and_remove_accent = this.config.do_lowercase_and_remove_accent ?? false;
    }
    // Implementation
    encode(text, {
      text_pair = null,
      add_special_tokens = true,
      return_token_type_ids = null
    } = {}) {
      const { tokens, token_type_ids } = this.tokenize_helper(text, {
        text_pair,
        add_special_tokens
      });
      const input_ids = tokens.map(
        (t) => this.added_tokens_map.get(t)?.id ?? this.model.tokens_to_ids.get(t) ?? this.model.unk_token_id
      );
      const result = {
        ids: input_ids,
        tokens,
        attention_mask: new Array(input_ids.length).fill(1)
      };
      if (return_token_type_ids && token_type_ids) {
        result.token_type_ids = token_type_ids;
      }
      return result;
    }
    decode(token_ids, options = {}) {
      if (!Array.isArray(token_ids) || token_ids.length === 0 || !is_integral_number(token_ids[0])) {
        throw Error("token_ids must be a non-empty array of integers.");
      }
      let tokens = token_ids.map(
        (i) => this.model.vocab[Number(i)] ?? this.model.unk_token
      );
      if (options.skip_special_tokens) {
        tokens = tokens.filter((x) => !this.special_tokens.includes(x));
      }
      let decoded = this.decoder ? this.decoder(tokens) : tokens.join(" ");
      if (this.decoder && this.decoder.end_of_word_suffix) {
        decoded = decoded.replaceAll(this.decoder.end_of_word_suffix, " ");
        if (options.skip_special_tokens) {
          decoded = decoded.trim();
        }
      }
      if (options.clean_up_tokenization_spaces ?? this.clean_up_tokenization_spaces) {
        decoded = clean_up_tokenization(decoded);
      }
      return decoded;
    }
    /**
     * Converts a string into a sequence of tokens.
     * @param text The sequence to be encoded.
     * @param options An optional object containing the following properties:
     * @returns The list of tokens.
     */
    tokenize(text, { text_pair = null, add_special_tokens = false } = {}) {
      return this.tokenize_helper(text, { text_pair, add_special_tokens }).tokens;
    }
    encode_text(text) {
      if (text === null) {
        return null;
      }
      const sections = this.splitter_unnormalized.split(text);
      sections.forEach((section, i) => {
        const added_token = this.added_tokens_map.get(section);
        if (added_token) {
          if (added_token.lstrip && i > 0) {
            sections[i - 1] = sections[i - 1].trimEnd();
          }
          if (added_token.rstrip && i < sections.length - 1) {
            sections[i + 1] = sections[i + 1].trimStart();
          }
        }
      });
      return sections.flatMap((processed_text, section_index) => {
        if (processed_text.length === 0) {
          return [];
        }
        if (this.added_tokens_map.has(processed_text)) {
          return [processed_text];
        }
        if (this.remove_space === true) {
          processed_text = processed_text.trim().split(/\s+/).join(" ");
        }
        if (this.do_lowercase_and_remove_accent) {
          processed_text = lowercase_and_remove_accents(processed_text);
        }
        if (this.normalizer !== null) {
          processed_text = this.normalizer(processed_text);
        }
        if (processed_text.length === 0) {
          return [];
        }
        const subsections = this.splitter_normalized.split(processed_text);
        subsections.forEach((subsection, j2) => {
          const added_token = this.added_tokens_map.get(subsection);
          if (added_token) {
            if (added_token.lstrip && j2 > 0) {
              subsections[j2 - 1] = subsections[j2 - 1].trimEnd();
            }
            if (added_token.rstrip && j2 < subsections.length - 1) {
              subsections[j2 + 1] = subsections[j2 + 1].trimStart();
            }
          }
        });
        return subsections.flatMap((subsection) => {
          if (subsection.length === 0) {
            return [];
          }
          if (this.added_tokens_map.has(subsection)) {
            return [subsection];
          }
          const section_tokens = this.pre_tokenizer !== null ? this.pre_tokenizer(subsection, {
            section_index
          }) : [subsection];
          return this.model(section_tokens);
        });
      });
    }
    tokenize_helper(text, { text_pair = null, add_special_tokens = true }) {
      const tokens1 = this.encode_text(text);
      const tokens2 = this.encode_text(text_pair || null);
      return this.post_processor ? this.post_processor(tokens1, tokens2, add_special_tokens) : { tokens: merge_arrays(tokens1 ?? [], tokens2 ?? []) };
    }
    /**
     * Converts a token string to its corresponding token ID.
     * @param token The token string to convert.
     * @returns The token ID, or undefined if the token is not in the vocabulary.
     */
    token_to_id(token) {
      return this.model.tokens_to_ids.get(token);
    }
    /**
     * Converts a token ID to its corresponding token string.
     * @param id The token ID to convert.
     * @returns The token string, or undefined if the ID is not in the vocabulary.
     */
    id_to_token(id) {
      return this.model.vocab[id];
    }
    /**
     * Returns a mapping of token IDs to AddedToken objects for all added tokens.
     * @returns A Map where keys are token IDs and values are AddedToken objects.
     */
    get_added_tokens_decoder() {
      const decoder = /* @__PURE__ */ new Map();
      for (const token of this.added_tokens) {
        decoder.set(token.id, token);
      }
      return decoder;
    }
    /**
     * Get the underlying vocabulary
     * @param with_added_tokens Whether to include the added tokens
     * @returns The vocabulary
     */
    get_vocab(with_added_tokens = true) {
      const vocab = /* @__PURE__ */ new Map();
      for (let i = 0; i < this.model.vocab.length; ++i) {
        const token = this.model.vocab[i];
        if (with_added_tokens || !this.added_tokens_map.has(token)) {
          vocab.set(token, i);
        }
      }
      return vocab;
    }
  };
  var Tokenizer_default = Tokenizer;

  // node_modules/@huggingface/jinja/dist/index.js
  var __defProp2 = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp2(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };
  var TOKEN_TYPES = Object.freeze({
    Text: "Text",
    // The text between Jinja statements or expressions
    NumericLiteral: "NumericLiteral",
    // e.g., 123, 1.0
    StringLiteral: "StringLiteral",
    // 'string'
    Identifier: "Identifier",
    // Variables, functions, statements, booleans, etc.
    Equals: "Equals",
    // =
    OpenParen: "OpenParen",
    // (
    CloseParen: "CloseParen",
    // )
    OpenStatement: "OpenStatement",
    // {%
    CloseStatement: "CloseStatement",
    // %}
    OpenExpression: "OpenExpression",
    // {{
    CloseExpression: "CloseExpression",
    // }}
    OpenSquareBracket: "OpenSquareBracket",
    // [
    CloseSquareBracket: "CloseSquareBracket",
    // ]
    OpenCurlyBracket: "OpenCurlyBracket",
    // {
    CloseCurlyBracket: "CloseCurlyBracket",
    // }
    Comma: "Comma",
    // ,
    Dot: "Dot",
    // .
    Colon: "Colon",
    // :
    Pipe: "Pipe",
    // |
    CallOperator: "CallOperator",
    // ()
    AdditiveBinaryOperator: "AdditiveBinaryOperator",
    // + - ~
    MultiplicativeBinaryOperator: "MultiplicativeBinaryOperator",
    // * / // %
    ExponentiationBinaryOperator: "ExponentiationBinaryOperator",
    // **
    ComparisonBinaryOperator: "ComparisonBinaryOperator",
    // < > <= >= == !=
    UnaryOperator: "UnaryOperator",
    // ! - +
    Comment: "Comment"
    // {# ... #}
  });
  var Token = class {
    /**
     * Constructs a new Token.
     * @param {string} value The raw value as seen inside the source code.
     * @param {TokenType} type The type of token.
     */
    constructor(value, type) {
      this.value = value;
      this.type = type;
    }
  };
  function isWord(char) {
    return /\w/.test(char);
  }
  function isInteger(char) {
    return /[0-9]/.test(char);
  }
  function isWhitespace(char) {
    return /\s/.test(char);
  }
  var ORDERED_MAPPING_TABLE = [
    // Control sequences
    ["{%", TOKEN_TYPES.OpenStatement],
    ["%}", TOKEN_TYPES.CloseStatement],
    ["{{", TOKEN_TYPES.OpenExpression],
    ["}}", TOKEN_TYPES.CloseExpression],
    // Single character tokens
    ["(", TOKEN_TYPES.OpenParen],
    [")", TOKEN_TYPES.CloseParen],
    ["{", TOKEN_TYPES.OpenCurlyBracket],
    ["}", TOKEN_TYPES.CloseCurlyBracket],
    ["[", TOKEN_TYPES.OpenSquareBracket],
    ["]", TOKEN_TYPES.CloseSquareBracket],
    [",", TOKEN_TYPES.Comma],
    [".", TOKEN_TYPES.Dot],
    [":", TOKEN_TYPES.Colon],
    ["|", TOKEN_TYPES.Pipe],
    // Comparison operators
    ["<=", TOKEN_TYPES.ComparisonBinaryOperator],
    [">=", TOKEN_TYPES.ComparisonBinaryOperator],
    ["==", TOKEN_TYPES.ComparisonBinaryOperator],
    ["!=", TOKEN_TYPES.ComparisonBinaryOperator],
    ["<", TOKEN_TYPES.ComparisonBinaryOperator],
    [">", TOKEN_TYPES.ComparisonBinaryOperator],
    // Arithmetic operators
    ["+", TOKEN_TYPES.AdditiveBinaryOperator],
    ["-", TOKEN_TYPES.AdditiveBinaryOperator],
    ["~", TOKEN_TYPES.AdditiveBinaryOperator],
    ["**", TOKEN_TYPES.ExponentiationBinaryOperator],
    // NOTE: must come before "*" so that "**" is matched first
    ["*", TOKEN_TYPES.MultiplicativeBinaryOperator],
    ["//", TOKEN_TYPES.MultiplicativeBinaryOperator],
    // NOTE: must come before "/" so that "//" is matched first
    ["/", TOKEN_TYPES.MultiplicativeBinaryOperator],
    ["%", TOKEN_TYPES.MultiplicativeBinaryOperator],
    // Assignment operator
    ["=", TOKEN_TYPES.Equals]
  ];
  var ESCAPE_CHARACTERS = /* @__PURE__ */ new Map([
    ["n", "\n"],
    // New line
    ["t", "	"],
    // Horizontal tab
    ["r", "\r"],
    // Carriage return
    ["b", "\b"],
    // Backspace
    ["f", "\f"],
    // Form feed
    ["v", "\v"],
    // Vertical tab
    ["'", "'"],
    // Single quote
    ['"', '"'],
    // Double quote
    ["\\", "\\"]
    // Backslash
  ]);
  function preprocess(template, options = {}) {
    if (template.endsWith("\n")) {
      template = template.slice(0, -1);
    }
    if (options.lstrip_blocks) {
      template = template.replace(/^[ \t]*({[#%-])/gm, "$1");
    }
    if (options.trim_blocks) {
      template = template.replace(/([#%-]})\n/g, "$1");
    }
    return template.replace(
      /(\s*){%(-?)\s*(?:end)?generation\s*(-?)%}(\s*)/gs,
      (_, before, lstrip, rstrip, after) => (lstrip ? "" : before) + (rstrip ? "" : after)
    );
  }
  function tokenize(source, options = {}) {
    const tokens = [];
    const src = preprocess(source, options);
    let cursorPosition = 0;
    let curlyBracketDepth = 0;
    const consumeWhile = (predicate) => {
      let str = "";
      while (predicate(src[cursorPosition])) {
        if (src[cursorPosition] === "\\") {
          ++cursorPosition;
          if (cursorPosition >= src.length) {
            throw new SyntaxError("Unexpected end of input");
          }
          const escaped = src[cursorPosition++];
          const unescaped = ESCAPE_CHARACTERS.get(escaped);
          if (unescaped === void 0) {
            throw new SyntaxError(`Unexpected escaped character: ${escaped}`);
          }
          str += unescaped;
          continue;
        }
        str += src[cursorPosition++];
        if (cursorPosition >= src.length) {
          throw new SyntaxError("Unexpected end of input");
        }
      }
      return str;
    };
    const stripTrailingWhitespace = () => {
      const lastToken = tokens.at(-1);
      if (lastToken && lastToken.type === TOKEN_TYPES.Text) {
        lastToken.value = lastToken.value.trimEnd();
        if (lastToken.value === "") {
          tokens.pop();
        }
      }
    };
    const skipLeadingWhitespace = () => {
      while (cursorPosition < src.length && isWhitespace(src[cursorPosition])) {
        ++cursorPosition;
      }
    };
    main:
      while (cursorPosition < src.length) {
        const lastTokenType = tokens.at(-1)?.type;
        if (lastTokenType === void 0 || lastTokenType === TOKEN_TYPES.CloseStatement || lastTokenType === TOKEN_TYPES.CloseExpression || lastTokenType === TOKEN_TYPES.Comment) {
          let text = "";
          while (cursorPosition < src.length && // Keep going until we hit the next Jinja statement or expression
          !(src[cursorPosition] === "{" && (src[cursorPosition + 1] === "%" || src[cursorPosition + 1] === "{" || src[cursorPosition + 1] === "#"))) {
            text += src[cursorPosition++];
          }
          if (text.length > 0) {
            tokens.push(new Token(text, TOKEN_TYPES.Text));
            continue;
          }
        }
        if (src[cursorPosition] === "{" && src[cursorPosition + 1] === "#") {
          cursorPosition += 2;
          const stripBefore = src[cursorPosition] === "-";
          if (stripBefore) {
            ++cursorPosition;
          }
          let comment = "";
          while (src[cursorPosition] !== "#" || src[cursorPosition + 1] !== "}") {
            if (cursorPosition + 2 >= src.length) {
              throw new SyntaxError("Missing end of comment tag");
            }
            comment += src[cursorPosition++];
          }
          const stripAfter = comment.endsWith("-");
          if (stripAfter) {
            comment = comment.slice(0, -1);
          }
          if (stripBefore) {
            stripTrailingWhitespace();
          }
          tokens.push(new Token(comment, TOKEN_TYPES.Comment));
          cursorPosition += 2;
          if (stripAfter) {
            skipLeadingWhitespace();
          }
          continue;
        }
        if (src.slice(cursorPosition, cursorPosition + 3) === "{%-") {
          stripTrailingWhitespace();
          tokens.push(new Token("{%", TOKEN_TYPES.OpenStatement));
          cursorPosition += 3;
          continue;
        }
        if (src.slice(cursorPosition, cursorPosition + 3) === "{{-") {
          stripTrailingWhitespace();
          tokens.push(new Token("{{", TOKEN_TYPES.OpenExpression));
          curlyBracketDepth = 0;
          cursorPosition += 3;
          continue;
        }
        consumeWhile(isWhitespace);
        if (src.slice(cursorPosition, cursorPosition + 3) === "-%}") {
          tokens.push(new Token("%}", TOKEN_TYPES.CloseStatement));
          cursorPosition += 3;
          skipLeadingWhitespace();
          continue;
        }
        if (src.slice(cursorPosition, cursorPosition + 3) === "-}}") {
          tokens.push(new Token("}}", TOKEN_TYPES.CloseExpression));
          cursorPosition += 3;
          skipLeadingWhitespace();
          continue;
        }
        const char = src[cursorPosition];
        if (char === "-" || char === "+") {
          const lastTokenType2 = tokens.at(-1)?.type;
          if (lastTokenType2 === TOKEN_TYPES.Text || lastTokenType2 === void 0) {
            throw new SyntaxError(`Unexpected character: ${char}`);
          }
          switch (lastTokenType2) {
            case TOKEN_TYPES.Identifier:
            case TOKEN_TYPES.NumericLiteral:
            case TOKEN_TYPES.StringLiteral:
            case TOKEN_TYPES.CloseParen:
            case TOKEN_TYPES.CloseSquareBracket:
              break;
            default: {
              ++cursorPosition;
              let num = consumeWhile(isInteger);
              if (num.length > 0 && src[cursorPosition] === "." && isInteger(src[cursorPosition + 1])) {
                ++cursorPosition;
                const frac = consumeWhile(isInteger);
                num = `${num}.${frac}`;
              }
              tokens.push(
                new Token(`${char}${num}`, num.length > 0 ? TOKEN_TYPES.NumericLiteral : TOKEN_TYPES.UnaryOperator)
              );
              continue;
            }
          }
        }
        for (const [seq, type] of ORDERED_MAPPING_TABLE) {
          if (seq === "}}" && curlyBracketDepth > 0) {
            continue;
          }
          const slice2 = src.slice(cursorPosition, cursorPosition + seq.length);
          if (slice2 === seq) {
            tokens.push(new Token(seq, type));
            if (type === TOKEN_TYPES.OpenExpression) {
              curlyBracketDepth = 0;
            } else if (type === TOKEN_TYPES.OpenCurlyBracket) {
              ++curlyBracketDepth;
            } else if (type === TOKEN_TYPES.CloseCurlyBracket) {
              --curlyBracketDepth;
            }
            cursorPosition += seq.length;
            continue main;
          }
        }
        if (char === "'" || char === '"') {
          ++cursorPosition;
          const str = consumeWhile((c) => c !== char);
          tokens.push(new Token(str, TOKEN_TYPES.StringLiteral));
          ++cursorPosition;
          continue;
        }
        if (isInteger(char)) {
          let num = consumeWhile(isInteger);
          if (tokens.at(-1)?.type !== TOKEN_TYPES.Dot && src[cursorPosition] === "." && isInteger(src[cursorPosition + 1])) {
            ++cursorPosition;
            const frac = consumeWhile(isInteger);
            num = `${num}.${frac}`;
          }
          tokens.push(new Token(num, TOKEN_TYPES.NumericLiteral));
          continue;
        }
        if (isWord(char)) {
          const word = consumeWhile(isWord);
          tokens.push(new Token(word, TOKEN_TYPES.Identifier));
          continue;
        }
        throw new SyntaxError(`Unexpected character: ${char}`);
      }
    return tokens;
  }
  var Statement = class {
    type = "Statement";
  };
  var Program = class extends Statement {
    constructor(body) {
      super();
      this.body = body;
    }
    type = "Program";
  };
  var If = class extends Statement {
    constructor(test, body, alternate) {
      super();
      this.test = test;
      this.body = body;
      this.alternate = alternate;
    }
    type = "If";
  };
  var For = class extends Statement {
    constructor(loopvar, iterable, body, defaultBlock) {
      super();
      this.loopvar = loopvar;
      this.iterable = iterable;
      this.body = body;
      this.defaultBlock = defaultBlock;
    }
    type = "For";
  };
  var Break = class extends Statement {
    type = "Break";
  };
  var Continue = class extends Statement {
    type = "Continue";
  };
  var SetStatement = class extends Statement {
    constructor(assignee, value, body) {
      super();
      this.assignee = assignee;
      this.value = value;
      this.body = body;
    }
    type = "Set";
  };
  var Macro = class extends Statement {
    constructor(name, args, body) {
      super();
      this.name = name;
      this.args = args;
      this.body = body;
    }
    type = "Macro";
  };
  var Comment = class extends Statement {
    constructor(value) {
      super();
      this.value = value;
    }
    type = "Comment";
  };
  var Expression = class extends Statement {
    type = "Expression";
  };
  var MemberExpression = class extends Expression {
    constructor(object, property, computed) {
      super();
      this.object = object;
      this.property = property;
      this.computed = computed;
    }
    type = "MemberExpression";
  };
  var CallExpression = class extends Expression {
    constructor(callee, args) {
      super();
      this.callee = callee;
      this.args = args;
    }
    type = "CallExpression";
  };
  var Identifier = class extends Expression {
    /**
     * @param {string} value The name of the identifier
     */
    constructor(value) {
      super();
      this.value = value;
    }
    type = "Identifier";
  };
  var Literal = class extends Expression {
    constructor(value) {
      super();
      this.value = value;
    }
    type = "Literal";
  };
  var IntegerLiteral = class extends Literal {
    type = "IntegerLiteral";
  };
  var FloatLiteral = class extends Literal {
    type = "FloatLiteral";
  };
  var StringLiteral = class extends Literal {
    type = "StringLiteral";
  };
  var ArrayLiteral = class extends Literal {
    type = "ArrayLiteral";
  };
  var TupleLiteral = class extends Literal {
    type = "TupleLiteral";
  };
  var ObjectLiteral = class extends Literal {
    type = "ObjectLiteral";
  };
  var BinaryExpression = class extends Expression {
    constructor(operator, left, right) {
      super();
      this.operator = operator;
      this.left = left;
      this.right = right;
    }
    type = "BinaryExpression";
  };
  var FilterExpression = class extends Expression {
    constructor(operand, filter) {
      super();
      this.operand = operand;
      this.filter = filter;
    }
    type = "FilterExpression";
  };
  var FilterStatement = class extends Statement {
    constructor(filter, body) {
      super();
      this.filter = filter;
      this.body = body;
    }
    type = "FilterStatement";
  };
  var SelectExpression = class extends Expression {
    constructor(lhs, test) {
      super();
      this.lhs = lhs;
      this.test = test;
    }
    type = "SelectExpression";
  };
  var TestExpression = class extends Expression {
    constructor(operand, negate, test) {
      super();
      this.operand = operand;
      this.negate = negate;
      this.test = test;
    }
    type = "TestExpression";
  };
  var UnaryExpression = class extends Expression {
    constructor(operator, argument) {
      super();
      this.operator = operator;
      this.argument = argument;
    }
    type = "UnaryExpression";
  };
  var SliceExpression = class extends Expression {
    constructor(start = void 0, stop = void 0, step = void 0) {
      super();
      this.start = start;
      this.stop = stop;
      this.step = step;
    }
    type = "SliceExpression";
  };
  var KeywordArgumentExpression = class extends Expression {
    constructor(key, value) {
      super();
      this.key = key;
      this.value = value;
    }
    type = "KeywordArgumentExpression";
  };
  var SpreadExpression = class extends Expression {
    constructor(argument) {
      super();
      this.argument = argument;
    }
    type = "SpreadExpression";
  };
  var KeywordSpreadExpression = class extends Expression {
    constructor(argument) {
      super();
      this.argument = argument;
    }
    type = "KeywordSpreadExpression";
  };
  var CallStatement = class extends Statement {
    constructor(call, callerArgs, body) {
      super();
      this.call = call;
      this.callerArgs = callerArgs;
      this.body = body;
    }
    type = "CallStatement";
  };
  var Ternary = class extends Expression {
    constructor(condition, trueExpr, falseExpr) {
      super();
      this.condition = condition;
      this.trueExpr = trueExpr;
      this.falseExpr = falseExpr;
    }
    type = "Ternary";
  };
  function parse(tokens) {
    const program = new Program([]);
    let current = 0;
    function expect(type, error) {
      const prev = tokens[current++];
      if (!prev || prev.type !== type) {
        throw new Error(`Parser Error: ${error}. ${prev.type} !== ${type}.`);
      }
      return prev;
    }
    function expectIdentifier(name) {
      if (!isIdentifier(name)) {
        throw new SyntaxError(`Expected ${name}`);
      }
      ++current;
    }
    function parseAny() {
      switch (tokens[current].type) {
        case TOKEN_TYPES.Comment:
          return new Comment(tokens[current++].value);
        case TOKEN_TYPES.Text:
          return parseText();
        case TOKEN_TYPES.OpenStatement:
          return parseJinjaStatement();
        case TOKEN_TYPES.OpenExpression:
          return parseJinjaExpression();
        default:
          throw new SyntaxError(`Unexpected token type: ${tokens[current].type}`);
      }
    }
    function is2(...types) {
      return current + types.length <= tokens.length && types.every((type, i) => type === tokens[current + i].type);
    }
    function isStatement(...names) {
      return tokens[current]?.type === TOKEN_TYPES.OpenStatement && tokens[current + 1]?.type === TOKEN_TYPES.Identifier && names.includes(tokens[current + 1]?.value);
    }
    function isIdentifier(...names) {
      return current + names.length <= tokens.length && names.every((name, i) => tokens[current + i].type === "Identifier" && name === tokens[current + i].value);
    }
    function parseText() {
      return new StringLiteral(expect(TOKEN_TYPES.Text, "Expected text token").value);
    }
    function parseJinjaStatement() {
      expect(TOKEN_TYPES.OpenStatement, "Expected opening statement token");
      if (tokens[current].type !== TOKEN_TYPES.Identifier) {
        throw new SyntaxError(`Unknown statement, got ${tokens[current].type}`);
      }
      const name = tokens[current].value;
      let result;
      switch (name) {
        case "set":
          ++current;
          result = parseSetStatement();
          break;
        case "if":
          ++current;
          result = parseIfStatement();
          expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
          expectIdentifier("endif");
          expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
          break;
        case "macro":
          ++current;
          result = parseMacroStatement();
          expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
          expectIdentifier("endmacro");
          expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
          break;
        case "for":
          ++current;
          result = parseForStatement();
          expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
          expectIdentifier("endfor");
          expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
          break;
        case "call": {
          ++current;
          let callerArgs = null;
          if (is2(TOKEN_TYPES.OpenParen)) {
            callerArgs = parseArgs("parameters");
          }
          const callee = parsePrimaryExpression();
          if (callee.type !== "Identifier") {
            throw new SyntaxError(`Expected identifier following call statement`);
          }
          const callArgs = parseArgs("call");
          expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
          const body = [];
          while (!isStatement("endcall")) {
            body.push(parseAny());
          }
          expect(TOKEN_TYPES.OpenStatement, "Expected '{%'");
          expectIdentifier("endcall");
          expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
          const callExpr = new CallExpression(callee, callArgs);
          result = new CallStatement(callExpr, callerArgs, body);
          break;
        }
        case "break":
          ++current;
          expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
          result = new Break();
          break;
        case "continue":
          ++current;
          expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
          result = new Continue();
          break;
        case "filter": {
          ++current;
          let filterNode = parsePrimaryExpression();
          if (filterNode instanceof Identifier && is2(TOKEN_TYPES.OpenParen)) {
            filterNode = parseCallExpression(filterNode);
          }
          expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
          const filterBody = [];
          while (!isStatement("endfilter")) {
            filterBody.push(parseAny());
          }
          expect(TOKEN_TYPES.OpenStatement, "Expected '{%'");
          expectIdentifier("endfilter");
          expect(TOKEN_TYPES.CloseStatement, "Expected '%}'");
          result = new FilterStatement(filterNode, filterBody);
          break;
        }
        default:
          throw new SyntaxError(`Unknown statement type: ${name}`);
      }
      return result;
    }
    function parseJinjaExpression() {
      expect(TOKEN_TYPES.OpenExpression, "Expected opening expression token");
      const result = parseExpression();
      expect(TOKEN_TYPES.CloseExpression, "Expected closing expression token");
      return result;
    }
    function parseSetStatement() {
      const left = parseExpressionSequence();
      let value = null;
      const body = [];
      if (is2(TOKEN_TYPES.Equals)) {
        ++current;
        value = parseExpressionSequence();
      } else {
        expect(TOKEN_TYPES.CloseStatement, "Expected %} token");
        while (!isStatement("endset")) {
          body.push(parseAny());
        }
        expect(TOKEN_TYPES.OpenStatement, "Expected {% token");
        expectIdentifier("endset");
      }
      expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
      return new SetStatement(left, value, body);
    }
    function parseIfStatement() {
      const test = parseExpression();
      expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
      const body = [];
      const alternate = [];
      while (!isStatement("elif", "else", "endif")) {
        body.push(parseAny());
      }
      if (isStatement("elif")) {
        ++current;
        ++current;
        const result = parseIfStatement();
        alternate.push(result);
      } else if (isStatement("else")) {
        ++current;
        ++current;
        expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
        while (!isStatement("endif")) {
          alternate.push(parseAny());
        }
      }
      return new If(test, body, alternate);
    }
    function parseMacroStatement() {
      const name = parsePrimaryExpression();
      if (name.type !== "Identifier") {
        throw new SyntaxError(`Expected identifier following macro statement`);
      }
      const args = parseArgs("parameters");
      expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
      const body = [];
      while (!isStatement("endmacro")) {
        body.push(parseAny());
      }
      return new Macro(name, args, body);
    }
    function parseExpressionSequence(primary = false) {
      const fn2 = primary ? parsePrimaryExpression : parseExpression;
      const expressions = [fn2()];
      const isTuple = is2(TOKEN_TYPES.Comma);
      while (isTuple) {
        ++current;
        expressions.push(fn2());
        if (!is2(TOKEN_TYPES.Comma)) {
          break;
        }
      }
      return isTuple ? new TupleLiteral(expressions) : expressions[0];
    }
    function parseForStatement() {
      const loopVariable = parseExpressionSequence(true);
      if (!(loopVariable instanceof Identifier || loopVariable instanceof TupleLiteral)) {
        throw new SyntaxError(`Expected identifier/tuple for the loop variable, got ${loopVariable.type} instead`);
      }
      if (!isIdentifier("in")) {
        throw new SyntaxError("Expected `in` keyword following loop variable");
      }
      ++current;
      const iterable = parseExpression();
      expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
      const body = [];
      while (!isStatement("endfor", "else")) {
        body.push(parseAny());
      }
      const alternative = [];
      if (isStatement("else")) {
        ++current;
        ++current;
        expect(TOKEN_TYPES.CloseStatement, "Expected closing statement token");
        while (!isStatement("endfor")) {
          alternative.push(parseAny());
        }
      }
      return new For(loopVariable, iterable, body, alternative);
    }
    function parseExpression() {
      return parseIfExpression();
    }
    function parseIfExpression() {
      const a = parseLogicalOrExpression();
      if (isIdentifier("if")) {
        ++current;
        const test = parseLogicalOrExpression();
        if (isIdentifier("else")) {
          ++current;
          const falseExpr = parseIfExpression();
          return new Ternary(test, a, falseExpr);
        } else {
          return new SelectExpression(a, test);
        }
      }
      return a;
    }
    function parseLogicalOrExpression() {
      let left = parseLogicalAndExpression();
      while (isIdentifier("or")) {
        const operator = tokens[current];
        ++current;
        const right = parseLogicalAndExpression();
        left = new BinaryExpression(operator, left, right);
      }
      return left;
    }
    function parseLogicalAndExpression() {
      let left = parseLogicalNegationExpression();
      while (isIdentifier("and")) {
        const operator = tokens[current];
        ++current;
        const right = parseLogicalNegationExpression();
        left = new BinaryExpression(operator, left, right);
      }
      return left;
    }
    function parseLogicalNegationExpression() {
      let right;
      while (isIdentifier("not")) {
        const operator = tokens[current];
        ++current;
        const arg = parseLogicalNegationExpression();
        right = new UnaryExpression(operator, arg);
      }
      return right ?? parseComparisonExpression();
    }
    function parseComparisonExpression() {
      let left = parseAdditiveExpression();
      while (true) {
        let operator;
        if (isIdentifier("not", "in")) {
          operator = new Token("not in", TOKEN_TYPES.Identifier);
          current += 2;
        } else if (isIdentifier("in")) {
          operator = tokens[current++];
        } else if (is2(TOKEN_TYPES.ComparisonBinaryOperator)) {
          operator = tokens[current++];
        } else {
          break;
        }
        const right = parseAdditiveExpression();
        left = new BinaryExpression(operator, left, right);
      }
      return left;
    }
    function parseAdditiveExpression() {
      let left = parseMultiplicativeExpression();
      while (is2(TOKEN_TYPES.AdditiveBinaryOperator)) {
        const operator = tokens[current];
        ++current;
        const right = parseMultiplicativeExpression();
        left = new BinaryExpression(operator, left, right);
      }
      return left;
    }
    function parseCallMemberExpression() {
      const member = parseMemberExpression(parsePrimaryExpression());
      if (is2(TOKEN_TYPES.OpenParen)) {
        return parseCallExpression(member);
      }
      return member;
    }
    function parseCallExpression(callee) {
      let expression = new CallExpression(callee, parseArgs("call"));
      expression = parseMemberExpression(expression);
      if (is2(TOKEN_TYPES.OpenParen)) {
        expression = parseCallExpression(expression);
      }
      return expression;
    }
    function parseArgs(mode) {
      expect(TOKEN_TYPES.OpenParen, "Expected opening parenthesis for arguments list");
      const args = parseArgumentsList(mode);
      expect(TOKEN_TYPES.CloseParen, "Expected closing parenthesis for arguments list");
      return args;
    }
    function parseArgumentsList(mode) {
      const args = [];
      const parameterNames = /* @__PURE__ */ new Set();
      let sawKeywordOrDefault = false;
      let sawSpreadArgument = false;
      while (!is2(TOKEN_TYPES.CloseParen)) {
        const isKeywordSpread = is2(TOKEN_TYPES.ExponentiationBinaryOperator);
        const isPositionalSpread = is2(TOKEN_TYPES.MultiplicativeBinaryOperator) && tokens[current].value === "*";
        if (mode === "parameters" && (isKeywordSpread || isPositionalSpread)) {
          throw new SyntaxError("Argument unpacking is not allowed in parameter declarations");
        }
        if (isKeywordSpread) {
          ++current;
          args.push(new KeywordSpreadExpression(parseExpression()));
          if (is2(TOKEN_TYPES.Comma)) {
            ++current;
          }
          if (!is2(TOKEN_TYPES.CloseParen)) {
            throw new SyntaxError("Expected closing parenthesis: `**` must be applied to the final argument");
          }
          break;
        }
        let argument;
        if (isPositionalSpread) {
          if (sawSpreadArgument) {
            throw new SyntaxError("Only one `*` argument unpacking is allowed");
          }
          sawSpreadArgument = true;
          ++current;
          const expr = parseExpression();
          argument = new SpreadExpression(expr);
        } else {
          argument = parseExpression();
          if (is2(TOKEN_TYPES.Equals)) {
            ++current;
            if (!(argument instanceof Identifier)) {
              throw new SyntaxError(
                mode === "parameters" ? "Expected identifier for parameter declaration" : "Expected identifier for keyword argument"
              );
            }
            const value = parseExpression();
            argument = new KeywordArgumentExpression(argument, value);
          }
          if (mode === "parameters") {
            if (!(argument instanceof Identifier || argument instanceof KeywordArgumentExpression)) {
              throw new SyntaxError("Expected identifier for parameter declaration");
            }
            const parameterName = argument instanceof Identifier ? argument.value : argument.key.value;
            if (parameterNames.has(parameterName)) {
              throw new SyntaxError(`Duplicate parameter name: ${parameterName}`);
            }
            parameterNames.add(parameterName);
          }
          if (argument instanceof KeywordArgumentExpression) {
            sawKeywordOrDefault = true;
          } else if (sawKeywordOrDefault) {
            throw new SyntaxError(
              mode === "call" ? "Positional arguments must come before keyword arguments" : "Non-default argument follows default argument"
            );
          } else if (sawSpreadArgument) {
            throw new SyntaxError("Positional arguments must not follow `*` argument unpacking");
          }
        }
        args.push(argument);
        if (is2(TOKEN_TYPES.Comma)) {
          ++current;
        }
      }
      return args;
    }
    function parseMemberExpressionArgumentsList() {
      const slices = [];
      let isSlice = false;
      while (!is2(TOKEN_TYPES.CloseSquareBracket)) {
        if (is2(TOKEN_TYPES.Colon)) {
          slices.push(void 0);
          ++current;
          isSlice = true;
        } else {
          slices.push(parseExpression());
          if (is2(TOKEN_TYPES.Colon)) {
            ++current;
            isSlice = true;
          }
        }
      }
      if (slices.length === 0) {
        throw new SyntaxError(`Expected at least one argument for member/slice expression`);
      }
      if (isSlice) {
        if (slices.length > 3) {
          throw new SyntaxError(`Expected 0-3 arguments for slice expression`);
        }
        return new SliceExpression(...slices);
      }
      return slices[0];
    }
    function parseMemberExpression(object) {
      while (is2(TOKEN_TYPES.Dot) || is2(TOKEN_TYPES.OpenSquareBracket)) {
        const operator = tokens[current];
        ++current;
        let property;
        const computed = operator.type === TOKEN_TYPES.OpenSquareBracket;
        if (computed) {
          property = parseMemberExpressionArgumentsList();
          expect(TOKEN_TYPES.CloseSquareBracket, "Expected closing square bracket");
        } else {
          property = parsePrimaryExpression();
          if (property.type !== "Identifier" && property.type !== "IntegerLiteral") {
            throw new SyntaxError(`Expected identifier or integer following dot operator`);
          }
        }
        object = new MemberExpression(object, property, computed);
      }
      return object;
    }
    function parseMultiplicativeExpression() {
      let left = parsePowerExpression();
      while (is2(TOKEN_TYPES.MultiplicativeBinaryOperator)) {
        const operator = tokens[current++];
        const right = parsePowerExpression();
        left = new BinaryExpression(operator, left, right);
      }
      return left;
    }
    function parsePowerExpression() {
      let left = parseTestExpression();
      while (is2(TOKEN_TYPES.ExponentiationBinaryOperator)) {
        const operator = tokens[current++];
        const right = parseTestExpression();
        left = new BinaryExpression(operator, left, right);
      }
      return left;
    }
    function parseTestExpression() {
      let operand = parseFilterExpression();
      while (isIdentifier("is")) {
        ++current;
        const negate = isIdentifier("not");
        if (negate) {
          ++current;
        }
        const filter = parsePrimaryExpression();
        if (!(filter instanceof Identifier)) {
          throw new SyntaxError(`Expected identifier for the test`);
        }
        operand = new TestExpression(operand, negate, filter);
      }
      return operand;
    }
    function parseFilterExpression() {
      let operand = parseUnarySignExpression();
      while (is2(TOKEN_TYPES.Pipe)) {
        ++current;
        let filter = parsePrimaryExpression();
        if (!(filter instanceof Identifier)) {
          throw new SyntaxError(`Expected identifier for the filter`);
        }
        if (is2(TOKEN_TYPES.OpenParen)) {
          filter = parseCallExpression(filter);
        }
        operand = new FilterExpression(operand, filter);
      }
      return operand;
    }
    function parseUnarySignExpression() {
      const token = tokens[current];
      if (token && (token.type === TOKEN_TYPES.UnaryOperator || token.type === TOKEN_TYPES.AdditiveBinaryOperator) && (token.value === "-" || token.value === "+")) {
        const operator = tokens[current++];
        const argument = parseUnarySignExpression();
        return new UnaryExpression(operator, argument);
      }
      return parseCallMemberExpression();
    }
    function parsePrimaryExpression() {
      const token = tokens[current++];
      switch (token.type) {
        case TOKEN_TYPES.NumericLiteral: {
          const num = token.value;
          return num.includes(".") ? new FloatLiteral(Number(num)) : new IntegerLiteral(Number(num));
        }
        case TOKEN_TYPES.StringLiteral: {
          let value = token.value;
          while (is2(TOKEN_TYPES.StringLiteral)) {
            value += tokens[current++].value;
          }
          return new StringLiteral(value);
        }
        case TOKEN_TYPES.Identifier:
          return new Identifier(token.value);
        case TOKEN_TYPES.OpenParen: {
          const expression = parseExpressionSequence();
          expect(TOKEN_TYPES.CloseParen, "Expected closing parenthesis, got ${tokens[current].type} instead.");
          return expression;
        }
        case TOKEN_TYPES.OpenSquareBracket: {
          const values = [];
          while (!is2(TOKEN_TYPES.CloseSquareBracket)) {
            values.push(parseExpression());
            if (is2(TOKEN_TYPES.Comma)) {
              ++current;
            }
          }
          ++current;
          return new ArrayLiteral(values);
        }
        case TOKEN_TYPES.OpenCurlyBracket: {
          const values = /* @__PURE__ */ new Map();
          while (!is2(TOKEN_TYPES.CloseCurlyBracket)) {
            const key = parseExpression();
            expect(TOKEN_TYPES.Colon, "Expected colon between key and value in object literal");
            const value = parseExpression();
            values.set(key, value);
            if (is2(TOKEN_TYPES.Comma)) {
              ++current;
            }
          }
          ++current;
          return new ObjectLiteral(values);
        }
        default:
          throw new SyntaxError(`Unexpected token: ${token.type}`);
      }
    }
    while (current < tokens.length) {
      program.body.push(parseAny());
    }
    return program;
  }
  function range(start, stop, step = 1) {
    if (stop === void 0) {
      stop = start;
      start = 0;
    }
    if (step === 0) {
      throw new Error("range() step must not be zero");
    }
    const result = [];
    if (step > 0) {
      for (let i = start; i < stop; i += step) {
        result.push(i);
      }
    } else {
      for (let i = start; i > stop; i += step) {
        result.push(i);
      }
    }
    return result;
  }
  function slice(array, start, stop, step = 1) {
    const direction = Math.sign(step);
    if (direction >= 0) {
      start = (start ??= 0) < 0 ? Math.max(array.length + start, 0) : Math.min(start, array.length);
      stop = (stop ??= array.length) < 0 ? Math.max(array.length + stop, 0) : Math.min(stop, array.length);
    } else {
      start = (start ??= array.length - 1) < 0 ? Math.max(array.length + start, -1) : Math.min(start, array.length - 1);
      stop = (stop ??= -1) < -1 ? Math.max(array.length + stop, -1) : Math.min(stop, array.length - 1);
    }
    const result = [];
    for (let i = start; direction * i < direction * stop; i += step) {
      result.push(array[i]);
    }
    return result;
  }
  function titleCase(value) {
    return value.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function strftime_now(format2) {
    return strftime(/* @__PURE__ */ new Date(), format2);
  }
  function strftime(date, format2) {
    const monthFormatterLong = new Intl.DateTimeFormat(void 0, { month: "long" });
    const monthFormatterShort = new Intl.DateTimeFormat(void 0, { month: "short" });
    const pad2 = (n) => n < 10 ? "0" + n : n.toString();
    return format2.replace(/%[YmdbBHM%]/g, (token) => {
      switch (token) {
        case "%Y":
          return date.getFullYear().toString();
        case "%m":
          return pad2(date.getMonth() + 1);
        case "%d":
          return pad2(date.getDate());
        case "%b":
          return monthFormatterShort.format(date);
        case "%B":
          return monthFormatterLong.format(date);
        case "%H":
          return pad2(date.getHours());
        case "%M":
          return pad2(date.getMinutes());
        case "%%":
          return "%";
        default:
          return token;
      }
    });
  }
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function replace(str, oldvalue, newvalue, count) {
    if (count === 0) {
      return str;
    }
    let remaining = count == null || count < 0 ? Infinity : count;
    const pattern = oldvalue.length === 0 ? new RegExp("(?=)", "gu") : new RegExp(escapeRegExp(oldvalue), "gu");
    return str.replaceAll(pattern, (match) => {
      if (remaining > 0) {
        --remaining;
        return newvalue;
      }
      return match;
    });
  }
  var BreakControl = class extends Error {
  };
  var ContinueControl = class extends Error {
  };
  var EMPTY_BUILTINS = /* @__PURE__ */ new Map();
  var RuntimeValue = class {
    type = "RuntimeValue";
    value;
    /**
     * A collection of built-in functions for this type.
     */
    get builtins() {
      return EMPTY_BUILTINS;
    }
    /**
     * Creates a new RuntimeValue.
     */
    constructor(value = void 0) {
      this.value = value;
    }
    /**
     * Determines truthiness or falsiness of the runtime value.
     * This function should be overridden by subclasses if it has custom truthiness criteria.
     * @returns {BooleanValue} BooleanValue(true) if the value is truthy, BooleanValue(false) otherwise.
     */
    __bool__() {
      return new BooleanValue(!!this.value);
    }
    toString() {
      return String(this.value);
    }
  };
  var IntegerValue = class extends RuntimeValue {
    type = "IntegerValue";
  };
  var FloatValue = class extends RuntimeValue {
    type = "FloatValue";
    toString() {
      if (Object.is(this.value, -0)) {
        return "-0.0";
      }
      return this.value % 1 === 0 ? this.value.toFixed(1) : this.value.toString();
    }
  };
  var StringValue = class extends RuntimeValue {
    type = "StringValue";
    _builtins;
    get builtins() {
      return this._builtins ??= /* @__PURE__ */ new Map([
        [
          "upper",
          new FunctionValue(() => {
            return new StringValue(this.value.toUpperCase());
          })
        ],
        [
          "lower",
          new FunctionValue(() => {
            return new StringValue(this.value.toLowerCase());
          })
        ],
        [
          "strip",
          new FunctionValue(() => {
            return new StringValue(this.value.trim());
          })
        ],
        [
          "title",
          new FunctionValue(() => {
            return new StringValue(titleCase(this.value));
          })
        ],
        [
          "capitalize",
          new FunctionValue(() => {
            return new StringValue(this.value.charAt(0).toUpperCase() + this.value.slice(1));
          })
        ],
        ["length", new IntegerValue(this.value.length)],
        [
          "rstrip",
          new FunctionValue(() => {
            return new StringValue(this.value.trimEnd());
          })
        ],
        [
          "lstrip",
          new FunctionValue(() => {
            return new StringValue(this.value.trimStart());
          })
        ],
        [
          "startswith",
          new FunctionValue((args) => {
            if (args.length === 0) {
              throw new Error("startswith() requires at least one argument");
            }
            const pattern = args[0];
            if (pattern instanceof StringValue) {
              return new BooleanValue(this.value.startsWith(pattern.value));
            } else if (pattern instanceof ArrayValue) {
              for (const item of pattern.value) {
                if (!(item instanceof StringValue)) {
                  throw new Error("startswith() tuple elements must be strings");
                }
                if (this.value.startsWith(item.value)) {
                  return new BooleanValue(true);
                }
              }
              return new BooleanValue(false);
            }
            throw new Error("startswith() argument must be a string or tuple of strings");
          })
        ],
        [
          "endswith",
          new FunctionValue((args) => {
            if (args.length === 0) {
              throw new Error("endswith() requires at least one argument");
            }
            const pattern = args[0];
            if (pattern instanceof StringValue) {
              return new BooleanValue(this.value.endsWith(pattern.value));
            } else if (pattern instanceof ArrayValue) {
              for (const item of pattern.value) {
                if (!(item instanceof StringValue)) {
                  throw new Error("endswith() tuple elements must be strings");
                }
                if (this.value.endsWith(item.value)) {
                  return new BooleanValue(true);
                }
              }
              return new BooleanValue(false);
            }
            throw new Error("endswith() argument must be a string or tuple of strings");
          })
        ],
        [
          "split",
          // follows Python's `str.split(sep=None, maxsplit=-1)` function behavior
          // https://docs.python.org/3.13/library/stdtypes.html#str.split
          new FunctionValue((args) => {
            const sep = args[0] ?? new NullValue();
            if (!(sep instanceof StringValue || sep instanceof NullValue)) {
              throw new Error("sep argument must be a string or null");
            }
            const maxsplit = args[1] ?? new IntegerValue(-1);
            if (!(maxsplit instanceof IntegerValue)) {
              throw new Error("maxsplit argument must be a number");
            }
            let result = [];
            if (sep instanceof NullValue) {
              const text = this.value.trimStart();
              for (const { 0: match, index } of text.matchAll(/\S+/g)) {
                if (maxsplit.value !== -1 && result.length >= maxsplit.value && index !== void 0) {
                  result.push(match + text.slice(index + match.length));
                  break;
                }
                result.push(match);
              }
            } else {
              if (sep.value === "") {
                throw new Error("empty separator");
              }
              result = this.value.split(sep.value);
              if (maxsplit.value !== -1 && result.length > maxsplit.value) {
                result.push(result.splice(maxsplit.value).join(sep.value));
              }
            }
            return new ArrayValue(result.map((part) => new StringValue(part)));
          })
        ],
        [
          "replace",
          new FunctionValue((args) => {
            if (args.length < 2) {
              throw new Error("replace() requires at least two arguments");
            }
            const oldValue = args[0];
            const newValue = args[1];
            if (!(oldValue instanceof StringValue && newValue instanceof StringValue)) {
              throw new Error("replace() arguments must be strings");
            }
            let count;
            if (args.length > 2) {
              if (args[2].type === "KeywordArgumentsValue") {
                count = args[2].value.get("count") ?? new NullValue();
              } else {
                count = args[2];
              }
            } else {
              count = new NullValue();
            }
            if (!(count instanceof IntegerValue || count instanceof NullValue)) {
              throw new Error("replace() count argument must be a number or null");
            }
            return new StringValue(replace(this.value, oldValue.value, newValue.value, count.value));
          })
        ]
      ]);
    }
  };
  var BooleanValue = class extends RuntimeValue {
    type = "BooleanValue";
  };
  var NON_ASCII_CHARS = /[\x7f-\uffff]/g;
  function makeAsciiSafe(str) {
    return str.replace(NON_ASCII_CHARS, (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"));
  }
  function toJSON(input, options = {}, depth = 0, convertUndefinedToNull = true) {
    const { indent = null, ensureAscii = false, separators = null, sortKeys = false } = options;
    let itemSeparator;
    let keySeparator;
    if (separators) {
      [itemSeparator, keySeparator] = separators;
    } else if (indent) {
      itemSeparator = ",";
      keySeparator = ": ";
    } else {
      itemSeparator = ", ";
      keySeparator = ": ";
    }
    switch (input.type) {
      case "NullValue":
        return "null";
      case "UndefinedValue":
        return convertUndefinedToNull ? "null" : "undefined";
      case "IntegerValue":
      case "FloatValue":
      case "BooleanValue":
        return JSON.stringify(input.value);
      case "StringValue": {
        let result = JSON.stringify(input.value);
        if (ensureAscii) {
          result = makeAsciiSafe(result);
        }
        return result;
      }
      case "ArrayValue":
      case "NamespaceValue":
      case "ObjectValue": {
        const indentValue = indent ? " ".repeat(indent) : "";
        const basePadding = "\n" + indentValue.repeat(depth);
        const childrenPadding = basePadding + indentValue;
        if (input.type === "ArrayValue") {
          const core = input.value.map((x) => toJSON(x, options, depth + 1, convertUndefinedToNull));
          return indent ? `[${childrenPadding}${core.join(`${itemSeparator}${childrenPadding}`)}${basePadding}]` : `[${core.join(itemSeparator)}]`;
        } else {
          let entries = Array.from(input.value.entries());
          if (sortKeys) {
            entries = entries.sort(([a], [b]) => a.localeCompare(b));
          }
          const core = entries.map(([key, value]) => {
            let keyStr = JSON.stringify(key);
            if (ensureAscii) {
              keyStr = makeAsciiSafe(keyStr);
            }
            const v = `${keyStr}${keySeparator}${toJSON(value, options, depth + 1, convertUndefinedToNull)}`;
            return indent ? `${childrenPadding}${v}` : v;
          });
          return indent ? `{${core.join(itemSeparator)}${basePadding}}` : `{${core.join(itemSeparator)}}`;
        }
      }
      default:
        throw new Error(`Cannot convert to JSON: ${input.type}`);
    }
  }
  var ObjectValue = class extends RuntimeValue {
    type = "ObjectValue";
    _builtins;
    /**
     * NOTE: necessary to override since all JavaScript arrays are considered truthy,
     * while only non-empty Python arrays are consider truthy.
     *
     * e.g.,
     *  - JavaScript:  {} && 5 -> 5
     *  - Python:      {} and 5 -> {}
     */
    __bool__() {
      return new BooleanValue(this.value.size > 0);
    }
    get builtins() {
      return this._builtins ??= /* @__PURE__ */ new Map([
        [
          "get",
          new FunctionValue(([key, defaultValue]) => {
            if (!(key instanceof StringValue)) {
              throw new Error(`Object key must be a string: got ${key.type}`);
            }
            return this.value.get(key.value) ?? defaultValue ?? new NullValue();
          })
        ],
        ["items", new FunctionValue(() => this.items())],
        ["keys", new FunctionValue(() => this.keys())],
        ["values", new FunctionValue(() => this.values())],
        [
          "dictsort",
          new FunctionValue((args) => {
            let kwargs = /* @__PURE__ */ new Map();
            const positionalArgs = args.filter((arg) => {
              if (arg instanceof KeywordArgumentsValue) {
                kwargs = arg.value;
                return false;
              }
              return true;
            });
            const caseSensitive = positionalArgs.at(0) ?? kwargs.get("case_sensitive") ?? new BooleanValue(false);
            if (!(caseSensitive instanceof BooleanValue)) {
              throw new Error("case_sensitive must be a boolean");
            }
            const by = positionalArgs.at(1) ?? kwargs.get("by") ?? new StringValue("key");
            if (!(by instanceof StringValue)) {
              throw new Error("by must be a string");
            }
            if (!["key", "value"].includes(by.value)) {
              throw new Error("by must be either 'key' or 'value'");
            }
            const reverse = positionalArgs.at(2) ?? kwargs.get("reverse") ?? new BooleanValue(false);
            if (!(reverse instanceof BooleanValue)) {
              throw new Error("reverse must be a boolean");
            }
            const items = Array.from(this.value.entries()).map(([key, value]) => new ArrayValue([new StringValue(key), value])).sort((a, b) => {
              const index = by.value === "key" ? 0 : 1;
              const aVal = a.value[index];
              const bVal = b.value[index];
              const result = compareRuntimeValues(aVal, bVal, caseSensitive.value);
              return reverse.value ? -result : result;
            });
            return new ArrayValue(items);
          })
        ]
      ]);
    }
    items() {
      return new ArrayValue(
        Array.from(this.value.entries()).map(([key, value]) => new ArrayValue([new StringValue(key), value]))
      );
    }
    keys() {
      return new ArrayValue(Array.from(this.value.keys()).map((key) => new StringValue(key)));
    }
    values() {
      return new ArrayValue(Array.from(this.value.values()));
    }
    toString() {
      return toJSON(this, {}, 0, false);
    }
  };
  var KeywordArgumentsValue = class extends ObjectValue {
    type = "KeywordArgumentsValue";
  };
  var NamespaceValue = class extends RuntimeValue {
    type = "NamespaceValue";
    toString() {
      return toJSON(this, {}, 0, false);
    }
  };
  var ArrayValue = class extends RuntimeValue {
    type = "ArrayValue";
    _builtins;
    get builtins() {
      return this._builtins ??= /* @__PURE__ */ new Map([["length", new IntegerValue(this.value.length)]]);
    }
    /**
     * NOTE: necessary to override since all JavaScript arrays are considered truthy,
     * while only non-empty Python arrays are consider truthy.
     *
     * e.g.,
     *  - JavaScript:  [] && 5 -> 5
     *  - Python:      [] and 5 -> []
     */
    __bool__() {
      return new BooleanValue(this.value.length > 0);
    }
    toString() {
      return toJSON(this, {}, 0, false);
    }
  };
  var TupleValue = class extends ArrayValue {
    type = "TupleValue";
  };
  var FunctionValue = class extends RuntimeValue {
    type = "FunctionValue";
  };
  var NullValue = class extends RuntimeValue {
    type = "NullValue";
  };
  var UndefinedValue = class extends RuntimeValue {
    type = "UndefinedValue";
  };
  function normalizeNamespaceEntry(pair) {
    let values;
    if (pair instanceof ArrayValue) {
      values = pair.value;
    } else if (pair instanceof StringValue) {
      values = Array.from(pair.value, (char) => new StringValue(char));
    }
    if (!values || values.length !== 2) {
      throw new Error("namespace expected an object or an iterable of [key, value] pairs");
    }
    const [key, value] = values;
    if (!(key instanceof StringValue)) {
      throw new Error("namespace keys must be strings");
    }
    return [key, value];
  }
  var _Environment = class {
    constructor(parent) {
      this.parent = parent;
    }
    /**
     * The variables declared in this environment.
     */
    variables = /* @__PURE__ */ new Map([
      [
        "namespace",
        new FunctionValue((args) => {
          const positional = args.slice();
          let kwargs;
          if (positional.at(-1) instanceof KeywordArgumentsValue) {
            kwargs = positional.pop();
          }
          if (positional.length > 1) {
            throw new Error(`namespace expected at most 1 argument, got ${positional.length}`);
          }
          const entries = /* @__PURE__ */ new Map();
          if (positional.length === 1) {
            const source = positional[0];
            if (source instanceof ObjectValue) {
              for (const [key, value] of source.value) {
                entries.set(key, value);
              }
            } else if (source instanceof ArrayValue) {
              for (const pair of source.value) {
                const [key, value] = normalizeNamespaceEntry(pair);
                entries.set(key.value, value);
              }
            } else {
              throw new Error(`'${source.type}' object is not iterable`);
            }
          }
          if (kwargs) {
            for (const [key, value] of kwargs.value) {
              entries.set(key, value);
            }
          }
          return new NamespaceValue(entries);
        })
      ]
    ]);
    tests = _Environment.TESTS;
    /**
     * Set the value of a variable in the current environment.
     */
    set(name, value) {
      return this.declareVariable(name, convertToRuntimeValues(value));
    }
    declareVariable(name, value) {
      if (this.variables.has(name)) {
        throw new SyntaxError(`Variable already declared: ${name}`);
      }
      this.variables.set(name, value);
      return value;
    }
    // private assignVariable(name: string, value: AnyRuntimeValue): AnyRuntimeValue {
    // 	const env = this.resolve(name);
    // 	env.variables.set(name, value);
    // 	return value;
    // }
    /**
     * Set variable in the current scope.
     * See https://jinja.palletsprojects.com/en/3.0.x/templates/#assignments for more information.
     */
    setVariable(name, value) {
      this.variables.set(name, value);
      return value;
    }
    /**
     * Resolve the environment in which the variable is declared.
     * @param {string} name The name of the variable.
     * @returns {Environment} The environment in which the variable is declared.
     */
    resolve(name) {
      if (this.variables.has(name)) {
        return this;
      }
      if (this.parent) {
        return this.parent.resolve(name);
      }
      throw new Error(`Unknown variable: ${name}`);
    }
    lookupVariable(name) {
      try {
        return this.resolve(name).variables.get(name) ?? new UndefinedValue();
      } catch {
        return new UndefinedValue();
      }
    }
  };
  var Environment = _Environment;
  __publicField(Environment, "TESTS", /* @__PURE__ */ new Map([
    ["boolean", (operand) => operand.type === "BooleanValue"],
    ["callable", (operand) => operand instanceof FunctionValue],
    [
      "odd",
      (operand) => {
        if (!(operand instanceof IntegerValue)) {
          throw new Error(`cannot odd on ${operand.type}`);
        }
        return operand.value % 2 !== 0;
      }
    ],
    [
      "even",
      (operand) => {
        if (!(operand instanceof IntegerValue)) {
          throw new Error(`cannot even on ${operand.type}`);
        }
        return operand.value % 2 === 0;
      }
    ],
    ["false", (operand) => operand.type === "BooleanValue" && !operand.value],
    ["true", (operand) => operand.type === "BooleanValue" && operand.value],
    ["none", (operand) => operand.type === "NullValue"],
    ["string", (operand) => operand.type === "StringValue"],
    ["number", (operand) => operand instanceof IntegerValue || operand instanceof FloatValue],
    ["integer", (operand) => operand instanceof IntegerValue],
    ["iterable", (operand) => operand.type === "ArrayValue" || operand.type === "StringValue"],
    ["mapping", (operand) => operand instanceof ObjectValue],
    [
      "sequence",
      (operand) => operand instanceof ArrayValue || operand instanceof ObjectValue || operand instanceof StringValue
    ],
    [
      "lower",
      (operand) => {
        const str = operand.value;
        return operand.type === "StringValue" && str === str.toLowerCase();
      }
    ],
    [
      "upper",
      (operand) => {
        const str = operand.value;
        return operand.type === "StringValue" && str === str.toUpperCase();
      }
    ],
    ["none", (operand) => operand.type === "NullValue"],
    ["defined", (operand) => operand.type !== "UndefinedValue"],
    ["undefined", (operand) => operand.type === "UndefinedValue"],
    ["equalto", (a, b) => a.value === b.value],
    ["eq", (a, b) => a.value === b.value]
  ]));
  function setupGlobals(env3) {
    env3.set("false", false);
    env3.set("true", true);
    env3.set("none", null);
    env3.set("raise_exception", (args) => {
      throw new Error(args);
    });
    env3.set("range", range);
    env3.set("strftime_now", strftime_now);
    env3.set("True", true);
    env3.set("False", false);
    env3.set("None", null);
  }
  function isAttributeContainer(value) {
    return value instanceof ObjectValue || value instanceof NamespaceValue;
  }
  function isNumericLikeValue(value) {
    return value instanceof IntegerValue || value instanceof FloatValue || value instanceof BooleanValue;
  }
  function getNumericValue(value) {
    return value instanceof BooleanValue ? Number(value.value) : value.value;
  }
  function getAttributeValue(item, attributePath) {
    const parts = attributePath.split(".");
    let value = item;
    for (const part of parts) {
      if (isAttributeContainer(value)) {
        value = value.value.get(part) ?? new UndefinedValue();
      } else if (value instanceof ArrayValue) {
        const index = parseInt(part, 10);
        if (!isNaN(index) && index >= 0 && index < value.value.length) {
          value = value.value[index];
        } else {
          return new UndefinedValue();
        }
      } else {
        return new UndefinedValue();
      }
    }
    return value;
  }
  function compareRuntimeValues(a, b, caseSensitive = false) {
    if (a instanceof NullValue && b instanceof NullValue) {
      return 0;
    }
    if (a instanceof NullValue || b instanceof NullValue) {
      throw new Error(`Cannot compare ${a.type} with ${b.type}`);
    }
    if (a instanceof UndefinedValue && b instanceof UndefinedValue) {
      return 0;
    }
    if (a instanceof UndefinedValue || b instanceof UndefinedValue) {
      throw new Error(`Cannot compare ${a.type} with ${b.type}`);
    }
    if (isNumericLikeValue(a) && isNumericLikeValue(b)) {
      const aNum = getNumericValue(a);
      const bNum = getNumericValue(b);
      return aNum < bNum ? -1 : aNum > bNum ? 1 : 0;
    }
    if (a.type !== b.type) {
      throw new Error(`Cannot compare different types: ${a.type} and ${b.type}`);
    }
    switch (a.type) {
      case "StringValue": {
        let aStr = a.value;
        let bStr = b.value;
        if (!caseSensitive) {
          aStr = aStr.toLowerCase();
          bStr = bStr.toLowerCase();
        }
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      }
      default:
        throw new Error(`Cannot compare type: ${a.type}`);
    }
  }
  function getParameterDescriptor(argument) {
    if (argument.type === "Identifier") {
      return { name: argument.value };
    }
    const keywordArgument = argument;
    return { name: keywordArgument.key.value, defaultValue: keywordArgument.value };
  }
  function isSpecialMacroArgument(name) {
    return name === "kwargs" || name === "varargs";
  }
  function findAccessedSpecialMacroArguments(parameters, body) {
    const declared = /* @__PURE__ */ new Set();
    const accessed = /* @__PURE__ */ new Set();
    const declareName = (name) => {
      if (isSpecialMacroArgument(name)) {
        declared.add(name);
      }
    };
    const declareTarget = (target) => {
      if (target.type === "Identifier") {
        declareName(target.value);
      } else if (target.type === "TupleLiteral") {
        for (const item of target.value) {
          declareTarget(item);
        }
      }
    };
    const declareArgument = (argument) => {
      declareName(getParameterDescriptor(argument).name);
    };
    const visitArgumentDefaults = (args) => {
      for (const argument of args) {
        const parameter = getParameterDescriptor(argument);
        if (parameter.defaultValue) {
          visit(parameter.defaultValue);
        }
      }
    };
    const visitFilter = (filter) => {
      if (filter.type === "CallExpression") {
        visit(filter.args);
      }
    };
    const visit = (node) => {
      if (Array.isArray(node)) {
        for (const item of node) {
          visit(item);
        }
        return;
      }
      if (node instanceof Map) {
        for (const [key, value] of node) {
          visit(key);
          visit(value);
        }
        return;
      }
      if (!(node instanceof Statement)) {
        return;
      }
      switch (node.type) {
        case "For": {
          const statement = node;
          declareTarget(statement.loopvar);
          if (statement.iterable.type === "SelectExpression") {
            const iterable = statement.iterable;
            visit(iterable.lhs);
            visit(statement.body);
            visit(statement.defaultBlock);
            visit(iterable.test);
            return;
          }
          visit(statement.iterable);
          visit(statement.body);
          visit(statement.defaultBlock);
          return;
        }
        case "Set": {
          const statement = node;
          declareTarget(statement.assignee);
          visit(statement.value);
          visit(statement.body);
          return;
        }
        case "Macro": {
          const statement = node;
          for (const argument of statement.args) {
            declareArgument(argument);
          }
          visitArgumentDefaults(statement.args);
          visit(statement.body);
          return;
        }
        case "CallStatement": {
          const statement = node;
          visit(statement.call);
          for (const argument of statement.callerArgs ?? []) {
            declareArgument(argument);
          }
          visitArgumentDefaults(statement.callerArgs ?? []);
          visit(statement.body);
          return;
        }
        case "FilterStatement": {
          const statement = node;
          visit(statement.body);
          visitFilter(statement.filter);
          return;
        }
        case "Identifier": {
          const name = node.value;
          if (isSpecialMacroArgument(name) && !declared.has(name)) {
            accessed.add(name);
          }
          return;
        }
        case "MemberExpression": {
          const expression = node;
          visit(expression.object);
          if (expression.computed) {
            visit(expression.property);
          }
          return;
        }
        case "FilterExpression": {
          const expression = node;
          visit(expression.operand);
          visitFilter(expression.filter);
          return;
        }
        case "TestExpression":
          visit(node.operand);
          return;
        case "SelectExpression": {
          const expression = node;
          visit(expression.test);
          visit(expression.lhs);
          return;
        }
        case "KeywordArgumentExpression":
          visit(node.value);
          return;
        default:
          for (const child of Object.values(node)) {
            visit(child);
          }
      }
    };
    for (const parameter of parameters) {
      declareArgument(parameter);
    }
    visit(body);
    return accessed;
  }
  var Interpreter = class {
    global;
    constructor(env3) {
      this.global = env3 ?? new Environment();
    }
    /**
     * Run the program.
     */
    run(program) {
      return this.evaluate(program, this.global);
    }
    /**
     * Evaluates expressions following the binary operation type.
     */
    evaluateBinaryExpression(node, environment) {
      const left = this.evaluate(node.left, environment);
      switch (node.operator.value) {
        case "and":
          return left.__bool__().value ? this.evaluate(node.right, environment) : left;
        case "or":
          return left.__bool__().value ? left : this.evaluate(node.right, environment);
      }
      const right = this.evaluate(node.right, environment);
      switch (node.operator.value) {
        case "==":
          return new BooleanValue(left.value == right.value);
        case "!=":
          return new BooleanValue(left.value != right.value);
      }
      if (left instanceof UndefinedValue || right instanceof UndefinedValue) {
        if (right instanceof UndefinedValue && ["in", "not in"].includes(node.operator.value)) {
          return new BooleanValue(node.operator.value === "not in");
        }
        throw new Error(`Cannot perform operation ${node.operator.value} on undefined values`);
      } else if (left instanceof NullValue || right instanceof NullValue) {
        throw new Error("Cannot perform operation on null values");
      } else if (node.operator.value === "~") {
        return new StringValue(left.value.toString() + right.value.toString());
      } else if (node.operator.value === "**" && isNumericLikeValue(left) && isNumericLikeValue(right)) {
        const a = getNumericValue(left);
        const b = getNumericValue(right);
        if (a === 0 && b < 0) {
          throw new Error("0.0 cannot be raised to a negative power");
        }
        const result = a ** b;
        if (!Number.isFinite(result)) {
          throw new Error("Exponentiation result is not a finite real number");
        }
        const isFloat = left instanceof FloatValue || right instanceof FloatValue || b < 0;
        return isFloat ? new FloatValue(result) : new IntegerValue(result);
      } else if ((left instanceof IntegerValue || left instanceof FloatValue) && (right instanceof IntegerValue || right instanceof FloatValue)) {
        const a = left.value, b = right.value;
        switch (node.operator.value) {
          case "+":
          case "-":
          case "*": {
            const res = node.operator.value === "+" ? a + b : node.operator.value === "-" ? a - b : a * b;
            const isFloat = left instanceof FloatValue || right instanceof FloatValue;
            return isFloat ? new FloatValue(res) : new IntegerValue(res);
          }
          case "/":
            return new FloatValue(a / b);
          case "//": {
            const res = Math.floor(a / b);
            const isFloat = left instanceof FloatValue || right instanceof FloatValue;
            return isFloat ? new FloatValue(res) : new IntegerValue(res);
          }
          case "%": {
            const rem = a % b;
            const isFloat = left instanceof FloatValue || right instanceof FloatValue;
            return isFloat ? new FloatValue(rem) : new IntegerValue(rem);
          }
          case "<":
            return new BooleanValue(a < b);
          case ">":
            return new BooleanValue(a > b);
          case ">=":
            return new BooleanValue(a >= b);
          case "<=":
            return new BooleanValue(a <= b);
        }
      } else if (left instanceof ArrayValue && right instanceof ArrayValue) {
        switch (node.operator.value) {
          case "+":
            return new ArrayValue(left.value.concat(right.value));
        }
      } else if (right instanceof ArrayValue) {
        const member = right.value.find((x) => x.value === left.value) !== void 0;
        switch (node.operator.value) {
          case "in":
            return new BooleanValue(member);
          case "not in":
            return new BooleanValue(!member);
        }
      }
      if (left instanceof StringValue || right instanceof StringValue) {
        switch (node.operator.value) {
          case "+":
            return new StringValue(left.value.toString() + right.value.toString());
        }
      }
      if (left instanceof StringValue && right instanceof StringValue) {
        switch (node.operator.value) {
          case "in":
            return new BooleanValue(right.value.includes(left.value));
          case "not in":
            return new BooleanValue(!right.value.includes(left.value));
        }
      }
      if (left instanceof StringValue && right instanceof ObjectValue) {
        switch (node.operator.value) {
          case "in":
            return new BooleanValue(right.value.has(left.value));
          case "not in":
            return new BooleanValue(!right.value.has(left.value));
        }
      }
      throw new SyntaxError(`Unknown operator "${node.operator.value}" between ${left.type} and ${right.type}`);
    }
    evaluateArguments(args, environment) {
      const positionalArguments = [];
      const keywordArguments = /* @__PURE__ */ new Map();
      const addKeywordArgument = (key, value) => {
        if (keywordArguments.has(key)) {
          throw new Error(`Got multiple values for keyword argument '${key}'`);
        }
        keywordArguments.set(key, value);
      };
      for (const argument of args) {
        if (argument.type === "SpreadExpression") {
          const spreadNode = argument;
          const val = this.evaluate(spreadNode.argument, environment);
          if (!(val instanceof ArrayValue)) {
            throw new Error(`Cannot unpack non-iterable type: ${val.type}`);
          }
          for (const item of val.value) {
            positionalArguments.push(item);
          }
        } else if (argument.type !== "KeywordArgumentExpression" && argument.type !== "KeywordSpreadExpression") {
          positionalArguments.push(this.evaluate(argument, environment));
        }
      }
      for (const argument of args) {
        if (argument.type === "KeywordArgumentExpression") {
          const kwarg = argument;
          addKeywordArgument(kwarg.key.value, this.evaluate(kwarg.value, environment));
        } else if (argument.type === "KeywordSpreadExpression") {
          const spreadNode = argument;
          const val = this.evaluate(spreadNode.argument, environment);
          if (!(val instanceof ObjectValue)) {
            throw new Error(`Argument after ** must be a mapping, not ${val.type}`);
          }
          for (const [key, value] of val.value) {
            addKeywordArgument(key, value);
          }
        }
      }
      return [positionalArguments, keywordArguments];
    }
    applyFilter(operand, filterNode, environment) {
      if (filterNode.type === "Identifier") {
        const filter = filterNode;
        if (filter.value === "safe") {
          return operand;
        }
        if (filter.value === "tojson") {
          return new StringValue(toJSON(operand, {}));
        }
        if (operand instanceof ArrayValue) {
          switch (filter.value) {
            case "list":
              return operand;
            case "first":
              return operand.value[0];
            case "last":
              return operand.value[operand.value.length - 1];
            case "length":
              return new IntegerValue(operand.value.length);
            case "reverse":
              return new ArrayValue(operand.value.slice().reverse());
            case "sort": {
              return new ArrayValue(operand.value.slice().sort((a, b) => compareRuntimeValues(a, b, false)));
            }
            case "join":
              return new StringValue(operand.value.map((x) => x.value).join(""));
            case "string":
              return new StringValue(toJSON(operand, {}, 0, false));
            case "unique": {
              const seen = /* @__PURE__ */ new Set();
              const output = [];
              for (const item of operand.value) {
                if (!seen.has(item.value)) {
                  seen.add(item.value);
                  output.push(item);
                }
              }
              return new ArrayValue(output);
            }
            default:
              throw new Error(`Unknown ArrayValue filter: ${filter.value}`);
          }
        } else if (operand instanceof StringValue) {
          switch (filter.value) {
            case "length":
            case "upper":
            case "lower":
            case "title":
            case "capitalize": {
              const builtin = operand.builtins.get(filter.value);
              if (builtin instanceof FunctionValue) {
                return builtin.value(
                  /* no arguments */
                  [],
                  environment
                );
              } else if (builtin instanceof IntegerValue) {
                return builtin;
              } else {
                throw new Error(`Unknown StringValue filter: ${filter.value}`);
              }
            }
            case "trim":
              return new StringValue(operand.value.trim());
            case "indent":
              return new StringValue(
                operand.value.split("\n").map(
                  (x, i) => (
                    // By default, don't indent the first line or empty lines
                    i === 0 || x.length === 0 ? x : "    " + x
                  )
                ).join("\n")
              );
            case "join":
            case "string":
              return operand;
            case "int": {
              const val = parseInt(operand.value, 10);
              return new IntegerValue(isNaN(val) ? 0 : val);
            }
            case "float": {
              const val = parseFloat(operand.value);
              return new FloatValue(isNaN(val) ? 0 : val);
            }
            default:
              throw new Error(`Unknown StringValue filter: ${filter.value}`);
          }
        } else if (operand instanceof IntegerValue || operand instanceof FloatValue) {
          switch (filter.value) {
            case "abs":
              return operand instanceof IntegerValue ? new IntegerValue(Math.abs(operand.value)) : new FloatValue(Math.abs(operand.value));
            case "int":
              return new IntegerValue(Math.floor(operand.value));
            case "float":
              return new FloatValue(operand.value);
            case "string":
              return new StringValue(operand.toString());
            default:
              throw new Error(`Unknown NumericValue filter: ${filter.value}`);
          }
        } else if (operand instanceof ObjectValue) {
          switch (filter.value) {
            case "items":
              return new ArrayValue(
                Array.from(operand.value.entries()).map(([key, value]) => new ArrayValue([new StringValue(key), value]))
              );
            case "length":
              return new IntegerValue(operand.value.size);
            default: {
              const builtin = operand.builtins.get(filter.value);
              if (builtin) {
                if (builtin instanceof FunctionValue) {
                  return builtin.value([], environment);
                }
                return builtin;
              }
              throw new Error(`Unknown ObjectValue filter: ${filter.value}`);
            }
          }
        } else if (operand instanceof BooleanValue) {
          switch (filter.value) {
            case "bool":
              return new BooleanValue(operand.value);
            case "int":
              return new IntegerValue(operand.value ? 1 : 0);
            case "float":
              return new FloatValue(operand.value ? 1 : 0);
            case "string":
              return new StringValue(operand.value ? "true" : "false");
            default:
              throw new Error(`Unknown BooleanValue filter: ${filter.value}`);
          }
        }
        throw new Error(`Cannot apply filter "${filter.value}" to type: ${operand.type}`);
      } else if (filterNode.type === "CallExpression") {
        const filter = filterNode;
        if (filter.callee.type !== "Identifier") {
          throw new Error(`Unknown filter: ${filter.callee.type}`);
        }
        const filterName = filter.callee.value;
        if (filterName === "tojson") {
          const [, kwargs] = this.evaluateArguments(filter.args, environment);
          const indent = kwargs.get("indent") ?? new NullValue();
          if (!(indent instanceof IntegerValue || indent instanceof NullValue)) {
            throw new Error("If set, indent must be a number");
          }
          const ensureAscii = kwargs.get("ensure_ascii") ?? new BooleanValue(false);
          if (!(ensureAscii instanceof BooleanValue)) {
            throw new Error("If set, ensure_ascii must be a boolean");
          }
          const sortKeys = kwargs.get("sort_keys") ?? new BooleanValue(false);
          if (!(sortKeys instanceof BooleanValue)) {
            throw new Error("If set, sort_keys must be a boolean");
          }
          const separatorsArg = kwargs.get("separators") ?? new NullValue();
          let separators = null;
          if (separatorsArg instanceof ArrayValue || separatorsArg instanceof TupleValue) {
            if (separatorsArg.value.length !== 2) {
              throw new Error("separators must be a tuple of two strings");
            }
            const [itemSep, keySep] = separatorsArg.value;
            if (!(itemSep instanceof StringValue) || !(keySep instanceof StringValue)) {
              throw new Error("separators must be a tuple of two strings");
            }
            separators = [itemSep.value, keySep.value];
          } else if (!(separatorsArg instanceof NullValue)) {
            throw new Error("If set, separators must be a tuple of two strings");
          }
          return new StringValue(
            toJSON(operand, {
              indent: indent.value,
              ensureAscii: ensureAscii.value,
              sortKeys: sortKeys.value,
              separators
            })
          );
        } else if (filterName === "join") {
          let value;
          if (operand instanceof StringValue) {
            value = Array.from(operand.value);
          } else if (operand instanceof ArrayValue) {
            value = operand.value.map((x) => x.value);
          } else {
            throw new Error(`Cannot apply filter "${filterName}" to type: ${operand.type}`);
          }
          const [args, kwargs] = this.evaluateArguments(filter.args, environment);
          const separator = args.at(0) ?? kwargs.get("separator") ?? new StringValue("");
          if (!(separator instanceof StringValue)) {
            throw new Error("separator must be a string");
          }
          return new StringValue(value.join(separator.value));
        } else if (filterName === "int" || filterName === "float") {
          const [args, kwargs] = this.evaluateArguments(filter.args, environment);
          const defaultValue = args.at(0) ?? kwargs.get("default") ?? (filterName === "int" ? new IntegerValue(0) : new FloatValue(0));
          if (operand instanceof StringValue) {
            const val = filterName === "int" ? parseInt(operand.value, 10) : parseFloat(operand.value);
            return isNaN(val) ? defaultValue : filterName === "int" ? new IntegerValue(val) : new FloatValue(val);
          } else if (operand instanceof IntegerValue || operand instanceof FloatValue) {
            return operand;
          } else if (operand instanceof BooleanValue) {
            return filterName === "int" ? new IntegerValue(operand.value ? 1 : 0) : new FloatValue(operand.value ? 1 : 0);
          } else {
            throw new Error(`Cannot apply filter "${filterName}" to type: ${operand.type}`);
          }
        } else if (filterName === "default") {
          const [args, kwargs] = this.evaluateArguments(filter.args, environment);
          const defaultValue = args[0] ?? new StringValue("");
          const booleanValue = args[1] ?? kwargs.get("boolean") ?? new BooleanValue(false);
          if (!(booleanValue instanceof BooleanValue)) {
            throw new Error("`default` filter flag must be a boolean");
          }
          if (operand instanceof UndefinedValue || booleanValue.value && !operand.__bool__().value) {
            return defaultValue;
          }
          return operand;
        }
        if (operand instanceof ArrayValue) {
          switch (filterName) {
            case "sort": {
              const [args, kwargs] = this.evaluateArguments(filter.args, environment);
              const reverse = args.at(0) ?? kwargs.get("reverse") ?? new BooleanValue(false);
              if (!(reverse instanceof BooleanValue)) {
                throw new Error("reverse must be a boolean");
              }
              const caseSensitive = args.at(1) ?? kwargs.get("case_sensitive") ?? new BooleanValue(false);
              if (!(caseSensitive instanceof BooleanValue)) {
                throw new Error("case_sensitive must be a boolean");
              }
              const attribute = args.at(2) ?? kwargs.get("attribute") ?? new NullValue();
              if (!(attribute instanceof StringValue || attribute instanceof IntegerValue || attribute instanceof NullValue)) {
                throw new Error("attribute must be a string, integer, or null");
              }
              const getSortValue = (item) => {
                if (attribute instanceof NullValue) {
                  return item;
                }
                const attrPath = attribute instanceof IntegerValue ? String(attribute.value) : attribute.value;
                return getAttributeValue(item, attrPath);
              };
              return new ArrayValue(
                operand.value.slice().sort((a, b) => {
                  const aVal = getSortValue(a);
                  const bVal = getSortValue(b);
                  const result = compareRuntimeValues(aVal, bVal, caseSensitive.value);
                  return reverse.value ? -result : result;
                })
              );
            }
            case "selectattr":
            case "rejectattr": {
              const select = filterName === "selectattr";
              if (operand.value.some((item) => !isAttributeContainer(item))) {
                throw new Error(`\`${filterName}\` can only be applied to array of objects`);
              }
              if (filter.args.some((x) => x.type !== "StringLiteral")) {
                throw new Error(`arguments of \`${filterName}\` must be strings`);
              }
              const [attr, testName, value] = filter.args.map((x) => this.evaluate(x, environment));
              let testFunction;
              if (testName) {
                const test = environment.tests.get(testName.value);
                if (!test) {
                  throw new Error(`Unknown test: ${testName.value}`);
                }
                testFunction = test;
              } else {
                testFunction = (...x) => x[0].__bool__().value;
              }
              const filtered = operand.value.filter((item) => {
                const a = item.value.get(attr.value);
                const result = a ? testFunction(a, value) : false;
                return select ? result : !result;
              });
              return new ArrayValue(filtered);
            }
            case "map": {
              const [, kwargs] = this.evaluateArguments(filter.args, environment);
              if (kwargs.has("attribute")) {
                const attr = kwargs.get("attribute");
                if (!(attr instanceof StringValue)) {
                  throw new Error("attribute must be a string");
                }
                const defaultValue = kwargs.get("default");
                const mapped = operand.value.map((item) => {
                  if (!isAttributeContainer(item)) {
                    throw new Error("items in map must be an object");
                  }
                  const value = getAttributeValue(item, attr.value);
                  return value instanceof UndefinedValue ? defaultValue ?? new UndefinedValue() : value;
                });
                return new ArrayValue(mapped);
              } else {
                throw new Error("`map` expressions without `attribute` set are not currently supported.");
              }
            }
          }
          throw new Error(`Unknown ArrayValue filter: ${filterName}`);
        } else if (operand instanceof StringValue) {
          switch (filterName) {
            case "indent": {
              const [args, kwargs] = this.evaluateArguments(filter.args, environment);
              const width = args.at(0) ?? kwargs.get("width") ?? new IntegerValue(4);
              if (!(width instanceof IntegerValue)) {
                throw new Error("width must be a number");
              }
              const first = args.at(1) ?? kwargs.get("first") ?? new BooleanValue(false);
              const blank = args.at(2) ?? kwargs.get("blank") ?? new BooleanValue(false);
              const lines = operand.value.split("\n");
              const indent = " ".repeat(width.value);
              const indented = lines.map(
                (x, i) => !first.value && i === 0 || !blank.value && x.length === 0 ? x : indent + x
              );
              return new StringValue(indented.join("\n"));
            }
            case "replace": {
              const replaceFn = operand.builtins.get("replace");
              if (!(replaceFn instanceof FunctionValue)) {
                throw new Error("replace filter not available");
              }
              const [args, kwargs] = this.evaluateArguments(filter.args, environment);
              return replaceFn.value([...args, new KeywordArgumentsValue(kwargs)], environment);
            }
          }
          throw new Error(`Unknown StringValue filter: ${filterName}`);
        } else if (operand instanceof ObjectValue) {
          const builtin = operand.builtins.get(filterName);
          if (builtin && builtin instanceof FunctionValue) {
            const [args, kwargs] = this.evaluateArguments(filter.args, environment);
            if (kwargs.size > 0) {
              args.push(new KeywordArgumentsValue(kwargs));
            }
            return builtin.value(args, environment);
          }
          throw new Error(`Unknown ObjectValue filter: ${filterName}`);
        } else {
          throw new Error(`Cannot apply filter "${filterName}" to type: ${operand.type}`);
        }
      }
      throw new Error(`Unknown filter: ${filterNode.type}`);
    }
    /**
     * Evaluates expressions following the filter operation type.
     */
    evaluateFilterExpression(node, environment) {
      const operand = this.evaluate(node.operand, environment);
      return this.applyFilter(operand, node.filter, environment);
    }
    /**
     * Evaluates expressions following the test operation type.
     */
    evaluateTestExpression(node, environment) {
      const operand = this.evaluate(node.operand, environment);
      const test = environment.tests.get(node.test.value);
      if (!test) {
        throw new Error(`Unknown test: ${node.test.value}`);
      }
      const result = test(operand);
      return new BooleanValue(node.negate ? !result : result);
    }
    /**
     * Evaluates expressions following the select operation type.
     */
    evaluateSelectExpression(node, environment) {
      const predicate = this.evaluate(node.test, environment);
      if (!predicate.__bool__().value) {
        return new UndefinedValue();
      }
      return this.evaluate(node.lhs, environment);
    }
    /**
     * Evaluates expressions following the unary operation type.
     */
    evaluateUnaryExpression(node, environment) {
      const argument = this.evaluate(node.argument, environment);
      switch (node.operator.value) {
        case "not":
          return new BooleanValue(!argument.value);
        case "+":
        case "-": {
          const sign = node.operator.value === "-" ? -1 : 1;
          if (argument instanceof IntegerValue || argument instanceof FloatValue || argument instanceof BooleanValue) {
            const value = argument instanceof BooleanValue ? argument.value ? 1 : 0 : argument.value;
            const result = sign * value;
            return argument instanceof FloatValue ? new FloatValue(result) : new IntegerValue(result);
          }
          throw new SyntaxError(`Unknown operator "${node.operator.value}" for ${argument.type}`);
        }
        default:
          throw new SyntaxError(`Unknown operator: ${node.operator.value}`);
      }
    }
    evaluateTernaryExpression(node, environment) {
      const cond = this.evaluate(node.condition, environment);
      return cond.__bool__().value ? this.evaluate(node.trueExpr, environment) : this.evaluate(node.falseExpr, environment);
    }
    evalProgram(program, environment) {
      return this.evaluateBlock(program.body, environment);
    }
    evaluateBlock(statements, environment) {
      let result = "";
      for (const statement of statements) {
        const lastEvaluated = this.evaluate(statement, environment);
        if (lastEvaluated.type !== "NullValue" && lastEvaluated.type !== "UndefinedValue") {
          result += lastEvaluated.toString();
        }
      }
      return new StringValue(result);
    }
    evaluateIdentifier(node, environment) {
      return environment.lookupVariable(node.value);
    }
    evaluateCallExpression(expr, environment) {
      const [args, kwargs] = this.evaluateArguments(expr.args, environment);
      if (kwargs.size > 0) {
        args.push(new KeywordArgumentsValue(kwargs));
      }
      const fn2 = this.evaluate(expr.callee, environment);
      if (fn2.type !== "FunctionValue") {
        throw new Error(`Cannot call something that is not a function: got ${fn2.type}`);
      }
      return fn2.value(args, environment);
    }
    evaluateSliceExpression(object, expr, environment) {
      if (!(object instanceof ArrayValue || object instanceof StringValue)) {
        throw new Error("Slice object must be an array or string");
      }
      const start = this.evaluate(expr.start, environment);
      const stop = this.evaluate(expr.stop, environment);
      const step = this.evaluate(expr.step, environment);
      if (!(start instanceof IntegerValue || start instanceof UndefinedValue)) {
        throw new Error("Slice start must be numeric or undefined");
      }
      if (!(stop instanceof IntegerValue || stop instanceof UndefinedValue)) {
        throw new Error("Slice stop must be numeric or undefined");
      }
      if (!(step instanceof IntegerValue || step instanceof UndefinedValue)) {
        throw new Error("Slice step must be numeric or undefined");
      }
      if (object instanceof ArrayValue) {
        return new ArrayValue(slice(object.value, start.value, stop.value, step.value));
      } else {
        return new StringValue(slice(Array.from(object.value), start.value, stop.value, step.value).join(""));
      }
    }
    evaluateMemberExpression(expr, environment) {
      const object = this.evaluate(expr.object, environment);
      let property;
      if (expr.computed) {
        if (expr.property.type === "SliceExpression") {
          return this.evaluateSliceExpression(object, expr.property, environment);
        } else {
          property = this.evaluate(expr.property, environment);
        }
      } else if (expr.property.type === "IntegerLiteral") {
        property = new IntegerValue(expr.property.value);
      } else {
        property = new StringValue(expr.property.value);
      }
      let value;
      if (isAttributeContainer(object)) {
        if (!(property instanceof StringValue)) {
          throw new Error(`Cannot access property with non-string: got ${property.type}`);
        }
        value = object.value.get(property.value) ?? (object instanceof ObjectValue ? object.builtins.get(property.value) : void 0);
      } else if (object instanceof ArrayValue || object instanceof StringValue) {
        if (property instanceof IntegerValue) {
          value = object.value.at(property.value);
          if (object instanceof StringValue) {
            value = new StringValue(object.value.at(property.value));
          }
        } else if (property instanceof StringValue) {
          value = object.builtins.get(property.value);
        } else {
          throw new Error(`Cannot access property with non-string/non-number: got ${property.type}`);
        }
      } else {
        if (!(property instanceof StringValue)) {
          throw new Error(`Cannot access property with non-string: got ${property.type}`);
        }
        value = object.builtins.get(property.value);
      }
      return value instanceof RuntimeValue ? value : new UndefinedValue();
    }
    evaluateSet(node, environment) {
      const rhs = node.value ? this.evaluate(node.value, environment) : this.evaluateBlock(node.body, environment);
      if (node.assignee.type === "Identifier") {
        const variableName = node.assignee.value;
        environment.setVariable(variableName, rhs);
      } else if (node.assignee.type === "TupleLiteral") {
        const tuple = node.assignee;
        if (!(rhs instanceof ArrayValue)) {
          throw new Error(`Cannot unpack non-iterable type in set: ${rhs.type}`);
        }
        const arr = rhs.value;
        if (arr.length !== tuple.value.length) {
          throw new Error(`Too ${tuple.value.length > arr.length ? "few" : "many"} items to unpack in set`);
        }
        for (let i = 0; i < tuple.value.length; ++i) {
          const elem = tuple.value[i];
          if (elem.type !== "Identifier") {
            throw new Error(`Cannot unpack to non-identifier in set: ${elem.type}`);
          }
          environment.setVariable(elem.value, arr[i]);
        }
      } else if (node.assignee.type === "MemberExpression") {
        const member = node.assignee;
        const object = this.evaluate(member.object, environment);
        if (!(object instanceof NamespaceValue)) {
          throw new Error("cannot assign attribute on non-namespace object");
        }
        if (member.property.type !== "Identifier") {
          throw new Error("Cannot assign to member with non-identifier property");
        }
        object.value.set(member.property.value, rhs);
      } else {
        throw new Error(`Invalid LHS inside assignment expression: ${JSON.stringify(node.assignee)}`);
      }
      return new NullValue();
    }
    evaluateIf(node, environment) {
      const test = this.evaluate(node.test, environment);
      return this.evaluateBlock(test.__bool__().value ? node.body : node.alternate, environment);
    }
    evaluateFor(node, environment) {
      const scope = new Environment(environment);
      let test, iterable;
      if (node.iterable.type === "SelectExpression") {
        const select = node.iterable;
        iterable = this.evaluate(select.lhs, scope);
        test = select.test;
      } else {
        iterable = this.evaluate(node.iterable, scope);
      }
      if (!(iterable instanceof ArrayValue || iterable instanceof ObjectValue)) {
        throw new Error(`Expected iterable or object type in for loop: got ${iterable.type}`);
      }
      if (iterable instanceof ObjectValue) {
        iterable = iterable.keys();
      }
      const items = [];
      const scopeUpdateFunctions = [];
      for (let i = 0; i < iterable.value.length; ++i) {
        const loopScope = new Environment(scope);
        const current = iterable.value[i];
        let scopeUpdateFunction;
        if (node.loopvar.type === "Identifier") {
          scopeUpdateFunction = (scope2) => scope2.setVariable(node.loopvar.value, current);
        } else if (node.loopvar.type === "TupleLiteral") {
          const loopvar = node.loopvar;
          if (current.type !== "ArrayValue") {
            throw new Error(`Cannot unpack non-iterable type: ${current.type}`);
          }
          const c = current;
          if (loopvar.value.length !== c.value.length) {
            throw new Error(`Too ${loopvar.value.length > c.value.length ? "few" : "many"} items to unpack`);
          }
          scopeUpdateFunction = (scope2) => {
            for (let j2 = 0; j2 < loopvar.value.length; ++j2) {
              if (loopvar.value[j2].type !== "Identifier") {
                throw new Error(`Cannot unpack non-identifier type: ${loopvar.value[j2].type}`);
              }
              scope2.setVariable(loopvar.value[j2].value, c.value[j2]);
            }
          };
        } else {
          throw new Error(`Invalid loop variable(s): ${node.loopvar.type}`);
        }
        if (test) {
          scopeUpdateFunction(loopScope);
          const testValue = this.evaluate(test, loopScope);
          if (!testValue.__bool__().value) {
            continue;
          }
        }
        items.push(current);
        scopeUpdateFunctions.push(scopeUpdateFunction);
      }
      let result = "";
      let noIteration = true;
      for (let i = 0; i < items.length; ++i) {
        const loop = /* @__PURE__ */ new Map([
          ["index", new IntegerValue(i + 1)],
          ["index0", new IntegerValue(i)],
          ["revindex", new IntegerValue(items.length - i)],
          ["revindex0", new IntegerValue(items.length - i - 1)],
          ["first", new BooleanValue(i === 0)],
          ["last", new BooleanValue(i === items.length - 1)],
          ["length", new IntegerValue(items.length)],
          ["previtem", i > 0 ? items[i - 1] : new UndefinedValue()],
          ["nextitem", i < items.length - 1 ? items[i + 1] : new UndefinedValue()]
        ]);
        scope.setVariable("loop", new ObjectValue(loop));
        scopeUpdateFunctions[i](scope);
        try {
          const evaluated = this.evaluateBlock(node.body, scope);
          result += evaluated.value;
        } catch (err) {
          if (err instanceof ContinueControl) {
            continue;
          }
          if (err instanceof BreakControl) {
            break;
          }
          throw err;
        }
        noIteration = false;
      }
      if (noIteration) {
        const defaultEvaluated = this.evaluateBlock(node.defaultBlock, scope);
        result += defaultEvaluated.value;
      }
      return new StringValue(result);
    }
    /**
     * Bind every parameter name and special argument before evaluating defaults,
     * preventing unbound parameters from resolving in an outer scope.
     */
    bindMacroArguments(displayName, parameters, specialArguments, args, scope) {
      const positionalArguments = args.slice();
      let keywordArguments = /* @__PURE__ */ new Map();
      if (positionalArguments.at(-1) instanceof KeywordArgumentsValue) {
        keywordArguments = new Map(positionalArguments.pop().value);
      }
      const pendingDefaults = [];
      for (let i = 0; i < parameters.length; ++i) {
        const { name, defaultValue } = getParameterDescriptor(parameters[i]);
        let value = positionalArguments[i];
        if (value === void 0 && keywordArguments.has(name)) {
          value = keywordArguments.get(name);
          keywordArguments.delete(name);
        }
        if (value === void 0 && defaultValue !== void 0) {
          pendingDefaults.push([name, defaultValue]);
        }
        scope.setVariable(name, value ?? new UndefinedValue());
      }
      if (specialArguments.has("kwargs")) {
        scope.setVariable("kwargs", new ObjectValue(keywordArguments));
      } else if (keywordArguments.size > 0) {
        throw new Error(`macro ${displayName} takes no keyword argument '${keywordArguments.keys().next().value}'`);
      }
      if (specialArguments.has("varargs")) {
        scope.setVariable("varargs", new ArrayValue(positionalArguments.slice(parameters.length)));
      } else if (positionalArguments.length > parameters.length) {
        throw new Error(`macro ${displayName} takes not more than ${parameters.length} argument(s)`);
      }
      for (const [name, defaultValue] of pendingDefaults) {
        scope.setVariable(name, this.evaluate(defaultValue, scope));
      }
    }
    /**
     * See https://jinja.palletsprojects.com/en/3.1.x/templates/#macros for more information.
     */
    evaluateMacro(node, environment) {
      const specialArguments = findAccessedSpecialMacroArguments(node.args, node.body);
      environment.setVariable(
        node.name.value,
        new FunctionValue((args, scope) => {
          const macroScope = new Environment(scope);
          this.bindMacroArguments(`'${node.name.value}'`, node.args, specialArguments, args, macroScope);
          return this.evaluateBlock(node.body, macroScope);
        })
      );
      return new NullValue();
    }
    evaluateCallStatement(node, environment) {
      const parameters = node.callerArgs ?? [];
      const specialArguments = findAccessedSpecialMacroArguments(parameters, node.body);
      const callerFn = new FunctionValue((callerArguments) => {
        const callBlockEnv = new Environment(environment);
        this.bindMacroArguments("None", parameters, specialArguments, callerArguments, callBlockEnv);
        return this.evaluateBlock(node.body, callBlockEnv);
      });
      const [macroArgs, macroKwargs] = this.evaluateArguments(node.call.args, environment);
      macroArgs.push(new KeywordArgumentsValue(macroKwargs));
      const fn2 = this.evaluate(node.call.callee, environment);
      if (fn2.type !== "FunctionValue") {
        throw new Error(`Cannot call something that is not a function: got ${fn2.type}`);
      }
      const newEnv = new Environment(environment);
      newEnv.setVariable("caller", callerFn);
      return fn2.value(macroArgs, newEnv);
    }
    evaluateFilterStatement(node, environment) {
      const rendered = this.evaluateBlock(node.body, environment);
      return this.applyFilter(rendered, node.filter, environment);
    }
    evaluate(statement, environment) {
      if (!statement) {
        return new UndefinedValue();
      }
      switch (statement.type) {
        case "Program":
          return this.evalProgram(statement, environment);
        case "Set":
          return this.evaluateSet(statement, environment);
        case "If":
          return this.evaluateIf(statement, environment);
        case "For":
          return this.evaluateFor(statement, environment);
        case "Macro":
          return this.evaluateMacro(statement, environment);
        case "CallStatement":
          return this.evaluateCallStatement(statement, environment);
        case "Break":
          throw new BreakControl();
        case "Continue":
          throw new ContinueControl();
        case "IntegerLiteral":
          return new IntegerValue(statement.value);
        case "FloatLiteral":
          return new FloatValue(statement.value);
        case "StringLiteral":
          return new StringValue(statement.value);
        case "ArrayLiteral":
          return new ArrayValue(statement.value.map((x) => this.evaluate(x, environment)));
        case "TupleLiteral":
          return new TupleValue(statement.value.map((x) => this.evaluate(x, environment)));
        case "ObjectLiteral": {
          const mapping = /* @__PURE__ */ new Map();
          for (const [key, value] of statement.value) {
            const evaluatedKey = this.evaluate(key, environment);
            if (!(evaluatedKey instanceof StringValue)) {
              throw new Error(`Object keys must be strings: got ${evaluatedKey.type}`);
            }
            mapping.set(evaluatedKey.value, this.evaluate(value, environment));
          }
          return new ObjectValue(mapping);
        }
        case "Identifier":
          return this.evaluateIdentifier(statement, environment);
        case "CallExpression":
          return this.evaluateCallExpression(statement, environment);
        case "MemberExpression":
          return this.evaluateMemberExpression(statement, environment);
        case "UnaryExpression":
          return this.evaluateUnaryExpression(statement, environment);
        case "BinaryExpression":
          return this.evaluateBinaryExpression(statement, environment);
        case "FilterExpression":
          return this.evaluateFilterExpression(statement, environment);
        case "FilterStatement":
          return this.evaluateFilterStatement(statement, environment);
        case "TestExpression":
          return this.evaluateTestExpression(statement, environment);
        case "SelectExpression":
          return this.evaluateSelectExpression(statement, environment);
        case "Ternary":
          return this.evaluateTernaryExpression(statement, environment);
        case "Comment":
          return new NullValue();
        default:
          throw new SyntaxError(`Unknown node type: ${statement.type}`);
      }
    }
  };
  function convertToRuntimeValues(input) {
    switch (typeof input) {
      case "number":
        return Number.isInteger(input) ? new IntegerValue(input) : new FloatValue(input);
      case "string":
        return new StringValue(input);
      case "boolean":
        return new BooleanValue(input);
      case "undefined":
        return new UndefinedValue();
      case "object":
        if (input === null) {
          return new NullValue();
        } else if (Array.isArray(input)) {
          return new ArrayValue(input.map(convertToRuntimeValues));
        } else {
          return new ObjectValue(
            new Map(Object.entries(input).map(([key, value]) => [key, convertToRuntimeValues(value)]))
          );
        }
      case "function":
        return new FunctionValue((args, _scope) => {
          const result = input(...args.map((x) => x.value)) ?? null;
          return convertToRuntimeValues(result);
        });
      default:
        throw new Error(`Cannot convert to runtime value: ${input}`);
    }
  }
  var NEWLINE = "\n";
  var OPEN_STATEMENT = "{%- ";
  var CLOSE_STATEMENT = " -%}";
  var PRECEDENCE = Object.freeze({
    CONDITIONAL: 0,
    // a if b else c
    LOGICAL_OR: 1,
    // or
    LOGICAL_AND: 2,
    // and
    LOGICAL_NOT: 3,
    // not a
    COMPARISON: 4,
    // == != < <= > >= in, not in
    ADDITIVE: 5,
    // + -
    MULTIPLICATIVE: 6,
    // * / // %
    EXPONENTIATION: 7,
    // **
    TEST: 8,
    // is
    FILTER: 9,
    // |
    UNARY_SIGN: 10,
    // -a +a
    ATOM: 11
    // literals, identifiers, calls, member accesses
  });
  function getBinaryOperatorPrecedence(expr) {
    switch (expr.operator.type) {
      case "ExponentiationBinaryOperator":
        return PRECEDENCE.EXPONENTIATION;
      case "MultiplicativeBinaryOperator":
        return PRECEDENCE.MULTIPLICATIVE;
      case "AdditiveBinaryOperator":
        return PRECEDENCE.ADDITIVE;
      case "ComparisonBinaryOperator":
        return PRECEDENCE.COMPARISON;
      case "Identifier":
        if (expr.operator.value === "and") {
          return PRECEDENCE.LOGICAL_AND;
        }
        if (expr.operator.value === "in" || expr.operator.value === "not in") {
          return PRECEDENCE.COMPARISON;
        }
        return PRECEDENCE.LOGICAL_OR;
    }
    return PRECEDENCE.LOGICAL_OR;
  }
  function getPrecedence(node) {
    switch (node.type) {
      case "SelectExpression":
      case "Ternary":
        return PRECEDENCE.CONDITIONAL;
      case "BinaryExpression":
        return getBinaryOperatorPrecedence(node);
      case "UnaryExpression":
        return node.operator.value === "not" ? PRECEDENCE.LOGICAL_NOT : PRECEDENCE.UNARY_SIGN;
      case "TestExpression":
        return PRECEDENCE.TEST;
      case "FilterExpression":
        return PRECEDENCE.FILTER;
      default:
        return PRECEDENCE.ATOM;
    }
  }
  function formatOperand(node, minPrecedence) {
    const expr = formatExpression(node);
    return getPrecedence(node) < minPrecedence ? `(${expr})` : expr;
  }
  function format(program, indent = "	") {
    const indentStr = typeof indent === "number" ? " ".repeat(indent) : indent;
    const body = formatStatements(program.body, 0, indentStr);
    return body.replace(/\n$/, "");
  }
  function createStatement(...text) {
    return OPEN_STATEMENT + text.join(" ") + CLOSE_STATEMENT;
  }
  function formatStatements(stmts, depth, indentStr) {
    return stmts.map((stmt) => formatStatement(stmt, depth, indentStr)).join(NEWLINE);
  }
  function formatExpressionList(expressions) {
    return expressions.map((expression) => formatExpression(expression)).join(", ");
  }
  function formatStatement(node, depth, indentStr) {
    const pad = indentStr.repeat(depth);
    switch (node.type) {
      case "Program":
        return formatStatements(node.body, depth, indentStr);
      case "If":
        return formatIf(node, depth, indentStr);
      case "For":
        return formatFor(node, depth, indentStr);
      case "Set":
        return formatSet(node, depth, indentStr);
      case "Macro":
        return formatMacro(node, depth, indentStr);
      case "Break":
        return pad + createStatement("break");
      case "Continue":
        return pad + createStatement("continue");
      case "CallStatement":
        return formatCallStatement(node, depth, indentStr);
      case "FilterStatement":
        return formatFilterStatement(node, depth, indentStr);
      case "Comment":
        return pad + "{# " + node.value + " #}";
      default:
        return pad + "{{- " + formatExpression(node) + " -}}";
    }
  }
  function formatIf(node, depth, indentStr) {
    const pad = indentStr.repeat(depth);
    const clauses = [];
    let current = node;
    while (current) {
      clauses.push({ test: current.test, body: current.body });
      if (current.alternate.length === 1 && current.alternate[0].type === "If") {
        current = current.alternate[0];
      } else {
        break;
      }
    }
    let out = pad + createStatement("if", formatExpression(clauses[0].test)) + NEWLINE + formatStatements(clauses[0].body, depth + 1, indentStr);
    for (let i = 1; i < clauses.length; ++i) {
      out += NEWLINE + pad + createStatement("elif", formatExpression(clauses[i].test)) + NEWLINE + formatStatements(clauses[i].body, depth + 1, indentStr);
    }
    if (current && current.alternate.length > 0) {
      out += NEWLINE + pad + createStatement("else") + NEWLINE + formatStatements(current.alternate, depth + 1, indentStr);
    }
    out += NEWLINE + pad + createStatement("endif");
    return out;
  }
  function formatFor(node, depth, indentStr) {
    const pad = indentStr.repeat(depth);
    let formattedIterable = "";
    if (node.iterable.type === "SelectExpression") {
      const n = node.iterable;
      formattedIterable = `${formatExpression(n.lhs)} if ${formatExpression(n.test)}`;
    } else {
      formattedIterable = formatExpression(node.iterable);
    }
    let out = pad + createStatement("for", formatExpression(node.loopvar), "in", formattedIterable) + NEWLINE + formatStatements(node.body, depth + 1, indentStr);
    if (node.defaultBlock.length > 0) {
      out += NEWLINE + pad + createStatement("else") + NEWLINE + formatStatements(node.defaultBlock, depth + 1, indentStr);
    }
    out += NEWLINE + pad + createStatement("endfor");
    return out;
  }
  function formatSet(node, depth, indentStr) {
    const pad = indentStr.repeat(depth);
    const left = formatExpression(node.assignee);
    const right = node.value ? formatExpression(node.value) : "";
    const value = pad + createStatement("set", `${left}${node.value ? " = " + right : ""}`);
    if (node.body.length === 0) {
      return value;
    }
    return value + NEWLINE + formatStatements(node.body, depth + 1, indentStr) + NEWLINE + pad + createStatement("endset");
  }
  function formatMacro(node, depth, indentStr) {
    const pad = indentStr.repeat(depth);
    const args = formatExpressionList(node.args);
    return pad + createStatement("macro", `${node.name.value}(${args})`) + NEWLINE + formatStatements(node.body, depth + 1, indentStr) + NEWLINE + pad + createStatement("endmacro");
  }
  function formatCallStatement(node, depth, indentStr) {
    const pad = indentStr.repeat(depth);
    const params = node.callerArgs && node.callerArgs.length > 0 ? `(${formatExpressionList(node.callerArgs)})` : "";
    const callExpr = formatExpression(node.call);
    let out = pad + createStatement(`call${params}`, callExpr) + NEWLINE;
    out += formatStatements(node.body, depth + 1, indentStr) + NEWLINE;
    out += pad + createStatement("endcall");
    return out;
  }
  function formatFilterStatement(node, depth, indentStr) {
    const pad = indentStr.repeat(depth);
    const spec = node.filter.type === "Identifier" ? node.filter.value : formatExpression(node.filter);
    let out = pad + createStatement("filter", spec) + NEWLINE;
    out += formatStatements(node.body, depth + 1, indentStr) + NEWLINE;
    out += pad + createStatement("endfilter");
    return out;
  }
  function formatExpression(node) {
    switch (node.type) {
      case "SpreadExpression": {
        const n = node;
        return `*${formatExpression(n.argument)}`;
      }
      case "KeywordSpreadExpression": {
        const n = node;
        return `**${formatExpression(n.argument)}`;
      }
      case "Identifier":
        return node.value;
      case "IntegerLiteral":
        return `${node.value}`;
      case "FloatLiteral": {
        const value = node.value;
        if (Object.is(value, -0)) {
          return "-0.0";
        }
        return value % 1 === 0 ? value.toFixed(1) : value.toString();
      }
      case "StringLiteral":
        return JSON.stringify(node.value);
      case "BinaryExpression": {
        const n = node;
        const thisPrecedence = getBinaryOperatorPrecedence(n);
        const left = formatOperand(n.left, thisPrecedence);
        const right = formatOperand(n.right, thisPrecedence + 1);
        return `${left} ${n.operator.value} ${right}`;
      }
      case "UnaryExpression": {
        const n = node;
        const operandPrecedence = n.argument.type === "UnaryExpression" ? getPrecedence(n) : PRECEDENCE.ATOM;
        return n.operator.value + (n.operator.value === "not" ? " " : "") + formatOperand(n.argument, operandPrecedence);
      }
      case "CallExpression": {
        const n = node;
        const args = formatExpressionList(n.args);
        return `${formatExpression(n.callee)}(${args})`;
      }
      case "MemberExpression": {
        const n = node;
        const obj = formatOperand(n.object, PRECEDENCE.ATOM);
        let prop = formatExpression(n.property);
        if (!n.computed && n.property.type !== "Identifier" && n.property.type !== "IntegerLiteral") {
          prop = `(${prop})`;
        }
        return n.computed ? `${obj}[${prop}]` : `${obj}.${prop}`;
      }
      case "FilterExpression": {
        const n = node;
        const operand = formatOperand(n.operand, PRECEDENCE.FILTER);
        if (n.filter.type === "CallExpression") {
          return `${operand} | ${formatExpression(n.filter)}`;
        }
        return `${operand} | ${n.filter.value}`;
      }
      case "SelectExpression": {
        const n = node;
        return `${formatOperand(n.lhs, PRECEDENCE.LOGICAL_OR)} if ${formatOperand(n.test, PRECEDENCE.LOGICAL_OR)}`;
      }
      case "TestExpression": {
        const n = node;
        return `${formatOperand(n.operand, PRECEDENCE.TEST)} is${n.negate ? " not" : ""} ${n.test.value}`;
      }
      case "ArrayLiteral":
      case "TupleLiteral": {
        const elems = formatExpressionList(node.value);
        const brackets = node.type === "ArrayLiteral" ? "[]" : "()";
        return `${brackets[0]}${elems}${brackets[1]}`;
      }
      case "ObjectLiteral": {
        const entries = Array.from(node.value.entries()).map(
          ([k, v]) => `${formatExpression(k)}: ${formatExpression(v)}`
        );
        return `{${entries.join(", ")}}`;
      }
      case "SliceExpression": {
        const n = node;
        const s = n.start ? formatExpression(n.start) : "";
        const t = n.stop ? formatExpression(n.stop) : "";
        const st = n.step ? `:${formatExpression(n.step)}` : "";
        return `${s}:${t}${st}`;
      }
      case "KeywordArgumentExpression": {
        const n = node;
        return `${n.key.value}=${formatExpression(n.value)}`;
      }
      case "Ternary": {
        const n = node;
        return `${formatOperand(n.trueExpr, PRECEDENCE.LOGICAL_OR)} if ${formatOperand(
          n.condition,
          PRECEDENCE.LOGICAL_OR
        )} else ${formatOperand(n.falseExpr, PRECEDENCE.CONDITIONAL)}`;
      }
      default:
        throw new Error(`Unknown expression type: ${node.type}`);
    }
  }
  var Template = class {
    parsed;
    /**
     * @param {string} template The template string
     */
    constructor(template) {
      const tokens = tokenize(template, {
        lstrip_blocks: true,
        trim_blocks: true
      });
      this.parsed = parse(tokens);
    }
    render(items) {
      const env3 = new Environment();
      setupGlobals(env3);
      if (items) {
        for (const [key, value] of Object.entries(items)) {
          env3.set(key, value);
        }
      }
      const interpreter = new Interpreter(env3);
      const result = interpreter.run(this.parsed);
      return result.value;
    }
    format(options) {
      return format(this.parsed, options?.indent || "	");
    }
  };

  // node_modules/@huggingface/transformers/src/utils/model_registry/get_tokenizer_files.js
  async function get_tokenizer_files(modelId) {
    if (!modelId) {
      throw new Error("modelId is required for get_tokenizer_files");
    }
    const metadata = await get_file_metadata(modelId, "tokenizer_config.json", {});
    if (metadata.exists) {
      return ["tokenizer.json", "tokenizer_config.json"];
    }
    return [];
  }

  // node_modules/@huggingface/transformers/src/tokenization_utils.js
  async function loadTokenizer(pretrained_model_name_or_path, options) {
    const tokenizerFiles = await get_tokenizer_files(pretrained_model_name_or_path);
    return await Promise.all(
      tokenizerFiles.map((file) => getModelJSON(pretrained_model_name_or_path, file, true, options))
    );
  }
  function prepareTensorForDecode(tensor) {
    const dims = tensor.dims;
    switch (dims.length) {
      case 1:
        return tensor.tolist();
      case 2:
        if (dims[0] !== 1) {
          throw new Error(
            "Unable to decode tensor with `batch size !== 1`. Use `tokenizer.batch_decode(...)` for batched inputs."
          );
        }
        return tensor.tolist()[0];
      default:
        throw new Error(`Expected tensor to have 1-2 dimensions, got ${dims.length}.`);
    }
  }
  var SPECIAL_TOKEN_ATTRIBUTES = [
    "bos_token",
    "eos_token",
    "unk_token",
    "sep_token",
    "pad_token",
    "cls_token",
    "mask_token"
    // additional_special_tokens (TODO)
  ];
  function padHelper(item, length, value_fn, side) {
    for (const key of Object.keys(item)) {
      const diff = length - item[key].length;
      const value = value_fn(key);
      const padData = new Array(diff).fill(value);
      item[key] = side === "right" ? mergeArrays(item[key], padData) : mergeArrays(padData, item[key]);
    }
  }
  function truncateHelper(item, length) {
    for (const key of Object.keys(item)) {
      item[key].length = length;
    }
  }
  function getTokenFromConfig(config, ...keys) {
    for (const key of keys) {
      if (!Object.hasOwn(config, key)) continue;
      const item = config[key];
      if (!item) continue;
      if (typeof item === "object") {
        if (item.__type === "AddedToken") {
          return item.content;
        } else {
          throw Error(`Unknown token: ${item}`);
        }
      } else {
        return item;
      }
    }
    return null;
  }
  function getSpecialTokens(tokenizer2) {
    const special = [];
    for (const value of tokenizer2.get_added_tokens_decoder().values()) {
      if (value.special) special.push(value);
    }
    return special;
  }
  var PreTrainedTokenizer = class extends /** @type {new (tokenizerJSON: Object, tokenizerConfig: Object) => PreTrainedTokenizerCallback} */
  Callable {
    return_token_type_ids = false;
    padding_side = "right";
    /**
     * Create a new PreTrainedTokenizer instance.
     * @param {Object} tokenizerJSON The JSON of the tokenizer.
     * @param {Object} tokenizerConfig The config of the tokenizer.
     */
    constructor(tokenizerJSON, tokenizerConfig) {
      super();
      this._tokenizerJSON = tokenizerJSON;
      this._tokenizerConfig = tokenizerConfig;
      this._tokenizer = new Tokenizer_default(tokenizerJSON, tokenizerConfig);
      this.config = tokenizerConfig;
      this.padding_side = tokenizerConfig.padding_side ?? this.padding_side;
      this.mask_token = getTokenFromConfig(tokenizerConfig, "mask_token");
      this.mask_token_id = this._tokenizer.token_to_id(this.mask_token);
      this.pad_token = getTokenFromConfig(tokenizerConfig, "pad_token", "eos_token");
      this.pad_token_id = this._tokenizer.token_to_id(this.pad_token);
      this.sep_token = getTokenFromConfig(tokenizerConfig, "sep_token");
      this.sep_token_id = this._tokenizer.token_to_id(this.sep_token);
      this.unk_token = getTokenFromConfig(tokenizerConfig, "unk_token");
      this.unk_token_id = this._tokenizer.token_to_id(this.unk_token);
      this.bos_token = getTokenFromConfig(tokenizerConfig, "bos_token");
      this.bos_token_id = this._tokenizer.token_to_id(this.bos_token);
      this.eos_token = getTokenFromConfig(tokenizerConfig, "eos_token");
      this.eos_token_id = this._tokenizer.token_to_id(this.eos_token);
      this.chat_template = tokenizerConfig.chat_template ?? null;
      if (Array.isArray(this.chat_template)) {
        const chat_template = /* @__PURE__ */ Object.create(null);
        for (const { name, template } of this.chat_template) {
          if (typeof name !== "string" || typeof template !== "string") {
            throw new Error('Chat template must be a list of objects with "name" and "template" properties');
          }
          chat_template[name] = template;
        }
        this.chat_template = chat_template;
      }
      this._compiled_template_cache = /* @__PURE__ */ new Map();
      const special_tokens = getSpecialTokens(this._tokenizer);
      this.all_special_ids = special_tokens.map((t) => t.id);
      this.all_special_tokens = special_tokens.map((t) => t.content);
    }
    /**
     * Loads a pretrained tokenizer from the given `pretrained_model_name_or_path`.
     *
     * @param {string} pretrained_model_name_or_path The path to the pretrained tokenizer.
     * @param {PretrainedTokenizerOptions} options Additional options for loading the tokenizer.
     *
     * @throws {Error} Throws an error if the tokenizer.json or tokenizer_config.json files are not found in the `pretrained_model_name_or_path`.
     * @returns {Promise<PreTrainedTokenizer>} A new instance of the `PreTrainedTokenizer` class.
     */
    static async from_pretrained(pretrained_model_name_or_path, { progress_callback = null, config = null, cache_dir = null, local_files_only = false, revision = "main" } = {}) {
      const info = await loadTokenizer(pretrained_model_name_or_path, {
        progress_callback,
        config,
        cache_dir,
        local_files_only,
        revision
      });
      return new this(...info);
    }
    get_vocab() {
      return this._tokenizer.get_vocab();
    }
    get model_max_length() {
      return this._tokenizerConfig.model_max_length ?? Infinity;
    }
    get add_eos_token() {
      return this._tokenizerConfig.add_eos_token;
    }
    get add_bos_token() {
      return this._tokenizerConfig.add_bos_token;
    }
    /**
     * Converts a token string (or a sequence of tokens) into a single integer id (or a sequence of ids), using the vocabulary.
     *
     * @template {string|string[]} T
     * @param {T} tokens One or several token(s) to convert to token id(s).
     * @returns {T extends string ? number : number[]} The token id or list of token ids.
     */
    convert_tokens_to_ids(tokens) {
      if (typeof tokens === "string") {
        return (
          /** @type {any} */
          this._tokenizer.token_to_id(tokens)
        );
      } else {
        return (
          /** @type {any} */
          tokens.map((token) => this._tokenizer.token_to_id(token))
        );
      }
    }
    /**
     * Encode/tokenize the given text(s).
     * @template {string|string[]} TText
     * @template {boolean} [TReturnTensor=true]
     * @param {TText} text The text to tokenize.
     * @param {TokenizerCallOptions<TText, TReturnTensor>} [options] Additional tokenization options.
     * @returns {BatchEncoding<BatchEncodingItem<TText, TReturnTensor>>} Object to be passed to the model.
     */
    _call(text, options = {}) {
      const { text_pair = null, add_special_tokens = true, padding = false, return_token_type_ids = null } = options;
      let { truncation = null, max_length = null } = options;
      const return_tensor = (
        /** @type {TReturnTensor} */
        options.return_tensor ?? true
      );
      const isBatched = Array.isArray(text);
      let encodedTokens;
      if (isBatched) {
        if (text.length === 0) {
          throw Error("text array must be non-empty");
        }
        if (text_pair !== null) {
          if (!Array.isArray(text_pair)) {
            throw Error("text_pair must also be an array");
          } else if (text.length !== text_pair.length) {
            throw Error("text and text_pair must have the same length");
          }
          encodedTokens = text.map(
            (t, i) => this._encode_plus(t, { text_pair: text_pair[i], add_special_tokens, return_token_type_ids })
          );
        } else {
          encodedTokens = text.map((x) => this._encode_plus(x, { add_special_tokens, return_token_type_ids }));
        }
      } else {
        if (text === null || text === void 0) {
          throw Error("text may not be null or undefined");
        }
        if (Array.isArray(text_pair)) {
          throw Error(
            "When specifying `text_pair`, since `text` is a string, `text_pair` must also be a string (i.e., not an array)."
          );
        }
        encodedTokens = [this._encode_plus(text, { text_pair, add_special_tokens, return_token_type_ids })];
      }
      if (max_length === null) {
        max_length = this.model_max_length;
      } else if (truncation === null) {
        if (padding === true) {
          logger.warn(
            "`max_length` is ignored when `padding: true` and there is no truncation strategy. To pad to max length, use `padding: 'max_length'`."
          );
          max_length = this.model_max_length;
        } else if (padding === false) {
          logger.warn(
            "Truncation was not explicitly activated but `max_length` is provided a specific value, please use `truncation: true` to explicitly truncate examples to max length."
          );
          truncation = true;
        }
      }
      if (padding === true) {
        max_length = Math.min(max(encodedTokens.map((x) => x.input_ids.length))[0], max_length ?? Infinity);
      }
      max_length = Math.min(max_length, this.model_max_length ?? Infinity);
      if (padding || truncation) {
        for (let i = 0; i < encodedTokens.length; ++i) {
          if (encodedTokens[i].input_ids.length === max_length) {
            continue;
          } else if (encodedTokens[i].input_ids.length > max_length) {
            if (truncation) {
              truncateHelper(encodedTokens[i], max_length);
            }
          } else {
            if (padding) {
              padHelper(
                encodedTokens[i],
                max_length,
                (key) => key === "input_ids" ? this.pad_token_id : 0,
                this.padding_side
              );
            }
          }
        }
      }
      const result = {};
      if (return_tensor) {
        if (!(padding && truncation)) {
          if (encodedTokens.some((x) => {
            for (const key of Object.keys(x)) {
              if (x[key].length !== encodedTokens[0][key]?.length) {
                return true;
              }
            }
            return false;
          })) {
            throw Error(
              "Unable to create tensor, you should probably activate truncation and/or padding with 'padding=true' and 'truncation=true' to have batched tensors with the same length."
            );
          }
        }
        const dims = [encodedTokens.length, encodedTokens[0].input_ids.length];
        for (const key of Object.keys(encodedTokens[0])) {
          result[key] = new Tensor3(
            "int64",
            BigInt64Array.from(encodedTokens.flatMap((x) => x[key]).map(BigInt)),
            dims
          );
        }
      } else {
        for (const key of Object.keys(encodedTokens[0])) {
          result[key] = encodedTokens.map((x) => x[key]);
        }
        if (!isBatched) {
          for (const key of Object.keys(result)) {
            result[key] = result[key][0];
          }
        }
      }
      return (
        /** @type {BatchEncoding<BatchEncodingItem<TText, TReturnTensor>>} */
        result
      );
    }
    /**
     * Encodes a single text using the preprocessor pipeline of the tokenizer.
     *
     * @param {string|null} text The text to encode.
     * @returns {string[]|null} The encoded tokens.
     */
    _encode_text(text) {
      if (text === null) return null;
      return this._tokenizer.encode(text).tokens;
    }
    /**
     * Encodes a single text or a pair of texts using the model's tokenizer.
     *
     * @param {string} text The text to encode.
     * @param {Object} options An optional object containing the following properties:
     * @param {string|null} [options.text_pair=null] The optional second text to encode.
     * @param {boolean} [options.add_special_tokens=true] Whether or not to add the special tokens associated with the corresponding model.
     * @param {boolean|null} [options.return_token_type_ids=null] Whether to return token_type_ids.
     * @returns {{input_ids: number[], attention_mask: number[], token_type_ids?: number[]}} An object containing the encoded text.
     * @private
     */
    _encode_plus(text, { text_pair = null, add_special_tokens = true, return_token_type_ids = null } = {}) {
      const { ids, attention_mask, token_type_ids } = this._tokenizer.encode(text, {
        text_pair,
        add_special_tokens,
        return_token_type_ids: return_token_type_ids ?? this.return_token_type_ids
      });
      return {
        input_ids: ids,
        attention_mask,
        ...token_type_ids ? { token_type_ids } : {}
      };
    }
    /**
     * Converts a string into a sequence of tokens.
     * @param {string} text The sequence to be encoded.
     * @param {Object} options An optional object containing the following properties:
     * @param {string|null} [options.pair] A second sequence to be encoded with the first.
     * @param {boolean} [options.add_special_tokens=false] Whether or not to add the special tokens associated with the corresponding model.
     * @returns {string[]} The list of tokens.
     */
    tokenize(text, { pair = null, add_special_tokens = false } = {}) {
      return this._tokenizer.tokenize(text, { text_pair: pair, add_special_tokens });
    }
    /**
     * Encodes a single text or a pair of texts using the model's tokenizer.
     *
     * @param {string} text The text to encode.
     * @param {Object} options An optional object containing the following properties:
     * @param {string|null} [options.text_pair=null] The optional second text to encode.
     * @param {boolean} [options.add_special_tokens=true] Whether or not to add the special tokens associated with the corresponding model.
     * @param {boolean|null} [options.return_token_type_ids=null] Whether to return token_type_ids.
     * @returns {number[]} An array of token IDs representing the encoded text(s).
     */
    encode(text, { text_pair = null, add_special_tokens = true, return_token_type_ids = null } = {}) {
      return this._tokenizer.encode(text, {
        text_pair,
        add_special_tokens,
        return_token_type_ids
      }).ids;
    }
    /**
     * Decode a batch of tokenized sequences.
     * @param {number[][]|Tensor} batch List/Tensor of tokenized input sequences.
     * @param {Object} decode_args (Optional) Object with decoding arguments.
     * @returns {string[]} List of decoded sequences.
     */
    batch_decode(batch, decode_args = {}) {
      if (batch instanceof Tensor3) {
        batch = batch.tolist();
      }
      return batch.map((x) => this.decode(x, decode_args));
    }
    /**
     * Decodes a sequence of token IDs back to a string.
     *
     * @param {number[]|bigint[]|Tensor} token_ids List/Tensor of token IDs to decode.
     * @param {Object} [decode_args={}]
     * @param {boolean} [decode_args.skip_special_tokens=false] If true, special tokens are removed from the output string.
     * @param {boolean} [decode_args.clean_up_tokenization_spaces=true] If true, spaces before punctuation and abbreviated forms are removed.
     *
     * @returns {string} The decoded string.
     * @throws {Error} If `token_ids` is not a non-empty array of integers.
     */
    decode(token_ids, decode_args = {}) {
      if (token_ids instanceof Tensor3) {
        token_ids = prepareTensorForDecode(token_ids);
      }
      if (!Array.isArray(token_ids) || token_ids.length === 0 || !isIntegralNumber(token_ids[0])) {
        throw Error("token_ids must be a non-empty array of integers.");
      }
      return this.decode_single(token_ids, decode_args);
    }
    /**
     * Decode a single list of token ids to a string.
     * @param {number[]|bigint[]} token_ids List of token ids to decode
     * @param {Object} decode_args Optional arguments for decoding
     * @param {boolean} [decode_args.skip_special_tokens=false] Whether to skip special tokens during decoding
     * @param {boolean|null} [decode_args.clean_up_tokenization_spaces=null] Whether to clean up tokenization spaces during decoding.
     * If null, the value is set to `this.decoder.cleanup` if it exists, falling back to `this.clean_up_tokenization_spaces` if it exists, falling back to `true`.
     * @returns {string} The decoded string
     */
    decode_single(token_ids, { skip_special_tokens = false, clean_up_tokenization_spaces = null }) {
      return this._tokenizer.decode(token_ids, {
        skip_special_tokens,
        clean_up_tokenization_spaces
      });
    }
    /**
     * Retrieve the chat template string used for tokenizing chat messages. This template is used
     * internally by the `apply_chat_template` method and can also be used externally to retrieve the model's chat
     * template for better generation tracking.
     *
     * @param {Object} options An optional object containing the following properties:
     * @param {string|null} [options.chat_template=null]
     * A Jinja template or the name of a template to use for this conversion.
     * It is usually not necessary to pass anything to this argument,
     * as the model's template will be used by default.
     * @param {Object[]} [options.tools=null]
     * A list of tools (callable functions) that will be accessible to the model. If the template does not
     * support function calling, this argument will have no effect. Each tool should be passed as a JSON Schema,
     * giving the name, description and argument types for the tool. See our
     * [chat templating guide](https://huggingface.co/docs/transformers/main/en/chat_templating#automated-function-conversion-for-tool-use)
     * for more information.
     * @returns {string} The chat template string.
     */
    get_chat_template({ chat_template = null, tools = null } = {}) {
      if (this.chat_template && typeof this.chat_template === "object") {
        const template_dict = this.chat_template;
        if (chat_template !== null && Object.hasOwn(template_dict, chat_template)) {
          chat_template = template_dict[chat_template];
        } else if (chat_template === null) {
          if (tools !== null && "tool_use" in template_dict) {
            chat_template = template_dict["tool_use"];
          } else if ("default" in template_dict) {
            chat_template = template_dict["default"];
          } else {
            throw Error(
              `This model has multiple chat templates with no default specified! Please either pass a chat template or the name of the template you wish to use to the 'chat_template' argument. Available template names are ${Object.keys(template_dict).sort()}.`
            );
          }
        }
      } else if (chat_template === null) {
        if (this.chat_template) {
          chat_template = this.chat_template;
        } else {
          throw Error(
            "Cannot use apply_chat_template() because tokenizer.chat_template is not set and no template argument was passed! For information about writing templates and setting the tokenizer.chat_template attribute, please see the documentation at https://huggingface.co/docs/transformers/main/en/chat_templating"
          );
        }
      }
      return chat_template;
    }
    /**
     * Converts a list of message objects with `"role"` and `"content"` keys to a list of token
     * ids. This method is intended for use with chat models, and will read the tokenizer's chat_template attribute to
     * determine the format and control tokens to use when converting.
     *
     * See the [chat templating guide](https://huggingface.co/docs/transformers/chat_templating) for more information.
     *
     * **Example:** Applying a chat template to a conversation.
     *
     * ```javascript
     * import { AutoTokenizer } from "@huggingface/transformers";
     *
     * const tokenizer = await AutoTokenizer.from_pretrained("Xenova/mistral-tokenizer-v1");
     *
     * const chat = [
     *   { "role": "user", "content": "Hello, how are you?" },
     *   { "role": "assistant", "content": "I'm doing great. How can I help you today?" },
     *   { "role": "user", "content": "I'd like to show off how chat templating works!" },
     * ]
     *
     * const text = tokenizer.apply_chat_template(chat, { tokenize: false });
     * // "<s>[INST] Hello, how are you? [/INST]I'm doing great. How can I help you today?</s> [INST] I'd like to show off how chat templating works! [/INST]"
     *
     * const input_ids = tokenizer.apply_chat_template(chat, { tokenize: true, return_tensor: false });
     * // [1, 733, 16289, 28793, 22557, 28725, 910, 460, 368, 28804, 733, 28748, 16289, 28793, 28737, 28742, 28719, 2548, 1598, 28723, 1602, 541, 315, 1316, 368, 3154, 28804, 2, 28705, 733, 16289, 28793, 315, 28742, 28715, 737, 298, 1347, 805, 910, 10706, 5752, 1077, 3791, 28808, 733, 28748, 16289, 28793]
     * ```
     *
     * @param {Message[]} conversation A list of message objects with `"role"` and `"content"` keys,
     * representing the chat history so far.
     * @template {boolean} [TTokenize=true]
     * @template {boolean} [TReturnTensor=true]
     * @template {boolean} [TReturnDict=true]
     * @param {ApplyChatTemplateOptions<TTokenize, TReturnTensor, TReturnDict>} [options] Options controlling
     * template rendering and tokenization.
     * @returns {ApplyChatTemplateReturn<TTokenize, TReturnTensor, TReturnDict>} The tokenized output.
     */
    apply_chat_template(conversation, options = (
      /** @type {ApplyChatTemplateOptions<TTokenize, TReturnTensor, TReturnDict>} */
      {}
    )) {
      let {
        tools = null,
        documents: documents2 = null,
        chat_template = null,
        add_generation_prompt = false,
        tokenize: tokenize2 = (
          /** @type {TTokenize} */
          true
        ),
        padding = false,
        truncation = false,
        max_length = null,
        return_tensor = (
          /** @type {TReturnTensor} */
          true
        ),
        return_dict = (
          /** @type {TReturnDict} */
          true
        ),
        tokenizer_kwargs = {},
        ...kwargs
      } = options;
      chat_template = this.get_chat_template({ chat_template, tools });
      if (typeof chat_template !== "string") {
        throw Error(`chat_template must be a string, but got ${typeof chat_template}`);
      }
      let compiledTemplate = this._compiled_template_cache.get(chat_template);
      if (compiledTemplate === void 0) {
        compiledTemplate = new Template(chat_template);
        this._compiled_template_cache.set(chat_template, compiledTemplate);
      }
      const special_tokens_map = /* @__PURE__ */ Object.create(null);
      for (const key of SPECIAL_TOKEN_ATTRIBUTES) {
        const value = getTokenFromConfig(this.config, key);
        if (value) {
          special_tokens_map[key] = value;
        }
      }
      const rendered = compiledTemplate.render({
        messages: conversation,
        add_generation_prompt,
        tools,
        documents: documents2,
        ...special_tokens_map,
        ...kwargs
      });
      if (tokenize2) {
        const out = this._call(rendered, {
          add_special_tokens: false,
          padding,
          truncation,
          max_length,
          return_tensor,
          ...tokenizer_kwargs
        });
        return (
          /** @type {ApplyChatTemplateReturn<TTokenize, TReturnTensor, TReturnDict>} */
          return_dict ? out : out.input_ids
        );
      }
      return (
        /** @type {ApplyChatTemplateReturn<TTokenize, TReturnTensor, TReturnDict>} */
        rendered
      );
    }
  };

  // node_modules/@huggingface/transformers/src/models/bert/tokenization_bert.js
  var BertTokenizer = class extends PreTrainedTokenizer {
    return_token_type_ids = true;
  };

  // src/semantic-worker.js
  MODEL_CLASS_TO_NAME_MAPPING.set(BertModel, "BertModel");
  MODEL_TYPE_MAPPING.set("BertModel", MODEL_TYPES.EncoderOnly);
  MODEL_TYPE_MAPPING.set("bert", MODEL_TYPES.EncoderOnly);
  var MODEL = "Xenova/all-MiniLM-L6-v2";
  var REVISION = "751bff37182d3f1213fa05d7196b954e230abad9";
  var model;
  var tokenizer;
  var documents;
  var vectors;
  var busy = false;
  async function embed(texts) {
    const inputs = tokenizer(texts, { padding: true, truncation: true });
    const output = await model(inputs);
    if (!output.last_hidden_state) throw new Error("The pinned encoder did not return token embeddings.");
    return mean_pooling(output.last_hidden_state, inputs.attention_mask).normalize(2, -1);
  }
  onmessage = async ({ data }) => {
    if (busy) return;
    busy = true;
    try {
      if (data.type === "load") {
        env.allowLocalModels = false;
        env.backends.onnx.wasm.numThreads = 1;
        env.backends.onnx.wasm.proxy = false;
        env.backends.onnx.wasm.wasmPaths = { mjs: data.assets.mjs, wasm: data.assets.wasm };
        const options = { revision: REVISION, dtype: "q8", device: "wasm", progress_callback: (progress) => postMessage({ type: "progress", progress }) };
        const [loadedModel, tokenizerJSON, tokenizerConfig] = await Promise.all([
          BertModel.from_pretrained(MODEL, options),
          getModelJSON(MODEL, "tokenizer.json", true, options),
          getModelJSON(MODEL, "tokenizer_config.json", true, options)
        ]);
        model = loadedModel;
        if (model.config.model_type !== "bert") throw new Error("The pinned semantic model is not a BERT encoder.");
        tokenizer = new BertTokenizer(tokenizerJSON, tokenizerConfig);
        documents = data.documents;
        const output = await embed(documents.map((x) => x.text));
        vectors = output.tolist();
        postMessage({ type: "ready", model: MODEL, revision: REVISION, dimensions: vectors[0].length, count: documents.length });
      } else if (data.type === "search" && model && tokenizer && vectors) {
        const output = await embed(data.query);
        const queryVector = output.tolist()[0];
        const results = vectors.map((v, i) => ({ id: documents[i].id, score: v.reduce((s, n, j2) => s + n * queryVector[j2], 0) })).sort((a, b) => b.score - a.score).slice(0, 5);
        postMessage({ type: "results", results, requestId: data.requestId });
      }
    } catch (error) {
      postMessage({ type: "error", message: String(error.message || error) });
    } finally {
      busy = false;
    }
  };
})();
/*! Bundled license information:

onnxruntime-web/dist/ort.webgpu.bundle.min.mjs:
  (*!
   * ONNX Runtime Web v1.31.0-dev.20260914-8d85527a0
   * Copyright (c) Microsoft Corporation. All rights reserved.
   * Licensed under the MIT License.
   *)
*/
