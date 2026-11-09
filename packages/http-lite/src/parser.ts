export interface HttpRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string;
}

export interface HttpResponse {
  status: number;
  headers?: Record<string, string>;
  body?: string | Uint8Array;
}

const MAX_BUFFER_BYTES = 8 * 1024 * 1024; // 8 MB max payload

const STATUS_TEXT: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  413: 'Payload Too Large',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

/**
 * Stateful streaming HTTP/1.1 request parser for raw TCP sockets.
 * Handles requests split across multiple TCP packets as well as multiple pipelined requests.
 */
export class HttpStreamParser {
  private buffer = '';

  public feed(chunk: string | Uint8Array): HttpRequest[] {
    const str =
      typeof chunk === 'string' ? chunk : new TextDecoder('utf-8').decode(chunk);
    this.buffer += str;

    if (this.buffer.length > MAX_BUFFER_BYTES) {
      this.buffer = '';
      throw new Error('Payload Too Large');
    }

    const requests: HttpRequest[] = [];

    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const headerBlock = this.buffer.slice(0, headerEnd);
      const lines = headerBlock.split('\r\n');
      const requestLine = lines[0] ?? '';
      const [method = 'GET', rawTarget = '/'] = requestLine.split(' ');

      const headers: Record<string, string> = {};
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim().toLowerCase();
          const val = line.slice(colonIdx + 1).trim();
          headers[key] = val;
        }
      }

      const contentLength = Number(headers['content-length'] ?? '0');
      const bodyStart = headerEnd + 4;

      // Note: string length vs byte length approximation; for UTF-8 JSON we check UTF-8 byte length
      const remainingStr = this.buffer.slice(bodyStart);
      const remainingBytes = new TextEncoder().encode(remainingStr);
      if (remainingBytes.byteLength < contentLength) {
        // Wait for more TCP chunks
        break;
      }

      const bodyBytes = remainingBytes.slice(0, contentLength);
      const body = new TextDecoder('utf-8').decode(bodyBytes);
      const leftoverBytes = remainingBytes.slice(contentLength);
      this.buffer = new TextDecoder('utf-8').decode(leftoverBytes);

      const [pathPart, queryPart = ''] = rawTarget.split('?');
      const query: Record<string, string> = {};
      if (queryPart) {
        const params = new URLSearchParams(queryPart);
        params.forEach((v, k) => {
          query[k] = v;
        });
      }

      requests.push({
        method: method.toUpperCase(),
        path: pathPart || '/',
        query,
        headers,
        body,
      });
    }

    return requests;
  }
}

export function serializeHttpResponse(res: HttpResponse): Uint8Array {
  const statusText = STATUS_TEXT[res.status] ?? 'OK';
  const bodyBytes =
    res.body === undefined
      ? new Uint8Array(0)
      : typeof res.body === 'string'
        ? new TextEncoder().encode(res.body)
        : res.body;

  const headers: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Connection: 'close',
    ...res.headers,
    'Content-Length': String(bodyBytes.byteLength),
  };

  let headerStr = `HTTP/1.1 ${res.status} ${statusText}\r\n`;
  for (const [k, v] of Object.entries(headers)) {
    headerStr += `${k}: ${v}\r\n`;
  }
  headerStr += '\r\n';

  const headerBytes = new TextEncoder().encode(headerStr);
  const combined = new Uint8Array(headerBytes.byteLength + bodyBytes.byteLength);
  combined.set(headerBytes, 0);
  combined.set(bodyBytes, headerBytes.byteLength);
  return combined;
}

export function jsonResponse(status: number, data: unknown): HttpResponse {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data),
  };
}
