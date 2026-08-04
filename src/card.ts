import type { Editor, Plugin } from "obsidian";
import { setIcon } from "obsidian";
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

function hideOnError(img: HTMLImageElement): void {
  img.onerror = () => {
    img.addClass("tnr-hidden");
  };
}

function buildMediaCard(el: HTMLElement, p: CardPayload): void {
  const dict = getDict(p.lang).card;
  const title = escapeHtml(p.title);

  const card = el.createDiv("tnr-card");

  const logoLink = card.createEl("a", { cls: "tnr-logo" });
  logoLink.href = "https://tnrapp.com";
  logoLink.target = "_blank";
  logoLink.rel = "noopener";
  logoLink.title = "TNR — Track 'n' Review";
  const logoImg = logoLink.createEl("img");
  logoImg.src = TNR_LOGO_DATA_URI;
  logoImg.alt = "TNR";

  const inner = card.createDiv("tnr-inner");

  const posterWrap = inner.createDiv(
    p.landscape ? "tnr-poster tnr-poster--landscape" : "tnr-poster"
  );
  if (p.poster) {
    const img = posterWrap.createEl("img");
    img.src = p.poster;
    img.alt = `Poster de ${title}`;
    hideOnError(img);
  }

  const info = inner.createDiv("tnr-info");

  const titleLine = info.createDiv("tnr-title-line");
  titleLine.createEl("span", { cls: "tnr-title", text: title });
  if (p.year) {
    titleLine.createEl("span", { cls: "tnr-year", text: p.year });
  }

  if (p.original) {
    info.createEl("div", {
      cls: "tnr-original",
      text: escapeHtml(p.original),
    });
  }

  if (p.subtitle) {
    info.createEl("div", {
      cls: "tnr-subtitle",
      text: escapeHtml(p.subtitle),
    });
  }

  const meta = info.createDiv("tnr-meta");

  const rows: Array<[string, string | undefined, boolean]> = [
    [dict.director, p.director, false],
    [dict.genres, p.genres, true],
    [dict.duration, p.duration, false],
    [dict.country, p.country, false],
  ];
  for (const [key, value, isGenres] of rows) {
    if (value) {
      meta.createEl("span", {
        cls: "tnr-meta-key",
        text: escapeHtml(key),
      });
      meta.createEl("span", {
        cls: isGenres ? "tnr-meta-value tnr-genres" : "tnr-meta-value",
        text: escapeHtml(value),
      });
    }
  }

  if (p.overview) {
    const OVERVIEW_MAX = 113;
    const full = escapeHtml(p.overview);
    const ov = info.createEl("div", { cls: "tnr-overview", text: full });
    if (full.length > OVERVIEW_MAX) {
      ov.setText(full.slice(0, OVERVIEW_MAX) + "…");
      let expanded = false;
      const toggle = info.createEl("a", {
        cls: "tnr-expand",
        text: dict.expand,
      });
      toggle.href = "#";
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

  const head = card.createDiv("tnr-cast-head");
  setIcon(head, "users");
  head.createEl("span", { text: dict.cast });

  const section = card.createDiv("tnr-cast-section");
  const carousel = section.createDiv("tnr-cast-carousel");
  const track = carousel.createDiv("tnr-cast-track");

  for (const member of p.cast) {
    const name = escapeHtml(member.name);
    const item = track.createDiv("tnr-cast-item");
    const avatar = item.createDiv("tnr-cast-avatar");
    const img = avatar.createEl("img");
    img.src = member.profile;
    img.alt = name;
    hideOnError(img);
    item.createEl("div", { cls: "tnr-cast-name", text: name });
  }
}

function buildMemoryHead(mem: HTMLElement, text: string): void {
  const head = mem.createDiv("tnr-mem-head");
  setIcon(head, "bookmark");
  head.createEl("span", { text });
}

function buildPersonCard(el: HTMLElement, p: CardPayload): void {
  const dict = getDict(p.lang).card;
  const name = escapeHtml(p.title);

  const card = el.createDiv("tnr-card");

  const logoLink = card.createEl("a", { cls: "tnr-logo" });
  logoLink.href = "https://tnrapp.com";
  logoLink.target = "_blank";
  logoLink.rel = "noopener";
  logoLink.title = "TNR — Track 'n' Review";
  const logoImg = logoLink.createEl("img");
  logoImg.src = TNR_LOGO_DATA_URI;
  logoImg.alt = "TNR";

  const inner = card.createDiv("tnr-inner");

  const photoWrap = inner.createDiv("tnr-photo");
  if (p.photo) {
    const img = photoWrap.createEl("img");
    img.src = p.photo;
    img.alt = `Foto de ${name}`;
    hideOnError(img);
  }

  const info = inner.createDiv("tnr-info");

  const titleLine = info.createDiv("tnr-title-line tnr-title-line--center");
  titleLine.createEl("span", { cls: "tnr-title", text: name });
  if (p.department) {
    titleLine.createEl("span", {
      cls: "tnr-dept",
      text: escapeHtml(p.department),
    });
  }

  const meta = info.createDiv("tnr-meta");
  const rows: Array<[string, string | undefined]> = [
    [dict.birth, p.birthday],
    [dict.death, p.deathday],
    [dict.place, p.placeOfBirth],
    [dict.roles, p.roles],
  ];
  for (const [key, value] of rows) {
    if (value) {
      meta.createEl("span", {
        cls: "tnr-meta-key",
        text: escapeHtml(key),
      });
      meta.createEl("span", {
        cls: "tnr-meta-value",
        text: escapeHtml(value),
      });
    }
  }

  if (p.personBio) {
    const BIO_MAX = 120;
    const full = escapeHtml(p.personBio);
    const ov = info.createEl("div", { cls: "tnr-bio", text: full });
    if (full.length > BIO_MAX) {
      ov.setText(full.slice(0, BIO_MAX) + "…");
      let expanded = false;
      const toggle = info.createEl("a", {
        cls: "tnr-expand",
        text: dict.expand,
      });
      toggle.href = "#";
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
    buildMemoryHead(mem, dict.inMemory);

    const stats = mem.createDiv("tnr-mem-stats");

    const tile1 = stats.createDiv("tnr-mem-stat");
    tile1.createDiv({
      cls: "tnr-mem-big",
      text: String(p.memoryCount),
    });
    tile1.createDiv({
      cls: "tnr-mem-cap",
      text: dict.filmsInMemory,
    });

    const tile2 = stats.createDiv("tnr-mem-stat");
    const big2 = tile2.createDiv("tnr-mem-big tnr-mem-big-good");
    if (p.memoryAverage !== undefined) {
      const pct = Math.min(100, Math.max(0, (p.memoryAverage / 5) * 100));
      const stars = big2.createSpan({ cls: "tnr-stars", text: "★★★★★" });
      const fill = stars.createSpan({ cls: "tnr-stars-fill", text: "★★★★★" });
      fill.style.width = `${pct}%`;
      big2.appendText(" " + p.memoryAverage.toFixed(1));
    } else {
      big2.setText("—");
    }
    tile2.createDiv({ cls: "tnr-mem-cap", text: dict.avgRating });
  } else if (p.memoryAvailable === false) {
    const mem = card.createDiv("tnr-mem");
    buildMemoryHead(mem, dict.inMemory);

    mem.createEl("div", {
      cls: "tnr-mem-hint",
      text: dict.profileHint,
    });
  }

  if (p.memoryFilms && p.memoryFilms.length > 0) {
    const known = card.createDiv("tnr-known");
    known.createEl("div", {
      cls: "tnr-known-label",
      text: dict.theirFilms,
    });
    const track = known.createDiv("tnr-known-track");
    for (const film of p.memoryFilms) {
      const title = escapeHtml(film.title);
      const item = track.createDiv("tnr-known-item");
      const poster = item.createDiv("tnr-known-poster");
      if (film.poster) {
        const img = poster.createEl("img");
        img.src = film.poster;
        img.alt = title;
        hideOnError(img);
      }
      item.createEl("div", {
        cls: "tnr-known-title",
        text: title,
      });
      item.createEl("div", {
        cls: "tnr-known-year",
        text: escapeHtml(film.year),
      });
      item.createEl("div", {
        cls: "tnr-known-rating",
        text: `★ ${film.rating.toFixed(1)}`,
      });
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
  footer.appendText(escapeHtml(dict.tmdbAttribution) + " ");

  const link = footer.createEl("a", {
    cls: "tnr-tmdb-link",
    text: `${escapeHtml(dict.tmdbId)}: ${p.tmdbId}`,
  });
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
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
