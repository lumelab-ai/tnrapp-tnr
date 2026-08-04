import type { Editor, Plugin } from "obsidian";
import { getDict } from "./i18n";
import { TNR_LOGO_DATA_URI } from "./logo";
import { posterUrl, profileUrl } from "./tmdb/image";
import { seasonRef } from "./tmdb/query";
import type {
  EpisodeDetails,
  MediaDetails,
  MediaType,
  PersonDetails,
  PersonSearchItem,
  SeasonDetails,
  SearchResultItem,
} from "./tmdb/types";
import type {
  PersonMemoryFilm,
  PersonMemoryStats,
} from "./profile/profile";

const MAX_CAST = 11;

export interface CastItemPayload {
  name: string;
  profile: string;
}

export type CardMediaType = MediaType | "season" | "episode" | "person";

export interface CardPayload {
  mediaType: CardMediaType;
  title: string;
  original: string;
  year: string;
  poster: string;
  subtitle?: string;
  director?: string;
  genres?: string;
  duration?: string;
  country?: string;
  overview?: string;
  tmdbId: number;
  season?: number;
  episode?: number;
  landscape?: boolean;
  withCast: boolean;
  cast: CastItemPayload[];
  lang: string;
  // Campos específicos do card de pessoa (mediaType === "person")
  photo?: string;
  department?: string;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
  personBio?: string;
  roles?: string;
  memoryAvailable?: boolean;
  memoryCount?: number;
  memoryAverage?: number;
  memoryFilms?: PersonMemoryFilm[];
}

export { type PersonMemoryFilm } from "./profile/profile";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "\"");
}

function titleOf(details: MediaDetails, mediaType: MediaType): string {
  return mediaType === "tv"
    ? details.name || details.original_name || ""
    : details.title || details.original_title || "";
}

function originalTitleOf(details: MediaDetails, mediaType: MediaType): string {
  return mediaType === "tv"
    ? details.original_name || ""
    : details.original_title || "";
}

function yearOf(details: MediaDetails, mediaType: MediaType): string {
  const date =
    mediaType === "tv" ? details.first_air_date : details.release_date;
  return date ? date.slice(0, 4) : "";
}

function directorOf(details: MediaDetails): string | undefined {
  const crew = details.credits?.crew ?? [];
  const director = crew.find((c) => c.job === "Director");
  return director?.name;
}

function genresOf(details: MediaDetails): string | undefined {
  const genres = details.genres ?? [];
  if (genres.length === 0) return undefined;
  return genres.map((g) => g.name).join(", ");
}

function durationOf(
  details: MediaDetails,
  mediaType: MediaType
): string | undefined {
  const minutes =
    mediaType === "tv" ? details.episode_run_time?.[0] : details.runtime;
  if (!minutes) return undefined;
  return `${minutes} min`;
}

function countryOf(details: MediaDetails): string | undefined {
  const list = details.origin_country;
  if (!list || list.length === 0) return undefined;
  return list.join(", ");
}

export function buildPayload(
  details: MediaDetails,
  mediaType: MediaType,
  withCast: boolean,
  lang: string
): CardPayload {
  const cast = (details.credits?.cast ?? [])
    .filter((c) => c.profile_path)
    .slice(0, MAX_CAST)
    .map((c) => ({
      name: c.name,
      profile: profileUrl(c.profile_path, "w185"),
    }));

  return {
    mediaType,
    title: titleOf(details, mediaType),
    original: originalTitleOf(details, mediaType),
    year: yearOf(details, mediaType),
    poster: posterUrl(details.poster_path, "w342"),
    director: directorOf(details),
    genres: genresOf(details),
    duration: durationOf(details, mediaType),
    country: countryOf(details),
    overview: details.overview || undefined,
    tmdbId: details.id,
    withCast,
    cast,
    lang,
  };
}

