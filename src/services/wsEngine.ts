import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

export interface CockfightSocketEvent {
  type: 'ARENAS_UPDATE' | 'PHASE_CHANGE' | 'TICK' | 'GATE_LOCKED' | 'RESULT_ANNOUNCED' | 'VOID_MATCH' | 'STREAM_SWITCH';
  arenaId?: string;
  data: any;
  timestamp: number;
}

export class WebSocketEngine {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  public init(server: HttpServer): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/cockfight'
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      this.clients.add(ws);

      // Send immediate welcome handshake with timestamp
      ws.send(JSON.stringify({
        type: 'HANDSHAKE',
        data: {
          server: 'SBOBET_COCKFIGHT_WS_STREAM',
          version: '2.0.0-REALTIME',
          antiVetLatencyCapMs: 100,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      }));

      ws.on('message', (msg) => {
        try {
          const parsed = JSON.parse(msg.toString());
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          }
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });

    // Heartbeat ping every 15s to keep connections alive on proxy/Render
    this.heartbeatInterval = setInterval(() => {
      this.broadcast({
        type: 'TICK',
        data: { activeConnections: this.clients.size },
        timestamp: Date.now()
      });
    }, 15000);

    console.log('⚡ [WEBSOCKET ENGINE]: Initialized on /ws/cockfight');
  }

  /**
   * Broadcast an event packet in < 1 millisecond to all active student clients
   */
  public broadcast(event: CockfightSocketEvent): void {
    if (!this.wss || this.clients.size === 0) return;
    const payload = JSON.stringify(event);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const wsEngine = new WebSocketEngine();
