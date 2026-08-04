import { App } from "obsidian";
import { posterUrl } from "../tmdb/image";

export interface MemoryTitleRef {
  tmdbId?: number;
  title?: string;
  year?: string;
  posterPath?: string | null;
  mediaKind?: string;
  director?: string;
  castNames?: string[];
  writerNames?: string[];
  genres?: string[];
  originCountry?: string;
  runtimeMinutes?: number;
}

export interface MemoryEntry {
  memoryId?: string;
  rating?: number;
  liked?: boolean;
  titleRef?: MemoryTitleRef;
}

export interface PersonMemoryFilm {
  title: string;
  year: string;
  poster: string;
  rating: number;
}

export interface PersonMemoryStats {
  available: boolean;
  count: number;
  ratedCount: number;
  average: number | null;
  roles: string[];
  films: PersonMemoryFilm[];
}

const MAX_FILMS = 50;

function normalizePath(base: string): string {
  return base.replace(/[\\/]+$/, "");
}

function isAbsolute(p: string): boolean {
  return /^([A-Za-z]:[\\/]|[\\/])/.test(p);
}

function toVaultRelative(app: App, absolutePath: string): string | null {
  try {
    const adapter = app.vault.adapter as { getBasePath?: () => string };
    const vaultRoot = adapter.getBasePath?.();
    if (!vaultRoot) return null;
    const normVault = vaultRoot.replace(/[\\/]+$/, "").toLowerCase();
    const normAbs = absolutePath.replace(/[\\/]+$/, "").toLowerCase();
    if (normAbs.startsWith(normVault)) {
      const rel = absolutePath.slice(vaultRoot.length).replace(/^[\\/]+/, "");
      return rel || ".";
    }
  } catch {
    // ignora
  }
  return null;
}

function candidatePaths(app: App, base: string): string[] {
  const candidates: string[] = [];

  if (!isAbsolute(base)) {
    // Caminho já é relativo ao vault
    candidates.push(`${base}/memories.json`);
    return candidates;
  }

  // Caminho absoluto: primeiro tenta relativo ao vault
  const rel = toVaultRelative(app, base);
  if (rel) {
    candidates.push(`${rel}/memories.json`);
  }
  // Fallback: tenta o caminho absoluto (pode funcionar em alguns adapters)
  candidates.push(`${base}/memories.json`);
  return candidates;
}

export async function loadMemories(
  app: App,
  profilePath: string
): Promise<MemoryEntry[] | null> {
  if (!profilePath) return null;
  const base = normalizePath(profilePath);
  for (const file of candidatePaths(app, base)) {
    try {
      const raw = await app.vault.adapter.read(file);
      const data = JSON.parse(raw) as { entries?: MemoryEntry[] };
      if (Array.isArray(data.entries)) return data.entries;
      return [];
    } catch {
      // tenta o próximo candidato
    }
  }
  return null;
}

function matchesPerson(entry: MemoryEntry, name: string): boolean {
  const t = entry.titleRef;
  if (!t) return false;
  const inCast = (t.castNames ?? []).some((n) => n.toLowerCase() === name);
  const isDirector = (t.director ?? "").toLowerCase() === name;
  const inWriters = (t.writerNames ?? []).some((n) => n.toLowerCase() === name);
  return inCast || isDirector || inWriters;
}

export function computePersonMemoryStats(
  entries: MemoryEntry[],
  personName: string
): PersonMemoryStats {
  const name = (personName || "").trim().toLowerCase();

  const matched = name ? entries.filter((e) => matchesPerson(e, name)) : [];

  const roles: string[] = [];
  if (matched.some((e) => (e.titleRef?.castNames ?? []).some((n) => n.toLowerCase() === name))) {
    roles.push("actor");
  }
  if (matched.some((e) => (e.titleRef?.director ?? "").toLowerCase() === name)) {
    roles.push("director");
  }
  if (matched.some((e) => (e.titleRef?.writerNames ?? []).some((n) => n.toLowerCase() === name))) {
    roles.push("writer");
  }

  const rated = matched.filter((e) => typeof e.rating === "number");
  const average = rated.length
    ? rated.reduce((sum, e) => sum + (e.rating as number), 0) / rated.length
    : null;

  const films: PersonMemoryFilm[] = matched
    .map((e) => {
      const t = e.titleRef!;
      return {
        title: t.title ?? "",
        year: t.year ?? "",
        poster: posterUrl(t.posterPath, "w185"),
        rating: typeof e.rating === "number" ? e.rating : 0,
      };
    })
    .filter((f) => f.title)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, MAX_FILMS);

  return {
    available: true,
    count: matched.length,
    ratedCount: rated.length,
    average,
    roles,
    films,
  };
}