export function buildSeasonPayload(
  series: SearchResultItem,
  season: SeasonDetails,
  lang: string
): CardPayload {
  const dict = getDict(lang).card;
  const seriesName = series.name || series.original_name || "";
  return {
    mediaType: "season",
    title: seriesName,
    original: "",
    subtitle: `${dict.season} ${season.season_number}`,
    year: (season.air_date || series.first_air_date || "").slice(0, 4),
    poster: posterUrl(season.poster_path || series.poster_path, "w342"),
    duration: season.episodes?.length
      ? `${season.episodes.length} ${dict.episodes}`
      : undefined,
    overview: season.overview || series.overview || undefined,
    tmdbId: series.id,
    season: season.season_number,
    withCast: false,
    cast: [],
    lang,
  };
}

export function buildEpisodePayload(
  series: SearchResultItem,
  episode: EpisodeDetails,
  withCast: boolean,
  lang: string
): CardPayload {
  const seriesName = series.name || series.original_name || "";
  const cast = withCast
    ? (episode.guest_stars ?? [])
        .filter((c) => c.profile_path)
        .slice(0, MAX_CAST)
        .map((c) => ({
          name: c.name,
          profile: profileUrl(c.profile_path, "w185"),
        }))
    : [];
  return {
    mediaType: "episode",
    title: episode.name || "",
    original: "",
    subtitle: `${seriesName} · ${seasonRef(
      episode.season_number,
      episode.episode_number
    )}`,
    year: (episode.air_date || "").slice(0, 4),
    poster: posterUrl(episode.still_path || series.poster_path, "w342"),
    landscape: Boolean(episode.still_path),
    duration: episode.runtime ? `${episode.runtime} min` : undefined,
    overview: episode.overview || undefined,
    tmdbId: series.id,
    season: episode.season_number,
    episode: episode.episode_number,
    withCast,
    cast,
    lang,
  };
}

const GRADIENT = "linear-gradient(135deg, #c8553d, #5a2336)";

const DEPARTMENT_LABEL: Record<string, string> = {
  Acting: "actor",
  Directing: "director",
  Writing: "writer",
  Production: "producer",
};

function departmentLabel(department: string | undefined): string | undefined {
  if (!department) return undefined;
  return DEPARTMENT_LABEL[department] ?? department;
}

export function buildPersonPayload(
  person: PersonSearchItem,
  details: PersonDetails,
  memory: PersonMemoryStats | null,
  lang: string
): CardPayload {
  const dict = getDict(lang).card;

  let roles: string | undefined;
  if (memory && memory.roles.length > 0) {
    roles = memory.roles
      .map((role) => {
        const label = dict[role as keyof typeof dict];
        return typeof label === "string" ? label : role;
      })
      .join(" · ");
  }

  return {
    mediaType: "person",
    title: person.name || details.name || "",
    original: "",
    year: "",
    poster: "",
    photo: profileUrl(details.profile_path || person.profile_path, "w342"),
    department: departmentLabel(
      details.known_for_department || person.known_for_department
    ),
    birthday: details.birthday || undefined,
    deathday: details.deathday || undefined,
    placeOfBirth: details.place_of_birth || undefined,
    personBio: details.biography || undefined,
    roles,
    memoryAvailable: memory ? true : false,
    memoryCount: memory ? memory.count : undefined,
    memoryAverage:
      memory && memory.ratedCount > 0 && memory.average !== null
        ? memory.average
        : undefined,
    memoryFilms:
      memory && memory.films.length > 0 ? memory.films : undefined,
    tmdbId: person.id,
    withCast: false,
    cast: [],
    lang,
  };
}

