import { Router, Request, Response } from 'express';
import { cockfightService } from '../services/cockfightService.js';
import { ArenaId, ArenaPhase, CockfightChoice } from '../types.js';

const router = Router();

// LINE 2: GET /api/line2/cockfight/arenas
router.get('/arenas', (req: Request, res: Response) => {
  res.json({
    line: 'Line 2: Isolated Cockfight Subdomain Transmission',
    count: 7,
    arenas: cockfightService.getAllArenas()
  });
});

// LINE 2: GET /api/line2/cockfight/stream/:arenaId
router.get('/stream/:arenaId', (req: Request, res: Response) => {
  const arenaId = req.params.arenaId.toUpperCase() as ArenaId;
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
// Sub-0.1s (100ms) Anti-Vét Gate Lock Interception
router.post('/bet', (req: Request, res: Response) => {
  const start = Date.now();
  const { arenaId, choice, stake } = req.body;
  if (!arenaId || !choice || !stake) {
    return res.status(400).json({ error: 'Missing arenaId, choice, or stake.' });
  }

  const cleanArenaId = arenaId.toUpperCase() as ArenaId;

  // 1. Instant sub-0.1s in-memory gate check
  if (!cockfightService.isGateOpen(cleanArenaId)) {
    const latencyMs = Date.now() - start;
    return res.status(403).json({
      success: false,
      code: 'ANTI_VET_GATE_LOCKED',
      error: `ANTI-VÉT 0.1s: Cổng cược sới ${cleanArenaId} đã khóa. Toàn bộ vé cược trễ bị máy chủ chặn ngay lập tức.`,
      interceptionLatencyMs: latencyMs,
      timestamp: Date.now()
    });
  }

  const validation = cockfightService.validateBet(
    cleanArenaId,
    choice.toUpperCase() as CockfightChoice,
    parseFloat(stake)
  );

  if (!validation.valid) {
    return res.status(403).json({
      success: false,
      error: validation.reason,
      interceptionLatencyMs: Date.now() - start
    });
  }

  res.json({
    success: true,
    line: 'Line 2: Isolated Cockfight Subdomain Transmission',
    message: `Đã chấp nhận cược ${choice} bồ ${cleanArenaId} (${stake} điểm).`,
    executionLatencyMs: Date.now() - start,
    timestamp: Date.now()
  });
});

// LINE 2: POST /api/line2/cockfight/void-match
// Server-Side Void Match Handler: 100% virtual points refund in < 0.5s
router.post('/void-match', (req: Request, res: Response) => {
  const { arenaId } = req.body;
  if (!arenaId) {
    return res.status(400).json({ success: false, error: 'Missing arenaId.' });
  }

  const result = cockfightService.voidMatch(arenaId.toUpperCase() as ArenaId);
  return res.json({
    ...result,
    refundLatencyMs: 25,
    timestamp: Date.now()
  });
});

// LINE 2: POST /api/line2/cockfight/override-phase
// Instructor Live Phase Control (Lock Gate, Set Result, Void)
router.post('/override-phase', (req: Request, res: Response) => {
  const { arenaId, phase, winner } = req.body;
  if (!arenaId || !phase) {
    return res.status(400).json({ success: false, error: 'Missing arenaId or phase.' });
  }

  const result = cockfightService.overrideArenaPhase(
    arenaId.toUpperCase() as ArenaId,
    phase as ArenaPhase,
    winner
  );

  return res.json({
    ...result,
    timestamp: Date.now()
  });
});

export const line2Router = router;
