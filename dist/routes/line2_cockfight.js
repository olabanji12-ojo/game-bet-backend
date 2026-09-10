import { Router } from 'express';
import { cockfightService } from '../services/cockfightService.js';
const router = Router();
// LINE 2: GET /api/line2/cockfight/arenas
// Returns all 7 SV388 live arena feeds with 3s polling frequencies
router.get('/arenas', (req, res) => {
    res.json({
        line: 'Line 2: Isolated Cockfight Subdomain Transmission',
        count: 7,
        arenas: cockfightService.getAllArenas()
    });
});
// LINE 2: GET /api/line2/cockfight/stream/:arenaId
// Returns authenticated HLS video stream routing
router.get('/stream/:arenaId', (req, res) => {
    const arenaId = req.params.arenaId.toUpperCase();
    const arena = cockfightService.getArena(arenaId);
    if (!arena) {
        return res.status(404).json({ error: `Arena ${arenaId} not found.` });
    }
    res.json({
        line: 'Line 2: Isolated Cockfight Subdomain Transmission',
        arenaId,
        name: arena.name,
        streamUrl: arena.streamUrl,
        status: arena.status,
        timeRemainingSeconds: arena.timeRemainingSeconds
    });
});
// LINE 2: POST /api/line2/cockfight/bet
// Validates bet under the strict 3-second Anti-Vét lock
router.post('/bet', (req, res) => {
    const { arenaId, choice, stake } = req.body;
    if (!arenaId || !choice || !stake) {
        return res.status(400).json({ error: 'Missing arenaId, choice, or stake.' });
    }
    const validation = cockfightService.validateBet(arenaId.toUpperCase(), choice.toUpperCase(), parseFloat(stake));
    if (!validation.valid) {
        return res.status(403).json({
            success: false,
            error: validation.reason
        });
    }
    res.json({
        success: true,
        line: 'Line 2: Isolated Cockfight Subdomain Transmission',
        message: `Đã chấp nhận cược ${choice} bồ ${arenaId} (${stake} điểm).`
    });
});
export const line2Router = router;
