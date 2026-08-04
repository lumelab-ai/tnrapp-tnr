# Guia de Desenvolvimento do Plugin Obsidian - Pack Movies

## 1. Visão Geral da Arquitetura de Plugins Obsidian

### Estrutura Básica
```
plugin-folder/
├── manifest.json      # Metadados do plugin
├── main.js           # Entry point (bundled)
├── styles.css        # Estilos opcionais
└── src/              # Código fonte TypeScript
    ├── main.ts       # Classe principal extendendo Plugin
    ├── settings.ts   # Interface de configurações
    └── setting-tab.ts # Aba de configurações
```

### manifest.json - Campos Obrigatórios
```json
{
  "id": "obsidian-pack-movies",
  "name": "Pack Movies",
  "version": "1.0.0",
  "minAppVersion": "1.11.4",
  "description": "Gerencia collections de filmes usando TMDB API",
  "author": "Lucas",
  "authorUrl": "https://github.com/lucas",
  "isDesktopOnly": false
}
```

### Ciclo de Vida do Plugin
```typescript
// main.ts
import { Plugin, App, PluginSettingTab, Setting, SecretComponent } from "obsidian";

export default class PackMoviesPlugin extends Plugin {
  settings: PackMoviesSettings;

  async onload() {
    // 1. Carregar configurações
    this.settings = await this.loadData();
    
    // 2. Registrar aba de configurações
    this.addSettingTab(new PackMoviesSettingTab(this.app, this));
    
    // 3. Registrar comandos
    this.addCommand({
      id: "search-movie",
      name: "Buscar filme no TMDB",
      callback: () => this.searchMovie()
    });
    
    // 4. Registrar event listeners se necessário
    this.registerEvent(this.app.workspace.on('layout-change', () => {}));
  }

  onunload() {
    // Cleanup automático via this.registerEvent, this.registerInterval, etc.
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

---

## 2. SecretStorage - Armazenamento Seguro de Credenciais

### Por que usar SecretStorage?
| Aspecto | data.json (direto) | SecretStorage |
|---------|-------------------|---------------|
| Segurança | Plaintext no vault | LocalStorage centralizado (vault-specific) |
| Duplicação | Copiar chave em cada plugin | Uma chave, múltiplos plugins |
| Atualização | Atualizar em todo lugar | Atualizar uma vez |
| UX | Colar API key várias vezes | Selecionar de lista existente |

> **Nota importante (v1.11.4):** Atualmente armazena em LocalStorage sem criptografia at-rest. Futuras versões usarão `electron.safeStorage` (desktop) e APIs nativas seguras (mobile). [Discussão no fórum](https://forum.obsidian.md/t/cross-platform-secure-storage-for-secrets-and-tokens-that-can-be-syncd/100716)

### Implementação Passo a Passo

#### 1. Settings - Armazenar NOME do secret, não o valor
```typescript
// settings.ts
export interface PackMoviesSettings {
  tmdbSecretName: string;  // Ex: "tmdb-api-token"
  defaultLanguage: string;
  adultContent: boolean;
}

export const DEFAULT_SETTINGS: PackMoviesSettings = {
  tmdbSecretName: "",
  defaultLanguage: "pt-BR",
  adultContent: false
};
```

#### 2. SettingTab - Usar SecretComponent
```typescript
// setting-tab.ts
import { App, PluginSettingTab, Setting, SecretComponent } from "obsidian";
import PackMoviesPlugin from "./main";
import { PackMoviesSettings } from "./settings";

export class PackMoviesSettingTab extends PluginSettingTab {
  plugin: PackMoviesPlugin;

