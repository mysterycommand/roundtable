export const search = (params: Record<string, string>): URLSearchParams =>
  new URLSearchParams(params);

export const href = (url: string, params?: Record<string, string>): string =>
  new URL(`${url}${params ? `?${search(params)}` : ''}`).href;

export const ws = (url: string, params?: Record<string, string>): WebSocket =>
  new WebSocket(href(url, params));

export const isConnecting = (ws: WebSocket): boolean =>
  ws.readyState === WebSocket.CONNECTING;

export const isOpen = (ws: WebSocket): boolean =>
  ws.readyState === WebSocket.OPEN;

export const isClosing = (ws: WebSocket): boolean =>
  ws.readyState === WebSocket.CLOSING;

export const isClosed = (ws: WebSocket): boolean =>
  ws.readyState === WebSocket.CLOSED;

export const el = <E extends Element = Element>(selectors: string): E | null =>
  document.querySelector(selectors);
