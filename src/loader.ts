import {
  findLoaderScript,
  resolveWidgetConfig,
  WIDGET_SELECTOR,
} from "./config";
import { mountWidget } from "./mount";
import type { WidgetConfig, WidgetInstance } from "./types";

function mountElement(
  element: HTMLElement,
  script: HTMLScriptElement | null,
  overrides?: Partial<WidgetConfig>,
): WidgetInstance {
  const config = resolveWidgetConfig(element, script, overrides);
  return mountWidget(element, config);
}

function init(selector = WIDGET_SELECTOR): WidgetInstance[] {
  const script = findLoaderScript();
  const nodes = document.querySelectorAll<HTMLElement>(selector);
  return Array.from(nodes).map((node) => mountElement(node, script));
}

function autoInit() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), { once: true });
  } else {
    init();
  }
}

const api = {
  init,
  mount: (element: HTMLElement, overrides?: Partial<WidgetConfig>) =>
    mountElement(element, findLoaderScript(), overrides),
};

window.CotizadorWidget = api;
autoInit();

export default api;
