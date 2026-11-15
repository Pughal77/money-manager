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
 * Pure-JS safe UTF-8 encoder/decoder so React Native (Hermes on iOS) works
 * even when global TextEncoder / TextDecoder are unavailable.
 */
export function encodeUtf8(str: string): Uint8Array {
  if (typeof globalThis.TextEncoder !== 'undefined') {
    return new globalThis.TextEncoder().encode(str);
  }
  const utf8: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    } else {
      i++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }
  return new Uint8Array(utf8);
}

export function decodeUtf8(bytes: Uint8Array): string {
  if (typeof globalThis.TextDecoder !== 'undefined') {
    return new globalThis.TextDecoder('utf-8').decode(bytes);
  }
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const c = bytes[i++];
    if (c < 128) {
      out += String.fromCharCode(c);
    } else if (c > 191 && c < 224) {
      const c2 = bytes[i++];
      out += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
    } else if (c > 239 && c < 365) {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      const c4 = bytes[i++];
      const u =
        (((c & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) -
        0x10000;
      out += String.fromCharCode(0xd800 + (u >> 10));
      out += String.fromCharCode(0xdc00 + (u & 1023));
    } else {
      const c2 = bytes[i++];
      const c3 = bytes[i++];
      out += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
    }
  }
  return out;
}

/**
 * Stateful streaming HTTP/1.1 request parser for raw TCP sockets.
 * Handles requests split across multiple TCP packets as well as multiple pipelined requests.
 */
export class HttpStreamParser {
  private buffer = '';

  public feed(chunk: string | Uint8Array): HttpRequest[] {
    const str = typeof chunk === 'string' ? chunk : decodeUtf8(chunk);
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

      const remainingStr = this.buffer.slice(bodyStart);
      const remainingBytes = encodeUtf8(remainingStr);
      if (remainingBytes.byteLength < contentLength) {
        // Wait for more TCP chunks
        break;
      }

      const bodyBytes = remainingBytes.slice(0, contentLength);
      const body = decodeUtf8(bodyBytes);
      const leftoverBytes = remainingBytes.slice(contentLength);
      this.buffer = decodeUtf8(leftoverBytes);

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
        ? encodeUtf8(res.body)
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

  const headerBytes = encodeUtf8(headerStr);
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
