import { describe, expect, it } from 'vitest';
import {
  BrowserApprovalManager,
  createPhoneHttpRouter,
  HttpStreamParser,
  serializeHttpResponse,
} from './index.js';

describe('@mm/http-lite', () => {
  it('parses HTTP/1.1 requests split across multiple TCP packets', () => {
    const parser = new HttpStreamParser();
    const bodyJson = '{"deviceName":"Safari on Mac"}';
    const raw =
      'POST /api/pair/request?foo=bar HTTP/1.1\r\n' +
      'Host: 192.168.1.20:8787\r\n' +
      'Content-Type: application/json\r\n' +
      `Content-Length: ${bodyJson.length}\r\n\r\n` +
      bodyJson;

    // Feed in 3 separate slices
    expect(parser.feed(raw.slice(0, 25))).toHaveLength(0);
    expect(parser.feed(raw.slice(25, 95))).toHaveLength(0);
    const reqs = parser.feed(raw.slice(95));
    expect(reqs).toHaveLength(1);
    expect(reqs[0].method).toBe('POST');
    expect(reqs[0].path).toBe('/api/pair/request');
    expect(reqs[0].query.foo).toBe('bar');
    expect(JSON.parse(reqs[0].body)).toEqual({ deviceName: 'Safari on Mac' });
  });

  it('handles "Allow this browser?" approval flow and protects snapshot/sync endpoints', () => {
    const approval = new BrowserApprovalManager({ autoApprove: false });
    const router = createPhoneHttpRouter(approval, {
      getSnapshot: () => ({ hello: 'world' }),
      applySyncPush: (body) => ({ merged: true, received: body }),
    });

    // 1. Unauthenticated snapshot request is rejected with 401
    const unauth = router({
      method: 'GET',
      path: '/api/snapshot',
      query: {},
      headers: {},
      body: '',
    });
    expect(unauth.status).toBe(401);

    // 2. Browser requests permission
    const pairReq = router({
      method: 'POST',
      path: '/api/pair/request',
      query: {},
      headers: { 'user-agent': 'Mozilla/5.0 Macintosh' },
      body: JSON.stringify({ deviceName: 'MacBook Safari' }),
    });
    expect(pairReq.status).toBe(200);
    const pairData = JSON.parse(String(pairReq.body));
    expect(pairData.status).toBe('pending');
    const requestId = pairData.requestId;

    // 3. Phone lists pending requests and user taps "Allow"
    expect(approval.listPendingRequests()).toHaveLength(1);
    approval.approve(requestId);
    expect(approval.listPendingRequests()).toHaveLength(0);

    // 4. Browser polls status and receives session token
    const statusRes = router({
      method: 'GET',
      path: '/api/pair/status',
      query: { requestId },
      headers: {},
      body: '',
    });
    const statusData = JSON.parse(String(statusRes.body));
    expect(statusData.status).toBe('approved');
    expect(statusData.token).toBeTruthy();

    // 5. Browser fetches snapshot using token
    const snapRes = router({
      method: 'GET',
      path: '/api/snapshot',
      query: {},
      headers: { authorization: `Bearer ${statusData.token}` },
      body: '',
    });
    expect(snapRes.status).toBe(200);
    expect(JSON.parse(String(snapRes.body))).toEqual({ hello: 'world' });

    // 6. Serialize HTTP response check
    const wireBytes = serializeHttpResponse(snapRes);
    const wireText = new TextDecoder().decode(wireBytes);
    expect(wireText).toContain('HTTP/1.1 200 OK');
    expect(wireText).toContain('Cache-Control: no-store');
  });
});
