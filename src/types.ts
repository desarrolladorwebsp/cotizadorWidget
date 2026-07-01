/** Protocolo postMessage compartido con cotizador-virtual/src/hooks/use-embed-resize.ts */
export const EMBED_MESSAGE_SOURCE = "cotizador-virtual" as const;
export const EMBED_RESIZE_MESSAGE = "cotizador-virtual:resize" as const;
export const EMBED_READY_MESSAGE = "cotizador-virtual:ready" as const;

export interface WidgetConfig {
  baseUrl: string;
  partner: string;
  minHeight: number;
  title: string;
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

export type EmbedMessage = EmbedResizeMessage | EmbedReadyMessage;

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
