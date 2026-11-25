import { dbStore } from '../db/store.js';

export interface MikroTikSecret {
  name: string; // PPPoE username
  password: string; // password
  service: string; // "pppoe"
  profile: string; // e.g. "profile-fiber-100m"
  remoteAddress?: string;
  callerId?: string;
  disabled: boolean;
  comment?: string;
}

export interface MikroTikActiveSession {
  id: string;
  user: string;
  address: string;
  callerId: string; // MAC address
  uptime: string;
  bytesIn: number;
  bytesOut: number;
}

// In-Memory Simulated RouterOS state per router
interface RouterSimState {
  secrets: Map<string, MikroTikSecret>;
  activeSessions: Map<string, MikroTikActiveSession>;
  trafficStats: { rxBps: number; txBps: number };
}

export class MikroTikService {
  private static simRouters: Map<string, RouterSimState> = new Map();

  private static getSimState(routerId: string): RouterSimState {
    if (!this.simRouters.has(routerId)) {
      const state: RouterSimState = {
        secrets: new Map(),
        activeSessions: new Map(),
        trafficStats: { rxBps: 245000000, txBps: 185000000 },
      };

      // Populate initial subscribers from dbStore
      for (const cust of dbStore.customers) {
        if (cust.pppoeUsername) {
          state.secrets.set(cust.pppoeUsername, {
            name: cust.pppoeUsername,
            password: 'secret_hash_demo',
            service: 'pppoe',
            profile: cust.planName.toLowerCase().replace(/\s+/g, '-'),
            remoteAddress: cust.ipAddress,
            callerId: cust.macAddress,
            disabled: cust.status === 'SUSPENDED' || cust.status === 'DISCONNECTED',
            comment: `NSMISP Subscriber: ${cust.code} (${cust.fullName})`,
          });

          if (cust.status === 'ACTIVE') {
            state.activeSessions.set(cust.pppoeUsername, {
              id: `*${Math.floor(Math.random() * 10000).toString(16)}`,
              user: cust.pppoeUsername,
              address: cust.ipAddress,
              callerId: cust.macAddress,
              uptime: '3d 14h 22m',
              bytesIn: Math.floor(Math.random() * 50000000000),
              bytesOut: Math.floor(Math.random() * 80000000000),
            });
          }
        }
      }

      this.simRouters.set(routerId, state);
    }
    return this.simRouters.get(routerId)!;
  }

  // 1. Connection Test
  static async testConnection(routerId: string): Promise<{ success: boolean; latencyMs: number; osVersion: string; cpuLoad: number }> {
    const router = dbStore.routers.find((r) => r.id === routerId);
    if (!router) throw new Error(`Router ${routerId} not found`);

    // Simulate authentic MikroTik RouterOS API handshake
    await new Promise((res) => setTimeout(res, 50));
    return {
      success: true,
      latencyMs: Math.floor(Math.random() * 4) + 1,
      osVersion: router.osVersion || 'RouterOS v7.14.2',
      cpuLoad: router.cpuUsage,
    };
  }

  // 2. PPPoE Secret Provisioning
  static async provisionPPPoEAccount(routerId: string, secret: MikroTikSecret): Promise<{ success: boolean; message: string }> {
    const router = dbStore.routers.find((r) => r.id === routerId);
    if (!router) throw new Error(`Router ${routerId} not found`);

    const state = this.getSimState(routerId);
    state.secrets.set(secret.name, secret);

    // If active and not disabled, register active session
    if (!secret.disabled) {
      state.activeSessions.set(secret.name, {
        id: `*${Math.floor(Math.random() * 10000).toString(16)}`,
        user: secret.name,
        address: secret.remoteAddress || '10.20.1.100',
        callerId: secret.callerId || '48:8F:5A:00:11:22',
        uptime: '0s',
        bytesIn: 0,
        bytesOut: 0,
      });
    }

    dbStore.logAudit('MIKROTIK_PROVISION', 'Router', routerId, `Provisioned PPPoE account ${secret.name} on router ${router.name}`);
    return { success: true, message: `PPPoE subscriber ${secret.name} provisioned successfully on ${router.name}` };
  }

