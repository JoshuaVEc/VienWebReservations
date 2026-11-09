import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ApiRequest extends IncomingMessage {
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
}

export type ApiResponse = ServerResponse;

export function getQueryParams(req: ApiRequest): URLSearchParams {
  const urlStr = req.url || '/';
  const qIdx = urlStr.indexOf('?');
  return new URLSearchParams(qIdx >= 0 ? urlStr.slice(qIdx + 1) : '');
}

export async function readJsonBody<T = unknown>(req: ApiRequest): Promise<T> {
  if (req.body && typeof req.body === 'object') {
    return req.body as T;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body) as T;
  }

  return new Promise<T>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve((raw ? JSON.parse(raw) : {}) as T);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export function sendJson(res: ApiResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function getRequestOrigin(req: ApiRequest): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:5173';
  return `${proto}://${host}`;
}
