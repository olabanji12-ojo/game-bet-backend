import { CONFIG } from '../config.js';
const ROOSTER_BREEDS = ['Gà Asil', 'Gà Tre', 'Gà Peru', 'Gà Kelso', 'Gà Sweater', 'Gà Hatch', 'Gà Cuban'];
const SPUR_TYPES_CAMBODIA = ['Cựa Sắt Tròn (Thomo)', 'Cựa Tháp Sắt', 'Cựa Tròn 2.5 Inch'];
const SPUR_TYPES_PHILIPPINES = ['Cựa Dao Slasher (Pasay)', 'Cựa Dao Double Blade', 'Cựa Dao Derby'];
const DEFAULT_TEACHING_SOURCES = [
    {
        id: 'source1',
        sourceKey: 'source1',
        name: 'Source 1: ga6789.com (Thomo Center)',
        provider: 'ga6789.com',
        url: 'https://ga6789.com',
        type: 'proxy_iframe',
        status: 'ONLINE'
    },
    {
        id: 'source2',
        sourceKey: 'source2',
        name: 'Source 2: bj988.com (Pasay Center)',
        provider: 'bj988.com',
        url: 'https://bj988.com/vn/vn',
        type: 'proxy_iframe',
        status: 'ONLINE'
    },
    {
        id: 'source3',
        sourceKey: 'source3',
        name: 'Source 3: daga88.net (Backup Feed)',
        provider: 'daga88.net',
        url: 'https://daga88.net',
        type: 'proxy_iframe',
        status: 'ONLINE'
    },
    {
        id: 'fallback_hls',
        sourceKey: 'fallback_hls',
        name: 'Source 4: High-Bitrate Live Feed (HLS 60FPS Backup)',
        provider: 'mux.dev',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        type: 'hls',
        status: 'ONLINE'
    }
];
export class CockfightService {
    arenas = new Map();
    classroomMode = true; // Enabled by default for teaching/demo, toggleable
    teachingSources = JSON.parse(JSON.stringify(DEFAULT_TEACHING_SOURCES));
    activeSourceIndex = 0;
    failoverLogs = [];
    isHealthChecking = false;
    constructor() {
        this.initializeArenas();
        this.startAutonomousLoop();
        this.startStreamHealthCheckDaemon();
    }
    generateRooster(side, location, matchNum) {
        const breed = ROOSTER_BREEDS[Math.floor(Math.random() * ROOSTER_BREEDS.length)];
        const weightKg = Math.round((2.80 + Math.random() * 0.70) * 100) / 100;
        const spurList = location === 'Philippines' ? SPUR_TYPES_PHILIPPINES : SPUR_TYPES_CAMBODIA;
        const spurType = spurList[Math.floor(Math.random() * spurList.length)];
        const wins = 3 + Math.floor(Math.random() * 8);
        const losses = Math.floor(Math.random() * 3);
        const tag = `${side.charAt(0)}-#${matchNum}${Math.floor(100 + Math.random() * 900)}`;
        return {
            breed,
            weightKg,
            spurType,
            record: `${wins}W - ${losses}L`,
            tag
        };
    }
    // Check operating hours in Asian GMT+7 (ICT)
    checkArenaOpenStatus(id) {
        if (this.classroomMode) {
            // In classroom teaching mode, arenas are always accessible
            const hours = id.startsWith('CPC') ? '11:00 AM – 17:00 PM (GMT+7)' : '14:00 PM – 02:00 AM (GMT+7)';
            return { isOpen: true, operatingHours: hours };
        }
        const now = new Date();
        // Calculate GMT+7 hour
        const utcHour = now.getUTCHours();
        const gmt7Hour = (utcHour + 7) % 24;
        if (id.startsWith('CPC')) {
            // Thomo: 11:00 AM to 17:00 PM
            const isOpen = gmt7Hour >= 11 && gmt7Hour < 17;
            return { isOpen, operatingHours: '11:00 AM – 17:00 PM (GMT+7)' };
        }
        else {
            // Philippine: 14:00 PM to 02:00 AM
            const isOpen = gmt7Hour >= 14 || gmt7Hour < 2;
            return { isOpen, operatingHours: '14:00 PM – 02:00 AM (GMT+7)' };
        }
    }
    initializeArenas() {
        const arenaDefs = [
            { id: 'CPC1', name: 'Thomo CPC1 VIP Arena', location: 'Cambodia' },
            { id: 'CPC2', name: 'Thomo CPC2 Grand Arena', location: 'Cambodia' },
            { id: 'CPC3', name: 'Thomo CPC3 Iron Spur', location: 'Cambodia' },
            { id: 'CPC4', name: 'Thomo CPC4 Derby', location: 'Cambodia' },
            { id: 'PH1', name: 'Pasay City PH1 Colosseum', location: 'Philippines' },
            { id: 'PH2', name: 'Davao PH2 Cockpit Arena', location: 'Philippines' },
            { id: 'PH3', name: 'Cebu PH3 Live Cockpit', location: 'Philippines' },
        ];
        arenaDefs.forEach((def, index) => {
            const { isOpen, operatingHours } = this.checkArenaOpenStatus(def.id);
            const currentMatch = 14 + index * 4;
            const initialPhase = isOpen ? 'BETTING_OPEN' : 'CLOSED';
            this.arenas.set(def.id, {
                id: def.id,
                name: def.name,
                location: def.location,
                isOpen,
                operatingHours,
                status: isOpen ? 'BETTING_OPEN' : 'CLOSED',
                phase: initialPhase,
                meronOdds: Math.round((0.82 + Math.random() * 0.10) * 100) / 100,
                walaOdds: Math.round((0.95 + Math.random() * 0.08) * 100) / 100,
                bddOdds: 8.00,
                timeRemainingSeconds: this.classroomMode ? 45 + index * 10 : 180 + index * 60,
                streamUrl: `https://live.sv388cdn.com/hls/${def.id.toLowerCase()}/master.m3u8`,
                currentMatch,
                meronRooster: this.generateRooster('MERON', def.location, currentMatch),
                walaRooster: this.generateRooster('WALA', def.location, currentMatch),
            });
        });
    }
    getAllArenas() {
        return Array.from(this.arenas.values());
    }
    getArena(id) {
        return this.arenas.get(id);
    }
    isClassroomMode() {
        return this.classroomMode;
    }
    setClassroomMode(mode) {
        this.classroomMode = mode;
    }
    setArenaStreamUrl(arenaId, url) {
        const arena = this.arenas.get(arenaId);
        if (!arena)
            return false;
        arena.customStreamUrl = url;
        return true;
    }
    // Validate bet under the 3-second Anti-Vét gate lock & operating status
    validateBet(arenaId, choice, stake) {
        const arena = this.arenas.get(arenaId);
        if (!arena) {
            return { valid: false, reason: `Không tìm thấy đấu trường ${arenaId}.` };
        }
        if (!arena.isOpen && !this.classroomMode) {
            return {
                valid: false,
                reason: `Đấu trường ${arenaId} hiện đang đóng cửa (${arena.operatingHours}).`
            };
        }
        // 3s Anti-Vét Gate Lock check
        if (arena.phase !== 'BETTING_OPEN' || arena.timeRemainingSeconds <= CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS) {
            return {
                valid: false,
                reason: `Cổng cược bồ ${arenaId} đã khóa (Khóa an toàn ${CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS}s trước khi thả gà).`
            };
        }
        if (stake > CONFIG.RISK.MAX_BET_LIMIT_POINTS) {
            return {
                valid: false,
                reason: `Vượt quá giới hạn cược tối đa ${CONFIG.RISK.MAX_BET_LIMIT_POINTS} điểm.`
            };
        }
        return { valid: true };
    }
    // --- LINE 2 STREAM HEALTH & AUTOMATIC FAILOVER ENGINE ---
    getTeachingStreamSources() {
        return this.teachingSources;
    }
    getActiveTeachingStream() {
        const active = this.teachingSources[this.activeSourceIndex] || this.teachingSources[0];
        return {
            activeSource: active,
            index: this.activeSourceIndex,
            totalSources: this.teachingSources.length,
            failoverLogs: this.failoverLogs.slice(-10)
        };
    }
    setActiveTeachingSource(sourceIdOrKey) {
        const idx = this.teachingSources.findIndex(s => s.id === sourceIdOrKey || s.sourceKey === sourceIdOrKey);
        if (idx === -1)
            return false;
        this.activeSourceIndex = idx;
        return true;
    }
    getStreamFailoverLogs() {
        return this.failoverLogs;
    }
    /**
     * Validates if a URL is a true streaming feed vs raw non-video web page
     */
    validateStreamUrl(url) {
        if (!url || typeof url !== 'string') {
            return { isVideo: false, streamType: 'invalid', reason: 'URL không được để trống.' };
        }
        const trimmed = url.trim();
        // 1. Direct HLS
        if (trimmed.includes('.m3u8') || trimmed.endsWith('.m3u8')) {
            return { isVideo: true, streamType: 'hls' };
        }
        // 2. Direct MP4 / WebM
        if (trimmed.endsWith('.mp4') || trimmed.endsWith('.webm') || trimmed.endsWith('.ts')) {
            return { isVideo: true, streamType: 'mp4' };
        }
        // 3. Authorized Live Video Embeds
        if (trimmed.includes('player.videosv388.com') ||
            trimmed.includes('youtube.com/embed') ||
            trimmed.includes('youtu.be') ||
            trimmed.includes('twitch.tv') ||
            trimmed.includes('vimeo.com')) {
            return { isVideo: true, streamType: 'iframe' };
        }
        // 4. Authorized Cockfight Webview Centers (ga6789, bj988, daga88)
        if (trimmed.includes('ga6789.com') ||
            trimmed.includes('bj988.com') ||
            trimmed.includes('daga88')) {
            return { isVideo: true, streamType: 'proxy_iframe' };
        }
        // Otherwise reject generic web pages
        return {
            isVideo: false,
            streamType: 'invalid',
            reason: 'URL này không phải là luồng video trực tiếp hợp lệ. Vui lòng nhập liên kết .m3u8, .mp4 hoặc luồng phát trực tiếp.'
        };
    }
    /**
     * Probes a stream URL with a 2.5s strict timeout
     */
    async probeStreamHealth(url) {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2500);
            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Line2-HealthMonitor/1.0)'
                }
            }).catch(async () => {
                // Retry with GET if HEAD is rejected by some CDNs
                return await fetch(url, {
                    method: 'GET',
                    signal: controller.signal,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Line2-HealthMonitor/1.0)',
                        'Range': 'bytes=0-1024'
                    }
                });
            });
            clearTimeout(timeoutId);
            const latencyMs = Date.now() - start;
            const ok = response.status >= 200 && response.status < 400;
            return { ok, status: response.status, latencyMs };
        }
        catch (err) {
            const latencyMs = Date.now() - start;
            return { ok: false, status: 0, latencyMs, error: err?.message || 'Timeout / Connection Refused' };
        }
    }
    /**
     * Trigger automatic failover to the next source in <= 3 seconds
     */
    triggerFailover(reason) {
        const prevSource = this.teachingSources[this.activeSourceIndex];
        if (prevSource) {
            prevSource.status = 'OFFLINE';
        }
        // Advance to next source
        const nextIdx = (this.activeSourceIndex + 1) % this.teachingSources.length;
        const nextSource = this.teachingSources[nextIdx];
        this.activeSourceIndex = nextIdx;
        const log = {
            timestamp: new Date().toISOString(),
            fromSource: prevSource?.name || 'Unknown',
            toSource: nextSource?.name || 'Unknown',
            reason,
            durationMs: 2500
        };
        this.failoverLogs.push(log);
        console.warn(`⚠️ [LINE 2 FAILOVER]: Switched from [${log.fromSource}] to [${log.toSource}] (Reason: ${reason})`);
    }
    /**
     * Background asynchronous health daemon running every 2.5s
     */
    startStreamHealthCheckDaemon() {
        setInterval(async () => {
            if (this.isHealthChecking)
                return;
            this.isHealthChecking = true;
            try {
                const activeSource = this.teachingSources[this.activeSourceIndex];
                if (activeSource && activeSource.url) {
                    const health = await this.probeStreamHealth(activeSource.url);
                    activeSource.lastChecked = new Date().toISOString();
                    activeSource.latencyMs = health.latencyMs;
                    if (!health.ok) {
                        // Stream is down / black screen / firewall block -> auto-failover in <= 3s
                        this.triggerFailover(`Health check failed (Status: ${health.status}, Error: ${health.error || 'Network unreachable'})`);
                    }
                    else {
                        activeSource.status = 'ONLINE';
                    }
                }
            }
            catch (err) {
                // Guard against uncaught daemon exceptions
            }
            finally {
                this.isHealthChecking = false;
            }
        }, 2500);
    }
    startAutonomousLoop() {
        setInterval(() => {
            this.arenas.forEach((arena) => {
                const { isOpen, operatingHours } = this.checkArenaOpenStatus(arena.id);
                arena.isOpen = isOpen;
                arena.operatingHours = operatingHours;
                if (!isOpen && !this.classroomMode) {
                    arena.phase = 'CLOSED';
                    arena.status = 'CLOSED';
                    return;
                }
                if (arena.timeRemainingSeconds > 0) {
                    arena.timeRemainingSeconds--;
                    // Enter 3-second Gate Locked state
                    if (arena.timeRemainingSeconds <= CONFIG.COCKFIGHT.BOOKING_LOCK_SECONDS && arena.phase === 'BETTING_OPEN') {
                        arena.phase = 'GATE_LOCKED';
                        arena.status = 'GATE_LOCKED';
                    }
                    // Subtle realistic odds fluctuation during weighing & betting
                    if (arena.timeRemainingSeconds % 10 === 0 && (arena.phase === 'WEIGHING' || arena.phase === 'BETTING_OPEN')) {
                        const shift = (Math.random() - 0.5) * 0.04;
                        arena.meronOdds = Math.round(Math.max(0.72, Math.min(0.98, arena.meronOdds + shift)) * 100) / 100;
                        arena.walaOdds = Math.round(Math.max(0.85, Math.min(1.05, arena.walaOdds - shift)) * 100) / 100;
                    }
                }
                else {
                    // Transition cycle between authentic phases
                    if (arena.phase === 'WEIGHING' || arena.status === 'WEIGHING') {
                        // Move from Weighing to Betting Open (2 mins / 40s in class mode)
                        arena.phase = 'BETTING_OPEN';
                        arena.status = 'BETTING_OPEN';
                        arena.timeRemainingSeconds = this.classroomMode ? 40 : 120;
                    }
                    else if (arena.phase === 'GATE_LOCKED' || arena.status === 'GATE_LOCKED') {
                        // Roosters released -> Live combat phase
                        arena.phase = 'FIGHTING';
                        arena.status = 'FIGHTING';
                        arena.timeRemainingSeconds = this.classroomMode ? 25 : 90;
                    }
                    else if (arena.phase === 'FIGHTING' || arena.status === 'FIGHTING') {
                        // Match concluded -> Settle & distribute winnings
                        arena.phase = 'SETTLING';
                        arena.status = 'SETTLING';
                        arena.timeRemainingSeconds = this.classroomMode ? 8 : 20;
                    }
                    else if (arena.phase === 'SETTLING' || arena.phase === 'CLOSED') {
                        // Next Match Prep: 10–15 min Weighing & Matching in real time, or 45s in classroom mode
                        arena.currentMatch++;
                        arena.meronRooster = this.generateRooster('MERON', arena.location, arena.currentMatch);
                        arena.walaRooster = this.generateRooster('WALA', arena.location, arena.currentMatch);
                        arena.meronOdds = Math.round((0.80 + Math.random() * 0.15) * 100) / 100;
                        arena.walaOdds = Math.round((0.95 + Math.random() * 0.10) * 100) / 100;
                        arena.phase = 'WEIGHING';
                        arena.status = 'WEIGHING';
                        arena.timeRemainingSeconds = this.classroomMode ? 50 : 600; // 10 minutes realistic weighing
                    }
                }
            });
        }, 1000);
    }
}
export const cockfightService = new CockfightService();
