# Especificação de Dados do Perfil TNR (Movie Odyssey)

## Visão Geral

O plugin lê uma pasta apontada pelo usuário contendo 5 arquivos JSON exportados pelo app **Movie Odyssey (TNR)**. Esses arquivos são a fonte primária de dados. A API do TMDB é usada apenas para enriquecer informações faltantes (posters, elenco completo, sinopses, etc.).

Todos os arquivos compartilham uma estrutura comum de referência de filme (`titleRef`) identificada pelo **tmdbId**, que serve como chave primária para vincular dados entre arquivos e consultar a API do TMDB.

---

## Estrutura da Pasta

```
pasta-do-perfil/
├── profile.json      # Perfil do usuário
├── collection.json   # Coleção física (DVDs, Blu-rays)
├── lists.json        # Listas personalizadas
├── memories.json     # Opiniões/ratings sobre filmes
├── diary.json        # Histórico de sessões assistidas
├── manifest.json     # Controle de versão e integridade
└── assets/
    └── avatar.jpg    # Avatar do usuário
```

---

## Arquivos de Dados

### 1. profile.json — Perfil do Usuário
**Um único registro.**

Campos principais:
- `profileId` — Identificador único do perfil
- `name` — Nome de exibição
- `bio` — Biografia livre
- `countryCode` — Código do país (ex: "BR")
- `avatarAssetPath` — Caminho relativo para `assets/avatar.jpg`
- `avatarStyle` — Cores do gradiente do avatar (`startHex`, `endHex`)
- `favoriteTitleRef` — Referência ao filme favorito (estrutura `titleRef`)
- `updatedAt` — Timestamp da última atualização

---

### 2. collection.json — Coleção Física
**Array de itens** (cada item = uma mídia física: DVD, Blu-ray, 4K UHD, etc.).

Campos por item:
- `itemId` — Identificador único do item na coleção
- `addedAt` / `updatedAt` — Timestamps
- `format` — Formato físico (ex: "DVD-Video", "Blu-ray 4K UHD", "DVD duplo")
- `details` — Array de strings descrevendo características: região, tipo de edição, extras
  - Exemplos: "Região 4", "Single", "Box / Coletânea", "Edição especial", "Estendida / do diretor", "Cinema", "Aberto", "Comentários", "Making of"
- `tags` — Tags do usuário (ex: ["Favoritos"])
- `titleRef` — Referência completa do filme (ver estrutura comum abaixo)

---

### 3. lists.json — Listas Personalizadas
**Array de listas**, cada uma com seus itens ordenados.

Campos da lista:
- `listId` — Identificador único da lista
- `name` — Nome da lista
- `createdAt` — Timestamp de criação
- `items` — Array de itens da lista

Campos do item da lista:
- `listItemId` — Identificador único do item na lista
- `order` — Posição na lista (0, 1, 2...)
- `addedAt` — Quando foi adicionado
- `titleRef` — Referência do filme (estrutura comum)

---

### 4. memories.json — Memórias / Opiniões
**Array de registros** representando a opinião do usuário sobre um filme (pode ser de filmes assistidos ou não).

Campos por registro:
- `memoryId` — Identificador único
- `createdAt` / `updatedAt` — Timestamps
- `liked` — Boolean (true = favorito)
- `rating` — Nota de 0.5 a 5.0 (incrementos de 0.5)
- `titleRef` — Referência do filme (estrutura comum)

---

### 5. diary.json — Diário de Sessões Assistidas
**Array de registros** representando uma sessão real de visualização.

Campos por registro:
- `entryId` — Identificador único
- `createdAt` / `updatedAt` — Timestamps
- `watchedOn` — Data da sessão no formato "YYYY-MM-DD"
- `watchedWhere` — Array de strings (local/plataforma; atualmente vazio)
- `liked` — Boolean (true = favorito nessa sessão)
- `rating` — Nota de 0.5 a 5.0 dada nessa sessão
- `titleRef` — Referência do filme (estrutura comum)

---

### 6. manifest.json — Controle de Integridade
**Um único registro** com metadados do export.

Campos:
- `revision` — Número incremental (aumenta a cada export)
- `schemaVersion` — Versão do esquema (atual: 1)
- `updatedAt` — Timestamp do export
- `files` — Objeto com contagem de registros e SHA256 de cada arquivo
- `assets` — SHA256 dos assets (avatar)

Uso no plugin: validar integridade antes de ler, detectar se houve mudanças desde última sincronização.

---

## Estrutura Comum: titleRef

Todos os arquivos acima referenciam filmes usando a mesma estrutura `titleRef` com dados enriquecidos do TMDB:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `tmdbId` | número | **Chave primária** — ID no The Movie Database |
| `title` | texto | Título localizado (pt-BR) |
| `year` | texto | Ano de lançamento como string |
| `posterPath` | texto | Caminho do poster no TMDB (ex: "/abc123.jpg") |
| `mediaKind` | texto | Sempre "movie" nos dados atuais |
| `director` | texto (opcional) | Nome do diretor |
| `castNames` | array de textos (opcional) | Elenco principal |
| `writerNames` | array de textos (opcional) | Roteiristas |
| `genres` | array de textos (opcional) | Gêneros localizados |
| `originCountry` | texto (opcional) | Código do país de origem (ex: "US", "BR", "FR") |
| `runtimeMinutes` | número (opcional) | Duração em minutos |

**Construção de URL de poster:** `https://image.tmdb.org/t/p/w500{posterPath}`

