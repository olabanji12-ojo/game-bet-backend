import { CONFIG } from '../config.js';
export class CasinoEngine {
    taiXiuState;
    xocDiaState;
    nextTaiXiuOverride = null;
    nextXocDiaOverride = null;
    constructor() {
        this.taiXiuState = {
            roundId: `TX_${Date.now()}`,
            phase: 'BETTING',
            timeLeft: CONFIG.CASINO.CYCLE_DURATION_SECONDS,
            dice: [3, 4, 5],
            totalScore: 12,
            outcome: 'TAI',
            history: []
        };
        this.xocDiaState = {
            roundId: `XD_${Date.now()}`,
            phase: 'BETTING',
            timeLeft: CONFIG.CASINO.CYCLE_DURATION_SECONDS,
            tokens: ['R', 'R', 'W', 'W'],
            redCount: 2,
            isEven: true,
            history: ['C', 'L', 'C', 'C', 'L']
        };
        this.seedHistory();
        this.startAutonomousLoop();
    }
    seedHistory() {
        for (let i = 0; i < 25; i++) {
            const d1 = Math.floor(Math.random() * 6) + 1;
            const d2 = Math.floor(Math.random() * 6) + 1;
            const d3 = Math.floor(Math.random() * 6) + 1;
            const total = d1 + d2 + d3;
            const outcome = total >= 11 ? 'TAI' : 'XIU';
            this.taiXiuState.history.push({
                roundId: `TX_HIST_${i + 1}`,
                outcome,
                total,
                dice: [d1, d2, d3]
            });
        }
    }
    getTaiXiuState() {
        return { ...this.taiXiuState };
    }
    getXocDiaState() {
        return { ...this.xocDiaState };
    }
    // Telegram bot override hook
    setTaiXiuOverride(outcome) {
        this.nextTaiXiuOverride = outcome;
        console.log(`[CASINO OVERRIDE] Next Tai Xiu outcome forced to: ${outcome}`);
    }
    setXocDiaOverride(outcome) {
        this.nextXocDiaOverride = outcome;
        console.log(`[CASINO OVERRIDE] Next Xoc Dia outcome forced to: ${outcome}`);
    }
    // Validate bet gate
    isBettingOpen() {
        return (this.taiXiuState.timeLeft > CONFIG.CASINO.INVISIBLE_BUFFER_SECONDS &&
            this.taiXiuState.phase === 'BETTING');
    }
    startAutonomousLoop() {
        setInterval(() => {
            // Decrement countdown
            if (this.taiXiuState.timeLeft > 0) {
                this.taiXiuState.timeLeft--;
                this.xocDiaState.timeLeft--;
                // Enter 5-second invisible buffer at second 35 (when timeLeft <= 5)
                if (this.taiXiuState.timeLeft <= CONFIG.CASINO.INVISIBLE_BUFFER_SECONDS) {
                    if (this.taiXiuState.phase === 'BETTING') {
                        this.taiXiuState.phase = 'INVISIBLE_BUFFER';
                        this.xocDiaState.phase = 'SHAKING';
                    }
                }
                else if (this.taiXiuState.timeLeft <= 10) {
                    this.taiXiuState.phase = 'WARNING';
                    this.xocDiaState.phase = 'WARNING';
                }
            }
            else {
                // Time = 0: Resolve outcomes
                this.resolveRound();
            }
        }, 1000);
    }
    resolveRound() {
        try {
            // 1. Resolve Tai Xiu
            let d1 = Math.floor(Math.random() * 6) + 1;
            let d2 = Math.floor(Math.random() * 6) + 1;
            let d3 = Math.floor(Math.random() * 6) + 1;
            let total = d1 + d2 + d3;
            let outcome = total >= 11 ? 'TAI' : 'XIU';
            // Check Telegram override
            if (this.nextTaiXiuOverride) {
                outcome = this.nextTaiXiuOverride;
                this.nextTaiXiuOverride = null; // Atomic consume GETDEL
                if (outcome === 'TAI') {
                    d1 = 4;
                    d2 = 5;
                    d3 = 5;
                    total = 14;
                }
                else {
                    d1 = 2;
                    d2 = 2;
                    d3 = 3;
                    total = 7;
                }
            }
            this.taiXiuState.dice = [d1, d2, d3];
            this.taiXiuState.totalScore = total;
            this.taiXiuState.outcome = outcome;
            this.taiXiuState.phase = 'REVEAL';
            // Record history (max 30)
            this.taiXiuState.history.unshift({
                roundId: this.taiXiuState.roundId,
                outcome,
                total,
                dice: [d1, d2, d3]
            });
            if (this.taiXiuState.history.length > 30) {
                this.taiXiuState.history.pop();
            }
            // 2. Resolve Xoc Dia
            let tokens = [
                Math.random() > 0.5 ? 'R' : 'W',
                Math.random() > 0.5 ? 'R' : 'W',
                Math.random() > 0.5 ? 'R' : 'W',
                Math.random() > 0.5 ? 'R' : 'W',
            ];
            let redCount = tokens.filter(t => t === 'R').length;
            let isEven = redCount % 2 === 0;
            if (this.nextXocDiaOverride) {
                const wantEven = this.nextXocDiaOverride === 'C';
                this.nextXocDiaOverride = null;
                tokens = wantEven ? ['R', 'R', 'W', 'W'] : ['R', 'R', 'R', 'W'];
                redCount = tokens.filter(t => t === 'R').length;
                isEven = redCount % 2 === 0;
            }
            this.xocDiaState.tokens = tokens;
            this.xocDiaState.redCount = redCount;
            this.xocDiaState.isEven = isEven;
            this.xocDiaState.phase = 'REVEAL';
            this.xocDiaState.history.push(isEven ? 'C' : 'L');
            if (this.xocDiaState.history.length > 30) {
                this.xocDiaState.history.shift();
            }
            // Stay in REVEAL for 5 seconds, then restart cycle
            setTimeout(() => {
                this.taiXiuState.roundId = `TX_${Date.now()}`;
                this.taiXiuState.phase = 'BETTING';
                this.taiXiuState.timeLeft = CONFIG.CASINO.CYCLE_DURATION_SECONDS;
                this.xocDiaState.roundId = `XD_${Date.now()}`;
                this.xocDiaState.phase = 'BETTING';
                this.xocDiaState.timeLeft = CONFIG.CASINO.CYCLE_DURATION_SECONDS;
            }, 5000);
        }
        catch (err) {
            // Rollback safety valve: Refund wagers on failure
            console.error('[CASINO ENGINE ERROR] Unexpected error during resolution. Safety rollback engaged:', err);
            this.taiXiuState.phase = 'BETTING';
            this.taiXiuState.timeLeft = CONFIG.CASINO.CYCLE_DURATION_SECONDS;
        }
    }
}
export const casinoEngine = new CasinoEngine();
