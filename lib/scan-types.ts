export interface CastMember {
  name: string;
  role?: string | null;
  character?: string | null;
}

export interface EpisodeInfo {
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
}

export type CatalogPerson = { id: number; name: string; character: string | null; profileUrl: string | null };
export type Provider = { id: number; name: string; logoUrl: string | null };

// TMDB data the backend attaches to identified movies and shows.
export type CatalogInfo = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  runtimeMinutes: number | null;
  seasons: number | null;
  cast: CatalogPerson[];
  trailerKey: string | null;
  watch: { region: string; link: string | null; stream: Provider[]; rent: Provider[]; buy: Provider[] } | null;
};

// Shape returned by POST /api/identify.
export interface IdentifyResult {
  found: boolean;
  confidence: number;
  title?: string | null;
  type?: string | null;
  year?: number | null;
  platform?: string | null;
  genre?: string | null;
  language?: string | null;
  country?: string | null;
  episode?: EpisodeInfo | null;
  cast?: CastMember[];
  director?: string | null;
  choreographer?: string | null;
  producer?: string | null;
  musicDirector?: string | null;
  creator?: string | null;
  creatorHandle?: string | null;
  synopsis?: string | null;
  alternativeTitles?: string[];
  identificationClues?: string | null;
  historyId?: number | null;
  scansRemaining?: number | null;
  catalog?: CatalogInfo | null;
}

// Best artwork for a scan: the official poster when we have one, else the frame.
export function posterFor(result: IdentifyResult, thumbUri?: string | null): string | null {
  return result.catalog?.posterUrl ?? thumbUri ?? null;
}

export const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tv_show: "TV show",
  music_video: "Music video",
  documentary: "Documentary",
  youtube_video: "YouTube video",
  reel: "Reel",
  short: "Short",
  viral_clip: "Viral clip",
  short_film: "Short film",
};

export type ScanKind = "movie" | "show" | "clip";

export function kindOf(type?: string | null): ScanKind {
  if (type === "tv_show") return "show";
  if (type === "reel" || type === "short" || type === "viral_clip" || type === "youtube_video" || type === "music_video") return "clip";
  return "movie";
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 80) return "Very likely";
  if (confidence >= 60) return "Likely";
  return "Possible";
}
