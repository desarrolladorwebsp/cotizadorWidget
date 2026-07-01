import {
  EMBED_MESSAGE_SOURCE,
  EMBED_READY_MESSAGE,
  EMBED_RESIZE_MESSAGE,
  type WidgetConfig,
  type WidgetInstance,
} from "./types";
import { buildEmbedUrl } from "./config";

const LOADER_CLASS = "cv-widget";
const IFRAME_CLASS = "cv-widget__iframe";
const SKELETON_CLASS = "cv-widget__skeleton";

function injectStyles() {
  if (document.getElementById("cv-widget-styles")) return;

  const style = document.createElement("style");
  style.id = "cv-widget-styles";
  style.textContent = `
    .${LOADER_CLASS} {
      position: relative;
      width: 100%;
      min-height: var(--cv-widget-min-height, 720px);
      overflow: hidden;
      border-radius: 16px;
      background: #f4f7fb;
    }
    .${IFRAME_CLASS} {
      display: block;
      width: 100%;
      border: 0;
      min-height: var(--cv-widget-min-height, 720px);
      background: transparent;
      opacity: 0;
      transition: opacity 0.25s ease;
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
  element.style.setProperty("--cv-widget-min-height", `${config.minHeight}px`);

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
  iframe.src = buildEmbedUrl(config);
  iframe.style.height = `${config.minHeight}px`;

  element.replaceChildren(skeleton, iframe);

  let currentHeight = config.minHeight;

  const applyHeight = (height: number) => {
    const nextHeight = Math.max(config.minHeight, Math.ceil(height));
    if (nextHeight === currentHeight) return;
    currentHeight = nextHeight;
    iframe.style.height = `${nextHeight}px`;
    element.style.minHeight = `${nextHeight}px`;
  };

  const markReady = () => {
    iframe.dataset.ready = "true";
    skeleton.dataset.hidden = "true";
    window.setTimeout(() => skeleton.remove(), 220);
  };

  const onMessage = (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return;

    const data = event.data as { type?: string; source?: string; height?: number };
    if (data?.source !== EMBED_MESSAGE_SOURCE) return;

    if (data.type === EMBED_READY_MESSAGE) {
      markReady();
      return;
    }

    if (data.type === EMBED_RESIZE_MESSAGE && typeof data.height === "number") {
      applyHeight(data.height);
      if (iframe.dataset.ready !== "true") {
        markReady();
      }
    }
  };

  window.addEventListener("message", onMessage);

  iframe.addEventListener("load", () => {
    if (iframe.dataset.ready !== "true") {
      markReady();
    }
  });

  return {
    destroy: () => {
      window.removeEventListener("message", onMessage);
      element.replaceChildren();
      element.classList.remove(LOADER_CLASS);
      delete element.dataset.cvMounted;
      element.style.removeProperty("--cv-widget-min-height");
      element.style.removeProperty("min-height");
    },
  };
}
