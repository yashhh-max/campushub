/**
 * CampusHub Real-Time WebSocket Client Utility.
 * Supports auto-reconnect with exponential backoff, ping/pong heartbeats,
 * and typed message handling.
 */

export function getWebSocketBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL.replace(/\/$/, "");
  }
  if (typeof window === "undefined") {
    return "ws://127.0.0.1:8000";
  }
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  try {
    const url = new URL(apiBase);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${url.host}`;
  } catch {
    return "ws://127.0.0.1:8000";
  }
}

export interface WebSocketClientOptions {
  path: string;
  token?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  autoReconnect?: boolean;
  maxReconnectDelay?: number;
}

export class CampusWebSocketClient {
  private ws: WebSocket | null = null;
  private options: WebSocketClientOptions;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 10000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private isExplicitlyClosed = false;

  constructor(options: WebSocketClientOptions) {
    this.options = options;
    if (options.maxReconnectDelay) {
      this.maxReconnectDelay = options.maxReconnectDelay;
    }
  }

  public connect(): void {
    if (typeof window === "undefined") return;
    this.isExplicitlyClosed = false;

    const baseUrl = getWebSocketBaseUrl();
    const tokenParam = this.options.token
      ? `?token=${encodeURIComponent(this.options.token)}`
      : "";
    const fullUrl = `${baseUrl}${this.options.path}${tokenParam}`;

    try {
      this.ws = new WebSocket(fullUrl);

      this.ws.onopen = () => {
        this.reconnectDelay = 1000;
        this.startHeartbeat();
        if (this.options.onOpen) {
          this.options.onOpen();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === "pong") return;
          if (this.options.onMessage) {
            this.options.onMessage(parsed);
          }
        } catch {
          // ignore non-json messages
        }
      };

      this.ws.onerror = (event) => {
        if (this.options.onError) {
          this.options.onError(event);
        }
      };

      this.ws.onclose = (event) => {
        this.stopHeartbeat();
        if (this.options.onClose) {
          this.options.onClose(event);
        }

        if (
          !this.isExplicitlyClosed &&
          (this.options.autoReconnect ?? true) &&
          event.code !== 4001 && // don't reconnect if unauthenticated
          event.code !== 4003    // don't reconnect if unauthorized
        ) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public send(payload: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, "Client closed connection");
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}
