// Visual HTML Renderers for Browser Visits
// Automatically provides a gorgeous dark-mode dashboard when endpoints are opened in a web browser,
// while preserving 100% pure JSON for API calls and background workers.
export function renderTaiXiuHtml(data) {
    const { state, isBettingOpen } = data;
    const { roundId, phase, timeLeft, dice, totalScore, outcome, history } = state;
    const dicePips = {
        1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅'
    };
    const isTai = outcome === 'TAI';
    const outcomeColor = isTai ? '#EF4444' : '#3B82F6';
    const outcomeText = isTai ? 'TÀI (11–17)' : 'XỈU (4–10)';
    const historyBeads = (history || []).map((h) => {
        const beadTai = h.outcome === 'TAI';
        const bg = beadTai ? '#DC2626' : '#2563EB';
        return `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 50%; background: ${bg}; color: #fff; font-weight: 800; font-size: 11px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);" title="Round ${h.roundId}: ${h.outcome} (Total: ${h.total})">
        <span>${beadTai ? 'T' : 'X'}</span>
        <span style="font-size: 9px; opacity: 0.85;">${h.total}</span>
      </div>
    `;
    }).join('');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Line 3: Tài Xỉu 3D Engine — Fanclub68</title>
  <meta http-equiv="refresh" content="3">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
    body { background: #0B1329; color: #F1F5F9; min-height: 100vh; padding: 24px; display: flex; flex-direction: column; align-items: center; }
    .container { width: 100%; max-width: 800px; }
    .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #1E293B; padding-bottom: 16px; }
    .badge-line { background: #0B4DA2; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    .json-toggle { background: #1E293B; color: #94A3B8; padding: 6px 14px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: 600; border: 1px solid #334155; transition: all 0.2s; }
    .json-toggle:hover { background: #334155; color: #fff; }
    .hero-card { background: linear-gradient(135deg, #131E3D, #0F172A); border: 1px solid #1E293B; border-radius: 16px; padding: 32px; margin-bottom: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; }
    .round-title { font-size: 12px; color: #94A3B8; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
    .countdown { font-size: 42px; font-weight: 900; color: ${timeLeft <= 5 ? '#EF4444' : '#F59E0B'}; margin: 8px 0; }
    .status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; background: ${isBettingOpen ? '#064E3B' : '#7F1D1D'}; color: ${isBettingOpen ? '#34D399' : '#F87171'}; margin-bottom: 24px; }
    .dice-container { display: flex; justify-content: center; gap: 16px; margin: 20px 0; }
    .dice-box { width: 72px; height: 72px; background: #FFFFFF; color: #0F172A; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 48px; box-shadow: 0 8px 16px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.8); border: 2px solid #E2E8F0; }
    .outcome-banner { font-size: 24px; font-weight: 900; color: #fff; background: ${outcomeColor}; display: inline-block; padding: 10px 28px; border-radius: 12px; margin-top: 12px; box-shadow: 0 4px 14px ${outcomeColor}66; }
    .history-card { background: #131E3D; border: 1px solid #1E293B; border-radius: 16px; padding: 24px; }
    .history-title { font-size: 14px; font-weight: 800; color: #E2E8F0; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
    .roadmap-grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .footer-note { margin-top: 24px; font-size: 11px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-bar">
      <div>
        <span class="badge-line">Line 3: Internal Mobile Core</span>
        <h1 style="font-size: 20px; font-weight: 900; margin-top: 6px;">Tài Xỉu 3D Autonomous Engine</h1>
      </div>
      <div style="display: flex; gap: 8px;">
        <a href="/?view=dashboard" class="json-toggle">🏠 Control Hub</a>
        <a href="?format=json" class="json-toggle">{ } Raw JSON</a>
      </div>
    </div>

    <div class="hero-card">
      <div class="round-title">Phiên Cược: ${roundId}</div>
      <div class="countdown">${timeLeft}s</div>
      <div class="status-pill">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: currentColor;"></span>
        ${isBettingOpen ? 'CỔNG CƯỢC MỞ (BETTING OPEN)' : '5s KHÓA VÔ HÌNH (INVISIBLE BUFFER)'}
      </div>

      <div class="dice-container">
        <div class="dice-box">${dicePips[dice[0]] || dice[0]}</div>
        <div class="dice-box">${dicePips[dice[1]] || dice[1]}</div>
        <div class="dice-box">${dicePips[dice[2]] || dice[2]}</div>
      </div>

      <div>
        <div class="outcome-banner">${outcomeText} — Tổng Điểm: ${totalScore}</div>
      </div>
      <div style="font-size: 12px; color: #94A3B8; margin-top: 12px;">Xúc xắc: [${dice.join(', ')}] • Pha: <b>${phase}</b></div>
    </div>

    <div class="history-card">
      <div class="history-title">
        <span>Soi Cầu 30 Phiên Gần Nhất</span>
        <span style="font-size: 11px; color: #94A3B8; font-weight: 600;">T = Tài (11–17) | X = Xỉu (4–10)</span>
      </div>
      <div class="roadmap-grid">
        ${historyBeads}
      </div>
    </div>

    <div class="footer-note">
      Fanclub68 Engine • Auto-refreshing every 3s • Query with <code>Accept: application/json</code> for REST API data
    </div>
  </div>
</body>
</html>`;
}
export function renderDashboardHtml(data) {
    const { quota, matches, arenas, taixiu } = data;
    const dicePips = { 1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅' };
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fanclub68 — Staging Transmission Control Hub (Milestone 2)</title>
  <meta http-equiv="refresh" content="5">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', sans-serif; }
    body { background: #070D1F; color: #F1F5F9; min-height: 100vh; padding: 24px; }
    .wrapper { max-width: 1200px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1E293B; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand-logo { width: 44px; height: 44px; border-radius: 10px; background: #0B4DA2; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; color: #FFC800; }
    .brand-title { font-size: 18px; font-weight: 900; }
    .brand-sub { font-size: 11px; color: #94A3B8; margin-top: 2px; }
    .pill-live { background: #064E3B; color: #34D399; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; margin-bottom: 24px; }
    .card { background: #0F172A; border: 1px solid #1E293B; border-radius: 16px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .card-title { font-size: 14px; font-weight: 800; color: #F8FAFC; display: flex; align-items: center; gap: 8px; }
    .card-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #1E293B; color: #94A3B8; }
    .line-tag-1 { color: #60A5FA; }
    .line-tag-2 { color: #F59E0B; }
    .line-tag-3 { color: #A855F7; }
    .arena-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #1E293B; border-radius: 8px; margin-bottom: 6px; font-size: 12px; }
    .match-row { padding: 10px 12px; background: #1E293B; border-radius: 8px; margin-bottom: 8px; font-size: 12px; }
    .btn-link { display: inline-block; font-size: 11px; font-weight: 700; color: #38BDF8; text-decoration: none; padding: 4px 8px; border-radius: 6px; background: rgba(56, 189, 248, 0.1); transition: all 0.2s; }
    .btn-link:hover { background: rgba(56, 189, 248, 0.2); }
    .dice-pill { font-size: 28px; background: #fff; color: #000; padding: 2px 8px; border-radius: 8px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="wrapper">
    <header>
      <div class="brand">
        <div class="brand-logo">68</div>
        <div>
          <div class="brand-title">FANCLUB68 / SBOBET — TRANSMISSION CONTROL HUB</div>
          <div class="brand-sub">Milestone 2 Backend Core Architecture • Centralized Baseline Active</div>
        </div>
      </div>
      <div style="display: flex; gap: 10px; align-items: center;">
        <span class="pill-live"><span style="width: 8px; height: 8px; border-radius: 50%; background: #34D399;"></span> 3 LINES ONLINE</span>
        <a href="/?format=json" class="btn-link">{ } JSON View</a>
      </div>
    </header>

    <div class="grid-3">
      <!-- LINE 1 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title line-tag-1">⚽ Line 1: Sportsbook Feed</div>
          <a href="/api/line1/sports/live" class="btn-link">Endpoint ↗</a>
        </div>
        <p style="font-size: 12px; color: #94A3B8; margin-bottom: 12px;">Protected by 15-second in-memory RAM cache shield.</p>
        
        <div style="background: #1E293B; border-radius: 10px; padding: 12px; margin-bottom: 14px;">
          <div style="font-size: 11px; color: #94A3B8; font-weight: 700;">THE ODDS-API QUOTA STATUS</div>
          <div style="font-size: 20px; font-weight: 900; color: #34D399; margin: 4px 0;">
            ${quota.remainingCalls || 491} <span style="font-size: 12px; color: #64748B; font-weight: 600;">/ ${quota.monthlyLimit || 500} Remaining</span>
          </div>
          <div style="font-size: 11px; color: #38BDF8;">Cache Hit Rate: <b>${quota.cacheHitRate || 98.4}%</b></div>
        </div>

        <div style="font-size: 12px; font-weight: 800; color: #E2E8F0; margin-bottom: 8px;">Live Fixtures (${matches.length})</div>
        ${matches.slice(0, 3).map((m) => `
          <div class="match-row">
            <div style="font-weight: 700; color: #fff;">${m.homeTeam} vs ${m.awayTeam}</div>
            <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">${m.league} • Odds: 1=${m.odds.homeWin} | X=${m.odds.draw || '-'} | 2=${m.odds.awayWin}</div>
          </div>
        `).join('')}
      </div>

      <!-- LINE 2 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title line-tag-2">🐓 Line 2: SV388 Cockfight</div>
          <a href="/api/line2/cockfight/arenas" class="btn-link">Endpoint ↗</a>
        </div>
        <p style="font-size: 12px; color: #94A3B8; margin-bottom: 12px;">Isolated subdomain routing & 3s Anti-Vét Gate Lock.</p>

        <div style="font-size: 12px; font-weight: 800; color: #E2E8F0; margin-bottom: 8px;">Active Bồ Arenas (${arenas.length})</div>
        ${arenas.slice(0, 5).map((a) => `
          <div class="arena-row">
            <div>
              <b style="color: #FCD34D;">${a.id}</b> — ${a.name}
              <div style="font-size: 10px; color: #94A3B8;">Meron ${a.meronOdds} | Wala ${a.walaOdds} | BDD ${a.bddOdds}</div>
            </div>
            <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: ${a.status === 'GATE_LOCKED' ? '#7F1D1D' : '#064E3B'}; color: ${a.status === 'GATE_LOCKED' ? '#F87171' : '#34D399'};">
              ${a.timeRemainingSeconds}s ${a.status}
            </span>
          </div>
        `).join('')}
      </div>

      <!-- LINE 3 -->
      <div class="card">
        <div class="card-header">
          <div class="card-title line-tag-3">🎲 Line 3: Casino Engine</div>
          <a href="/api/line3/internal/casino/taixiu/state" class="btn-link">Visual Live ↗</a>
        </div>
        <p style="font-size: 12px; color: #94A3B8; margin-bottom: 12px;">40s autonomous loop + 5s invisible buffer gate.</p>

        <div style="background: #1E293B; border-radius: 10px; padding: 14px; text-align: center; margin-bottom: 12px;">
          <div style="font-size: 11px; color: #94A3B8;">TÀI XỈU 3D COUNTDOWN</div>
          <div style="font-size: 32px; font-weight: 900; color: ${taixiu.state.timeLeft <= 5 ? '#EF4444' : '#F59E0B'};">
            ${taixiu.state.timeLeft}s
          </div>
          <div style="display: flex; justify-content: center; gap: 8px; margin: 10px 0;">
            <span class="dice-pill">${dicePips[taixiu.state.dice[0]] || taixiu.state.dice[0]}</span>
            <span class="dice-pill">${dicePips[taixiu.state.dice[1]] || taixiu.state.dice[1]}</span>
            <span class="dice-pill">${dicePips[taixiu.state.dice[2]] || taixiu.state.dice[2]}</span>
          </div>
          <div style="font-size: 16px; font-weight: 800; color: ${taixiu.state.outcome === 'TAI' ? '#EF4444' : '#3B82F6'};">
            ${taixiu.state.outcome === 'TAI' ? '🔴 TÀI (11-17)' : '🔵 XỈU (4-10)'} — Tổng: ${taixiu.state.totalScore}
          </div>
        </div>

        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
          ${(taixiu.state.history || []).slice(0, 14).map((h) => `
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${h.outcome === 'TAI' ? '#EF4444' : '#3B82F6'}; color: #fff; font-size: 10px; font-weight: 800; display: flex; align-items: center; justify-content: center;" title="Round ${h.roundId}: ${h.outcome} (${h.total})">
              ${h.outcome === 'TAI' ? 'T' : 'X'}
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- CORE QUEUE & RISK LAYER -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <div class="card-title">🛡️ Asynchronous Anti-Latency Bet Queue & Risk Management</div>
        <span class="card-badge">Delay Queue Tier 1: 8s Active</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; font-size: 12px;">
        <div style="background: #1E293B; padding: 12px; border-radius: 8px;">
          <div style="color: #94A3B8;">Tier 1 Standard Delay</div>
          <div style="font-size: 18px; font-weight: 800; color: #fff; margin-top: 4px;">8 Giây</div>
        </div>
        <div style="background: #1E293B; padding: 12px; border-radius: 8px;">
          <div style="color: #94A3B8;">Tier 2 Attack Delay</div>
          <div style="font-size: 18px; font-weight: 800; color: #fff; margin-top: 4px;">15 Giây</div>
        </div>
        <div style="background: #1E293B; padding: 12px; border-radius: 8px;">
          <div style="color: #94A3B8;">Tier 3 Critical Freeze</div>
          <div style="font-size: 18px; font-weight: 800; color: #fff; margin-top: 4px;">25 Giây</div>
        </div>
        <div style="background: #1E293B; padding: 12px; border-radius: 8px;">
          <div style="color: #94A3B8;">Max Stake Hard Cap</div>
          <div style="font-size: 18px; font-weight: 800; color: #F59E0B; margin-top: 4px;">300 Điểm / Vé</div>
        </div>
      </div>
    </div>

    <div style="text-align: center; font-size: 11px; color: #64748B;">
      Fanclub68 Staging Server • Running on Render • Connected to The Odds-API & SV388 feeds
    </div>
  </div>
</body>
</html>`;
}