function buildMediaCard(el: HTMLElement, p: CardPayload): void {
  const dict = getDict(p.lang).card;
  const title = escapeHtml(p.title);

  const card = el.createDiv("tnr-card");
  card.style.cssText =
    "box-sizing:border-box;background:var(--tnr-panel);border:none;" +
    "border-radius:10px;padding:14px 16px 12px;box-shadow:0 1px 2px rgba(0,0,0,0.04);" +
    "margin-top:16px;" +
    "position:relative;font-family:-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;color:var(--tnr-text);";

  const logoLink = card.createEl("a", { cls: "tnr-logo" });
  logoLink.href = "https://tnrapp.com";
  logoLink.target = "_blank";
  logoLink.rel = "noopener";
  logoLink.title = "TNR — Track 'n' Review";
  logoLink.style.cssText =
    "position:absolute;top:14px;right:16px;width:30px;height:30px;border-radius:7px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.2);opacity:0.9;z-index:1;text-decoration:none;";
  const logoImg = logoLink.createEl("img");
  logoImg.src = TNR_LOGO_DATA_URI;
  logoImg.alt = "TNR";
  logoImg.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";

  const inner = card.createDiv("tnr-inner");
  inner.style.cssText = "box-sizing:border-box;display:flex;gap:16px;align-items:flex-start;";

  const posterWrap = inner.createDiv("tnr-poster");
  posterWrap.style.cssText =
    `box-sizing:border-box;flex:0 0 auto;width:140px;` +
    `aspect-ratio:${p.landscape ? "16/9" : "2/3"};border-radius:7px;` +
    `overflow:hidden;box-shadow:0 3px 8px rgba(0,0,0,0.25);`;
  if (p.poster) {
    const img = posterWrap.createEl("img");
    img.src = p.poster;
    img.alt = `Poster de ${title}`;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    img.onerror = () => {
      img.style.display = "none";
    };
  }

  const info = inner.createDiv("tnr-info");
  info.style.cssText = "box-sizing:border-box;flex:1;min-width:0;";

  const titleLine = info.createDiv("tnr-title-line");
  titleLine.style.cssText = "display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;";
  const titleEl = titleLine.createEl("span", { cls: "tnr-title", text: title });
  titleEl.style.cssText = "font-size:18px;font-weight:700;line-height:1.25;color:var(--tnr-text);";
  if (p.year) {
    const yearEl = titleLine.createEl("span", { cls: "tnr-year", text: p.year });
    yearEl.style.cssText = "font-size:12px;font-weight:600;color:var(--tnr-muted);background:var(--tnr-code-bg);border-radius:999px;padding:2px 9px;white-space:nowrap;";
  }

  if (p.original) {
    const origEl = info.createEl("div", { cls: "tnr-original", text: escapeHtml(p.original) });
    origEl.style.cssText = "color:var(--tnr-muted);font-size:13px;margin-top:2px;font-style:italic;";
  }

  if (p.subtitle) {
    const subEl = info.createEl("div", { cls: "tnr-subtitle", text: escapeHtml(p.subtitle) });
    subEl.style.cssText = "color:var(--tnr-muted);font-size:13px;margin-top:2px;font-weight:600;";
  }

  const meta = info.createDiv("tnr-meta");
  meta.style.cssText = "display:grid;grid-template-columns:auto 1fr;gap:3px 12px;margin:10px 0;font-size:13px;";

  const rows: Array<[string, string | undefined, boolean]> = [
    [dict.director, p.director, false],
    [dict.genres, p.genres, true],
    [dict.duration, p.duration, false],
    [dict.country, p.country, false],
  ];
  for (const [key, value, isGenres] of rows) {
    if (value) {
      const k = meta.createEl("span", { cls: "tnr-meta-key", text: escapeHtml(key) });
      k.style.cssText = "color:var(--tnr-muted);white-space:nowrap;";
      const v = meta.createEl("span", { cls: isGenres ? "tnr-meta-value tnr-genres" : "tnr-meta-value", text: escapeHtml(value) });
      v.style.cssText = isGenres
        ? "color:var(--tnr-accent);font-weight:600;"
        : "font-weight:500;color:var(--tnr-text);";
    }
  }

  if (p.overview) {
    const OVERVIEW_MAX = 113;
    const full = escapeHtml(p.overview);
    const ov = info.createEl("div", { cls: "tnr-overview", text: full });
    ov.style.cssText = "font-size:13px;color:var(--tnr-text);line-height:1.5;border-top:1px solid var(--tnr-border);padding-top:9px;";
    if (full.length > OVERVIEW_MAX) {
      ov.setText(full.slice(0, OVERVIEW_MAX) + "…");
      let expanded = false;
      const toggle = info.createEl("a", {
        cls: "tnr-expand",
        text: dict.expand,
      });
      toggle.href = "#";
      toggle.style.cssText =
        "display:inline-block;margin-top:6px;font-size:13px;font-weight:600;color:var(--tnr-accent);text-decoration:underline;cursor:pointer;";
      toggle.onclick = (ev) => {
        ev.preventDefault();
        expanded = !expanded;
        ov.setText(expanded ? full : full.slice(0, OVERVIEW_MAX) + "…");
        toggle.setText(expanded ? dict.collapse : dict.expand);
      };
    }
  }
}

