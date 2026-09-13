import { CONFIG } from '../config.js';
import { ArenaId, ArenaPhase, CockfightArena, CockfightChoice, RoosterProfile } from '../types.js';

const ROOSTER_BREEDS = ['Gà Asil', 'Gà Tre', 'Gà Peru', 'Gà Kelso', 'Gà Sweater', 'Gà Hatch', 'Gà Cuban'];
const SPUR_TYPES_CAMBODIA = ['Cựa Sắt Tròn (Thomo)', 'Cựa Tháp Sắt', 'Cựa Tròn 2.5 Inch'];
const SPUR_TYPES_PHILIPPINES = ['Cựa Dao Slasher (Pasay)', 'Cựa Dao Double Blade', 'Cựa Dao Derby'];

export class CockfightService {
  private arenas: Map<ArenaId, CockfightArena> = new Map();
  private classroomMode: boolean = true; // Enabled by default for teaching/demo, toggleable

  constructor() {
    this.initializeArenas();
    this.startAutonomousLoop();
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

  private startAutonomousLoop(): void {
    setInterval(() => {
      this.arenas.forEach((arena) => {
        const { isOpen, operatingHours } = this.checkArenaOpenStatus(arena.id);
        arena.isOpen = isOpen;
        arena.operatingHours = operatingHours;

        if (!isOpen && !this.classroomMode) {
          arena.phase = 'CLOSED';
          arena.status = 'CLOSED';
          return;
        }

        if (arena.timeRemainingSeconds > 0) {
          arena.timeRemainingSeconds--;
          
          // Enter 3-second Gate Locked state
          if (arena.timeRemainingSeconds <= CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS && arena.phase === 'BETTING_OPEN') {
            arena.phase = 'GATE_LOCKED';
            arena.status = 'GATE_LOCKED';
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
          } else if (arena.phase === 'GATE_LOCKED' || arena.status === 'GATE_LOCKED') {
            // Roosters released -> Live combat phase
            arena.phase = 'FIGHTING';
            arena.status = 'FIGHTING';
            arena.timeRemainingSeconds = this.classroomMode ? 25 : 90;
          } else if (arena.phase === 'FIGHTING' || arena.status === 'FIGHTING') {
            // Match concluded -> Settle & distribute winnings
            arena.phase = 'SETTLING';
            arena.status = 'SETTLING';
            arena.timeRemainingSeconds = this.classroomMode ? 8 : 20;
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
          }
        }
      });
    }, 1000);
  }
}

export const cockfightService = new CockfightService();
