import { Router } from 'express';
import { casinoEngine } from '../services/casinoEngine.js';
import { telegramService } from '../services/telegramService.js';
import { renderTaiXiuHtml } from '../views/htmlRenderers.js';
const router = Router();
// LINE 3: GET /api/line3/internal/casino/taixiu/state
// Returns live Tài Xỉu 40s countdown loop, 5s buffer flag, and 30-round Soi Cầu history
router.get('/casino/taixiu/state', (req, res) => {
    const data = {
        line: 'Line 3: Internal Mobile Core Transmission',
        state: casinoEngine.getTaiXiuState(),
        isBettingOpen: casinoEngine.isBettingOpen()
    };
    // If opened in browser without ?format=json, render beautiful visual dashboard
    if (req.get('accept')?.includes('text/html') && req.query.format !== 'json') {
        return res.type('html').send(renderTaiXiuHtml(data));
    }
    res.json(data);
});
// LINE 3: GET /api/line3/internal/casino/xocdia/state
// Returns live Xóc Đĩa 4-token plate state, shaking phase, and outcome trends
router.get('/casino/xocdia/state', (req, res) => {
    res.json({
        line: 'Line 3: Internal Mobile Core Transmission',
        state: casinoEngine.getXocDiaState()
    });
});
// LINE 3: POST /api/line3/internal/telegram/webhook
// Inbound Telegram Bot webhook listener for authorized administrator overrules
router.post('/telegram/webhook', (req, res) => {
    const result = telegramService.handleWebhookUpdate(req.body);
    res.json({
        line: 'Line 3: Internal Mobile Core Transmission',
        received: true,
        ...result
    });
});
// LINE 3: POST /api/line3/internal/admin/override
// Local Staging Administrator direct override simulator
router.post('/admin/override', (req, res) => {
    const { game, target } = req.body;
    if (game === 'taixiu' && (target === 'TAI' || target === 'XIU')) {
        casinoEngine.setTaiXiuOverride(target);
        return res.json({ success: true, message: `Tai Xiu outcome forced to: ${target}` });
    }
    if (game === 'xocdia' && (target === 'C' || target === 'L')) {
        casinoEngine.setXocDiaOverride(target);
        return res.json({ success: true, message: `Xoc Dia outcome forced to: ${target}` });
    }
    res.status(400).json({ error: 'Invalid game or target override.' });
});
export const line3Router = router;
