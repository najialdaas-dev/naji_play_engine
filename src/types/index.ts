export interface StreamSource {
  url: string;
  quality: string;
  format: 'm3u8' | 'mp4';
  headers?: Record<string, string>;
}

export interface SubtitleSource {
  url: string;
  language: string;
  label: string;
}

export interface StreamResponse {
  success: boolean;
  sources: StreamSource[];
  subtitles: SubtitleSource[];
  headers?: Record<string, string>;
  error?: string;
}

export interface ExtractorConfig {
  name: string;
  baseUrl: string;
  headers: Record<string, string>;
  timeout: number;
}

export interface CacheEntry {
  data: StreamResponse;
  timestamp: number;
  expiresAt: number;
}

export interface ExtractedData {
  streamUrl: string;
  quality: string;
  subtitles: SubtitleSource[];
  headers: Record<string, string>;
}
