export interface SeasonQuery {
  base: string;
  season: number;
  episode?: number;
}

const SEASON_QUERY_RE = /^(.*?)\s+s(\d{1,2})(?:e(\d{1,3}))?$/i;

export function parseSeasonQuery(query: string): SeasonQuery | null {
  const trimmed = query.trim();
  const match = SEASON_QUERY_RE.exec(trimmed);
  if (!match) return null;
  const base = match[1].trim();
  const season = Number(match[2]);
  const episode = match[3] ? Number(match[3]) : undefined;
  if (!base || season < 1 || (episode !== undefined && episode < 1)) {
    return null;
  }
  return { base, season, episode };
}

export function seasonRef(season: number, episode?: number): string {
  const s: string = String(season).padStart(2, "0");
  if (episode === undefined) return `S${s}`;
  return `S${s}E${String(episode).padStart(2, "0")}`;
}
