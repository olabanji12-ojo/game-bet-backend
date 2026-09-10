import { CONFIG } from '../config.js';
import { ArenaId, CockfightArena, CockfightChoice } from '../types.js';

export class CockfightService {
  private arenas: Map<ArenaId, CockfightArena> = new Map();

  constructor() {
    this.initializeArenas();
    this.startAutonomousLoop();
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
      this.arenas.set(def.id, {
        id: def.id,
        name: def.name,
        location: def.location,
        status: 'BETTING_OPEN',
        meronOdds: 0.88,
        walaOdds: 1.00,
        bddOdds: 8.00,
        timeRemainingSeconds: 25 + index * 5,
        streamUrl: `https://live.sv388cdn.com/hls/${def.id.toLowerCase()}/master.m3u8`,
        currentMatch: 12 + index * 3
      });
    });
  }

  public getAllArenas(): CockfightArena[] {
    return Array.from(this.arenas.values());
  }

  public getArena(id: ArenaId): CockfightArena | undefined {
    return this.arenas.get(id);
  }

  // Validate bet under the 3-second Anti-Vét gate lock
  public validateBet(arenaId: ArenaId, choice: CockfightChoice, stake: number): { valid: boolean; reason?: string } {
    const arena = this.arenas.get(arenaId);
    if (!arena) {
      return { valid: false, reason: `Arena ${arenaId} not found.` };
    }

    // 3s Anti-Vét Gate Lock check
    if (arena.status !== 'BETTING_OPEN' || arena.timeRemainingSeconds <= CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS) {
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

  private startAutonomousLoop(): void {
    setInterval(() => {
      this.arenas.forEach((arena) => {
        if (arena.timeRemainingSeconds > 0) {
          arena.timeRemainingSeconds--;
          // Enter 3-second Gate Locked state
          if (arena.timeRemainingSeconds <= CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS && arena.status === 'BETTING_OPEN') {
            arena.status = 'GATE_LOCKED';
          }
        } else {
          // Transition cycle
          if (arena.status === 'GATE_LOCKED') {
            arena.status = 'FIGHTING';
            arena.timeRemainingSeconds = 30; // 30s fight phase
          } else if (arena.status === 'FIGHTING') {
            arena.status = 'SETTLING';
            arena.timeRemainingSeconds = 5;
          } else if (arena.status === 'SETTLING') {
            arena.status = 'BETTING_OPEN';
            arena.timeRemainingSeconds = 40;
            arena.currentMatch++;
            // Randomize live odds slightly
            arena.meronOdds = Math.round((0.80 + Math.random() * 0.15) * 100) / 100;
            arena.walaOdds = Math.round((0.95 + Math.random() * 0.10) * 100) / 100;
          }
        }
      });
    }, 1000);
  }
}

export const cockfightService = new CockfightService();
