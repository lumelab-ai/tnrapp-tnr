import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { TNRSettingTab } from "./settings/settingTab";
import {
  DEFAULT_SETTINGS,
  type TNRPluginSettings,
} from "./settings/settings";
import { t } from "./i18n";
import { TMDBSearchService } from "./tmdb/service";
import { TMDSearchModal } from "./commands/tmdbSearchModal";
import { TMDSearchPersonModal } from "./commands/tmdbSearchPersonModal";
import {
  buildPayload,
  buildPersonPayload,
  buildSeasonPayload,
  buildEpisodePayload,
  insertCardBlock,
  registerCardProcessor,
  type CardPayload,
} from "./card";
import { computePersonMemoryStats, loadMemories } from "./profile/profile";
import type { PersonSearchItem, SearchHit } from "./tmdb/types";
import type { MemoryEntry } from "./profile/profile";

export default class TNRPlugin extends Plugin {
  settings: TNRPluginSettings;
  private service: TMDBSearchService;
  _memoryCache: MemoryEntry[] | undefined;

  async onload(): Promise<void> {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as Partial<TNRPluginSettings>
    );
    this.service = new TMDBSearchService(this);

    this.addSettingTab(new TNRSettingTab(this.app, this));

    registerCardProcessor(this);

    this.registerCommands();
  }

  registerCommands(): void {
    this.addCommand({
      id: "tnr-add",
      name: t(this.settings.language, "commands").add,
      callback: () => this.runAdd(false),
    });
    this.addCommand({
      id: "tnr-add-cast",
      name: t(this.settings.language, "commands").addCast,
      callback: () => this.runAdd(true),
    });
    this.addCommand({
      id: "tnr-person",
      name: t(this.settings.language, "commands").person,
      callback: () => this.runAddPerson(),
    });
  }

  refreshCommands(): void {
    // Re-registra comandos para atualizar nomes localizados.
    this.registerCommands();
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private runAdd(withCast: boolean): void {
    new TMDSearchModal(this, this.service, (hit) => {
      void this.handleSelection(hit, withCast);
    }).open();
  }

  private runAddPerson(): void {
    new TMDSearchPersonModal(this, this.service, (person) => {
      void this.handlePersonSelection(person);
    }).open();
  }

  private async handlePersonSelection(person: PersonSearchItem): Promise<void> {
    const dict = t(this.settings.language, "notices");
    const editor = this.activeEditor();
    if (!editor) {
      new Notice("No active editor");
      return;
    }
    try {
      const details = await this.service.personDetails(
        person.id,
        this.settings.language
      );
      // Usa cache de memória se disponível (carregado via seletor de pasta)
      const cached = this._memoryCache;
      const memories = cached ?? (await loadMemories(this.app, this.settings.profilePath));
      if (!cached && !this.settings.profilePath) {
        new Notice(dict.noProfile);
      } else if (!cached && memories === null) {
        new Notice(`${dict.profileReadError} ${this.settings.profilePath}`);
      }
      const stats = memories
        ? computePersonMemoryStats(memories, person.name ?? "")
        : null;
      const payload = buildPersonPayload(
        person,
        details,
        stats,
        this.settings.language
      );
      insertCardBlock(editor, payload);
      new Notice(dict.insertPersonOk);
    } catch (error) {
      this.service.errorNotice(error, this.settings.language);
    }
  }

  private async handleSelection(
    hit: SearchHit,
    withCast: boolean
  ): Promise<void> {
    const dict = t(this.settings.language, "notices");
    const editor = this.activeEditor();
    if (!editor) {
      new Notice("No active editor");
      return;
    }
    try {
      let payload: CardPayload;
      if (hit.kind === "media") {
        const mediaType = hit.item.media_type === "tv" ? "tv" : "movie";
        const details = await this.service.details(
          hit.item.id,
          mediaType,
          this.settings.language
        );
        payload = buildPayload(
          details,
          mediaType,
          withCast,
          this.settings.language
        );
      } else if (hit.kind === "season") {
        payload = buildSeasonPayload(
          hit.series,
          hit.season,
          this.settings.language
        );
      } else {
        payload = buildEpisodePayload(
          hit.series,
          hit.episode,
          withCast,
          this.settings.language
        );
      }
      insertCardBlock(editor, payload);
      const castInserted = withCast && hit.kind !== "season";
      new Notice(castInserted ? dict.insertCastOk : dict.insertOk);
    } catch (error) {
      this.service.errorNotice(error, this.settings.language);
    }
  }

  private activeEditor(): Editor | null {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view?.editor ?? null;
  }
}
