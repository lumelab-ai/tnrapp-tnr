import {
  App,
  PluginSettingTab,
  SecretComponent,
  Notice,
  type SettingDefinitionItem,
} from "obsidian";
import type TNRPlugin from "../main";
import { t, SUPPORTED_LANGUAGES } from "../i18n";
import type { Dict } from "../i18n/en";
import type { MemoryEntry } from "../profile/profile";

export class TNRSettingTab extends PluginSettingTab {
  plugin: TNRPlugin;

  constructor(app: App, plugin: TNRPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private dict(): Dict["settings"] {
    return t(this.plugin.settings.language, "settings");
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    const dict = this.dict();

    return [
      {
        name: dict.languageName,
        desc: dict.languageDesc,
        render: (setting) => {
          setting.addDropdown((dropdown) => {
            SUPPORTED_LANGUAGES.forEach((code) =>
              dropdown.addOption(code, code)
            );
            dropdown.setValue(this.plugin.settings.language);
            dropdown.onChange(async (value) => {
              this.plugin.settings.language = value;
              await this.plugin.saveSettings();
              this.plugin.refreshCommands();
              this.update();
            });
          });
        },
      },
      {
        name: dict.tokenName,
        desc: dict.tokenDesc,
        render: (setting) => {
          setting.addComponent((el) => {
            return new SecretComponent(this.app, el)
              .setValue(this.plugin.settings.tmdbSecretName)
              .onChange((value) => {
                this.plugin.settings.tmdbSecretName = value;
                void this.plugin.saveSettings();
              });
          });
        },
      },
      {
        name: dict.profileName,
        desc: dict.profileDesc,
        render: (setting) => {
          setting
            .addText((text) => {
              text
                .setPlaceholder(dict.profilePlaceholder)
                .setValue(this.plugin.settings.profilePath)
                .onChange((value) => {
                  this.plugin.settings.profilePath = value;
                  void this.plugin.saveSettings();
                });
            })
            .addButton((button) =>
              button.setButtonText(dict.browse).onClick(() => {
                this.openFolderPicker(setting.controlEl);
              })
            );
        },
      },
      {
        name: dict.adultName,
        render: (setting) => {
          setting.addToggle((toggle) =>
            toggle
              .setValue(this.plugin.settings.includeAdult)
              .onChange((value) => {
                this.plugin.settings.includeAdult = value;
                void this.plugin.saveSettings();
              })
          );
        },
      },
    ];
  }

  private openFolderPicker(containerEl: HTMLElement): void {
    const input = containerEl.createEl("input", {
      type: "file",
      attr: { webkitdirectory: "", directory: "", multiple: "" },
      cls: "tnr-folder-picker-input tnr-hidden",
    });
    input.onchange = () => {
      const files = Array.from(input.files || []);
      const memoriesFile = files.find((f) => f.name === "memories.json");
      if (!memoriesFile) {
        new Notice("memories.json não encontrado na pasta selecionada");
        input.remove();
        return;
      }
      void this.loadProfileFile(memoriesFile, input);
    };
    containerEl.appendChild(input);
    input.click();
  }

  private async loadProfileFile(
    memoriesFile: File,
    input: HTMLInputElement
  ): Promise<void> {
    try {
      const text = await memoriesFile.text();
      const data = JSON.parse(text) as { entries?: MemoryEntry[] };
      if (!Array.isArray(data.entries)) {
        new Notice("memories.json inválido (sem array entries)");
        return;
      }
      // Salva apenas o nome da pasta para exibição
      const folderName = memoriesFile.webkitRelativePath.split("/")[0];
      this.plugin.settings.profilePath = folderName;
      await this.plugin.saveSettings();
      // Armazena os dados em memória para uso imediato
      this.plugin._memoryCache = data.entries;
      new Notice(`Perfil carregado: ${data.entries.length} memórias`);
      this.update();
    } catch (e) {
      new Notice("Erro ao ler memories.json: " + (e as Error).message);
    } finally {
      input.remove();
    }
  }
}
