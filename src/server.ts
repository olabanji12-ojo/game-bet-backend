import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { CONFIG, printConfigBanner } from './config.js';
import { line1Router } from './routes/line1_sports.js';
import { line2Router } from './routes/line2_cockfight.js';
import { line3Router } from './routes/line3_internal.js';
import { betQueue } from './services/betQueue.js';
import { walletLedger } from './services/walletLedger.js';
import { BetSelection, BetType } from './types.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Subdomain isolation routing middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = req.headers.host || '';
  if (host.startsWith('line2.')) {
    // Route directly to Line 2 Cockfight Subdomain
    return line2Router(req, res, next);
  }
  if (host.startsWith('line3.')) {
    // Route directly to Line 3 Internal Casino & Webhooks
    return line3Router(req, res, next);
  }
  next();
});

// Dedicated 3-Transmission Lines
app.use('/api/line1/sports', line1Router);
app.use('/api/line2/cockfight', line2Router);
app.use('/api/line3/internal', line3Router);

// Unified Anti-Latency Bet Placement Queue
app.post('/api/bets/place', (req: Request, res: Response) => {
  const { userId, type, selections, stake } = req.body;
  if (!type || !selections || !Array.isArray(selections) || selections.length === 0 || !stake) {
    return res.status(400).json({ success: false, error: 'Invalid bet payload.' });
  }

  const result = betQueue.enqueueBet(
    userId || 'user_demo_01',
    type as BetType,
    selections as BetSelection[],
    parseFloat(stake)
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  res.status(202).json({
    ...result,
    message: `Vé cược đã tiếp nhận vào hàng đợi trễ (${result.bet?.delaySeconds}s delay).`,
    wallet: walletLedger.getWallet()
  });
});

app.get('/api/bets/queue', (req: Request, res: Response) => {
  res.json({
    tier: betQueue.getPlatformTier(),
    count: betQueue.getQueue().length,
    bets: betQueue.getQueue().slice(-30).reverse()
  });
});

app.post('/api/bets/tier', (req: Request, res: Response) => {
  const { tier } = req.body;
  if (tier === 1 || tier === 2 || tier === 3) {
    betQueue.setPlatformTier(tier);
    return res.json({ success: true, tier: betQueue.getPlatformTier() });
  }
  res.status(400).json({ error: 'Tier must be 1, 2, or 3.' });
});

// Double-Entry Wallet Ledger API
app.get('/api/wallet', (req: Request, res: Response) => {
  res.json(walletLedger.getWallet());
});

app.post('/api/wallet/deposit', (req: Request, res: Response) => {
  const { amount } = req.body;
  try {
    const updatedWallet = walletLedger.deposit(parseFloat(amount));
    res.json({ success: true, wallet: updatedWallet });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/api/wallet/reset', (req: Request, res: Response) => {
  res.json({ success: true, wallet: walletLedger.reset() });
});

// Staging Server Health Check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    service: 'Fanclub68 / SBOBET Backend Gateway',
    timestamp: new Date().toISOString(),
    environment: CONFIG.SERVER.NODE_ENV,
    lines: {
      line1: 'ACTIVE (/api/line1/sports)',
      line2: 'ACTIVE (/api/line2/cockfight)',
      line3: 'ACTIVE (/api/line3/internal)'
    }
  });
});

// Print startup banner and start HTTP server
printConfigBanner();

const PORT = CONFIG.SERVER.PORT;
app.listen(PORT, () => {
  console.log(`🚀 [SERVER RUNNING]: Listening on http://localhost:${PORT}`);
  console.log(`   • Line 1 Sports:     http://localhost:${PORT}/api/line1/sports/live`);
  console.log(`   • Line 2 Cockfight:  http://localhost:${PORT}/api/line2/cockfight/arenas`);
  console.log(`   • Line 3 Casino:     http://localhost:${PORT}/api/line3/internal/casino/taixiu/state`);
  console.log(`   • Health Endpoint:   http://localhost:${PORT}/health\n`);
});

export default app;