---

## Relacionamentos entre Arquivos

```
profile.json
  └─ favoriteTitleRef → tmdbId

collection.json (itens físicos)
  ├─ titleRef → tmdbId
  └─ tags (ex: "Favoritos")

lists.json (listas personalizadas)
  └─ items[].titleRef → tmdbId
      └─ order (posição na lista)

memories.json (opiniões)
  └─ titleRef → tmdbId
      ├─ rating (0.5–5.0)
      └─ liked (boolean)

diary.json (sessões assistidas)
  └─ titleRef → tmdbId
      ├─ watchedOn (data)
      ├─ rating (0.5–5.0)
      └─ liked (boolean)
```

**Chave de vinculação:** `tmdbId` aparece em todos os arquivos. Um mesmo filme pode estar na coleção, em uma lista, ter memória registrada e ter entradas no diário.

---

## Estratégia de Enriquecimento via TMDB

O plugin deve usar os dados dos JSONs como **fonte da verdade**. A API do TMDB serve apenas para:

1. **Completar campos opcionais ausentes** — ex: `director`, `castNames`, `genres`, `runtimeMinutes`, `originCountry`
2. **Buscar posters em alta resolução** — tamanhos w500, w780, original
3. **Obter sinopse/overview** — para preencher conteúdo da nota
4. **Buscar créditos completos** — elenco, equipe, personagens
5. **Buscar vídeos** — trailers, teasers
6. **Buscar imagens** — backdrops, stills
7. **Validar/atualizar metadados** — se TMDB corrigiu ano, título, etc.

**Regras:**
- Nunca sobrescrever dados que o usuário editou no Obsidian (ex: rating pessoal, tags, notas)
- Cache local de respostas TMDB para respeitar rate limits (40 req/10s)
- Usar `append_to_response=credits,images,videos,external_ids` para minimizar chamadas
- Idioma padrão: `pt-BR` (configurável)

---

## Fluxo de Sincronização

### Leitura (TNR → Obsidian)
1. Usuário aponta pasta do perfil nas configurações
2. Plugin lê `manifest.json` → valida SHA256 → lê os 5 JSONs
3. Para cada `titleRef` único encontrado:
   - Agrega dados de todos os arquivos (coleção, listas, memories, diary)
   - Completa com TMDB se houver campos faltantes essenciais
   - Cria/atualiza nota Markdown no vault com frontmatter rico
4. Notas organizadas em pastas: `Movies/`, `Collections/`, `Lists/`

### Escrita (Obsidian → TNR) — Opcional
1. Usuário edita nota no Obsidian (ex: muda rating, adiciona tag)
2. Plugin detecta mudança (via event listener ou comando manual)
3. Atualiza JSON correspondente (`memories.json`, `diary.json`, `collection.json`)
4. Incrementa `revision` no `manifest.json`
5. Recalcula SHA256 dos arquivos modificados

---

## Campos Sugeridos para Frontmatter da Nota

Quando o plugin criar a nota no Obsidian, o frontmatter YAML deve conter a agregação de todas as fontes:

```yaml
---
# Identificação TMDB
tmdbId: 45318
title: "Ilha das Flores"
originalTitle: "Ilha das Flores"
year: "1989"

# Metadados enriquecidos (TMDB)
director: "Jorge Furtado"
genres: ["Documentário"]
castNames: ["Paulo José", "Júlia Barth", ...]
writerNames: ["Jorge Furtado"]
originCountry: "BR"
runtimeMinutes: 13
posterPath: "/sGLv72iYI46tNldBSjYp4GIz1sw.jpg"
backdropPath: "/..."
overview: "Sinopse do filme..."

# Dados do TNR (fonte primária)
inCollection: true
collectionFormat: "DVD-Video"
collectionDetails: ["Região 4", "Single"]
collectionTags: ["Favoritos"]

memoryRating: 5.0
memoryLiked: true
memoryCount: 1

diaryEntries:
  - watchedOn: "2024-01-15"
    rating: 5.0
    liked: true
    watchedWhere: []

lists:
  - listId: "abc123"
    listName: "Meus Favoritos"
    order: 0

# Controle
tags: ["filme", "tmdb", "documentário", "brasil", "favoritos"]
tnrProfileId: "537adfdd-ab5e-45e3-9597-a4836de6e400"
lastSync: "2026-08-03T12:00:00.000Z"
---
```

---

## Considerações de Implementação

- **Performance:** Indexar todos os `tmdbId` na inicialização para buscas O(1)
- **Deduplicação:** Mesmo `tmdbId` pode aparecer em múltiplos arquivos — agregar, não duplicar
- **Conflitos:** Se `memories.json` e `diary.json` têm ratings diferentes para mesmo filme, manter ambos (são contextos diferentes: opinião geral vs sessão específica)
- **Atualização incremental:** Comparar `revision` e SHA256 do `manifest.json` para ler apenas o que mudou
- **Backup:** Antes de escrever nos JSONs, criar backup automático com timestamp
- **Validação:** Verificar `schemaVersion` — se > 1, alertar usuário sobre possível incompatibilidade

---

## Referências

- Pasta do perfil: configurável pelo usuário (Settings → Pack Movies → Caminho do Perfil TNR)
- TMDB API: `https://api.themoviedb.org/3` (requer Bearer token no SecretStorage)
- Imagens TMDB: `https://image.tmdb.org/t/p/{size}{path}`
- Rate limit TMDB: 40 requisições / 10 segundos por IP