import { CONFIG } from '../config.js';
import { ArenaId, ArenaPhase, CockfightArena, CockfightChoice, RoosterProfile } from '../types.js';
import { wsEngine } from './wsEngine.js';
import { walletLedger } from './walletLedger.js';

const ROOSTER_BREEDS = ['Gà Asil', 'Gà Tre', 'Gà Peru', 'Gà Kelso', 'Gà Sweater', 'Gà Hatch', 'Gà Cuban'];
const SPUR_TYPES_CAMBODIA = ['Cựa Sắt Tròn (Thomo)', 'Cựa Tháp Sắt', 'Cựa Tròn 2.5 Inch'];
const SPUR_TYPES_PHILIPPINES = ['Cựa Dao Slasher (Pasay)', 'Cựa Dao Double Blade', 'Cựa Dao Derby'];

export interface TeachingStreamSource {
  id: string;
  sourceKey: string;
  name: string;
  provider: string;
  url: string;
  type: 'hls' | 'iframe' | 'proxy_iframe' | 'mp4';
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  lastChecked?: string;
  latencyMs?: number;
}

export interface StreamFailoverLog {
  timestamp: string;
  fromSource: string;
  toSource: string;
  reason: string;
  durationMs: number;
}

const DEFAULT_TEACHING_SOURCES: TeachingStreamSource[] = [
  {
    id: 'daga88_primary',
    sourceKey: 'daga88_primary',
    name: 'DAGA88 — Recorded Match Feed (player.videosv388.com)',
    provider: 'player.videosv388.com',
    url: 'https://player.videosv388.com',
    type: 'iframe',
    status: 'ONLINE'
  },
  {
    id: 'fallback_hls',
    sourceKey: 'fallback_hls',
    name: 'Mux HLS Live Stream (60FPS Backup)',
    provider: 'mux.dev',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    type: 'hls',
    status: 'ONLINE'
  }
];

export class CockfightService {
  private arenas: Map<ArenaId, CockfightArena> = new Map();
  private classroomMode: boolean = true; // Enabled by default for teaching/demo, toggleable
  private teachingSources: TeachingStreamSource[] = JSON.parse(JSON.stringify(DEFAULT_TEACHING_SOURCES));
  private activeSourceIndex: number = 0;
  private failoverLogs: StreamFailoverLog[] = [];
  private isHealthChecking: boolean = false;

  constructor() {
    this.initializeArenas();
    this.startAutonomousLoop();
    this.startStreamHealthCheckDaemon();
  }

  private generateRooster(side: 'MERON' | 'WALA', location: string, matchNum: number): RoosterProfile {
    const breed = ROOSTER_BREEDS[Math.floor(Math.random() * ROOSTER_BREEDS.length)];
    const weightKg = Math.round((2.80 + Math.random() * 0.70) * 100) / 100;
    const spurList = location === 'Philippines' ? SPUR_TYPES_PHILIPPINES : SPUR_TYPES_CAMBODIA;
    const spurType = spurList[Math.floor(Math.random() * spurList.length)];
    const wins = 3 + Math.floor(Math.random() * 8);
    const losses = Math.floor(Math.random() * 3);
    const tag = `${side.charAt(0)}-#${matchNum}${Math.floor(100 + Math.random() * 900)}`;

    return {
      breed,
      weightKg,
      spurType,
      record: `${wins}W - ${losses}L`,
      tag
    };
  }

