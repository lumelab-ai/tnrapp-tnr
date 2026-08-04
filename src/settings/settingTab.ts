import { App, PluginSettingTab, Setting, SecretComponent, Notice } from "obsidian";
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

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    const dict = this.dict();

    new Setting(containerEl)
      .setName(dict.languageName)
      .setDesc(dict.languageDesc)
      .addDropdown((dropdown) => {
        SUPPORTED_LANGUAGES.forEach((code) => dropdown.addOption(code, code));
        dropdown.setValue(this.plugin.settings.language);
        dropdown.onChange(async (value) => {
          this.plugin.settings.language = value;
          await this.plugin.saveSettings();
          this.plugin.refreshCommands();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName(dict.tokenName)
      .setDesc(dict.tokenDesc)
      .addComponent((el) => {
        return new SecretComponent(this.app, el)
          .setValue(this.plugin.settings.tmdbSecretName)
          .onChange(async (value) => {
            this.plugin.settings.tmdbSecretName = value;
            await this.plugin.saveSettings();
          });
      });

new Setting(containerEl)
      .setName(dict.profileName)
      .setDesc(dict.profileDesc)
      .addText((text) => {
        text
          .setPlaceholder(dict.profilePlaceholder)
          .setValue(this.plugin.settings.profilePath)
          .onChange(async (value) => {
            this.plugin.settings.profilePath = value;
            await this.plugin.saveSettings();
          });
      })
      .addButton((button) =>
        button.setButtonText(dict.browse).onClick(() => {
          const input = containerEl.createEl("input", {
            type: "file",
            attr: { webkitdirectory: "", directory: "", multiple: "" },
            cls: "tnr-folder-picker-input",
          });
          input.style.display = "none";
          input.onchange = async () => {
            const files = Array.from(input.files || []);
            const memoriesFile = files.find((f) => f.name === "memories.json");
            if (!memoriesFile) {
              new Notice("memories.json não encontrado na pasta selecionada");
              input.remove();
              return;
            }
            try {
              const text = await memoriesFile.text();
              const data = JSON.parse(text) as { entries?: MemoryEntry[] };
              if (!Array.isArray(data.entries)) {
                new Notice("memories.json inválido (sem array entries)");
                input.remove();
                return;
              }
              // Salva apenas o nome da pasta para exibição
              const folderName = memoriesFile.webkitRelativePath.split("/")[0];
              this.plugin.settings.profilePath = folderName;
              await this.plugin.saveSettings();
              // Armazena os dados em memória para uso imediato
              (this.plugin as any)._memoryCache = data.entries;
              new Notice(`Perfil carregado: ${data.entries.length} memórias`);
              this.display();
            } catch (e) {
              new Notice("Erro ao ler memories.json: " + (e as Error).message);
            }
            input.remove();
          };
          containerEl.appendChild(input);
          input.click();
        })
      );

    new Setting(containerEl)
      .setName(dict.adultName)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeAdult)
          .onChange(async (value) => {
            this.plugin.settings.includeAdult = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
