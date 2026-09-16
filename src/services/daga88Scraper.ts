/**
 * DAGA88 Scraper Service
 * Scrapes real cockfight match video UUIDs from qynzy.nl (DAGA88 WordPress site)
 * Each arena has 12-15 recorded matches per day, all freely embeddable via player.videosv388.com
 * Refreshes automatically every 6 hours or on-demand.
 */

export interface MatchVideo {
  matchNumber: number;
  playerUrl: string;
  uuid: string;
  arenaKey: string;
  date: string;
}

export interface ArenaVideoCache {
  arenaKey: string;
  arenaLabel: string;
  date: string;
  matches: MatchVideo[];
  fetchedAt: string;
  isStale: boolean;
}

// Arena slug mapping: arenaId -> qynzy.nl slug fragment
const ARENA_SLUGS: Record<string, { slug: string; label: string }> = {
  CPC2:   { slug: 'da-ga-cpc2',   label: 'CPC2 Thomo Grand Arena' },
  CPC3:   { slug: 'da-ga-cpc3',   label: 'CPC3 Casino 999 Arena' },
  CPC4:   { slug: 'da-ga-cpc4',   label: 'CPC4 Kandal Arena' },
  CPC5:   { slug: 'da-ga-cpc5',   label: 'CPC5 Phnom Den Arena' },
  CPC7:   { slug: 'da-ga-cpc7',   label: 'CPC7 Arena' },
  XA_XIA: { slug: 'da-ga-xa-xia', label: 'Xà Xía Kampot Arena' },
};

// Map frontend arenaIds to our scraper keys
const ARENA_ID_MAP: Record<string, string> = {
  CPC1: 'CPC2', // CPC1 falls back to CPC2 feed
  CPC2: 'CPC2',
  CPC3: 'CPC3',
  CPC4: 'CPC4',
  PH1:  'CPC5', // Philippine arenas map to CPC5/CPC7
  PH2:  'CPC7',
  PH3:  'XA_XIA',
};

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const BASE_URL = 'https://qynzy.nl';

class Daga88ScraperService {
  private cache: Map<string, ArenaVideoCache> = new Map();
  private isFetching: Set<string> = new Set();

  constructor() {
    // Warm up cache on startup (non-blocking)
    setTimeout(() => this.warmupCache(), 3000);
    // Auto-refresh every 6 hours
    setInterval(() => this.warmupCache(), CACHE_TTL_MS);
  }

  private getDateSlug(date: Date): string {
    const dd   = String(date.getDate()).padStart(2, '0');
    const mm   = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }

  private extractPlayerUUIDs(html: string): string[] {
    const regex = /player\.videosv388\.com\/\?play=([a-f0-9-]{36})/g;
    const uuids: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      uuids.push(match[1]);
    }
    return [...new Set(uuids)];
  }

  private async fetchPage(url: string): Promise<{ status: number; html: string }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });
      const html = await response.text();
      return { status: response.status, html };
    } catch {
      return { status: 0, html: '' };
    }
  }

  private async scrapeArena(arenaKey: string): Promise<ArenaVideoCache | null> {
    const config = ARENA_SLUGS[arenaKey];
    if (!config) return null;
    if (this.isFetching.has(arenaKey)) return this.cache.get(arenaKey) || null;

    this.isFetching.add(arenaKey);

    try {
      // Try today, then yesterday, then 2 days ago
      for (let daysAgo = 0; daysAgo <= 2; daysAgo++) {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        const dateSlug = this.getDateSlug(d);
        const url = `${BASE_URL}/xem-full-video-${config.slug}-ngay-${dateSlug}/`;

        const { status, html } = await this.fetchPage(url);
        if (status !== 200) continue;

        const uuids = this.extractPlayerUUIDs(html);
        if (uuids.length === 0) continue;

        const matches: MatchVideo[] = uuids.map((uuid, i) => ({
          matchNumber: i + 1,
          playerUrl: `https://player.videosv388.com/?play=${uuid}`,
          uuid,
          arenaKey,
          date: dateSlug,
        }));

        const cacheEntry: ArenaVideoCache = {
          arenaKey,
          arenaLabel: config.label,
          date: dateSlug,
          matches,
          fetchedAt: new Date().toISOString(),
          isStale: daysAgo > 0,
        };

        this.cache.set(arenaKey, cacheEntry);
        console.log(`✅ [DAGA88 Scraper] ${arenaKey}: ${matches.length} matches scraped (${daysAgo === 0 ? 'today' : `${daysAgo}d ago`})`);
        return cacheEntry;
      }

      console.warn(`⚠️  [DAGA88 Scraper] ${arenaKey}: No videos found in last 3 days`);
      return null;
    } finally {
      this.isFetching.delete(arenaKey);
    }
  }

  private async warmupCache(): Promise<void> {
    console.log('🔄 [DAGA88 Scraper] Warming up video cache...');
    for (const arenaKey of Object.keys(ARENA_SLUGS)) {
      await this.scrapeArena(arenaKey);
      await new Promise(resolve => setTimeout(resolve, 500)); // polite delay
    }
    console.log('✅ [DAGA88 Scraper] Cache warmed up.');
  }

  /**
   * Get videos for a frontend arenaId (CPC1, CPC2, PH1, etc.)
   * Performs lazy scraping if cache is missing or expired.
   */
  public async getVideosForArena(frontendArenaId: string): Promise<ArenaVideoCache | null> {
    const scraperKey = ARENA_ID_MAP[frontendArenaId] || frontendArenaId;
    
    // Return from cache if fresh
    const cached = this.cache.get(scraperKey);
    if (cached) {
      const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
      if (ageMs < CACHE_TTL_MS) return cached;
    }

    // Otherwise scrape now
    return this.scrapeArena(scraperKey);
  }

  /**
   * Get all cached arena videos (for bulk response)
   */
  public getAllCachedVideos(): Record<string, ArenaVideoCache> {
    const result: Record<string, ArenaVideoCache> = {};
    this.cache.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Force refresh a specific arena
   */
  public async forceRefresh(arenaKey: string): Promise<ArenaVideoCache | null> {
    this.cache.delete(arenaKey);
    return this.scrapeArena(arenaKey);
  }

  public getCacheStatus(): object {
    const status: Record<string, object> = {};
    this.cache.forEach((v, k) => {
      status[k] = {
        matchCount: v.matches.length,
        date: v.date,
        fetchedAt: v.fetchedAt,
        isStale: v.isStale,
        ageMinutes: Math.floor((Date.now() - new Date(v.fetchedAt).getTime()) / 60000),
      };
    });
    return status;
  }
}

export const daga88Scraper = new Daga88ScraperService();
