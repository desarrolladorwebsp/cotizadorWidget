/** Protocolo postMessage compartido con cotizador-premium/src/hooks/use-embed-resize.ts */
export const EMBED_MESSAGE_SOURCE = "cotizador-premium" as const;
export const EMBED_RESIZE_MESSAGE = "cotizador-premium:resize" as const;
export const EMBED_READY_MESSAGE = "cotizador-premium:ready" as const;
export const EMBED_EXIT_NAVIGATE_MESSAGE =
  "cotizador-premium:exit-navigate" as const;
export const EMBED_WHEEL_MESSAGE = "cotizador-premium:wheel" as const;

export interface WidgetConfig {
  baseUrl: string;
  /** Agent Key / embed key del socio (data-agent-key). */
  agentKey: string;
  /** Alias legacy de agentKey (data-partner). */
  partner: string;
  /** premium = /cotizador?agent= ; legacy = /{slug}?entidad= */
  routing?: "premium" | "legacy";
  /** Si se define, altura mínima en px (opcional; por defecto el iframe crece con el contenido). */
  minHeight?: number;
  title: string;
  fullWidth: boolean;
  /**
   * true (default): scroll interno 72vh en móvil (legacy).
   * false | "auto": iframe crece; scroll de página (auto permite scroll en iframe solo si falta altura).
   */
  mobileScroll?: boolean | "auto";
  query: Record<string, string>;
}

export interface EmbedResizeMessage {
  type: typeof EMBED_RESIZE_MESSAGE;
  source: typeof EMBED_MESSAGE_SOURCE;
  height: number;
}

export interface EmbedReadyMessage {
  type: typeof EMBED_READY_MESSAGE;
  source: typeof EMBED_MESSAGE_SOURCE;
}

export interface EmbedExitNavigateMessage {
  type: typeof EMBED_EXIT_NAVIGATE_MESSAGE;
  source: typeof EMBED_MESSAGE_SOURCE;
}

export interface EmbedWheelMessage {
  type: typeof EMBED_WHEEL_MESSAGE;
  source: typeof EMBED_MESSAGE_SOURCE;
  deltaY: number;
  deltaX: number;
}

export type EmbedMessage =
  | EmbedResizeMessage
  | EmbedReadyMessage
  | EmbedExitNavigateMessage
  | EmbedWheelMessage;

export interface WidgetInstance {
  destroy: () => void;
}

declare global {
  interface Window {
    CotizadorWidget?: {
      init: (selector?: string) => WidgetInstance[];
      mount: (element: HTMLElement, overrides?: Partial<WidgetConfig>) => WidgetInstance;
    };
  }
}
