import {
  EMBED_EXIT_NAVIGATE_MESSAGE,
  EMBED_MESSAGE_SOURCE,
  EMBED_READY_MESSAGE,
  EMBED_REQUEST_RESIZE_MESSAGE,
  EMBED_RESIZE_MESSAGE,
  EMBED_WHEEL_MESSAGE,
  type WidgetConfig,
  type WidgetInstance,
} from "./types";
import { buildEmbedUrl, EMBED_LOADING_HEIGHT } from "./config";

const LOADER_CLASS = "cv-widget";
const IFRAME_CLASS = "cv-widget__iframe";
const SKELETON_CLASS = "cv-widget__skeleton";
const EXIT_OVERLAY_CLASS = "cv-widget__exit-overlay";
const MOBILE_SCROLL_CLASS = "cv-widget--mobile-scroll";

/** Altura máxima visible del widget en móvil (el resto se desplaza dentro). */
const MOBILE_MAX_HEIGHT_VH = 72;

/** Padding extra al aplicar altura recibida por postMessage (evita recorte inferior). */
const RESIZE_HEIGHT_PADDING = 12;
const RESIZE_HEIGHT_PADDING_NO_MOBILE_SCROLL = 96;

const RESIZE_POLL_INTERVAL_MS = 800;
const RESIZE_POLL_MAX_ATTEMPTS = 12;

function usesPageScrollMode(mobileScroll: WidgetConfig["mobileScroll"]): boolean {
  return mobileScroll === false || mobileScroll === "auto";
}

function readMobileScrollDataset(
  mobileScroll: WidgetConfig["mobileScroll"],
): string {
  if (mobileScroll === "auto") return "auto";
  if (mobileScroll === false) return "false";
  return "true";
}

const VALID_EMBED_SOURCES = new Set([
  EMBED_MESSAGE_SOURCE,
  "cotizador-virtual",
]);

function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 768px)").matches;
}

