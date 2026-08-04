export interface TNRPluginSettings {
  tmdbSecretName: string;
  language: string;
  profilePath: string;
  includeAdult: boolean;
}

export const DEFAULT_SETTINGS: TNRPluginSettings = {
  tmdbSecretName: "",
  language: "pt-BR",
  profilePath: "",
  includeAdult: false,
};
