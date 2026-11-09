export interface BrowserApprovalRequest {
  requestId: string;
  deviceName: string;
  userAgent: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
  token?: string;
}

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  deviceName: string;
  message: string;
}

export interface ApprovalManagerOptions {
  /**
   * If true, automatically approves incoming browser requests (handy for automated tests or headless sim).
   */
  autoApprove?: boolean;
  onUpdate?: () => void;
}

/**
 * Manages the "Allow this browser?" prompt queue and active session tokens on the phone.
 */
export class BrowserApprovalManager {
  private requests = new Map<string, BrowserApprovalRequest>();
  private tokens = new Map<string, { deviceName: string; approvedAt: string }>();
  private logs: SyncLogEntry[] = [];
  private autoApprove: boolean;
  private onUpdate?: () => void;

  constructor(options?: ApprovalManagerOptions) {
    this.autoApprove = options?.autoApprove ?? false;
    this.onUpdate = options?.onUpdate;
  }

  public setAutoApprove(auto: boolean): void {
    this.autoApprove = auto;
  }

  public requestApproval(deviceName: string, userAgent: string = ''): BrowserApprovalRequest {
    const requestId = this.randomHex(12);
    const req: BrowserApprovalRequest = {
      requestId,
      deviceName: deviceName.trim() || 'Browser on Local Network',
      userAgent,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };

    if (this.autoApprove) {
      const token = this.randomHex(24);
      req.status = 'approved';
      req.token = token;
      this.tokens.set(token, { deviceName: req.deviceName, approvedAt: new Date().toISOString() });
      this.addLog(req.deviceName, 'Browser auto-approved and connected');
    } else {
      this.addLog(req.deviceName, 'Requested permission to connect ("Allow this browser?")');
    }

    this.requests.set(requestId, req);
    this.onUpdate?.();
    return req;
  }

  public approve(requestId: string): BrowserApprovalRequest | undefined {
    const req = this.requests.get(requestId);
    if (!req) return undefined;
    const token = req.token ?? this.randomHex(24);
    req.status = 'approved';
    req.token = token;
    this.tokens.set(token, { deviceName: req.deviceName, approvedAt: new Date().toISOString() });
    this.addLog(req.deviceName, 'Allowed by user on phone');
    this.onUpdate?.();
    return req;
  }

  public deny(requestId: string): BrowserApprovalRequest | undefined {
    const req = this.requests.get(requestId);
    if (!req) return undefined;
    req.status = 'denied';
    this.addLog(req.deviceName, 'Connection denied on phone');
    this.onUpdate?.();
    return req;
  }

  public getRequest(requestId: string): BrowserApprovalRequest | undefined {
    return this.requests.get(requestId);
  }

  public listPendingRequests(): BrowserApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.status === 'pending');
  }

  public listApprovedDevices(): Array<{ token: string; deviceName: string; approvedAt: string }> {
    return Array.from(this.tokens.entries()).map(([token, info]) => ({
      token,
      ...info,
    }));
  }

  public revokeToken(token: string): void {
    const info = this.tokens.get(token);
    if (info) {
      this.tokens.delete(token);
      this.addLog(info.deviceName, 'Disconnected / revoked session');
      this.onUpdate?.();
    }
  }

  public validateToken(token: string | undefined): { valid: boolean; deviceName?: string } {
    if (!token) return { valid: false };
    const clean = token.replace(/^Bearer\s+/i, '').trim();
    const info = this.tokens.get(clean);
    if (!info) return { valid: false };
    return { valid: true, deviceName: info.deviceName };
  }

  public addLog(deviceName: string, message: string): void {
    this.logs.unshift({
      id: this.randomHex(8),
      timestamp: new Date().toISOString(),
      deviceName,
      message,
    });
    if (this.logs.length > 50) {
      this.logs.length = 50;
    }
    this.onUpdate?.();
  }

  public getLogs(): SyncLogEntry[] {
    return [...this.logs];
  }

  private randomHex(bytesLen: number): string {
    const arr = new Uint8Array(bytesLen);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < bytesLen; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