function buildCastCard(el: HTMLElement, p: CardPayload): void {
  if (p.cast.length === 0) return;
  const dict = getDict(p.lang).card;

  const card = el.createDiv("tnr-card tnr-cast-card");
  card.style.cssText =
    "box-sizing:border-box;background:var(--tnr-panel);border:none;" +
    "border-radius:10px;padding:14px 16px 12px;box-shadow:0 1px 2px rgba(0,0,0,0.04);" +
    "position:relative;font-family:-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;color:var(--tnr-text);" +
    "margin-top:14px;";

  const head = card.createDiv("tnr-cast-head");
  head.style.cssText = "display:flex;align-items:center;gap:7px;color:var(--tnr-accent);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.style.cssText = "width:15px;height:15px;flex:0 0 auto;";
  svg.innerHTML = `
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  `;
  head.appendChild(svg);
  head.createEl("span", { text: dict.cast });

  const section = card.createDiv("tnr-cast-section");
  section.style.cssText = "box-sizing:border-box;";

  const carousel = section.createDiv("tnr-cast-carousel");
  carousel.style.cssText = "box-sizing:border-box;position:relative;";

  const track = carousel.createDiv("tnr-cast-track");
  track.style.cssText = "box-sizing:border-box;display:flex;gap:12px;overflow-x:auto;padding:2px 0;cursor:grab;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;scrollbar-width:none;";

  for (const member of p.cast) {
    const name = escapeHtml(member.name);
    const item = track.createDiv("tnr-cast-item");
    item.style.cssText = "box-sizing:border-box;flex:0 0 auto;width:84px;text-align:center;";
    const avatar = item.createDiv("tnr-cast-avatar");
    avatar.style.cssText = "box-sizing:border-box;width:78px;height:78px;border-radius:50%;margin:0 auto;overflow:hidden;background:" + GRADIENT + ";box-shadow:0 1px 4px rgba(0,0,0,0.2);";
    const img = avatar.createEl("img");
    img.src = member.profile;
    img.alt = name;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    img.onerror = () => {
      img.style.display = "none";
    };
    const nameEl = item.createEl("div", { cls: "tnr-cast-name", text: name });
    nameEl.style.cssText = "font-size:10px;color:var(--tnr-muted);margin-top:5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  }
}

function buildPersonCard(el: HTMLElement, p: CardPayload): void {
  const dict = getDict(p.lang).card;
  const name = escapeHtml(p.title);

  const card = el.createDiv("tnr-card");
  card.style.cssText =
    "box-sizing:border-box;background:var(--tnr-panel);border:none;" +
    "border-radius:10px;padding:14px 16px 12px;box-shadow:0 1px 2px rgba(0,0,0,0.04);" +
    "margin-top:16px;" +
    "position:relative;font-family:-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;color:var(--tnr-text);";

  const logoLink = card.createEl("a", { cls: "tnr-logo" });
  logoLink.href = "https://tnrapp.com";
  logoLink.target = "_blank";
  logoLink.rel = "noopener";
  logoLink.title = "TNR — Track 'n' Review";
  logoLink.style.cssText =
    "position:absolute;top:14px;right:16px;width:30px;height:30px;border-radius:7px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.2);opacity:0.9;z-index:1;text-decoration:none;";
  const logoImg = logoLink.createEl("img");
  logoImg.src = TNR_LOGO_DATA_URI;
  logoImg.alt = "TNR";
  logoImg.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";

  const inner = card.createDiv("tnr-inner");
  inner.style.cssText =
    "box-sizing:border-box;display:flex;gap:18px;align-items:flex-start;";

  const photoWrap = inner.createDiv("tnr-photo");
  photoWrap.style.cssText =
    "box-sizing:border-box;flex:0 0 auto;width:140px;" +
    "aspect-ratio:2/3;border-radius:7px;" +
    "overflow:hidden;background:" +
    GRADIENT +
    ";box-shadow:0 3px 8px rgba(0,0,0,0.25);";
  if (p.photo) {
    const img = photoWrap.createEl("img");
    img.src = p.photo;
    img.alt = `Foto de ${name}`;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    img.onerror = () => {
      img.style.display = "none";
    };
  }

  const info = inner.createDiv("tnr-info");
  info.style.cssText = "box-sizing:border-box;flex:1;min-width:0;";

  const titleLine = info.createDiv("tnr-title-line");
  titleLine.style.cssText =
    "display:flex;align-items:center;gap:8px;flex-wrap:wrap;";
  const titleEl = titleLine.createEl("span", { cls: "tnr-title", text: name });
  titleEl.style.cssText =
    "font-size:19px;font-weight:700;line-height:1.25;color:var(--tnr-text);";
  if (p.department) {
    const dept = titleLine.createEl("span", {
      cls: "tnr-dept",
      text: escapeHtml(p.department),
    });
    dept.style.cssText =
      "font-size:11px;font-weight:600;color:var(--tnr-accent);background:var(--tnr-accent-soft);border-radius:999px;padding:3px 10px;white-space:nowrap;";
  }

  const meta = info.createDiv("tnr-meta");
  meta.style.cssText =
    "display:grid;grid-template-columns:auto 1fr;gap:3px 12px;margin:10px 0;font-size:13px;";
  const rows: Array<[string, string | undefined]> = [
    [dict.birth, p.birthday],
    [dict.death, p.deathday],
    [dict.place, p.placeOfBirth],
    [dict.roles, p.roles],
  ];
  for (const [key, value] of rows) {
    if (value) {
      const k = meta.createEl("span", {
        cls: "tnr-meta-key",
        text: escapeHtml(key),
      });
      k.style.cssText = "color:var(--tnr-muted);white-space:nowrap;";
      const v = meta.createEl("span", {
        cls: "tnr-meta-value",
        text: escapeHtml(value),
      });
      v.style.cssText = "font-weight:500;color:var(--tnr-text);";
    }
  }

  if (p.personBio) {
    const BIO_MAX = 120;
    const full = escapeHtml(p.personBio);
    const ov = info.createEl("div", { cls: "tnr-bio", text: full });
    ov.style.cssText =
      "font-size:13px;color:var(--tnr-text);line-height:1.5;border-top:1px solid var(--tnr-border);padding-top:9px;";
    if (full.length > BIO_MAX) {
      ov.setText(full.slice(0, BIO_MAX) + "…");
      let expanded = false;
      const toggle = info.createEl("a", {
        cls: "tnr-expand",
        text: dict.expand,
      });
      toggle.href = "#";
      toggle.style.cssText =
        "display:inline-block;margin-top:6px;font-size:13px;font-weight:600;color:var(--tnr-accent);text-decoration:underline;cursor:pointer;";
      toggle.onclick = (ev) => {
        ev.preventDefault();
        expanded = !expanded;
        ov.setText(expanded ? full : full.slice(0, BIO_MAX) + "…");
        toggle.setText(expanded ? dict.collapse : dict.expand);
      };
    }
  }

  if (p.memoryAvailable === true && p.memoryCount !== undefined) {
    const mem = card.createDiv("tnr-mem");
    mem.style.cssText =
      "margin-top:12px;border-top:1px solid var(--tnr-border);padding-top:10px;";

    const head = mem.createDiv("tnr-mem-head");
    head.style.cssText =
      "display:flex;align-items:center;gap:7px;color:var(--tnr-accent);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.cssText = "width:15px;height:15px;flex:0 0 auto;";
    svg.innerHTML = `
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    `;
    head.appendChild(svg);
    head.createEl("span", { text: dict.inMemory });

    const stats = mem.createDiv("tnr-mem-stats");
    stats.style.cssText =
      "display:grid;grid-template-columns:1fr 1fr;gap:10px;";

    const statCss =
      "box-sizing:border-box;border:1px solid var(--tnr-border);border-radius:8px;padding:10px 12px;background:var(--tnr-code-bg);text-align:center;";
    const bigCss = "font-size:22px;font-weight:700;line-height:1.1;";
    const capCss =
      "font-size:11px;color:var(--tnr-muted);margin-top:3px;";

    const tile1 = stats.createDiv("tnr-mem-stat");
    tile1.style.cssText = statCss;
    const big1 = tile1.createDiv({
      cls: "tnr-mem-big",
      text: String(p.memoryCount),
    });
    big1.style.cssText = bigCss + "color:var(--tnr-text);";
    const cap1 = tile1.createDiv({
      cls: "tnr-mem-cap",
      text: dict.filmsInMemory,
    });
    cap1.style.cssText = capCss;

    const tile2 = stats.createDiv("tnr-mem-stat");
    tile2.style.cssText = statCss;
    const big2 = tile2.createDiv("tnr-mem-big tnr-mem-big-good");
    big2.style.cssText = bigCss + "color:var(--tnr-good);";
    if (p.memoryAverage !== undefined) {
      const pct = Math.min(100, Math.max(0, (p.memoryAverage / 5) * 100));
      const stars = big2.createSpan({ cls: "tnr-stars", text: "★★★★★" });
      stars.style.cssText =
        "position:relative;display:inline-block;font-size:17px;line-height:1;letter-spacing:2px;color:var(--tnr-border);vertical-align:-1px;";
      const fill = stars.createSpan({ cls: "tnr-stars-fill", text: "★★★★★" });
      fill.style.cssText =
        "position:absolute;top:0;left:0;overflow:hidden;white-space:nowrap;color:#e0a92e;width:" +
        pct +
        "%;";
      big2.appendText(" " + p.memoryAverage.toFixed(1));
    } else {
      big2.setText("—");
    }
    const cap2 = tile2.createDiv({ cls: "tnr-mem-cap", text: dict.avgRating });
    cap2.style.cssText = capCss;
  } else if (p.memoryAvailable === false) {
    const mem = card.createDiv("tnr-mem");
    mem.style.cssText =
      "margin-top:12px;border-top:1px solid var(--tnr-border);padding-top:10px;";

    const head = mem.createDiv("tnr-mem-head");
    head.style.cssText =
      "display:flex;align-items:center;gap:7px;color:var(--tnr-accent);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.cssText = "width:15px;height:15px;flex:0 0 auto;";
    svg.innerHTML = `
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    `;
    head.appendChild(svg);
    head.createEl("span", { text: dict.inMemory });

    const hint = mem.createEl("div", {
      cls: "tnr-mem-hint",
      text: dict.profileHint,
    });
    hint.style.cssText = "font-size:12px;color:var(--tnr-muted);line-height:1.5;";
  }

  if (p.memoryFilms && p.memoryFilms.length > 0) {
    const known = card.createDiv("tnr-known");
    known.style.cssText =
      "margin-top:12px;border-top:1px solid var(--tnr-border);padding-top:10px;";
    const label = known.createEl("div", {
      cls: "tnr-known-label",
      text: dict.theirFilms,
    });
    label.style.cssText =
      "font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:var(--tnr-muted);margin-bottom:8px;";
    const track = known.createDiv("tnr-known-track");
    track.style.cssText =
      "box-sizing:border-box;display:flex;gap:12px;overflow-x:auto;padding:2px 0;scrollbar-width:none;";
    for (const film of p.memoryFilms) {
      const title = escapeHtml(film.title);
      const item = track.createDiv("tnr-known-item");
      item.style.cssText =
        "box-sizing:border-box;flex:0 0 auto;width:92px;text-align:center;";
      const poster = item.createDiv("tnr-known-poster");
      poster.style.cssText =
        "box-sizing:border-box;width:92px;aspect-ratio:2/3;border-radius:6px;overflow:hidden;background:" +
        GRADIENT +
        ";box-shadow:0 1px 4px rgba(0,0,0,0.2);";
      if (film.poster) {
        const img = poster.createEl("img");
        img.src = film.poster;
        img.alt = title;
        img.style.cssText =
          "width:100%;height:100%;object-fit:cover;display:block;";
        img.onerror = () => {
          img.style.display = "none";
        };
      }
      const t = item.createEl("div", {
        cls: "tnr-known-title",
        text: title,
      });
      t.style.cssText =
        "font-size:10px;color:var(--tnr-text);margin-top:4px;line-height:1.2;";
      const y = item.createEl("div", {
        cls: "tnr-known-year",
        text: escapeHtml(film.year),
      });
      y.style.cssText = "font-size:10px;color:var(--tnr-muted);";
      const r = item.createEl("div", {
        cls: "tnr-known-rating",
        text: `★ ${film.rating.toFixed(1)}`,
      });
      r.style.cssText = "font-size:10px;color:#e0a92e;font-weight:600;";
    }
  }
}

export function buildTmdbFooter(el: HTMLElement, p: CardPayload): void {
  const dict = getDict(p.lang).card;
  const path =
    p.mediaType === "person"
      ? "person"
      : p.mediaType === "movie"
      ? "movie"
      : "tv";
  let url = `https://www.themoviedb.org/${path}/${p.tmdbId}`;
  if (p.season) url += `/season/${p.season}`;
  if (p.episode) url += `/episode/${p.episode}`;

  const footer = el.createDiv("tnr-tmdb-footer");
  footer.style.cssText =
    "box-sizing:border-box;text-align:center;font-size:11px;color:var(--tnr-muted);margin:10px 0 16px;font-family:-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif;line-height:1.5;";

  footer.appendText(escapeHtml(dict.tmdbAttribution) + " ");

  const link = footer.createEl("a", {
    cls: "tnr-tmdb-link",
    text: `${escapeHtml(dict.tmdbId)}: ${p.tmdbId}`,
  });
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.style.cssText = "color:var(--tnr-accent);text-decoration:underline;font-weight:600;";
}

export function renderCards(el: HTMLElement, p: CardPayload): void {
  if (p.mediaType === "person") {
    buildPersonCard(el, p);
    buildTmdbFooter(el, p);
    return;
  }
  buildMediaCard(el, p);
  if (p.withCast) {
    buildCastCard(el, p);
  }
  buildTmdbFooter(el, p);
}

export function registerCardProcessor(plugin: Plugin): void {
  plugin.registerMarkdownCodeBlockProcessor("tnr", (source, el) => {
    el.addClass("tnr-embed");
    try {
      const payload = JSON.parse(source) as CardPayload;
      renderCards(el, payload);
    } catch {
      el.setText("TNR: dados do card inválidos.");
    }
  });
}

export function insertCardBlock(editor: Editor, payload: CardPayload): void {
  const cursor = editor.getCursor();
  const json = JSON.stringify(payload).replace(/`{3,}/g, "`");
  const text = "```tnr\n" + json + "\n```\n";
  editor.replaceRange(text, cursor);
  const end = editor.offsetToPos(editor.posToOffset(cursor) + text.length);
  editor.setCursor(end);
}