import { CONFIG } from '../config.js';
import { walletLedger } from './walletLedger.js';
import { quotaShield } from './quotaShield.js';
export class BetQueueService {
    queue = new Map();
    userSubMarketStakes = new Map(); // Tracks anti-hedging & 300 pt container cap
    platformTier = 1;
    getPlatformTier() {
        return this.platformTier;
    }
    setPlatformTier(tier) {
        this.platformTier = tier;
        console.log(`[BET QUEUE] Platform Anti-Latency Tier switched to: Tier ${tier}`);
    }
    getQueue() {
        return Array.from(this.queue.values());
    }
    enqueueBet(userId, type, selections, stake) {
        // 1. Validate Stake Limits (300-point container ceiling)
        if (stake <= 0) {
            return { success: false, error: 'Stake must be a positive number.' };
        }
        if (stake > CONFIG.RISK.MAX_BET_LIMIT_POINTS) {
            return {
                success: false,
                error: `Vượt quá giới hạn cược tối đa ${CONFIG.RISK.MAX_BET_LIMIT_POINTS} điểm trên một vé.`
            };
        }
        // 2. Anti-Hedging & Container Ceiling Check
        for (const sel of selections) {
            const containerKey = `${userId}_${sel.matchId}`;
            const existingStake = this.userSubMarketStakes.get(containerKey) || 0;
            if (existingStake + stake > CONFIG.RISK.MAX_BET_LIMIT_POINTS) {
                return {
                    success: false,
                    error: `Giới hạn tổng cược cho trận đấu này đã vượt trần ${CONFIG.RISK.MAX_BET_LIMIT_POINTS} điểm.`
                };
            }
        }
        // 3. Wallet Escrow Hold
        const held = walletLedger.holdFunds(stake, `Escrow Hold for ${type} Bet`);
        if (!held) {
            return { success: false, error: 'Số dư ví không đủ để đặt cược.' };
        }
        // 4. Calculate Delay Tier
        let delaySeconds = CONFIG.DELAY_TIERS.TIER_1_STANDARD_SECONDS;
        if (this.platformTier === 2) {
            delaySeconds = CONFIG.DELAY_TIERS.TIER_2_DANGEROUS_ATTACK_SECONDS;
        }
        else if (this.platformTier === 3) {
            delaySeconds = CONFIG.DELAY_TIERS.TIER_3_CRITICAL_EVENT_SECONDS;
        }
        // Calculate potential payout
        const totalOdds = selections.reduce((acc, s) => acc * s.oddsAtPlacement, 1);
        const potentialPayout = Math.round(stake * totalOdds * 100) / 100;
        const betId = `BET_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const bet = {
            id: betId,
            userId,
            type,
            selections,
            stake,
            potentialPayout,
            status: 'QUEUED',
            delayTier: this.platformTier,
            delaySeconds,
            placedAt: new Date().toISOString()
        };
        this.queue.set(betId, bet);
        // Track container stake
        selections.forEach(sel => {
            const key = `${userId}_${sel.matchId}`;
            this.userSubMarketStakes.set(key, (this.userSubMarketStakes.get(key) || 0) + stake);
        });
        // 5. Asynchronous Delay Evaluation Worker
        setTimeout(() => {
            this.processBet(betId);
        }, delaySeconds * 1000);
        return { success: true, bet };
    }
    async processBet(betId) {
        const bet = this.queue.get(betId);
        if (!bet)
            return;
        bet.evaluatedAt = new Date().toISOString();
        // Re-fetch latest live odds to check for latency arbitrage drift
        let rejectReason = null;
        const matches = await quotaShield.getLiveMatches();
        for (const sel of bet.selections) {
            const liveMatch = matches.find(m => m.id === sel.matchId);
            if (!liveMatch || liveMatch.status === 'Suspended') {
                rejectReason = 'Thị trường tạm khóa do sự kiện quan trọng (VAR / Bàn thắng).';
                break;
            }
            // Check odds drift
            let currentOdds = sel.oddsAtPlacement;
            if (sel.type === 'Home')
                currentOdds = liveMatch.odds.homeWin;
            else if (sel.type === 'Away')
                currentOdds = liveMatch.odds.awayWin;
            else if (sel.type === 'Draw')
                currentOdds = liveMatch.odds.draw || sel.oddsAtPlacement;
            const drift = Math.abs(currentOdds - sel.oddsAtPlacement);
            if (drift > CONFIG.RISK.ODDS_DRIFT_THRESHOLD) {
                rejectReason = `Tỷ lệ kèo đã biến động vượt ngưỡng (Lệch ${(drift).toFixed(2)} > ${CONFIG.RISK.ODDS_DRIFT_THRESHOLD}).`;
                break;
            }
        }
        if (rejectReason) {
            // Reject & Full Escrow Refund
            bet.status = 'REJECTED';
            bet.rejectionReason = rejectReason;
            walletLedger.releaseHold(bet.stake, `Refund: Bet Rejected (${rejectReason})`);
            console.log(`[BET QUEUE] Bet ${betId} REJECTED: ${rejectReason}`);
        }
        else {
            // Commit & Confirm
            bet.status = 'CONFIRMED';
            walletLedger.commitBet(bet.stake, `Bet Confirmed (${bet.type})`);
            console.log(`[BET QUEUE] Bet ${betId} CONFIRMED after ${bet.delaySeconds}s delay.`);
        }
    }
}
export const betQueue = new BetQueueService();
