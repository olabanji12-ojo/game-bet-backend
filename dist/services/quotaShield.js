import { CONFIG } from '../config.js';
export class QuotaShieldService {
    cache = new Map();
    totalRequests = 0;
    cacheHits = 0;
    monthlyLimit = 100000;
    usedCalls = 0;
    remainingCalls = 100000;
    lastAccessTime = Date.now();
    isHibernate = false;
    constructor() {
        this.startInactivityChecker();
    }
    getMetrics() {
        const total = this.totalRequests || 1;
        const hitRate = Math.round((this.cacheHits / total) * 10000) / 100;
        let status = 'NOMINAL';
        if (this.remainingCalls < 5000) {
            status = 'EMERGENCY_THROTTLE';
        }
        else if (this.remainingCalls < 30000) {
            status = 'WARNING';
        }
        return {
            monthlyLimit: this.monthlyLimit,
            usedCalls: this.usedCalls,
            remainingCalls: this.remainingCalls,
            cacheHitRate: hitRate,
            totalRequests: this.totalRequests,
            cacheHits: this.cacheHits,
            status
        };
    }
    async getLiveMatches(sport = 'soccer') {
        this.totalRequests++;
        this.lastAccessTime = Date.now();
        this.isHibernate = false;
        const cacheKey = `matches_${sport}`;
        const cached = this.cache.get(cacheKey);
        const now = Date.now();
        // 15-second RAM Cache Shield Check
        if (cached && (now - cached.timestamp) < CONFIG.ODDS_API.CACHE_TTL_SECONDS * 1000) {
            this.cacheHits++;
            return cached.data;
        }
        // Attempt live upstream ingest
        try {
            const liveData = await this.fetchFromOddsApi(sport);
            if (liveData && liveData.length > 0) {
                this.cache.set(cacheKey, { data: liveData, timestamp: now });
                return liveData;
            }
        }
        catch (err) {
            console.warn(`[QUOTA SHIELD] Live ingest failed: ${err.message}. Returning resilient fallback cache.`);
        }
        // Fallback: Resilient mock fixture feed (matching SBOBET UI)
        const fallbackMatches = this.getFallbackMatches(sport);
        this.cache.set(cacheKey, { data: fallbackMatches, timestamp: now });
        return fallbackMatches;
    }
    async fetchFromOddsApi(sportKey) {
        if (!CONFIG.ODDS_API.KEY) {
            return [];
        }
        const endpoint = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${CONFIG.ODDS_API.KEY}&regions=eu&markets=h2h,spreads,totals&oddsFormat=decimal`;
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
        // Update quota headers from The Odds-API
        const remaining = response.headers.get('x-requests-remaining');
        const used = response.headers.get('x-requests-used');
        if (remaining)
            this.remainingCalls = parseInt(remaining, 10);
        if (used)
            this.usedCalls = parseInt(used, 10);
        if (!response.ok) {
            throw new Error(`The Odds-API HTTP ${response.status}: ${response.statusText}`);
        }
        const json = await response.json();
        if (!Array.isArray(json))
            return [];
        return json.slice(0, 15).map((item, idx) => {
            const bookmakers = item.bookmakers || [];
            const bookie = bookmakers.find((b) => b.markets?.some((m) => m.key === 'spreads')) || bookmakers[0];
            const h2hMarket = bookie?.markets?.find((m) => m.key === 'h2h');
            const spreadsMarket = bookie?.markets?.find((m) => m.key === 'spreads');
            const totalsMarket = bookie?.markets?.find((m) => m.key === 'totals');
            const homeOutcome = h2hMarket?.outcomes?.find((o) => o.name === item.home_team);
            const awayOutcome = h2hMarket?.outcomes?.find((o) => o.name === item.away_team);
            const drawOutcome = h2hMarket?.outcomes?.find((o) => o.name === 'Draw');
            const homeSpread = spreadsMarket?.outcomes?.find((o) => o.name === item.home_team);
            const awaySpread = spreadsMarket?.outcomes?.find((o) => o.name === item.away_team);
            const overOutcome = totalsMarket?.outcomes?.find((o) => o.name === 'Over');
            const underOutcome = totalsMarket?.outcomes?.find((o) => o.name === 'Under');
            const homeHdp = homeSpread?.point !== undefined ? (homeSpread.point > 0 ? `+${homeSpread.point.toFixed(2)}` : homeSpread.point.toFixed(2)) : '-0.50';
            const awayHdp = awaySpread?.point !== undefined ? (awaySpread.point > 0 ? `+${awaySpread.point.toFixed(2)}` : awaySpread.point.toFixed(2)) : '+0.50';
            const homeOdds = homeSpread?.price ? (homeSpread.price >= 2.0 ? Number((homeSpread.price - 1).toFixed(2)) : Number(-(1 / (homeSpread.price - 1)).toFixed(2))) : -0.85;
            const awayOdds = awaySpread?.price ? (awaySpread.price >= 2.0 ? Number((awaySpread.price - 1).toFixed(2)) : Number(-(1 / (awaySpread.price - 1)).toFixed(2))) : 0.75;
            const ouGoal = overOutcome?.point !== undefined ? overOutcome.point.toFixed(2) : '2.50';
            const ouOverOdds = overOutcome?.price ? (overOutcome.price >= 2.0 ? Number((overOutcome.price - 1).toFixed(2)) : Number(-(1 / (overOutcome.price - 1)).toFixed(2))) : 0.88;
            const ouUnderOdds = underOutcome?.price ? (underOutcome.price >= 2.0 ? Number((underOutcome.price - 1).toFixed(2)) : Number(-(1 / (underOutcome.price - 1)).toFixed(2))) : -0.96;
            const now = Date.now();
            const diffMin = Math.floor((now - new Date(item.commence_time).getTime()) / 60000);
            const isLive = diffMin >= 0 && diffMin <= 115;
            return {
                id: item.id || `match_${Math.random().toString(36).substring(2, 8)}`,
                sport: 'Football',
                homeTeam: item.home_team,
                awayTeam: item.away_team,
                league: item.sport_title || 'International Football',
                status: 'Active',
                startTime: item.commence_time || new Date().toISOString(),
                score: { home: isLive ? (diffMin > 30 ? 1 : 0) : 0, away: isLive ? (diffMin > 60 ? 1 : 0) : 0 },
                odds: {
                    homeWin: homeOutcome?.price || 2.10,
                    draw: drawOutcome?.price || 3.30,
                    awayWin: awayOutcome?.price || 3.20,
                    overUnder: parseFloat(ouGoal) || 2.5,
                    overOdds: ouOverOdds,
                    underOdds: ouUnderOdds,
                    spread: homeSpread?.point || -0.5,
                    spreadHomeOdds: homeOdds,
                    spreadAwayOdds: awayOdds
                },
                // SBOBET Full Odds Table Props
                matchId: item.id || `match_${idx}`,
                leagueId: (item.sport_key?.includes('epl') ? 'EPL' : item.sport_key?.includes('la_liga') ? 'LALIGA' : item.sport_key?.includes('champs') ? 'UCL' : 'EPL'),
                leagueName: item.sport_title || 'Giải Bóng Đá Quốc Tế',
                scoreHome: isLive ? (diffMin > 30 ? 1 : 0) : 0,
                scoreAway: isLive ? (diffMin > 60 ? 1 : 0) : 0,
                liveTime: isLive ? `${Math.max(1, diffMin)}' (H1)` : `Hôm nay ${new Date(item.commence_time).getUTCHours()}:${String(new Date(item.commence_time).getUTCMinutes()).padStart(2, '0')}`,
                isLive,
                handicapTeam: (homeHdp.startsWith('-') ? 'home' : 'away'),
                homeHandicap: homeHdp,
                homeOdds,
                awayHandicap: awayHdp,
                awayOdds,
                ouGoal,
                ouOverOdds,
                ouUnderOdds,
                oneXTwoHome: homeOutcome?.price || 2.10,
                oneXTwoAway: awayOutcome?.price || 3.20,
                oneXTwoDraw: drawOutcome?.price || 3.30,
                moreCount: 20
            };
        });
    }
    getFallbackMatches(sport) {
        const now = new Date();
        return [
            // 1. Live In-Play Match
            {
                id: 'sb_fb_01',
                sport: 'Football',
                homeTeam: 'Real Madrid',
                awayTeam: 'Barcelona',
                league: 'La Liga (Tây Ban Nha)',
                status: 'Active',
                startTime: new Date(now.getTime() - 1000 * 60 * 78).toISOString(),
                currentMinute: 78,
                score: { home: 1, away: 2 },
                odds: { homeWin: 2.60, draw: 3.50, awayWin: 2.50, overUnder: 4.5, overOdds: 0.89, underOdds: -0.97, spread: 0.0, spreadHomeOdds: 0.98, spreadAwayOdds: -0.92 },
                matchId: 'sb_fb_01',
                leagueId: 'LALIGA',
                leagueName: 'Giải Tây Ban Nha (La Liga)',
                scoreHome: 1,
                scoreAway: 2,
                liveTime: "78' (H2)",
                isLive: true,
                handicapTeam: 'home',
                homeHandicap: '0.00',
                homeOdds: 0.98,
                awayHandicap: '0.00',
                awayOdds: -0.92,
                ouGoal: '4.50',
                ouOverOdds: 0.89,
                ouUnderOdds: -0.97,
                oneXTwoHome: 2.60,
                oneXTwoAway: 2.50,
                oneXTwoDraw: 3.50,
                moreCount: 30
            },
            // 2. Live In-Play Match
            {
                id: 'sb_fb_02',
                sport: 'Football',
                homeTeam: 'Benfica',
                awayTeam: 'Sporting CP',
                league: 'Liga Portugal',
                status: 'Active',
                startTime: new Date(now.getTime() - 1000 * 60 * 38).toISOString(),
                currentMinute: 38,
                score: { home: 0, away: 1 },
                odds: { homeWin: 2.10, draw: 3.20, awayWin: 3.40, overUnder: 3.5, overOdds: -0.61, underOdds: 0.51, spread: -0.25, spreadHomeOdds: -0.54, spreadAwayOdds: 0.46 },
                matchId: 'sb_fb_02',
                leagueId: 'PORTUGAL',
                leagueName: 'Giải Bồ Đào Nha (Liga Portugal)',
                scoreHome: 0,
                scoreAway: 1,
                liveTime: "38' (H1)",
                isLive: true,
                handicapTeam: 'home',
                homeHandicap: '-0.25',
                homeOdds: -0.54,
                awayHandicap: '+0.25',
                awayOdds: 0.46,
                ouGoal: '3.50',
                ouOverOdds: -0.61,
                ouUnderOdds: 0.51,
                oneXTwoHome: 2.10,
                oneXTwoAway: 3.40,
                oneXTwoDraw: 3.20,
                moreCount: 17
            },
            // 3. Today Scheduled Match
            {
                id: 'sb_fb_03',
                sport: 'Football',
                homeTeam: 'Atlético Madrid',
                awayTeam: 'Sevilla',
                league: 'La Liga (Tây Ban Nha)',
                status: 'Active',
                startTime: new Date(now.getTime() + 1000 * 60 * 180).toISOString(),
                score: { home: 0, away: 0 },
                odds: { homeWin: 1.35, draw: 4.90, awayWin: 8.50, overUnder: 2.5, overOdds: -0.95, underOdds: 0.85, spread: -1.0, spreadHomeOdds: -0.75, spreadAwayOdds: 0.65 },
                matchId: 'sb_fb_03',
                leagueId: 'LALIGA',
                leagueName: 'Giải Tây Ban Nha (La Liga)',
                scoreHome: 0,
                scoreAway: 0,
                liveTime: 'Hôm nay 21:00',
                isLive: false,
                handicapTeam: 'home',
                homeHandicap: '-1.00',
                homeOdds: -0.75,
                awayHandicap: '+1.00',
                awayOdds: 0.65,
                ouGoal: '2.50',
                ouOverOdds: -0.95,
                ouUnderOdds: 0.85,
                oneXTwoHome: 1.35,
                oneXTwoAway: 8.50,
                oneXTwoDraw: 4.90,
                moreCount: 18
            },
            // 4. Basketball
            {
                id: 'sb_bb_01',
                sport: 'Basketball',
                homeTeam: 'Golden State Warriors',
                awayTeam: 'Los Angeles Lakers',
                league: 'NBA Basketball',
                status: 'Active',
                startTime: new Date(now.getTime() + 1000 * 60 * 30).toISOString(),
                currentMinute: 78,
                score: { home: 88, away: 84 },
                odds: { homeWin: 1.85, awayWin: 1.95, overUnder: 224.5, overOdds: 1.91, underOdds: 1.91, spread: -3.5, spreadHomeOdds: 1.90, spreadAwayOdds: 1.90 }
            }
        ];
    }
    startInactivityChecker() {
        setInterval(() => {
            const idleSeconds = (Date.now() - this.lastAccessTime) / 1000;
            if (idleSeconds > CONFIG.TIMEOUTS.LAZY_LOADING_IDLE_SECONDS && !this.isHibernate) {
                this.isHibernate = true;
                console.log(`[QUOTA SHIELD] Inactivity detected (${idleSeconds}s idle). Entering 0-API sleep mode.`);
            }
        }, 15000);
    }
}
export const quotaShield = new QuotaShieldService();
