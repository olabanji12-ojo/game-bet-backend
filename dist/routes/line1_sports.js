import { Router } from 'express';
import { quotaShield } from '../services/quotaShield.js';
const router = Router();
// LINE 1: GET /api/line1/sports/live
// Delivers live sports odds protected by the 15s in-memory RAM cache shield
router.get('/live', async (req, res) => {
    try {
        const sport = req.query.sport || 'soccer';
        const matches = await quotaShield.getLiveMatches(sport);
        res.json({
            line: 'Line 1: Main Sportsbook Transmission Node',
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