  // 3. Suspend Subscriber (Disables secret and terminates active session)
  static async suspendSubscriber(routerId: string, username: string, reason: string): Promise<{ success: boolean; message: string }> {
    const state = this.getSimState(routerId);
    const secret = state.secrets.get(username);
    if (secret) {
      secret.disabled = true;
      secret.comment = `SUSPENDED: ${reason} at ${new Date().toISOString()}`;
    }

    // Drop active PPPoE session instantly
    state.activeSessions.delete(username);

    dbStore.logAudit('MIKROTIK_SUSPEND', 'PPPoEAccount', username, `Suspended PPPoE subscriber ${username} on router ${routerId}. Reason: ${reason}`);
    return { success: true, message: `Subscriber ${username} suspended and kicked from active sessions` };
  }

  // 4. Reconnect Subscriber
  static async reconnectSubscriber(routerId: string, username: string): Promise<{ success: boolean; message: string }> {
    const state = this.getSimState(routerId);
    const secret = state.secrets.get(username);
    if (secret) {
      secret.disabled = false;
      secret.comment = `RECONNECTED at ${new Date().toISOString()}`;
      state.activeSessions.set(username, {
        id: `*${Math.floor(Math.random() * 10000).toString(16)}`,
        user: username,
        address: secret.remoteAddress || '10.20.1.100',
        callerId: secret.callerId || '48:8F:5A:00:11:22',
        uptime: '1m',
        bytesIn: 1024,
        bytesOut: 2048,
      });
    }

    dbStore.logAudit('MIKROTIK_RECONNECT', 'PPPoEAccount', username, `Reconnected subscriber ${username} on router ${routerId}`);
    return { success: true, message: `Subscriber ${username} enabled and connection restored` };
  }

  // 5. Change Speed Profile / Rate Limit
  static async updateSpeedProfile(routerId: string, username: string, profileName: string): Promise<{ success: boolean }> {
    const state = this.getSimState(routerId);
    const secret = state.secrets.get(username);
    if (secret) {
      secret.profile = profileName;
    }
    dbStore.logAudit('MIKROTIK_PROFILE_CHANGE', 'PPPoEAccount', username, `Updated rate profile to ${profileName}`);
    return { success: true };
  }

  // 6. Get Active Sessions
  static async getActiveSessions(routerId: string): Promise<MikroTikActiveSession[]> {
    const state = this.getSimState(routerId);
    return Array.from(state.activeSessions.values());
  }

  // 7. Get Real-Time Bandwidth & Resource Metrics
  static async getRouterMetrics(routerId: string) {
    const router = dbStore.routers.find((r) => r.id === routerId);
    if (!router) throw new Error(`Router not found`);

    const state = this.getSimState(routerId);
    const jitter = Math.floor(Math.random() * 20000000) - 10000000;
    const currentRx = Math.max(50000000, state.trafficStats.rxBps + jitter);
    const currentTx = Math.max(40000000, state.trafficStats.txBps + jitter);

    return {
      routerId: router.id,
      name: router.name,
      cpuUsage: Math.floor(Math.random() * 10) + 12,
      memoryUsage: 34,
      uptimeSeconds: router.uptimeSeconds + 120,
      activePPPoESessions: state.activeSessions.size,
      downloadBps: currentRx,
      uploadBps: currentTx,
      downloadGbps: (currentRx / 1000000000).toFixed(3),
      uploadGbps: (currentTx / 1000000000).toFixed(3),
    };
  }

  // 8. Reboot Router
  static async rebootRouter(routerId: string): Promise<{ success: boolean; message: string }> {
    const router = dbStore.routers.find((r) => r.id === routerId);
    if (!router) throw new Error(`Router not found`);

    router.status = 'ONLINE';
    router.uptimeSeconds = 0;
    dbStore.logAudit('MIKROTIK_REBOOT', 'Router', routerId, `Initiated controlled software restart on ${router.name}`);
    return { success: true, message: `Router ${router.name} reboot command issued successfully` };
  }
}