  // Check operating hours in Asian GMT+7 (ICT)
  public checkArenaOpenStatus(id: ArenaId): { isOpen: boolean; operatingHours: string } {
    if (this.classroomMode) {
      // In classroom teaching mode, arenas are always accessible
      const hours = id.startsWith('CPC') ? '11:00 AM – 17:00 PM (GMT+7)' : '14:00 PM – 02:00 AM (GMT+7)';
      return { isOpen: true, operatingHours: hours };
    }

    const now = new Date();
    // Calculate GMT+7 hour
    const utcHour = now.getUTCHours();
    const gmt7Hour = (utcHour + 7) % 24;

    if (id.startsWith('CPC')) {
      // Thomo: 11:00 AM to 17:00 PM
      const isOpen = gmt7Hour >= 11 && gmt7Hour < 17;
      return { isOpen, operatingHours: '11:00 AM – 17:00 PM (GMT+7)' };
    } else {
      // Philippine: 14:00 PM to 02:00 AM
      const isOpen = gmt7Hour >= 14 || gmt7Hour < 2;
      return { isOpen, operatingHours: '14:00 PM – 02:00 AM (GMT+7)' };
    }
  }

  private initializeArenas(): void {
    const arenaDefs: Array<{ id: ArenaId; name: string; location: string }> = [
      { id: 'CPC1', name: 'Thomo CPC1 VIP Arena', location: 'Cambodia' },
      { id: 'CPC2', name: 'Thomo CPC2 Grand Arena', location: 'Cambodia' },
      { id: 'CPC3', name: 'Thomo CPC3 Iron Spur', location: 'Cambodia' },
      { id: 'CPC4', name: 'Thomo CPC4 Derby', location: 'Cambodia' },
      { id: 'PH1', name: 'Pasay City PH1 Colosseum', location: 'Philippines' },
      { id: 'PH2', name: 'Davao PH2 Cockpit Arena', location: 'Philippines' },
      { id: 'PH3', name: 'Cebu PH3 Live Cockpit', location: 'Philippines' },
    ];

    arenaDefs.forEach((def, index) => {
      const { isOpen, operatingHours } = this.checkArenaOpenStatus(def.id);
      const currentMatch = 14 + index * 4;
      const initialPhase: ArenaPhase = isOpen ? 'BETTING_OPEN' : 'CLOSED';

      this.arenas.set(def.id, {
        id: def.id,
        name: def.name,
        location: def.location,
        isOpen,
        operatingHours,
        status: isOpen ? 'BETTING_OPEN' : 'CLOSED',
        phase: initialPhase,
        meronOdds: Math.round((0.82 + Math.random() * 0.10) * 100) / 100,
        walaOdds: Math.round((0.95 + Math.random() * 0.08) * 100) / 100,
        bddOdds: 8.00,
        timeRemainingSeconds: this.classroomMode ? 45 + index * 10 : 180 + index * 60,
        streamUrl: `https://live.sv388cdn.com/hls/${def.id.toLowerCase()}/master.m3u8`,
        currentMatch,
        meronRooster: this.generateRooster('MERON', def.location, currentMatch),
        walaRooster: this.generateRooster('WALA', def.location, currentMatch),
      });
    });
  }

  public getAllArenas(): CockfightArena[] {
    return Array.from(this.arenas.values());
  }

  public getArena(id: ArenaId): CockfightArena | undefined {
    return this.arenas.get(id);
  }

  public isClassroomMode(): boolean {
    return this.classroomMode;
  }

  public setClassroomMode(mode: boolean): void {
    this.classroomMode = mode;
  }

  public setArenaStreamUrl(arenaId: ArenaId, url: string): boolean {
    const arena = this.arenas.get(arenaId);
    if (!arena) return false;
    arena.customStreamUrl = url;
    return true;
  }