  constructor(app: App, plugin: PackMoviesPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // TMDB Token via SecretStorage
    new Setting(containerEl)
      .setName("TMDB API Token")
      .setDesc("Selecione o token do TMDB armazenado no SecretStorage")
      .addComponent(el => new SecretComponent(this.app, el)
        .setValue(this.plugin.settings.tmdbSecretName)
        .onChange(async (value) => {
          this.plugin.settings.tmdbSecretName = value;
          await this.plugin.saveSettings();
        }));

    // Outras configurações normais
    new Setting(containerEl)
      .setName("Idioma padrão")
      .addDropdown(dropdown => dropdown
        .addOption("pt-BR", "Português (BR)")
        .addOption("en-US", "English (US)")
        .addOption("es-ES", "Español")
        .setValue(this.plugin.settings.defaultLanguage)
        .onChange(async (value) => {
          this.plugin.settings.defaultLanguage = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Incluir conteúdo adulto")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.adultContent)
        .onChange(async (value) => {
          this.plugin.settings.adultContent = value;
          await this.plugin.saveSettings();
        }));
  }
}
```

#### 3. Recuperar Secret em Runtime
```typescript
// tmdb-service.ts
import { App } from "obsidian";

export class TMDBService {
  private app: App;
  private baseUrl = "https://api.themoviedb.org/3";
  private imageBaseUrl = "https://image.tmdb.org/t/p/w500";

  constructor(app: App) {
    this.app = app;
  }

  private async getAuthHeader(): Promise<Record<string, string>> {
    const secretName = this.plugin.settings.tmdbSecretName;
    if (!secretName) {
      throw new Error("TMDB secret não configurado nas settings");
    }

    const token = this.app.secretStorage.get(secretName);
    if (!token) {
      throw new Error(`Secret "${secretName}" não encontrado no SecretStorage`);
    }

    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json;charset=utf-8"
    };
  }

  async searchMovies(query: string, language = "pt-BR", page = 1) {
    const headers = await this.getAuthHeader();
    const url = `${this.baseUrl}/search/movie?query=${encodeURIComponent(query)}&language=${language}&page=${page}&include_adult=${this.plugin.settings.adultContent}`;
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
    return response.json();
  }

  async getMovieDetails(movieId: number, language = "pt-BR") {
    const headers = await this.getAuthHeader();
    const url = `${this.baseUrl}/movie/${movieId}?language=${language}&append_to_response=credits,videos,images`;
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
    return response.json();
  }

  async getPopularMovies(language = "pt-BR", page = 1) {
    const headers = await this.getAuthHeader();
    const url = `${this.baseUrl}/movie/popular?language=${language}&page=${page}`;
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
    return response.json();
  }

  getImageUrl(path: string, size = "w500"): string {
    return `${this.imageBaseUrl}${path}`;
  }
}
```

---

## 3. TMDB API - Autenticação e Uso

### Tipos de Autenticação
1. **Bearer Token (Recomendado)** - Access Token como `Authorization: Bearer <token>`
   - Funciona em v3 e v4
   - Single authentication process
2. **API Key (v3 apenas)** - Query parameter `?api_key=<key>`
   - Limitado a alguns endpoints

### Obter Credenciais TMDB
1. Login em [themoviedb.org](https://www.themoviedb.org/login)
2. Settings → API
3. Copiar **API Read Access Token** (Bearer token)
4. No Obsidian: Settings → Community Plugins → Pack Movies → "TMDB API Token" → Criar/Selecionar secret "tmdb-api-token" → Colar o token

### Endpoints Principais para o Plugin

| Endpoint | Descrição | Parâmetros-chave |
|----------|-----------|------------------|
| `GET /3/search/movie` | Buscar filmes | `query`, `language`, `page`, `include_adult` |
| `GET /3/movie/{id}` | Detalhes do filme | `language`, `append_to_response=credits,videos,images` |
| `GET /3/movie/popular` | Filmes populares | `language`, `page` |
| `GET /3/movie/top_rated` | Mais bem avaliados | `language`, `page` |
| `GET /3/movie/now_playing` | Em cartaz | `language`, `page`, `region` |
| `GET /3/discover/movie` | Descoberta avançada | `sort_by`, `with_genres`, `vote_average.gte`, etc. |
| `GET /3/genre/movie/list` | Lista de gêneros | `language` |
| `GET /3/configuration` | Configuração de imagens | - |

### Exemplo de Response - Search Movie
```json
{
  "page": 1,
  "results": [
    {
      "adult": false,
      "backdrop_path": "/path.jpg",
      "genre_ids": [28, 12, 878],
      "id": 299536,
      "original_language": "en",
      "original_title": "Avengers: Infinity War",
      "overview": "As the Avengers...",
      "popularity": 150.23,
      "poster_path": "/path.jpg",
      "release_date": "2018-04-25",
      "title": "Vingadores: Guerra Infinita",
      "video": false,
      "vote_average": 8.3,
      "vote_count": 12000
    }
  ],
  "total_pages": 500,
  "total_results": 10000
}
```

### Rate Limits
- **40 requests/10 segundos** por IP
- Retornam `429 Too Many Requests` se excedido
- Headers de resposta: `Retry-After`

---

## 4. Integração Completa - Fluxo do Plugin

### Arquitetura de Serviços
```
PackMoviesPlugin (main.ts)
├── settings: PackMoviesSettings
├── tmdbService: TMDBService
├── settingTab: PackMoviesSettingTab
└── commands:
    ├── search-movie → tmdbService.searchMovies()
    ├── create-movie-note → cria nota Obsidian com frontmatter
    └── sync-collection → sincroniza collection local com TMDB
```

### Exemplo de Comando - Criar Nota de Filme
```typescript
// commands/create-movie-note.ts
import { App, TFile } from "obsidian";
import { TMDBService } from "./tmdb-service";

export async function createMovieNote(
  app: App, 
  tmdbService: TMDBService, 
  movieId: number
): Promise<TFile> {
  const movie = await tmdbService.getMovieDetails(movieId);
  
  const frontmatter = {
    title: movie.title,
    original_title: movie.original_title,
    release_date: movie.release_date,
    runtime: movie.runtime,
    genres: movie.genres?.map(g => g.name) || [],
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
    overview: movie.overview,
    tmdb_id: movie.id,
    imdb_id: movie.imdb_id,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    tags: ["filme", "tmdb"]
  };

  const content = `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n\n${movie.overview}\n\n![Poster](${tmdbService.getImageUrl(movie.poster_path)})`;

  const folder = "Movies";
  const fileName = `${movie.title} (${movie.release_date?.split('-')[0] || ''}).md`;
  
  // Criar pasta se não existir
  const folderExists = app.vault.getAbstractFileByPath(folder);
  if (!folderExists) {
    await app.vault.createFolder(folder);
  }

  const file = await app.vault.create(`${folder}/${fileName}`, content);
  return file;
}
```

---

## 5. Checklist de Desenvolvimento

### Setup Inicial
- [ ] Criar `manifest.json` com `minAppVersion: "1.11.4"` (SecretStorage)
- [ ] Configurar build com Rollup/ESBuild (`npm run build`)
- [ ] Estrutura `src/` com TypeScript strict mode

### SecretStorage Integration
- [ ] Settings guardam `tmdbSecretName` (string)
- [ ] SettingTab usa `SecretComponent` via `addComponent()`
- [ ] Service recupera token via `app.secretStorage.get(name)`
- [ ] Tratamento de erro: secret não configurado / não encontrado

### TMDB Service
- [ ] `getAuthHeader()` retorna `Authorization: Bearer <token>`
- [ ] Métodos: `searchMovies`, `getMovieDetails`, `getPopularMovies`, `getGenres`
- [ ] Error handling para 401, 429, 404, network errors
- [ ] Helper `getImageUrl(path, size)` para posters/backdrops

### Commands & UI
- [ ] Command "Buscar filme" → Modal/QuickSwitcher com resultados
- [ ] Command "Criar nota do filme" → Cria .md com frontmatter YAML
- [ ] Command "Sincronizar collection" → Bidirecional vault ↔ TMDB lists
- [ ] SettingTab completa: token, idioma, adult content, pasta destino

### Testing
- [ ] Testar com secret válido no SecretStorage
- [ ] Testar erro quando secret não existe
- [ ] Testar rate limiting (429)
- [ ] Testar em mobile (verificar SecretStorage funciona)

---

## 6. Referências

- [Obsidian Plugin Docs](https://docs.obsidian.md/Plugins/Build+a+plugin)
- [SecretStorage Guide](https://docs.obsidian.md/Plugins/Guides/Store+secrets)
- [SecretStorage API](https://docs.obsidian.md/Reference/TypeScript+API/SecretStorage)
- [Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
- [TMDB API Docs](https://developer.themoviedb.org/docs/getting-started)
- [TMDB Authentication](https://developer.themoviedb.org/docs/authentication-application)
- [Fórum: SecretStorage Security](https://forum.obsidian.md/t/cross-platform-secure-storage-for-secrets-and-tokens-that-can-be-syncd/100716)