import { Modal } from "obsidian";
import type TNRPlugin from "../main";
import { t } from "../i18n";
import { posterUrl } from "../tmdb/image";
import { parseSeasonQuery, seasonRef } from "../tmdb/query";
import { TMDBSearchService } from "../tmdb/service";
import type { SearchHit, SearchResultItem } from "../tmdb/types";

const DEBOUNCE_MS = 300;

export class TMDSearchModal extends Modal {
  private plugin: TNRPlugin;
  private service: TMDBSearchService;
  private input: HTMLInputElement;
  private resultsEl: HTMLElement;
  private statusEl: HTMLElement;
  private debounceTimer: number | null = null;
  private searchSeq = 0;
  private items: SearchHit[] = [];
  private activeIndex = 0;
  private onSelect: (hit: SearchHit) => void;

  constructor(
    plugin: TNRPlugin,
    service: TMDBSearchService,
    onSelect: (hit: SearchHit) => void
  ) {
    super(plugin.app);
    this.plugin = plugin;
    this.service = service;
    this.onSelect = onSelect;
  }

  private dict() {
    return t(this.plugin.settings.language, "modal");
  }

  onOpen(): void {
    const { contentEl } = this;
    this.titleEl.setText(this.dict().title);

    this.input = contentEl.createEl("input", {
      type: "text",
      cls: "tnr-search-input",
      attr: { placeholder: this.dict().searchPlaceholder },
    });
    this.input.addEventListener("input", () => this.onInput());

    this.statusEl = contentEl.createDiv({ cls: "tnr-search-status" });
    this.resultsEl = contentEl.createDiv({ cls: "tnr-search-results" });

    this.input.addEventListener("keydown", (e) => this.onKeydown(e));

    this.input.focus();
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }

  private onInput(): void {
    if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
    const query = this.input.value.trim();
    if (!query) {
      this.searchSeq++;
      this.statusEl.setText("");
      this.resultsEl.empty();
      return;
    }
    this.statusEl.setText(this.dict().searching);
    this.debounceTimer = window.setTimeout(() => this.runSearch(query), DEBOUNCE_MS);
  }

  private async runSearch(query: string): Promise<void> {
    const language = this.plugin.settings.language;
    const seq = ++this.searchSeq;
    const parsed = parseSeasonQuery(query);
    try {
      let items: SearchHit[] = [];
      if (parsed) {
        items = await this.service.resolveSeasonEpisode(query, language);
      }
      if (items.length === 0) {
        const searchQuery = parsed ? parsed.base : query;
        const res = await this.service.search(searchQuery, language);
        items = res.results
          .filter(
            (r) => r.media_type === "movie" || r.media_type === "tv"
          )
          .map((item) => ({ kind: "media", item }));
      }
      if (seq !== this.searchSeq) return;
      this.items = items;
      this.activeIndex = 0;
      if (this.items.length === 0) {
        this.statusEl.setText(this.dict().noResults);
        this.resultsEl.empty();
        return;
      }
      this.statusEl.setText("");
      this.renderResults();
    } catch (error) {
      if (seq !== this.searchSeq) return;
      this.service.errorNotice(error, language);
      this.statusEl.setText(this.dict().error);
    }
  }

  private renderResults(): void {
    this.resultsEl.empty();
    this.items.forEach((hit, index) => {
      const row = this.resultsEl.createDiv({
        cls: "tnr-search-item",
        attr: { "data-index": String(index) },
      });
      row.addEventListener("click", () => this.choose(this.items[index]));

      const poster = row.createDiv({ cls: "tnr-search-poster" });
      const img = poster.createEl("img", {
        attr: { src: this.hitPoster(hit), alt: "" },
      });
      img.addEventListener("error", () => poster.addClass("tnr-hidden"));

      const info = row.createDiv({ cls: "tnr-search-info" });
      const title = this.hitTitle(hit);
      const year = this.hitYear(hit);
      info.createDiv({ cls: "tnr-search-title", text: `${title} (${year})` });
      info.createDiv({ cls: "tnr-search-sub", text: this.hitSub(hit) });
    });
    this.highlight(this.activeIndex);
  }

  private hitPoster(hit: SearchHit): string {
    if (hit.kind === "media") {
      return posterUrl(hit.item.poster_path, "w92");
    }
    if (hit.kind === "season") {
      return posterUrl(hit.season.poster_path || hit.series.poster_path, "w92");
    }
    return posterUrl(hit.episode.still_path || hit.series.poster_path, "w92");
  }

  private hitTitle(hit: SearchHit): string {
    if (hit.kind === "media") {
      return this.itemTitle(hit.item);
    }
    if (hit.kind === "season") {
      return hit.series.name || hit.series.original_name || "";
    }
    return (
      hit.episode.name ||
      hit.series.name ||
      hit.series.original_name ||
      ""
    );
  }

  private hitYear(hit: SearchHit): string {
    if (hit.kind === "media") {
      return this.itemYear(hit.item);
    }
    if (hit.kind === "season") {
      return (hit.season.air_date || hit.series.first_air_date || "").slice(
        0,
        4
      );
    }
    return (hit.episode.air_date || "").slice(0, 4);
  }

  private hitSub(hit: SearchHit): string {
    if (hit.kind === "media") {
      return hit.item.media_type === "tv" ? this.dict().series : this.dict().movie;
    }
    if (hit.kind === "season") {
      return `${this.dict().season} ${hit.season.season_number}`;
    }
    const seriesName = hit.series.name || hit.series.original_name || "";
    return `${seriesName} · ${seasonRef(
      hit.episode.season_number,
      hit.episode.episode_number
    )}`;
  }

  private itemTitle(item: SearchResultItem): string {
    return item.media_type === "tv"
      ? item.name || item.original_name || ""
      : item.title || item.original_title || "";
  }

  private itemYear(item: SearchResultItem): string {
    const date =
      item.media_type === "tv" ? item.first_air_date : item.release_date;
    return date ? date.slice(0, 4) : "";
  }

  private highlight(index: number): void {
    const children = this.resultsEl.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      el.toggleClass("is-active", i === index);
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.activeIndex = Math.min(
        this.activeIndex + 1,
        this.items.length - 1
      );
      this.highlight(this.activeIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, 0);
      this.highlight(this.activeIndex);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (this.items.length > 0) this.choose(this.items[this.activeIndex]);
    } else if (e.key === "Escape") {
      this.close();
    }
  }

  private choose(hit: SearchHit): void {
    this.close();
    this.onSelect(hit);
  }
}