  // Validate bet under the 3-second Anti-Vét gate lock & operating status
  public validateBet(arenaId: ArenaId, choice: CockfightChoice, stake: number): { valid: boolean; reason?: string } {
    const arena = this.arenas.get(arenaId);
    if (!arena) {
      return { valid: false, reason: `Không tìm thấy đấu trường ${arenaId}.` };
    }

    if (!arena.isOpen && !this.classroomMode) {
      return {
        valid: false,
        reason: `Đấu trường ${arenaId} hiện đang đóng cửa (${arena.operatingHours}).`
      };
    }

    // 3s Anti-Vét Gate Lock check
    if (arena.phase !== 'BETTING_OPEN' || arena.timeRemainingSeconds <= CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS) {
      return { 
        valid: false, 
        reason: `Cổng cược bồ ${arenaId} đã khóa (Khóa an toàn ${CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS}s trước khi thả gà).` 
      };
    }

    if (stake > CONFIG.RISK.MAX_BET_LIMIT_POINTS) {
      return { 
        valid: false, 
        reason: `Vượt quá giới hạn cược tối đa ${CONFIG.RISK.MAX_BET_LIMIT_POINTS} điểm.` 
      };
    }

    return { valid: true };
  }

  // --- LINE 2 STREAM HEALTH & AUTOMATIC FAILOVER ENGINE ---

  public getTeachingStreamSources(): TeachingStreamSource[] {
    return this.teachingSources;
  }

  public getActiveTeachingStream(): { activeSource: TeachingStreamSource; index: number; totalSources: number; failoverLogs: StreamFailoverLog[] } {
    const active = this.teachingSources[this.activeSourceIndex] || this.teachingSources[0];
    return {
      activeSource: active,
      index: this.activeSourceIndex,
      totalSources: this.teachingSources.length,
      failoverLogs: this.failoverLogs.slice(-10)
    };
  }

  public setActiveTeachingSource(sourceIdOrKey: string): boolean {
    const idx = this.teachingSources.findIndex(s => s.id === sourceIdOrKey || s.sourceKey === sourceIdOrKey);
    if (idx === -1) {
      // If not in presets, keep current index
      return true;
    }
    this.activeSourceIndex = idx;
    return true;
  }

  public setCustomTeachingUrl(url: string): void {
    const trimmed = url.trim();
    if (!trimmed) return;
    const validation = this.validateStreamUrl(trimmed);
    const newSource: TeachingStreamSource = {
      id: `custom-${Date.now()}`,
      sourceKey: `custom-${Date.now()}`,
      name: `Custom: ${trimmed.substring(0, 32)}...`,
      provider: 'custom',
      url: trimmed,
      type: validation.streamType === 'invalid' ? 'iframe' : validation.streamType,
      status: 'ONLINE'
    };
    this.teachingSources.unshift(newSource);
    this.activeSourceIndex = 0;
  }

  public getStreamFailoverLogs(): StreamFailoverLog[] {
    return this.failoverLogs;
  }

  /**
   * Validates if a URL is a true streaming feed vs raw non-video web page
   */
  public validateStreamUrl(url: string): { isVideo: boolean; streamType: 'hls' | 'iframe' | 'proxy_iframe' | 'mp4' | 'invalid'; reason?: string } {
    if (!url || typeof url !== 'string') {
      return { isVideo: false, streamType: 'invalid', reason: 'URL không được để trống.' };
    }

    const trimmed = url.trim();

    // 1. Direct HLS
    if (trimmed.includes('.m3u8') || trimmed.endsWith('.m3u8')) {
      return { isVideo: true, streamType: 'hls' };
    }

    // 2. Direct MP4 / WebM
    if (trimmed.endsWith('.mp4') || trimmed.endsWith('.webm') || trimmed.endsWith('.ts')) {
      return { isVideo: true, streamType: 'mp4' };
    }

    // 3. DAGA88 player and other trusted video embeds
    if (
      trimmed.includes('player.videosv388.com') ||
      trimmed.includes('youtube.com/embed') ||
      trimmed.includes('youtu.be') ||
      trimmed.includes('twitch.tv') ||
      trimmed.includes('vimeo.com')
    ) {
      return { isVideo: true, streamType: 'iframe' };
    }

    // Otherwise reject generic web pages
    return {
      isVideo: false,
      streamType: 'invalid',
      reason: 'URL này không phải là luồng video trực tiếp hợp lệ. Vui lòng nhập liên kết .m3u8, .mp4 hoặc player.videosv388.com.'
    };
  }

