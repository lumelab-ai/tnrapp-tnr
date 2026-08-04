import { App, Notice } from "obsidian";
import type TNRPlugin from "../main";
import { t } from "../i18n";
import {
  TMDBError,
  type Credits,
  type EpisodeDetails,
  type MediaDetails,
  type MediaType,
  type PersonDetails,
  type PersonSearchResponse,
  type SearchHit,
  type SearchMultiResponse,
  type SeasonDetails,
} from "./types";
import { parseSeasonQuery } from "./query";

const API_BASE = "https://api.themoviedb.org/3";

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const TTL = 5 * 60 * 1000;

export class TMDBSearchService {
  private plugin: TNRPlugin;
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  constructor(plugin: TNRPlugin) {
    this.plugin = plugin;
  }

  async getToken(): Promise<string> {
    const secretName = this.plugin.settings.tmdbSecretName;
    if (!secretName) {
      throw new TMDBError("missing_secret", 0);
    }
    const token = await this.plugin.app.secretStorage.getSecret(secretName);
    if (!token) {
      throw new TMDBError("missing_secret", 0);
    }
    return token;
  }

  private headers(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json;charset=utf-8",
    };
  }

  private cacheGet<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;
    if (Date.now() - entry.ts > TTL) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  private cacheSet<T>(key: string, data: T): void {
    this.cache.set(key, { data, ts: Date.now() });
  }

  private async request<T>(path: string, query: string, token: string): Promise<T> {
    const url = `${API_BASE}${path}?${query}`;
    const response = await fetch(url, { headers: this.headers(token) });
    if (!response.ok) {
      if (response.status === 401) {
        throw new TMDBError("invalid_secret", response.status);
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        throw new TMDBError(
          retryAfter ? `rate_limit_${retryAfter}` : "rate_limit",
          response.status
        );
      }
      throw new TMDBError(`http_${response.status}`, response.status);
    }
    return (await response.json()) as T;
  }

  async search(query: string, language: string): Promise<SearchMultiResponse> {
    const token = await this.getToken();
    const lang = this.toTMDBSearchLang(language);
    const key = `search:${query}:${lang}:${this.plugin.settings.includeAdult}`;
    const cached = this.cacheGet<SearchMultiResponse>(key);
    if (cached) return cached;

    const qs = new URLSearchParams({
      query,
      language: lang,
      page: "1",
      include_adult: String(this.plugin.settings.includeAdult),
    });
    const data = await this.request<SearchMultiResponse>(
      "/search/multi",
      qs.toString(),
      token
    );
    this.cacheSet(key, data);
    return data;
  }

  async searchTV(query: string, language: string): Promise<SearchMultiResponse> {    const token = await this.getToken();
    const lang = this.toTMDBSearchLang(language);
    const key = `search-tv:${query}:${lang}:${this.plugin.settings.includeAdult}`;
    const cached = this.cacheGet<SearchMultiResponse>(key);
    if (cached) return cached;

    const qs = new URLSearchParams({
      query,
      language: lang,
      page: "1",
      include_adult: String(this.plugin.settings.includeAdult),
    });
    const data = await this.request<SearchMultiResponse>(
      "/search/tv",
      qs.toString(),
      token
    );
    this.cacheSet(key, data);
    return data;
  }

  async seasonDetails(
    seriesId: number,
    seasonNumber: number,
    language: string
  ): Promise<SeasonDetails> {
    const token = await this.getToken();
    const lang = this.toTMDBSearchLang(language);
    const key = `season:${seriesId}:${seasonNumber}:${lang}`;
    const cached = this.cacheGet<SeasonDetails>(key);
    if (cached) return cached;

    const qs = new URLSearchParams({ language: lang });
    const data = await this.request<SeasonDetails>(
      `/tv/${seriesId}/season/${seasonNumber}`,
      qs.toString(),
      token
    );
    this.cacheSet(key, data);
    return data;
  }

  async episodeDetails(
    seriesId: number,
    seasonNumber: number,
    episodeNumber: number,
    language: string
  ): Promise<EpisodeDetails> {
    const token = await this.getToken();
    const lang = this.toTMDBSearchLang(language);
    const key = `episode:${seriesId}:${seasonNumber}:${episodeNumber}:${lang}`;
    const cached = this.cacheGet<EpisodeDetails>(key);
    if (cached) return cached;

    const qs = new URLSearchParams({ language: lang });
    const data = await this.request<EpisodeDetails>(
      `/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`,
      qs.toString(),
      token
    );
    this.cacheSet(key, data);
    return data;
  }

  async resolveSeasonEpisode(
    query: string,
    language: string
  ): Promise<SearchHit[]> {
    const parsed = parseSeasonQuery(query);
    if (!parsed) return [];

    const res = await this.searchTV(parsed.base, language);
    const series = res.results[0];
    if (!series) return [];

    try {
      if (parsed.episode !== undefined) {
        const episode = await this.episodeDetails(
          series.id,
          parsed.season,
          parsed.episode,
          language
        );
        return [{ kind: "episode", series, episode }];
      }
      const season = await this.seasonDetails(
        series.id,
        parsed.season,
        language
      );
      return [{ kind: "season", series, season }];
    } catch (error) {
      if (error instanceof TMDBError && error.status === 404) return [];
      throw error;
    }
  }

  async searchPerson(
    query: string,
    language: string
  ): Promise<PersonSearchResponse> {
    const token = await this.getToken();
    const lang = this.toTMDBSearchLang(language);
    const key = `search-person:${query}:${lang}:${this.plugin.settings.includeAdult}`;
    const cached = this.cacheGet<PersonSearchResponse>(key);
    if (cached) return cached;

    const qs = new URLSearchParams({
      query,
      language: lang,
      page: "1",
      include_adult: String(this.plugin.settings.includeAdult),
    });
    const data = await this.request<PersonSearchResponse>(
      "/search/person",
      qs.toString(),
      token
    );
    this.cacheSet(key, data);
    return data;
  }

  async personDetails(id: number, language: string): Promise<PersonDetails> {
    const token = await this.getToken();
    const lang = this.toTMDBSearchLang(language);
    const key = `person:${id}:${lang}`;
    const cached = this.cacheGet<PersonDetails>(key);
    if (cached) return cached;

    const qs = new URLSearchParams({ language: lang });
    const data = await this.request<PersonDetails>(
      `/person/${id}`,
      qs.toString(),
      token
    );
    this.cacheSet(key, data);
    return data;
  }

  async details(
    id: number,
    mediaType: MediaType,
    language: string
  ): Promise<MediaDetails> {
    const token = await this.getToken();
    const lang = this.toTMDBSearchLang(language);
    const key = `details:${mediaType}:${id}:${lang}`;
    const cached = this.cacheGet<MediaDetails>(key);
    if (cached) return cached;

    const qs = new URLSearchParams({
      language: lang,
      append_to_response: "credits,images,videos,external_ids",
    });
    const data = await this.request<MediaDetails>(
      `/${mediaType}/${id}`,
      qs.toString(),
      token
    );
    this.cacheSet(key, data);
    return data;
  }

  async validateToken(): Promise<boolean> {
    try {
      const token = await this.getToken();
      await this.request("/authentication", "", token);
      return true;
    } catch {
      return false;
    }
  }

  private toTMDBSearchLang(language: string): string {
    return language === "pt-BR" ? "pt-BR" : "en-US";
  }

  errorNotice(error: unknown, language: string): void {
    const dict = t(language, "notices");
    if (error instanceof TMDBError) {
      if (error.status === 0) {
        new Notice(`${dict.missingSecret} ${dict.getKeySteps}`);
      } else if (error.status === 401) {
        new Notice(dict.invalidSecret);
      } else if (error.status === 429) {
        new Notice(t(language, "modal").error);
      } else {
        new Notice(t(language, "modal").error);
      }
    } else {
      new Notice(t(language, "modal").error);
    }
  }
}
