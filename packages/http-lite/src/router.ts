import { BrowserApprovalManager } from './approval';
import { jsonResponse, type HttpRequest, type HttpResponse } from './parser';

export interface PhoneApiHandlers {
  getSnapshot: () => unknown;
  applySyncPush: (body: unknown, deviceName: string) => unknown;
  getStaticAsset?: (path: string) => HttpResponse | undefined;
}

/**
 * Platform-independent HTTP router for the phone's local network server.
 * Used identically by both the real iPhone (`react-native-tcp-socket`) and `apps/phone-sim` (`node:net`).
 */
export function createPhoneHttpRouter(
  approval: BrowserApprovalManager,
  handlers: PhoneApiHandlers
): (req: HttpRequest) => HttpResponse {
  return (req: HttpRequest): HttpResponse => {
    if (req.method === 'OPTIONS') {
      return { status: 204 };
    }

    try {
      // 1. Health check / server info
      if (req.method === 'GET' && req.path === '/api/ping') {
        return jsonResponse(200, { ok: true, role: 'iphone-master' });
      }

      // 2. Browser requests permission ("Allow this browser?" prompt on phone)
      if (req.method === 'POST' && req.path === '/api/pair/request') {
        const payload = req.body ? JSON.parse(req.body) : {};
        const record = approval.requestApproval(
          String(payload.deviceName ?? 'Web Browser'),
          req.headers['user-agent'] ?? ''
        );
        return jsonResponse(200, {
          requestId: record.requestId,
          status: record.status,
          token: record.token,
        });
      }

      // 3. Browser polls whether user tapped "Allow" on the phone
      if (req.method === 'GET' && req.path === '/api/pair/status') {
        const requestId = req.query.requestId ?? '';
        const record = approval.getRequest(requestId);
        if (!record) {
          return jsonResponse(404, { error: 'Approval request not found' });
        }
        return jsonResponse(200, {
          requestId: record.requestId,
          status: record.status,
          token: record.status === 'approved' ? record.token : undefined,
        });
      }

      // 4. Protected routes: require valid session token
      const tokenHeader = req.headers['authorization'] ?? req.query.token;
      const auth = approval.validateToken(tokenHeader);

      if (req.method === 'GET' && req.path === '/api/snapshot') {
        if (!auth.valid) {
          return jsonResponse(401, { error: 'Unauthorized: Browser not approved on phone' });
        }
        approval.addLog(auth.deviceName ?? 'Browser', 'Loaded initial snapshot');
        return jsonResponse(200, handlers.getSnapshot());
      }

      if (req.method === 'POST' && req.path === '/api/sync') {
        if (!auth.valid) {
          return jsonResponse(401, { error: 'Unauthorized: Browser not approved on phone' });
        }
        const body = req.body ? JSON.parse(req.body) : {};
        const result = handlers.applySyncPush(body, auth.deviceName ?? 'Browser');
        return jsonResponse(200, result);
      }

      // 5. Static web app assets (when served directly from the phone)
      if (req.method === 'GET' && handlers.getStaticAsset) {
        const asset = handlers.getStaticAsset(req.path);
        if (asset) return asset;
      }

      return jsonResponse(404, { error: `Not found: ${req.method} ${req.path}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return jsonResponse(400, { error: message });
    }
  };
}