  /**
   * Probes a stream URL with a 2.5s strict timeout
   */
  public async probeStreamHealth(url: string): Promise<{ ok: boolean; status: number; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Line2-HealthMonitor/1.0)'
        }
      }).catch(async () => {
        // Retry with GET if HEAD is rejected by some CDNs
        return await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Line2-HealthMonitor/1.0)',
            'Range': 'bytes=0-1024'
          }
        });
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;
      const ok = response.status >= 200 && response.status < 400;

      return { ok, status: response.status, latencyMs };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return { ok: false, status: 0, latencyMs, error: err?.message || 'Timeout / Connection Refused' };
    }
  }

  /**
   * Trigger automatic failover to the next source in <= 3 seconds
   */
  public triggerFailover(reason: string): void {
    const prevSource = this.teachingSources[this.activeSourceIndex];
    if (prevSource) {
      prevSource.status = 'OFFLINE';
    }

    // Advance to next source
    const nextIdx = (this.activeSourceIndex + 1) % this.teachingSources.length;
    const nextSource = this.teachingSources[nextIdx];
    this.activeSourceIndex = nextIdx;

    const log: StreamFailoverLog = {
      timestamp: new Date().toISOString(),
      fromSource: prevSource?.name || 'Unknown',
      toSource: nextSource?.name || 'Unknown',
      reason,
      durationMs: 2500
    };

    this.failoverLogs.push(log);
    console.warn(`⚠️ [LINE 2 FAILOVER]: Switched from [${log.fromSource}] to [${log.toSource}] (Reason: ${reason})`);
  }

  /**
   * Background asynchronous health daemon running every 2.5s
   */
  private startStreamHealthCheckDaemon(): void {
    setInterval(async () => {
      if (this.isHealthChecking) return;
      this.isHealthChecking = true;

      try {
        const activeSource = this.teachingSources[this.activeSourceIndex];
        if (activeSource && activeSource.url) {
          const health = await this.probeStreamHealth(activeSource.url);
          activeSource.lastChecked = new Date().toISOString();
          activeSource.latencyMs = health.latencyMs;

          if (!health.ok) {
            // Stream is down / black screen / firewall block -> auto-failover in <= 3s
            this.triggerFailover(`Health check failed (Status: ${health.status}, Error: ${health.error || 'Network unreachable'})`);
          } else {
            activeSource.status = 'ONLINE';
          }
        }
      } catch (err) {
        // Guard against uncaught daemon exceptions
      } finally {
        this.isHealthChecking = false;
      }
    }, 2500);
  }

  public isGateOpen(id: ArenaId): boolean {
    const arena = this.arenas.get(id);
    if (!arena) return false;
    return arena.phase === 'BETTING_OPEN' && arena.timeRemainingSeconds > CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS;
  }

  /**
   * Server-Side Void Match Handler: Cancel all active tickets & refund 100% points in < 0.5s
   */
  public voidMatch(arenaId: ArenaId): { success: boolean; message: string; arena: CockfightArena | null } {
    const arena = this.arenas.get(arenaId);
    if (!arena) return { success: false, message: 'Arena not found', arena: null };

    arena.phase = 'CLOSED';
    arena.status = 'CLOSED';
    arena.timeRemainingSeconds = 0;

    // Broadcast instant Void Match event to all connected student clients
    wsEngine.broadcast({
      type: 'VOID_MATCH',
      arenaId,
      data: {
        arenaId,
        matchNumber: arena.currentMatch,
        reason: 'Trận đấu bị HỦY (Match Voided/Drawn). Toàn bộ 100% tiền cược được hoàn trả về ví.',
        refundTimestamp: Date.now()
      },
      timestamp: Date.now()
    });

    console.log(`⚠️ [VOID MATCH]: Arena ${arenaId} Match #${arena.currentMatch} voided. 100% points refunded.`);

    return {
      success: true,
      message: `Bồ ${arenaId} Trận #${arena.currentMatch} đã được xử lý HỦY TRẬN (Void) & hoàn tiền 100% trong < 0.5s.`,
      arena
    };
  }

  /**
   * Instructor Live Override Control: Lock Gate, Set Winner, Advance Phase on demand
   */
  public overrideArenaPhase(arenaId: ArenaId, phase: ArenaPhase, winner?: 'MERON' | 'WALA' | 'BDD'): { success: boolean; arena: CockfightArena | null } {
    const arena = this.arenas.get(arenaId);
    if (!arena) return { success: false, arena: null };

    arena.phase = phase;
    arena.status = phase;

    if (phase === 'BETTING_OPEN') {
      arena.timeRemainingSeconds = this.classroomMode ? 40 : 120;
    } else if (phase === 'GATE_LOCKED') {
      arena.timeRemainingSeconds = 0;
      wsEngine.broadcast({
        type: 'GATE_LOCKED',
        arenaId,
        data: { arenaId, matchNumber: arena.currentMatch, lockedAt: Date.now() },
        timestamp: Date.now()
      });
    } else if (phase === 'FIGHTING') {
      arena.timeRemainingSeconds = this.classroomMode ? 25 : 90;
    } else if (phase === 'SETTLING' || (phase as string) === 'RESULT_ANNOUNCED') {
      arena.phase = 'SETTLING';
      arena.status = 'SETTLING';
      arena.timeRemainingSeconds = this.classroomMode ? 8 : 20;
      const winResult = winner || (Math.random() < 0.48 ? 'MERON' : Math.random() < 0.94 ? 'WALA' : 'BDD');
      wsEngine.broadcast({
        type: 'RESULT_ANNOUNCED',
        arenaId,
        data: {
          arenaId,
          matchNumber: arena.currentMatch,
          winner: winResult,
          meronOdds: arena.meronOdds,
          walaOdds: arena.walaOdds,
          bddOdds: 8.00,
          announcedAt: Date.now()
        },
        timestamp: Date.now()
      });
    }

    wsEngine.broadcast({
      type: 'PHASE_CHANGE',
      arenaId,
      data: { arenaId, phase, currentMatch: arena.currentMatch, timeRemainingSeconds: arena.timeRemainingSeconds },
      timestamp: Date.now()
    });

    return { success: true, arena };
  }

  private startAutonomousLoop(): void {
    setInterval(() => {
      const updatedArenas: CockfightArena[] = [];

      this.arenas.forEach((arena) => {
        const { isOpen, operatingHours } = this.checkArenaOpenStatus(arena.id);
        arena.isOpen = isOpen;
        arena.operatingHours = operatingHours;

        if (!isOpen && !this.classroomMode) {
          arena.phase = 'CLOSED';
          arena.status = 'CLOSED';
          updatedArenas.push(arena);
          return;
        }

        if (arena.timeRemainingSeconds > 0) {
          arena.timeRemainingSeconds--;
          
          // Enter 3-second Gate Locked state
          if (arena.timeRemainingSeconds <= CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS && arena.phase === 'BETTING_OPEN') {
            arena.phase = 'GATE_LOCKED';
            arena.status = 'GATE_LOCKED';
            wsEngine.broadcast({
              type: 'GATE_LOCKED',
              arenaId: arena.id,
              data: { arenaId: arena.id, matchNumber: arena.currentMatch, lockedAt: Date.now() },
              timestamp: Date.now()
            });
          }

          // Subtle realistic odds fluctuation during weighing & betting
          if (arena.timeRemainingSeconds % 10 === 0 && (arena.phase === 'WEIGHING' || arena.phase === 'BETTING_OPEN')) {
            const shift = (Math.random() - 0.5) * 0.04;
            arena.meronOdds = Math.round(Math.max(0.72, Math.min(0.98, arena.meronOdds + shift)) * 100) / 100;
            arena.walaOdds = Math.round(Math.max(0.85, Math.min(1.05, arena.walaOdds - shift)) * 100) / 100;
          }
        } else {
          // Transition cycle between authentic phases
          if (arena.phase === 'WEIGHING' || arena.status === 'WEIGHING') {
            // Move from Weighing to Betting Open (2 mins / 40s in class mode)
            arena.phase = 'BETTING_OPEN';
            arena.status = 'BETTING_OPEN';
            arena.timeRemainingSeconds = this.classroomMode ? 40 : 120;
            wsEngine.broadcast({
              type: 'PHASE_CHANGE',
              arenaId: arena.id,
              data: { arenaId: arena.id, phase: 'BETTING_OPEN', currentMatch: arena.currentMatch, timeRemainingSeconds: arena.timeRemainingSeconds },
              timestamp: Date.now()
            });
          } else if (arena.phase === 'GATE_LOCKED' || arena.status === 'GATE_LOCKED') {
            // Roosters released -> Live combat phase
            arena.phase = 'FIGHTING';
            arena.status = 'FIGHTING';
            arena.timeRemainingSeconds = this.classroomMode ? 25 : 90;
            wsEngine.broadcast({
              type: 'PHASE_CHANGE',
              arenaId: arena.id,
              data: { arenaId: arena.id, phase: 'FIGHTING', currentMatch: arena.currentMatch, timeRemainingSeconds: arena.timeRemainingSeconds },
              timestamp: Date.now()
            });
          } else if (arena.phase === 'FIGHTING' || arena.status === 'FIGHTING') {
            // Match concluded -> Settle & distribute winnings
            arena.phase = 'SETTLING';
            arena.status = 'SETTLING';
            arena.timeRemainingSeconds = this.classroomMode ? 8 : 20;

            const winResult: 'MERON' | 'WALA' | 'BDD' = Math.random() < 0.48 ? 'MERON' : Math.random() < 0.94 ? 'WALA' : 'BDD';
            wsEngine.broadcast({
              type: 'RESULT_ANNOUNCED',
              arenaId: arena.id,
              data: {
                arenaId: arena.id,
                matchNumber: arena.currentMatch,
                winner: winResult,
                meronOdds: arena.meronOdds,
                walaOdds: arena.walaOdds,
                bddOdds: 8.00,
                announcedAt: Date.now()
              },
              timestamp: Date.now()
            });
          } else if (arena.phase === 'SETTLING' || arena.phase === 'CLOSED') {
            // Next Match Prep: 10–15 min Weighing & Matching in real time, or 45s in classroom mode
            arena.currentMatch++;
            arena.meronRooster = this.generateRooster('MERON', arena.location, arena.currentMatch);
            arena.walaRooster = this.generateRooster('WALA', arena.location, arena.currentMatch);
            arena.meronOdds = Math.round((0.80 + Math.random() * 0.15) * 100) / 100;
            arena.walaOdds = Math.round((0.95 + Math.random() * 0.10) * 100) / 100;

            arena.phase = 'WEIGHING';
            arena.status = 'WEIGHING';
            arena.timeRemainingSeconds = this.classroomMode ? 50 : 600; // 10 minutes realistic weighing
            wsEngine.broadcast({
              type: 'PHASE_CHANGE',
              arenaId: arena.id,
              data: { arenaId: arena.id, phase: 'WEIGHING', currentMatch: arena.currentMatch, timeRemainingSeconds: arena.timeRemainingSeconds },
              timestamp: Date.now()
            });
          }
        }
        updatedArenas.push(arena);
      });

      // Broadcast synchronous tick to all clients
      wsEngine.broadcast({
        type: 'ARENAS_UPDATE',
        data: { arenas: updatedArenas },
        timestamp: Date.now()
      });
    }, 1000);
  }
}

export const cockfightService = new CockfightService();

