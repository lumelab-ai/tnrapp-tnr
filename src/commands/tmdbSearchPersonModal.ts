import { App, Modal } from "obsidian";
import type TNRPlugin from "../main";
import { t } from "../i18n";
import { profileUrl } from "../tmdb/image";
import { TMDBSearchService } from "../tmdb/service";
import type { PersonSearchItem } from "../tmdb/types";

const DEBOUNCE_MS = 300;

export class TMDSearchPersonModal extends Modal {
  private plugin: TNRPlugin;
  private service: TMDBSearchService;
  private input: HTMLInputElement;
  private resultsEl: HTMLElement;
  private statusEl: HTMLElement;
  private debounceTimer: number | null = null;
  private searchSeq = 0;
  private items: PersonSearchItem[] = [];
  private activeIndex = 0;
  private onSelect: (person: PersonSearchItem) => void;

  constructor(
    plugin: TNRPlugin,
    service: TMDBSearchService,
    onSelect: (person: PersonSearchItem) => void
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
    this.titleEl.setText(this.dict().personTitle);

    this.input = contentEl.createEl("input", {
      type: "text",
      cls: "tnr-search-input",
      attr: { placeholder: this.dict().personPlaceholder },
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
    this.debounceTimer = window.setTimeout(
      () => this.runSearch(query),
      DEBOUNCE_MS
    );
  }

  private async runSearch(query: string): Promise<void> {
    const language = this.plugin.settings.language;
    const seq = ++this.searchSeq;
    try {
      const res = await this.service.searchPerson(query, language);
      if (seq !== this.searchSeq) return;
      this.items = res.results;
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
    this.items.forEach((person, index) => {
      const row = this.resultsEl.createDiv({
        cls: "tnr-search-item",
        attr: { "data-index": String(index) },
      });
      row.addEventListener("click", () => this.choose(this.items[index]));

      const thumb = row.createDiv({
        cls: "tnr-search-poster tnr-search-poster-person",
      });
      const img = thumb.createEl("img", {
        attr: { src: profileUrl(person.profile_path, "w185"), alt: "" },
      });
      img.addEventListener("error", () => (thumb.style.display = "none"));

      const info = row.createDiv({ cls: "tnr-search-info" });
      info.createDiv({ cls: "tnr-search-title", text: person.name || "" });
      info.createDiv({ cls: "tnr-search-sub", text: this.sub(person) });
    });
    this.highlight(this.activeIndex);
  }

  private sub(person: PersonSearchItem): string {
    const parts: string[] = [];
    if (person.known_for_department) parts.push(person.known_for_department);
    const known = (person.known_for ?? [])
      .slice(0, 2)
      .map((k) => (k.media_type === "tv" ? k.name : k.title))
      .filter(Boolean);
    if (known.length > 0) parts.push(known.join(", "));
    return parts.join(" · ");
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

  private choose(person: PersonSearchItem): void {
    this.close();
    this.onSelect(person);
  }
}
