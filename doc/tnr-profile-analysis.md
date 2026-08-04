# Entendimento do Perfil TNR (Movie Odyssey)

## Visão Geral
Os arquivos em `doc/perfil/` representam o export de dados do app **Movie Odyssey** (provavelmente "The New Reel" - TNR). Contêm o perfil completo do usuário com coleção física, listas, memórias (ratings) e diário de assistidos.

## Estrutura dos Arquivos

### 1. `profile.json` - Perfil do Usuário
```json
{
  "profile": {
    "profileId": "537adfdd-ab5e-45e3-9597-a4836de6e400",
    "name": "Luc",
    "bio": "Ilha das Flores e E.T. são o ponto zero.",
    "countryCode": "BR",
    "avatarAssetPath": "assets/avatar.jpg",
    "avatarStyle": { "startHex": "#C8553D", "endHex": "#5A2336" },
    "favoriteTitleRef": {
      "mediaKind": "movie",
      "title": "Ilha das Flores",
      "tmdbId": 45318
    },
    "updatedAt": "2026-07-15T18:03:11.212Z"
  },
  "schemaVersion": 1
}
```

### 2. `collection.json` - Coleção Física (13 itens)
Itens de mídia física (DVD, Blu-ray, 4K UHD) com:
- **Metadados do item**: `itemId`, `addedAt`, `updatedAt`, `format`, `details[]`, `tags[]`
- **Referência do título (titleRef)**: Rico em dados TMDB:
  - `tmdbId`, `title`, `originalTitle`, `year`, `posterPath`
  - `director`, `castNames[]`, `writerNames[]`, `genres[]`
  - `originCountry`, `runtimeMinutes`, `mediaKind`
- **Exemplos de formatos**: "DVD duplo", "DVD-Video", "Blu-ray (1080p)", "Blu-ray 4K UHD"
- **Details típicos**: "Região 4", "Single", "Box / Coletânea", "Edição especial", "Estendida / do diretor", "Cinema", "Aberto", "Comentários", "Making of"
- **Tags**: "Favoritos"

### 3. `lists.json` - Listas Personalizadas (2 listas, ~150 itens na primeira)
```json
{
  "lists": [
    {
      "listId": "...",
      "name": "...",
      "createdAt": "...",
      "items": [
        {
          "listItemId": "...",
          "order": 0,
          "addedAt": "...",
          "titleRef": { /* same structure as collection */ }
        }
      ]
    }
  ]
}
```
- Lista 1: ~150 filmes (ordem 0-150), criada em 2026-07-13
- Lista 2: (dados truncados)

### 4. `memories.json` - Memórias/Ratings (1.721 entradas)
Registro de opiniões sobre filmes:
```json
{
  "entries": [
    {
      "memoryId": "...",
      "createdAt": "...",
      "updatedAt": "...",
      "liked": boolean,      // true/false (favorito)
      "rating": number,      // 0.5 a 5.0 (incrementos de 0.5)
      "titleRef": { /* full TMDB metadata */ }
    }
  ]
}
```
- **Rating scale**: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0
- **Liked**: true para favoritos (geralmente rating >= 4.0)
- Inclui filmes assistidos e não-assistidos (opinião prévia)

### 5. `diary.json` - Diário de Assistidos (377 entradas)
Registro de sessões de visualização:
```json
{
  "entries": [
    {
      "entryId": "...",
      "createdAt": "...",
      "updatedAt": "...",
      "watchedOn": "YYYY-MM-DD",  // Data da sessão
      "watchedWhere": [],         // Array vazio (local/plataforma)
      "liked": boolean,
      "rating": number,           // 0.5 a 5.0
      "titleRef": { /* full TMDB metadata */ }
    }
  ]
}
```
- **watchedOn**: Data específica da visualização (ex: "2023-10-08")
- **watchedWhere**: Array vazio (potencial para streaming/cinema)
- Período: Out/2023 a Jul/2024
- Muitos filmes aparecem tanto em memories quanto diary

