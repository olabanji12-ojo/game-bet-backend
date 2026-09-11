import { Router } from 'express';
import { quotaShield } from '../services/quotaShield.js';
const router = Router();
// LINE 1: GET /api/line1/sports/live
// Delivers live in-play sports odds protected by the 15s in-memory RAM cache shield
router.get('/live', async (req, res) => {
    try {
        const sport = req.query.sport || 'soccer';
        const matches = await quotaShield.getLiveMatches(sport);
        const liveMatches = matches.filter(m => m.isLive);
        res.json({
            line: 'Line 1: Main Sportsbook Transmission Node (Live In-Play)',
            sport,
            cachedTtlSeconds: 15,
            count: liveMatches.length > 0 ? liveMatches.length : matches.length,
            matches: liveMatches.length > 0 ? liveMatches : matches
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// LINE 1: GET /api/line1/sports/today
// Delivers today scheduled sports odds
router.get('/today', async (req, res) => {
    try {
        const sport = req.query.sport || 'soccer';
        const matches = await quotaShield.getLiveMatches(sport);
        const todayMatches = matches.filter(m => !m.isLive);
        res.json({
            line: 'Line 1: Main Sportsbook Transmission Node (Today Scheduled)',
            sport,
            cachedTtlSeconds: 15,
            count: todayMatches.length > 0 ? todayMatches.length : matches.length,
            matches: todayMatches.length > 0 ? todayMatches : matches
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// LINE 1: GET /api/line1/sports/all
// Delivers all live and scheduled matches
router.get('/all', async (req, res) => {
    try {
        const sport = req.query.sport || 'soccer';
        const matches = await quotaShield.getLiveMatches(sport);
        res.json({
            line: 'Line 1: Main Sportsbook Transmission Node (Master Feed)',
            sport,
            cachedTtlSeconds: 15,
            count: matches.length,
            matches
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// LINE 1: GET /api/line1/sports/quota
// Reports real-time API quota, remaining calls, and RAM cache efficiency
router.get('/quota', (req, res) => {
    res.json({
        line: 'Line 1: Main Sportsbook Transmission Node',
        metrics: quotaShield.getMetrics()
    });
});
export const line1Router = router;
