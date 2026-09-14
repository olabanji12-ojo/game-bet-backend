import { Router, Request, Response } from 'express';
import { cockfightService } from '../services/cockfightService.js';
import { ArenaId } from '../types.js';

export const streamProxyRouter = Router();

// Preset Public/Teaching Stream Feeds
const DEFAULT_PRESET_FEEDS: Record<string, { title: string; url: string; type: 'hls' | 'iframe' | 'mp4' }> = {
  CPC1: {
    title: 'Thomo CPC1 VIP Live Feed',
    url: 'https://bj988.com/vn/vn',
    type: 'iframe'
  },
  CPC2: {
    title: 'Thomo CPC2 Grand Arena',
    url: 'https://player.videosv388.com/?play=0de89302-2ad7-4f02-ae63-83ce3c78f22a',
    type: 'iframe'
  },
  PH1: {
    title: 'Pasay City PH1 Colosseum (Philippines)',
    url: 'https://player.videosv388.com/?play=9e08a521-b9a0-44a1-8452-5d224bbfe64f',
    type: 'iframe'
  },
  DEMO_HLS: {
    title: 'High-Bitrate Test Stream (HLS 60FPS)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    type: 'hls'
  }
};

/**
 * 1. Webview Header-Stripping Proxy
 * Removes X-Frame-Options and Content-Security-Policy to allow embedding BJ988 / SV388 into iframes
 */
streamProxyRouter.get('/embed-proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send('Missing target url query parameter');
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
        'Referer': `${parsedTarget.protocol}//${parsedTarget.host}/`
      }
    });

    let html = await response.text();

    // Inject base href tag so all relative assets, scripts, stylesheets resolve to original domain
    const baseTag = `<base href="${parsedTarget.protocol}//${parsedTarget.host}/">`;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}`);
    } else if (html.includes('<HEAD>')) {
      html = html.replace('<HEAD>', `<HEAD>${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }

    // Set permissive CORS and remove framing blockers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/html; charset=utf-8');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    return res.status(response.status).send(html);
  } catch (error: any) {
    console.error('[StreamProxy] Failed to proxy embed:', error.message);
    return res.status(502).send(`
      <div style="background:#0f172a; color:#f8fafc; font-family:sans-serif; padding:24px; text-align:center; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
        <h3 style="color:#ef4444; margin-bottom:8px;">⚠️ Không thể kết nối luồng trực tiếp</h3>
        <p style="color:#94a3b8; max-width:400px; font-size:13px;">Không thể tải luồng phát từ: ${targetUrl}</p>
        <p style="color:#64748b; font-size:12px; margin-top:12px;">Đang tự động chuyển sang mô phỏng video chuẩn SV388...</p>
      </div>
    `);
  }
});

/**
 * 2. HLS Manifest & TS Video Chunk CORS Relay
 * Forwards .m3u8 playlists and rewrites URLs with spoofed headers
 */
streamProxyRouter.get('/hls-relay', async (req: Request, res: Response) => {
  const streamUrl = req.query.url as string;
  if (!streamUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const parsed = new URL(streamUrl);
    const response = await fetch(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': `${parsed.protocol}//${parsed.host}/`,
        'Origin': `${parsed.protocol}//${parsed.host}`
      }
    });

    const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', contentType);

    if (streamUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
      const playlistText = await response.text();
      // Rewrite relative URLs to route through proxy
      const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
      const lines = playlistText.split('\n');
      const rewritten = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const fullSegmentUrl = trimmed.startsWith('http') ? trimmed : `${baseUrl}${trimmed}`;
          return `/api/stream/hls-relay?url=${encodeURIComponent(fullSegmentUrl)}`;
        }
        return line;
      }).join('\n');

      return res.send(rewritten);
    } else {
      // Stream raw binary TS / AAC chunks
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }
  } catch (error: any) {
    console.error('[HLSRelay] Error fetching stream segment:', error.message);
    return res.status(502).send('HLS Relay segment error');
  }
});

/**
 * 3. Channel List & Preset Endpoints
 */
streamProxyRouter.get('/presets', (req: Request, res: Response) => {
  return res.json({
    success: true,
    presets: DEFAULT_PRESET_FEEDS,
    teachingSources: cockfightService.getTeachingStreamSources(),
    classroomMode: cockfightService.isClassroomMode(),
    timestamp: new Date().toISOString()
  });
});

/**
 * 4. Active Stream Status & Student UI Real-time Sync
 */
streamProxyRouter.get('/active-source', (req: Request, res: Response) => {
  const activeData = cockfightService.getActiveTeachingStream();
  return res.json({
    success: true,
    ...activeData,
    teachingSources: cockfightService.getTeachingStreamSources(),
    timestamp: new Date().toISOString()
  });
});

/**
 * 5. Instructor Stream Source Override & Failover Switch
 */
streamProxyRouter.post('/active-source', (req: Request, res: Response) => {
  const { sourceId, customUrl } = req.body;

  if (sourceId) {
    cockfightService.setActiveTeachingSource(sourceId);
  }

  if (customUrl) {
    cockfightService.setCustomTeachingUrl(customUrl);
  }

  return res.json({
    success: true,
    message: 'Nguồn phát trực tiếp đã được cập nhật.',
    ...cockfightService.getActiveTeachingStream(),
    timestamp: new Date().toISOString()
  });
});

/**
 * 6. Video Stream URL Validator
 * Checks if a link is a real video/stream link vs raw non-video web page
 */
streamProxyRouter.post('/validate', (req: Request, res: Response) => {
  const { url } = req.body;
  const validation = cockfightService.validateStreamUrl(url);
  return res.json({
    success: true,
    ...validation
  });
});

/**
 * 7. Live Health & Failover Log Inspector
 */
streamProxyRouter.get('/health', (req: Request, res: Response) => {
  return res.json({
    success: true,
    status: 'ACTIVE',
    teachingSources: cockfightService.getTeachingStreamSources(),
    activeStream: cockfightService.getActiveTeachingStream(),
    failoverLogs: cockfightService.getStreamFailoverLogs(),
    timestamp: new Date().toISOString()
  });
});

/**
 * 8. Instructor Control: Custom Arena Stream Override & Speed Toggle
 */
streamProxyRouter.post('/configure-arena', (req: Request, res: Response) => {
  const { arenaId, customStreamUrl, classroomMode } = req.body;

  if (typeof classroomMode === 'boolean') {
    cockfightService.setClassroomMode(classroomMode);
  }

  if (arenaId && customStreamUrl !== undefined) {
    const updated = cockfightService.setArenaStreamUrl(arenaId as ArenaId, customStreamUrl);
    if (!updated) {
      return res.status(404).json({ success: false, error: `Arena ${arenaId} not found.` });
    }
  }

  return res.json({
    success: true,
    message: 'Arena streaming & classroom mode updated successfully.',
    classroomMode: cockfightService.isClassroomMode(),
    arenas: cockfightService.getAllArenas()
  });
});

