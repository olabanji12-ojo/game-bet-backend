import dotenv from 'dotenv';

// Load centralized .env
dotenv.config();

function getEnvNumber(key: string, defaultValue: number): number {
  const val = process.env[key];
  if (!val) return defaultValue;
  const parsed = Number(val);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export const CONFIG = {
  SERVER: {
    PORT: getEnvNumber('PORT', 3000),
    NODE_ENV: getEnvString('NODE_ENV', 'development'),
  },
  ODDS_API: {
    KEY: getEnvString('THE_ODDS_API_KEY', 'c6cc5131f2e2954832edba4a8620877e'),
    MARKETS: getEnvString('SPORTS_MARKETS_PARAMS', 'spreads,totals,outlays,player_props,tennis_props')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    CACHE_TTL_SECONDS: getEnvNumber('CACHE_TTL_LIVE_SECONDS', 1800),
  },
  TIMEOUTS: {
    LAZY_LOADING_IDLE_SECONDS: getEnvNumber('LAZY_LOADING_IDLE_TIMEOUT_SECONDS', 60),
    ACTIVE_WINDOW_CHECK_MINUTES: getEnvNumber('ACTIVE_WINDOW_CHECK_INTERVAL_MINUTES', 10),
  },
  DELAY_TIERS: {
    TIER_1_STANDARD_SECONDS: getEnvNumber('DELAY_TIER_1_STANDARD_SECONDS', 8),
    TIER_2_DANGEROUS_ATTACK_SECONDS: getEnvNumber('DELAY_TIER_2_DANGEROUS_ATTACK_SECONDS', 15),
    TIER_3_CRITICAL_EVENT_SECONDS: getEnvNumber('DELAY_TIER_3_CRITICAL_EVENT_SECONDS', 25),
  },
  COCKFIGHT: {
    BOOKING_LOCK_SECONDS: getEnvNumber('DELAY_COCKFIGHT_BOOKING_LOCK_SECONDS', 3),
  },
  RISK: {
    MAX_BET_LIMIT_POINTS: getEnvNumber('MAX_BET_LIMIT_POINTS', 300),
    ODDS_DRIFT_THRESHOLD: getEnvNumber('ODDS_DRIFT_THRESHOLD', 0.05),
  },
  CASINO: {
    CYCLE_DURATION_SECONDS: getEnvNumber('CASINO_CYCLE_DURATION_SECONDS', 40),
    INVISIBLE_BUFFER_SECONDS: getEnvNumber('CASINO_INVISIBLE_BUFFER_SECONDS', 5),
  },
  TELEGRAM: {
    BOT_TOKEN: getEnvString('TELEGRAM_BOT_TOKEN', ''),
    ADMIN_CHAT_ID: getEnvString('TELEGRAM_ADMIN_CHAT_ID', ''),
  }
} as const;

export function printConfigBanner(): void {
  console.log('=================================================================');
  console.log('  FANCLUB68.COM - BACKEND TRANSMISSION ARCHITECTURE (MILESTONE 2)');
  console.log('=================================================================');
  console.log(`[CONFIG] Port: ${CONFIG.SERVER.PORT} | Environment: ${CONFIG.SERVER.NODE_ENV}`);
  console.log(`[CONFIG] Odds-API Key: ...${CONFIG.ODDS_API.KEY ? CONFIG.ODDS_API.KEY.slice(-6) : 'NOT SET'}`);
  console.log(`[CONFIG] Cache TTL: ${CONFIG.ODDS_API.CACHE_TTL_SECONDS}s | Idle Timeout: ${CONFIG.TIMEOUTS.LAZY_LOADING_IDLE_SECONDS}s`);
  console.log(`[CONFIG] Delay Tiers: T1=${CONFIG.DELAY_TIERS.TIER_1_STANDARD_SECONDS}s, T2=${CONFIG.DELAY_TIERS.TIER_2_DANGEROUS_ATTACK_SECONDS}s, T3=${CONFIG.DELAY_TIERS.TIER_3_CRITICAL_EVENT_SECONDS}s`);
  console.log(`[CONFIG] Cockfight Lock: ${CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS}s | Max Bet Limit: ${CONFIG.RISK.MAX_BET_LIMIT_POINTS} pts`);
  console.log('=================================================================\n');
}