function injectStyles() {
  if (document.getElementById("cv-widget-styles")) return;

  const style = document.createElement("style");
  style.id = "cv-widget-styles";
  style.textContent = `
    .${LOADER_CLASS} {
      position: relative;
      width: 100%;
      max-width: none;
      overflow: visible;
      background: transparent;
      touch-action: pan-y;
    }
    .${LOADER_CLASS}[data-full-width="true"] {
      width: 100vw;
      max-width: 100vw;
      margin-left: calc(50% - 50vw);
      margin-right: calc(50% - 50vw);
    }
    .${LOADER_CLASS}[data-mobile-scroll="false"],
    .${LOADER_CLASS}[data-mobile-scroll="auto"] {
      overflow: visible !important;
      max-height: none !important;
    }
    .${LOADER_CLASS}[data-mobile-scroll="false"] .${IFRAME_CLASS},
    .${LOADER_CLASS}[data-mobile-scroll="auto"] .${IFRAME_CLASS} {
      overflow: visible;
      display: block;
    }
    .${LOADER_CLASS}.${MOBILE_SCROLL_CLASS} {
      max-height: ${MOBILE_MAX_HEIGHT_VH}vh;
      overflow-x: hidden;
      overflow-y: auto;
      overscroll-behavior-y: auto;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-y;
    }
    .${IFRAME_CLASS} {
      display: block;
      width: 100%;
      max-width: none;
      border: 0;
      background: transparent;
      overflow: visible;
      opacity: 0;
      transition: opacity 0.25s ease, height 0.12s ease;
    }
    .${IFRAME_CLASS}[data-ready="true"] {
      opacity: 1;
    }
    .${SKELETON_CLASS} {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 24px;
      color: #64748b;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .${SKELETON_CLASS}[data-hidden="true"] {
      opacity: 0;
    }
    .${SKELETON_CLASS}__pulse {
      width: min(100%, 420px);
      height: 12px;
      border-radius: 999px;
      background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
      background-size: 200% 100%;
      animation: cv-widget-pulse 1.2s ease-in-out infinite;
      margin-bottom: 12px;
    }
    @keyframes cv-widget-pulse {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }
    .${EXIT_OVERLAY_CLASS} {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(6px);
      color: #0f172a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      text-align: center;
    }
    .${EXIT_OVERLAY_CLASS}__spinner {
      width: 40px;
      height: 40px;
      margin: 0 auto 16px;
      border-radius: 999px;
      border: 2px solid rgba(15, 23, 42, 0.12);
      border-top-color: #ff6600;
      animation: cv-widget-spin 0.8s linear infinite;
    }
    .${EXIT_OVERLAY_CLASS}__title {
      margin: 0 0 6px;
      font-size: 15px;
      font-weight: 700;
    }
    .${EXIT_OVERLAY_CLASS}__subtitle {
      margin: 0;
      font-size: 13px;
      color: #64748b;
    }
    @keyframes cv-widget-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export function mountWidget(
  element: HTMLElement,
  config: WidgetConfig,
): WidgetInstance {
  injectStyles();

  if (element.dataset.cvMounted === "true") {
    return {
      destroy: () => undefined,
    };
  }

  element.dataset.cvMounted = "true";
  element.classList.add(LOADER_CLASS);
  if (config.fullWidth) {
    element.dataset.fullWidth = "true";
  }
  if (config.minHeight !== undefined) {
    element.style.setProperty("--cv-widget-min-height", `${config.minHeight}px`);
  }
  element.dataset.mobileScroll = readMobileScrollDataset(config.mobileScroll);

  const skeleton = document.createElement("div");
  skeleton.className = SKELETON_CLASS;
  skeleton.setAttribute("aria-hidden", "true");
  skeleton.innerHTML = `
    <div style="width:100%;max-width:420px;text-align:center">
      <div class="${SKELETON_CLASS}__pulse"></div>
      <div class="${SKELETON_CLASS}__pulse" style="width:70%;margin-inline:auto"></div>
      <p style="margin:16px 0 0">Cargando cotizador…</p>
    </div>
  `;

  const iframe = document.createElement("iframe");
  iframe.className = IFRAME_CLASS;
  iframe.title = config.title;
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allow = "clipboard-write";
  iframe.setAttribute(
    "scrolling",
    usesPageScrollMode(config.mobileScroll) ? "auto" : "no",
  );
  iframe.style.overflow = "visible";
  iframe.src = buildEmbedUrl(config);

  const initialHeight = config.minHeight ?? EMBED_LOADING_HEIGHT;
  iframe.style.height = `${initialHeight}px`;
  element.style.height = `${initialHeight}px`;

  element.replaceChildren(skeleton, iframe);

  let currentHeight = initialHeight;
  let exitOverlay: HTMLDivElement | null = null;
  let mobileMediaQuery: MediaQueryList | null = null;

  const syncMobileScrollMode = () => {
    if (usesPageScrollMode(config.mobileScroll)) {
      element.classList.remove(MOBILE_SCROLL_CLASS);
      element.dataset.mobileScroll = readMobileScrollDataset(config.mobileScroll);
      element.style.maxHeight = "none";
      element.style.overflow = "visible";
      element.style.removeProperty("overflow-y");
      return;
    }

    const mobile = isMobileViewport();
    element.classList.toggle(MOBILE_SCROLL_CLASS, mobile);
    element.dataset.mobileScroll = mobile ? "true" : "false";

    if (mobile) {
      element.style.removeProperty("max-height");
      element.style.overflowY = "";
    } else {
      element.style.maxHeight = "none";
      element.style.overflow = "visible";
    }
  };

  const onMobileViewportChange = () => {
    syncMobileScrollMode();
  };

  const showExitLoading = () => {
    if (exitOverlay) return;
    exitOverlay = document.createElement("div");
    exitOverlay.className = EXIT_OVERLAY_CLASS;
    exitOverlay.setAttribute("role", "status");
    exitOverlay.setAttribute("aria-live", "polite");
    exitOverlay.setAttribute("aria-busy", "true");
    exitOverlay.innerHTML = `
      <div style="max-width:420px">
        <div class="${EXIT_OVERLAY_CLASS}__spinner"></div>
        <p class="${EXIT_OVERLAY_CLASS}__title">Buscando el mejor plan para ti…</p>
        <p class="${EXIT_OVERLAY_CLASS}__subtitle">Cargando el cotizador completo</p>
      </div>
    `;
    element.appendChild(exitOverlay);
  };

  const applyHeight = (height: number) => {
    const floor = config.minHeight ?? 1;
    const padding = usesPageScrollMode(config.mobileScroll)
      ? RESIZE_HEIGHT_PADDING_NO_MOBILE_SCROLL
      : RESIZE_HEIGHT_PADDING;
    const nextHeight = Math.max(floor, Math.ceil(height) + padding);
    currentHeight = nextHeight;
    iframe.style.height = `${nextHeight}px`;
    iframe.style.minHeight = `${nextHeight}px`;
    iframe.style.maxHeight = "none";
    iframe.setAttribute("height", String(nextHeight));
    element.style.height = `${nextHeight}px`;
    element.style.minHeight = `${nextHeight}px`;
    element.style.maxHeight = "none";
    syncMobileScrollMode();
  };

  const requestEmbedResize = () => {
    const target = iframe.contentWindow;
    if (!target) return;
    target.postMessage(
      {
        type: EMBED_REQUEST_RESIZE_MESSAGE,
        source: EMBED_MESSAGE_SOURCE,
      },
      "*",
    );
  };

  let resizePollTimer: number | null = null;
  let resizePollAttempts = 0;

  const startResizePolling = () => {
    if (resizePollTimer !== null) return;
    resizePollTimer = window.setInterval(() => {
      resizePollAttempts += 1;
      requestEmbedResize();
      if (resizePollAttempts >= RESIZE_POLL_MAX_ATTEMPTS && resizePollTimer !== null) {
        window.clearInterval(resizePollTimer);
        resizePollTimer = null;
      }
    }, RESIZE_POLL_INTERVAL_MS);
  };

  const stopResizePolling = () => {
    if (resizePollTimer === null) return;
    window.clearInterval(resizePollTimer);
    resizePollTimer = null;
  };

  const markReady = () => {
    iframe.dataset.ready = "true";
    skeleton.dataset.hidden = "true";
    window.setTimeout(() => skeleton.remove(), 220);
  };

  const applyWheelScroll = (deltaY: number, deltaX: number) => {
    const scrollOptions: ScrollToOptions = {
      top: deltaY,
      left: deltaX,
      behavior: "auto",
    };

    if (usesPageScrollMode(config.mobileScroll)) {
      window.scrollBy(scrollOptions);
      return;
    }

    if (element.classList.contains(MOBILE_SCROLL_CLASS)) {
      element.scrollBy(scrollOptions);
      return;
    }

    window.scrollBy(scrollOptions);
  };

  const onMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return;

    const data = event.data as {
      type?: string;
      source?: string;
      height?: number;
      deltaY?: number;
      deltaX?: number;
    };
    if (!data?.source || !VALID_EMBED_SOURCES.has(data.source)) return;

    if (data.type === EMBED_WHEEL_MESSAGE) {
      if (typeof data.deltaY !== "number" || typeof data.deltaX !== "number") {
        return;
      }
      applyWheelScroll(data.deltaY, data.deltaX);
      return;
    }

    if (data.type === EMBED_EXIT_NAVIGATE_MESSAGE) {
      showExitLoading();
      return;
    }

    if (data.type === EMBED_READY_MESSAGE) {
      markReady();
      return;
    }

    if (data.type === EMBED_RESIZE_MESSAGE && typeof data.height === "number") {
      applyHeight(data.height);
      stopResizePolling();
      if (iframe.dataset.ready !== "true") {
        markReady();
      }
    }
  };

  window.addEventListener("message", onMessage);
  syncMobileScrollMode();
  startResizePolling();

  if (!usesPageScrollMode(config.mobileScroll) && typeof window.matchMedia === "function") {
    mobileMediaQuery = window.matchMedia("(max-width: 768px)");
    mobileMediaQuery.addEventListener("change", onMobileViewportChange);
  }

  iframe.addEventListener("load", () => {
    startResizePolling();
    requestEmbedResize();
    if (iframe.dataset.ready !== "true") {
      markReady();
    }
  });

  return {
    destroy: () => {
      stopResizePolling();
      window.removeEventListener("message", onMessage);
      mobileMediaQuery?.removeEventListener("change", onMobileViewportChange);
      element.replaceChildren();
      element.classList.remove(LOADER_CLASS, MOBILE_SCROLL_CLASS);
      delete element.dataset.cvMounted;
      delete element.dataset.fullWidth;
      delete element.dataset.mobileScroll;
      element.style.removeProperty("--cv-widget-min-height");
      element.style.removeProperty("height");
      element.style.removeProperty("max-height");
      element.style.removeProperty("overflow");
    },
  };
}
