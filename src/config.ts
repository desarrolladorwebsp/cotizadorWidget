import type { WidgetConfig } from "./types";

const DEFAULT_BASE_URL = "https://cotizadorpremium.cl";
const DEFAULT_AGENT_KEY = "cotizaloantes";

/** Altura inicial del iframe mientras carga (solo placeholder; luego manda el embed). */
export const EMBED_LOADING_HEIGHT = 120;

/** Params de deep-link soportados vía data-* en el contenedor. */
const QUERY_PARAM_KEYS = [
  "region",
  "edad",
  "sexo",
  "ingreso",
  "cargas",
  "q",
  "precioMin",
  "precioMax",
  "isapres",
  "zonas",
  "tipoPlan",
  "coberturaH",
  "coberturaA",
  "orden",
  "moneda",
  "auto",
  "email",
  "plan",
  "vista",
  "nombre",
  "rut",
  "telefono",
] as const;

function readDatasetValue(
  element: HTMLElement,
  script: HTMLScriptElement | null,
  key: string,
): string | undefined {
  const fromElement = element.dataset[key];
  if (fromElement?.trim()) return fromElement.trim();

  const fromScript = script?.dataset[key];
  if (fromScript?.trim()) return fromScript.trim();

  return undefined;
}

function normalizeBaseUrl(raw: string | undefined): string {
  const value = (raw?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  try {
    return new URL(value).origin + new URL(value).pathname.replace(/\/+$/, "");
  } catch {
    return DEFAULT_BASE_URL;
  }
}

function parseMinHeight(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }
  return parsed;
}

function parseFullWidth(
  element: HTMLElement,
  script: HTMLScriptElement | null,
): boolean {
  const raw =
    readDatasetValue(element, script, "fullWidth") ??
    readDatasetValue(element, script, "full-width");
  if (!raw) return true;
  return raw === "true" || raw === "1";
}

function readAgentKey(
  element: HTMLElement,
  script: HTMLScriptElement | null,
  overrides: Partial<WidgetConfig>,
): string {
  return (
    overrides.agentKey ??
    readDatasetValue(element, script, "agentKey") ??
    readDatasetValue(element, script, "agent-key") ??
    overrides.partner ??
    readDatasetValue(element, script, "partner") ??
    DEFAULT_AGENT_KEY
  );
}

function parseMobileScroll(
  element: HTMLElement,
  script: HTMLScriptElement | null,
  overrides: Partial<WidgetConfig>,
): boolean | "auto" {
  if (overrides.mobileScroll !== undefined) {
    return overrides.mobileScroll;
  }

  const raw =
    readDatasetValue(element, script, "mobileScroll") ??
    readDatasetValue(element, script, "mobile-scroll");

  if (!raw) return "auto";
  if (raw === "auto") return "auto";
  if (raw === "false" || raw === "0") return false;
  return raw === "true" || raw === "1";
}

function readRoutingMode(
  element: HTMLElement,
  script: HTMLScriptElement | null,
  overrides: Partial<WidgetConfig>,
): "premium" | "legacy" | undefined {
  const raw =
    overrides.routing ??
    readDatasetValue(element, script, "routing") ??
    readDatasetValue(element, script, "cotizadorRouting");

  if (raw === "premium" || raw === "legacy") return raw;
  return undefined;
}

function buildQueryParams(
  element: HTMLElement,
  script: HTMLScriptElement | null,
): Record<string, string> {
  const query: Record<string, string> = {};

  for (const key of QUERY_PARAM_KEYS) {
    const value = readDatasetValue(element, script, key);
    if (value) {
      query[key] = value;
    }
  }

  const autoSearch = readDatasetValue(element, script, "autoSearch");
  if (autoSearch === "true" || autoSearch === "1") {
    query.auto = "1";
  }

  return query;
}

export function resolveWidgetConfig(
  element: HTMLElement,
  script: HTMLScriptElement | null,
  overrides: Partial<WidgetConfig> = {},
): WidgetConfig {
  const baseUrl = normalizeBaseUrl(
    overrides.baseUrl ??
      readDatasetValue(element, script, "baseUrl") ??
      readDatasetValue(element, script, "cotizadorUrl"),
  );

  const agentKey = readAgentKey(element, script, overrides);
  const partner = overrides.partner ?? agentKey;
  const routing = readRoutingMode(element, script, overrides);

  const minHeight =
    overrides.minHeight ??
    parseMinHeight(readDatasetValue(element, script, "minHeight"));

  const title =
    overrides.title ??
    readDatasetValue(element, script, "title") ??
    "Cotizador de planes de salud";

  const fullWidth =
    overrides.fullWidth ?? parseFullWidth(element, script);

  const mobileScroll = parseMobileScroll(element, script, overrides);

  const query = {
    ...buildQueryParams(element, script),
    ...overrides.query,
  };

  return {
    baseUrl,
    agentKey,
    partner,
    routing,
    minHeight,
    title,
    fullWidth,
    mobileScroll,
    query,
  };
}

export function buildEmbedUrl(config: WidgetConfig): string {
  const premium = config.routing !== "legacy";
  const url = premium
    ? new URL("/cotizador", `${config.baseUrl}/`)
    : new URL(
        config.partner ? `/${encodeURIComponent(config.partner)}` : "/",
        `${config.baseUrl}/`,
      );

  if (premium) {
    url.searchParams.set("agent", config.agentKey);
  }

  url.searchParams.set("embed", "1");

  for (const [key, value] of Object.entries(config.query)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

export function findLoaderScript(): HTMLScriptElement | null {
  const current = document.currentScript;
  if (current instanceof HTMLScriptElement) {
    return current;
  }

  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[src*="cotizador-widget"]',
  );
  return scripts[scripts.length - 1] ?? null;
}

export const WIDGET_SELECTOR = "[data-cotizador-widget]";