### 6. `manifest.json` - Integridade e Versionamento
```json
{
  "revision": 311,
  "schemaVersion": 1,
  "updatedAt": "2026-08-03T12:02:40.701Z",
  "files": {
    "collection.json": { "recordCount": 13, "sha256": "..." },
    "diary.json": { "recordCount": 377, "sha256": "..." },
    "lists.json": { "recordCount": 2, "sha256": "..." },
    "memories.json": { "recordCount": 1721, "sha256": "..." },
    "profile.json": { "recordCount": 1, "sha256": "..." }
  },
  "assets": {
    "assets/avatar.jpg": { "sha256": "..." }
  }
}
```

## Padrões de Dados TMDB (titleRef)
Todos os arquivos usam a mesma estrutura `titleRef` enriquecida com dados TMDB:
```typescript
interface TitleRef {
  tmdbId: number;
  title: string;           // Título localizado (pt-BR)
  originalTitle?: string;  // Título original
  year: string;            // Ano como string
  posterPath: string;      // Path TMDB (ex: "/abc123.jpg")
  mediaKind: "movie";      // Sempre "movie" nos dados atuais
  director?: string;
  castNames?: string[];
  writerNames?: string[];
  genres?: string[];       // Gêneros localizados
  originCountry?: string;  // Código do país (US, BR, FR, etc.)
  runtimeMinutes?: number;
}
```

## Implicações para o Plugin Pack Movies

### 1. **Sincronização Bidirecional**
- Plugin pode **ler** memories/diary para mostrar ratings no Obsidian
- Plugin pode **escrever** novas entradas no formato JSON para sincronizar de volta

### 2. **Estrutura de Notas no Obsidian**
Cada filme → uma nota Markdown com frontmatter YAML:
```yaml
---
tmdbId: 45318
title: "Ilha das Flores"
originalTitle: "Ilha das Flores"
year: "1989"
director: "Jorge Furtado"
genres: ["Documentário"]
castNames: ["Paulo José", "Júlia Barth", ...]
runtimeMinutes: 13
posterPath: "/sGLv72iYI46tNldBSjYp4GIz1sw.jpg"
originCountry: "BR"
rating: 5.0
liked: true
watchedOn: "2024-01-15"      # do diary
memoryRating: 5.0            # do memories
inCollection: true           # se em collection.json
collectionFormat: "DVD-Video"
collectionDetails: ["Região 4", "Single"]
tags: ["Favoritos", "filme", "tmdb"]
---
```

### 3. **Comandos Úteis**
- `sync-from-tnr` - Importa memories/diary/collection para notas
- `sync-to-tnr` - Exporta notas modificadas de volta para JSON
- `create-movie-note` - Cria nota a partir de busca TMDB
- `update-collection` - Gerencia itens físicos (formato, detalhes, tags)

### 4. **Mapeamento de Dados**
| Fonte | Campo | Uso no Plugin |
|-------|-------|---------------|
| `memories.json` | rating, liked | Opinião geral do filme |
| `diary.json` | watchedOn, rating, liked | Sessões específicas de visualização |
| `collection.json` | format, details, tags | Metadados de mídia física |
| `lists.json` | order, listId | Listas personalizadas (watchlist, favoritos, etc.) |
| `profile.json` | favoriteTitleRef | Filme favorito do perfil |

### 5. **Considerações Técnicas**
- **TMDB IDs** são a chave primária para enriquecimento via API
- **posterPath** → construir URL: `https://image.tmdb.org/t/p/w500${posterPath}`
- **schemaVersion: 1** - formato estável
- **revision: 311** - incrementa a cada sync; útil para detectar mudanças
- **sha256** - validar integridade dos arquivos antes de ler

## Próximos Passos
1. Definir estrutura de pastas no vault (ex: `Movies/`, `Collections/`, `Lists/`)
2. Criar templates de nota (frontmatter + conteúdo)
3. Implementar serviço de sync (leitura/escrita JSON)
4. Integrar com TMDB API para enriquecer dados faltantes
5. UI no Obsidian: commands, setting tab, views