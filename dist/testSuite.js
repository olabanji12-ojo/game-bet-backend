import { CONFIG } from './config.js';
import { quotaShield } from './services/quotaShield.js';
import { cockfightService } from './services/cockfightService.js';
import { casinoEngine } from './services/casinoEngine.js';
import { betQueue } from './services/betQueue.js';
import { walletLedger } from './services/walletLedger.js';
import { telegramService } from './services/telegramService.js';
let passed = 0;
let failed = 0;
function assert(condition, testName) {
    if (condition) {
        console.log(`  ✅ PASS: ${testName}`);
        passed++;
    }
    else {
        console.error(`  ❌ FAIL: ${testName}`);
        failed++;
    }
}
async function runTestSuite() {
    console.log('===============================================================');
    console.log('  MILESTONE 2: AUTOMATED ARCHITECTURE VERIFICATION TEST SUITE');
    console.log('===============================================================\n');
    // TEST 1: Centralized Configuration Check
    console.log('[TEST GROUP 1]: Centralized Configuration Baseline');
    assert(CONFIG.ODDS_API.KEY === '8ba50f3775f004dc011c39700a4f0a16', 'THE_ODDS_API_KEY correctly loaded from .env');
    assert(CONFIG.DELAY_TIERS.TIER_1_STANDARD_SECONDS === 8, 'DELAY_TIER_1_STANDARD_SECONDS === 8s');
    assert(CONFIG.DELAY_TIERS.TIER_2_DANGEROUS_ATTACK_SECONDS === 15, 'DELAY_TIER_2_DANGEROUS_ATTACK_SECONDS === 15s');
    assert(CONFIG.DELAY_TIERS.TIER_3_CRITICAL_EVENT_SECONDS === 25, 'DELAY_TIER_3_CRITICAL_EVENT_SECONDS === 25s');
    assert(CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS === 3, 'DELAY_COCKFIGHT_BOOKING_LOCK_SECONDS === 3s');
    assert(CONFIG.RISK.MAX_BET_LIMIT_POINTS === 300, 'MAX_BET_LIMIT_POINTS === 300 points');
    // TEST 2: Line 1 (Main Sports Node & RAM Cache Shield)
    console.log('\n[TEST GROUP 2]: Line 1 Sports & Quota Shield');
    const matches = await quotaShield.getLiveMatches('soccer');
    assert(Array.isArray(matches) && matches.length > 0, `Live matches fetched (${matches.length} fixtures returned)`);
    const metricsBefore = quotaShield.getMetrics();
    // Second call must hit RAM cache
    await quotaShield.getLiveMatches('soccer');
    const metricsAfter = quotaShield.getMetrics();
    assert(metricsAfter.cacheHits > metricsBefore.cacheHits, '15-second RAM Cache Hit detected (Zero unnecessary API consumption)');
    // TEST 3: Line 2 (Cockfight Subdomain & 3s Anti-Vét Gate Lock)
    console.log('\n[TEST GROUP 3]: Line 2 Cockfight 7-Arena & Anti-Vét Gate');
    const arenas = cockfightService.getAllArenas();
    assert(arenas.length === 7, `All 7 SV388 arenas initialized (${arenas.map(a => a.id).join(', ')})`);
    const validBet = cockfightService.validateBet('CPC1', 'MERON', 50);
    assert(validBet.valid, 'Bet accepted when arena is BETTING_OPEN and > 3s');
    const overLimitBet = cockfightService.validateBet('CPC1', 'MERON', 500);
    assert(!overLimitBet.valid, 'Bet rejected when exceeding 300-point limit ceiling');
    // TEST 4: Line 3 (Casino Core 40s Loop & 5s Buffer Gate)
    console.log('\n[TEST GROUP 4]: Line 3 Casino Engine & Telegram Webhooks');
    const txState = casinoEngine.getTaiXiuState();
    assert(txState.dice.length === 3 && txState.totalScore >= 3, 'Tai Xiu state machine running with 3D dice history');
    const xdState = casinoEngine.getXocDiaState();
    assert(xdState.tokens.length === 4, 'Xoc Dia 4-token plate running');
    // Test Telegram override
    casinoEngine.setTaiXiuOverride('TAI');
    const telegramResp = telegramService.handleWebhookUpdate({
        message: { text: '/override tai', chat: { id: 12345 } }
    });
    assert(telegramResp.handled, 'Telegram webhook listener handled /override command');
    // TEST 5: Double-Entry Wallet & Anti-Latency Delay Queue
    console.log('\n[TEST GROUP 5]: Wallet Ledger & Anti-Latency Queue');
    const initialBalance = walletLedger.getBalance();
    const enqueueResult = betQueue.enqueueBet('user_test', 'Single', [
        { matchId: matches[0].id, type: 'Home', oddsAtPlacement: matches[0].odds.homeWin }
    ], 100);
    assert(enqueueResult.success, 'Bet ticket successfully enqueued in delay queue');
    assert(walletLedger.getBalance() === initialBalance - 100, 'Escrow held from balance atomically');
    // Exceed 300 limit
    const overCeilingBet = betQueue.enqueueBet('user_test', 'Single', [
        { matchId: matches[0].id, type: 'Home', oddsAtPlacement: 2.0 }
    ], 250);
    assert(!overCeilingBet.success, 'Anti-hedging container ceiling rejected bet exceeding 300 pts total on match');
    console.log('\n===============================================================');
    console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('===============================================================\n');
    setTimeout(() => {
        process.exit(failed > 0 ? 1 : 0);
    }, 100);
}
runTestSuite().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
