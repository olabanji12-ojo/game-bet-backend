// Domain Types for Fanclub68 / SBOBET Platform

export type SportType = 'Football' | 'Basketball' | 'Tennis' | 'AmericanFootball' | 'Cockfight';

export interface Score {
  home: number;
  away: number;
}

export interface MatchOdds {
  homeWin: number;
  draw?: number;
  awayWin: number;
  overUnder?: number;
  overOdds?: number;
  underOdds?: number;
  spread?: number;
  spreadHomeOdds?: number;
  spreadAwayOdds?: number;
}

export interface Match {
  id: string;
  sport: SportType;
  homeTeam: string;
  awayTeam: string;
  league: string;
  status: 'Active' | 'Suspended' | 'Finished';
  startTime: string;
  currentMinute?: number;
  score: Score;
  odds: MatchOdds;
  // SBOBET Odds Compatibility
  matchId?: string;
  leagueId?: string;
  leagueName?: string;
  scoreHome?: number;
  scoreAway?: number;
  liveTime?: string;
  isLive?: boolean;
  handicapTeam?: 'home' | 'away';
  homeHandicap?: string;
  awayHandicap?: string;
  homeOdds?: number;
  awayOdds?: number;
  ouGoal?: string;
  ouOverOdds?: number;
  ouUnderOdds?: number;
  oneXTwoHome?: number;
  oneXTwoAway?: number;
  oneXTwoDraw?: number;
  moreCount?: number;
}

export type SelectionType = 'Home' | 'Away' | 'Draw' | 'Over' | 'Under' | 'SpreadHome' | 'SpreadAway';

export interface BetSelection {
  matchId: string;
  type: SelectionType;
  oddsAtPlacement: number;
}

export type BetType = 'Single' | 'Parlay';
export type BetStatus = 'QUEUED' | 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'WON' | 'LOST' | 'VOID';

export interface Bet {
  id: string;
  userId: string;
  type: BetType;
  selections: BetSelection[];
  stake: number;
  potentialPayout: number;
  status: BetStatus;
  delayTier: 1 | 2 | 3;
  delaySeconds: number;
  placedAt: string;
  evaluatedAt?: string;
  rejectionReason?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'Credit' | 'Debit' | 'Hold' | 'Refund';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  inPlayBalance: number;
  history: WalletTransaction[];
}

// Cockfight SV388 Domain Types
export type ArenaId = 'CPC1' | 'CPC2' | 'CPC3' | 'CPC4' | 'PH1' | 'PH2' | 'PH3';
export type CockfightChoice = 'MERON' | 'WALA' | 'BDD';

export interface CockfightArena {
  id: ArenaId;
  name: string;
  location: string;
  status: 'BETTING_OPEN' | 'GATE_LOCKED' | 'FIGHTING' | 'SETTLING';
  meronOdds: number;
  walaOdds: number;
  bddOdds: number;
  timeRemainingSeconds: number;
  streamUrl: string;
  currentMatch: number;
}

// Casino 3D Domain Types
export type TaiXiuOutcome = 'TAI' | 'XIU';
export interface TaiXiuState {
  roundId: string;
  phase: 'BETTING' | 'WARNING' | 'INVISIBLE_BUFFER' | 'ROLLING' | 'REVEAL';
  timeLeft: number;
  dice: [number, number, number];
  totalScore: number;
  outcome: TaiXiuOutcome;
  history: Array<{ roundId: string; outcome: TaiXiuOutcome; total: number; dice: [number, number, number] }>;
}

export type XocDiaToken = 'R' | 'W';
export interface XocDiaState {
  roundId: string;
  phase: 'BETTING' | 'WARNING' | 'SHAKING' | 'REVEAL';
  timeLeft: number;
  tokens: [XocDiaToken, XocDiaToken, XocDiaToken, XocDiaToken];
  redCount: number;
  isEven: boolean;
  history: Array<'C' | 'L'>;
}

// Quota Metrics
export interface QuotaMetrics {
  monthlyLimit: number;
  usedCalls: number;
  remainingCalls: number;
  cacheHitRate: number;
  totalRequests: number;
  cacheHits: number;
  status: 'NOMINAL' | 'WARNING' | 'EMERGENCY_THROTTLE';
}
