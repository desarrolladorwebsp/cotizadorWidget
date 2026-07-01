import type { WidgetConfig } from "./types";

const DEFAULT_BASE_URL = "https://cotizador.cotizaloantes.cl";
const DEFAULT_PARTNER = "cotizaloantes";
const DEFAULT_MIN_HEIGHT = 720;

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

function parseMinHeight(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 320) {
    return DEFAULT_MIN_HEIGHT;
  }
  return parsed;
}

function buildQueryParams(element: HTMLElement, script: HTMLScriptElement | null): Record<string, string> {
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

  const partner =
    overrides.partner ??
    readDatasetValue(element, script, "partner") ??
    DEFAULT_PARTNER;

  const minHeight =
    overrides.minHeight ??
    parseMinHeight(readDatasetValue(element, script, "minHeight"));

  const title =
    overrides.title ??
    readDatasetValue(element, script, "title") ??
    "Cotizador de planes de salud";

  const query = {
    ...buildQueryParams(element, script),
    ...overrides.query,
  };

  return { baseUrl, partner, minHeight, title, query };
}

export function buildEmbedUrl(config: WidgetConfig): string {
  const path = config.partner ? `/embed/${encodeURIComponent(config.partner)}` : "/embed";
  const url = new URL(path, `${config.baseUrl}/`);
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
