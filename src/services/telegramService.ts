import { CONFIG } from '../config.js';
import { casinoEngine } from './casinoEngine.js';
import { betQueue } from './betQueue.js';
import { quotaShield } from './quotaShield.js';
import { walletLedger } from './walletLedger.js';

export class TelegramService {
  public handleWebhookUpdate(update: any): { handled: boolean; replyText?: string } {
    if (!update || !update.message || !update.message.text) {
      return { handled: false };
    }

    const text = update.message.text.trim();
    const chatId = update.message.chat?.id?.toString();

    // Verify authorized admin if configured
    if (CONFIG.TELEGRAM.ADMIN_CHAT_ID && chatId !== CONFIG.TELEGRAM.ADMIN_CHAT_ID) {
      console.warn(`[TELEGRAM] Unauthorized command attempt from Chat ID: ${chatId}`);
      return { handled: false, replyText: 'Unauthorized.' };
    }

    // Command: /override
    if (text.startsWith('/override')) {
      const parts = text.split(' ');
      const target = parts[1]?.toLowerCase();
      if (target === 'tai' || target === 'xiu') {
        casinoEngine.setTaiXiuOverride(target.toUpperCase() as 'TAI' | 'XIU');
        return { handled: true, replyText: `✅ Đã ép kết quả Tài Xỉu phiên kế tiếp: ${target.toUpperCase()}` };
      }
      if (target === 'chan' || target === 'le') {
        casinoEngine.setXocDiaOverride(target === 'chan' ? 'C' : 'L');
        return { handled: true, replyText: `✅ Đã ép kết quả Xóc Đĩa phiên kế tiếp: ${target.toUpperCase()}` };
      }
      return { handled: true, replyText: 'Cú pháp: /override [tai|xiu|chan|le]' };
    }

    // Command: /tier
    if (text.startsWith('/tier')) {
      const parts = text.split(' ');
      const tierNum = parseInt(parts[1], 10);
      if (tierNum === 1 || tierNum === 2 || tierNum === 3) {
        betQueue.setPlatformTier(tierNum);
        return { handled: true, replyText: `🛡️ Đã chuyển chế độ Anti-Latency sang Tier ${tierNum}` };
      }
      return { handled: true, replyText: 'Cú pháp: /tier [1|2|3]' };
    }

    // Command: /status
    if (text.startsWith('/status')) {
      const quota = quotaShield.getMetrics();
      const wallet = walletLedger.getWallet();
      const tier = betQueue.getPlatformTier();
      const statusMessage = [
        '📊 **FANCLUB68 HỆ THỐNG TRẠNG THÁI**',
        `• Anti-Latency Tier: Tier ${tier}`,
        `• Quota API Còn: ${quota.remainingCalls} / ${quota.monthlyLimit}`,
        `• Tỷ Lệ Trúng Cache: ${quota.cacheHitRate}%`,
        `• Số Dư Ví Staging: $${wallet.balance.toFixed(2)}`,
        `• Đang Chờ Xử Lý: ${betQueue.getQueue().filter(b => b.status === 'QUEUED').length} vé`
      ].join('\n');
      return { handled: true, replyText: statusMessage };
    }

    return { handled: false };
  }
}

export const telegramService = new TelegramService();
