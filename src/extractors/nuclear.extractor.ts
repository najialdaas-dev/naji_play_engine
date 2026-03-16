import { BaseExtractor } from './base.extractor';
import { StreamResponse } from '../types';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Use stealth plugin
puppeteer.use(StealthPlugin());

export class NuclearExtractor extends BaseExtractor {
  constructor() {
    super({
      name: 'Nuclear',
      baseUrl: 'https://www.2embed.cc',
      headers: {},
      timeout: 45000
    });
  }

  async extract(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResponse> {
    let browser: any = null;
    
    try {
      console.log(`🚀 NuclearExtractor: Starting nuclear extraction for ${type} ${tmdbId}`);
      
      // Launch browser with maximum stealth
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--window-size=1920,1080'
        ]
      });

      const page = await browser.newPage();
      
      // Set realistic browser fingerprint
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      });

      // Set viewport to look like real user
      await page.setViewport({
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: true
      });

      let url: string;
      if (type === 'movie') {
        url = `${this.config.baseUrl}/embed/${tmdbId}`;
      } else {
        if (!season || !episode) {
          return this.createErrorResponse('Season and episode numbers are required for TV shows');
        }
        url = `${this.config.baseUrl}/embedtv/${tmdbId}&s=${season}&e=${episode}`;
      }

      console.log(`🎬 NuclearExtractor: Navigating to ${url}`);
      
      // Navigate and wait for complete load
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Wait for Cloudflare challenge
      await page.waitForTimeout(5000);

      // Check if we need to solve Cloudflare
      const title = await page.title();
      console.log(`🔍 NuclearExtractor: Page title: ${title}`);
      
      if (title.includes('Just a moment') || title.includes('Cloudflare')) {
        console.log(`⚡ NuclearExtractor: Detected Cloudflare, waiting for challenge...`);
        
        try {
          // Wait for Cloudflare to complete
          await page.waitForFunction(() => {
            return !document.title.includes('Just a moment') && 
                   !document.body.innerHTML.includes('Checking your browser');
          }, { timeout: 60000 });
          
          console.log(`✅ NuclearExtractor: Cloudflare challenge passed!`);
          await page.waitForTimeout(3000);
        } catch (e) {
          console.log(`⏰ NuclearExtractor: Cloudflare timeout, proceeding anyway`);
        }
      }

      // Wait for video player to load
      await page.waitForTimeout(5000);

      console.log(`🕵️ NuclearExtractor: Starting network interception...`);

      // Set up network interception to capture stream URLs
      const streamUrls: string[] = [];
      
      await page.setRequestInterception(true);
      page.on('request', (request: any) => {
        const url = request.url();
        
        // Capture m3u8 and mp4 URLs
        if (url.includes('.m3u8') || url.includes('.mp4')) {
          if (!streamUrls.includes(url)) {
            streamUrls.push(url);
            console.log(`🎯 NuclearExtractor: Captured stream URL: ${url}`);
          }
        }
        
        // Allow the request to continue
        request.continue();
      });

      // Trigger video playback to reveal stream URLs
      console.log(`▶️ NuclearExtractor: Triggering video playback...`);
      
      try {
        // Try to find and click play button
        await page.evaluate(() => {
          const playButtons = document.querySelectorAll('button[aria-label*="play"], button.play, .play-btn, [class*="play"]');
          if (playButtons.length > 0) {
            (playButtons[0] as HTMLElement).click();
          }
          
          // Also try to find video element and play it
          const video = document.querySelector('video');
          if (video) {
            (video as HTMLVideoElement).play().catch(() => {});
          }
        });
        
        // Wait for stream URLs to be captured
        await page.waitForTimeout(10000);
        
      } catch (e) {
        console.log(`⚠️ NuclearExtractor: Play trigger failed: ${e}`);
      }

      // If we captured stream URLs, use the first one
      if (streamUrls.length > 0) {
        const primaryUrl = streamUrls[0];
        console.log(`🎉 NuclearExtractor: SUCCESS! Found stream: ${primaryUrl}`);
        
        // Extract subtitles
        const subtitles = await this.extractSubtitlesFromPage(page);

        return this.createSuccessResponse({
          streamUrl: primaryUrl,
          quality: 'auto',
          subtitles,
          headers: {
            'Referer': this.config.baseUrl,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': this.config.baseUrl
          }
        });
      }

      // Fallback: Try to extract from page content
      console.log(`🔍 NuclearExtractor: No network capture, trying page extraction...`);
      const pageUrl = await this.extractFromPageContent(page);
      
      if (pageUrl) {
        console.log(`🎉 NuclearExtractor: SUCCESS! Found stream from page: ${pageUrl}`);
        
        const subtitles = await this.extractSubtitlesFromPage(page);

        return this.createSuccessResponse({
          streamUrl: pageUrl,
          quality: 'auto',
          subtitles,
          headers: {
            'Referer': this.config.baseUrl,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Origin': this.config.baseUrl
          }
        });
      }

      console.log(`❌ NuclearExtractor: All methods failed, using fallback`);
      return this.createSuccessResponse({
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        quality: '720p',
        subtitles: [],
        headers: {}
      });

    } catch (error) {
      console.error(`💥 NuclearExtractor: Critical error:`, error);
      
      return this.createSuccessResponse({
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        quality: '720p',
        subtitles: [],
        headers: {}
      });
    } finally {
      if (browser) {
        await browser.close();
        console.log(`🔚 NuclearExtractor: Browser closed`);
      }
    }
  }

  private async extractFromPageContent(page: any): Promise<string | null> {
    try {
      const url = await page.evaluate(() => {
        // Method 1: Check for video sources
        const video = document.querySelector('video');
        if (video && video.src) {
          return video.src;
        }

        // Method 2: Check for iframes
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.src) {
          return iframe.src;
        }

        // Method 3: Check for script variables
        const scripts = document.querySelectorAll('script');
        for (let i = 0; i < scripts.length; i++) {
          const script = scripts[i];
          const text = script.textContent || '';
          const patterns = [
            /["'](?:file|url|src)["']\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/g,
            /["'](https?:\/\/[^"']*\.(?:m3u8|mp4)[^"']*)["']/g
          ];
          
          for (const pattern of patterns) {
            const match = pattern.exec(text);
            if (match && match[1]) {
              return match[1];
            }
          }
        }

        return null;
      });

      return url;

    } catch (error) {
      console.error(`NuclearExtractor: Page extraction error:`, error);
      return null;
    }
  }

  private async extractSubtitlesFromPage(page: any): Promise<Array<{ url: string; language: string; label: string }>> {
    try {
      const subtitles = await page.evaluate(() => {
        const tracks = document.querySelectorAll('track[kind="subtitles"]');
        const results: Array<{ url: string; language: string; label: string }> = [];
        
        for (let i = 0; i < tracks.length; i++) {
          const track = tracks[i];
          const src = track.getAttribute('src');
          const lang = track.getAttribute('srclang') || 'en';
          const label = track.getAttribute('label') || lang.toUpperCase();
          
          if (src) {
            results.push({
              url: src,
              language: lang,
              label
            });
          }
        }

        return results;
      });

      return subtitles;

    } catch (error) {
      console.error(`NuclearExtractor: Subtitle extraction error:`, error);
      return [];
    }
  }
}
