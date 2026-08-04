# Plano — Funcionalidades `tnr-add` e `tnr-add-cast` (Adicionar Filme/Série)

## Contexto

Primeiras funcionalidades do plugin **TNR - Track 'n' Review**. Permitem ao usuário buscar um filme ou série no TMDB e inserir **cards com embed** no documento em que está editando, na posição atual do cursor.

**Nome do plugin:** TNR - Track 'n' Review
**Comandos:**
- `tnr-add` — insere apenas o **card do filme ou série**
- `tnr-add-cast` (en) / `tnr-add-elenco` (pt-BR) — insere os **dois cards** (filme/série + elenco)

**Idiomas na v1:** Inglês (`en`) e Português do Brasil (`pt-BR`)

---

## Objetivo

O usuário executa o comando, busca um filme ou série com autocomplete, seleciona um resultado e o plugin insere o(s) card(s) formatado(s) com os dados no ponto do cursor.

**Fluxo de dois passos:**
1. **Busca** — Modal/sugestão com autocomplete consultando o TMDB, exibindo opções clicáveis
2. **Inserção** — Card(s) com informações + embed inserido no texto na posição do cursor

**Pré-requisito:** o usuário precisa ter sua própria chave do TMDB salva no SecretStorage do Obsidian (seção abaixo).

---

## Chave TMDB do Usuário (SecretStorage)

### Por que cada usuário gera a própria chave
- **Política do TMDB:** cada usuário/desenvolvedor cria a própria chave em sua conta; chaves são individuais e proibidas de serem compartilhadas
- O plugin **não embute nenhuma chave** — nada de chave hard-coded ou compartilhada
- A chave identifica o requester perante o TMDB e possui **rate limits próprios** (40 req/10s)

### Como o usuário obtém a chave (instruções a mostrar nas settings)
1. Criar/login em [themoviedb.org](https://www.themoviedb.org/login)
2. Conta → **Settings** → **API** → "Request an API Key" (aceitar termos de uso)
3. Copiar o **API Read Access Token** (Bearer token — recomendado, funciona em v3 e v4)
   - Alternativa: **API Key** (query param `?api_key=`), porém limitado a alguns endpoints
4. No Obsidian: Settings → TNR → campo "TMDB API Token" (SecretComponent) → criar o secret → colar o token

### Conceito técnico — SecretStorage (Obsidian v1.11.4+)
- As settings do plugin guardam apenas o **NOME** do secret (`tmdbSecretName`), **nunca o valor**
- Na aba de settings, o usuário **cria ou seleciona** o secret através do `SecretComponent`
- Em runtime, o plugin recupera o valor: `app.secretStorage.get(tmdbSecretName)`
- O valor fica no armazenamento seguro do Obsidian (vault-specific, local ao dispositivo), compartilhável entre plugins
- Enviado como `Authorization: Bearer <token>` em toda chamada à API

### Fluxo de onboarding (primeira execução)
1. Plugin carrega → verifica se `tmdbSecretName` está vazio
2. Se vazio: notice guiando o usuário à aba de settings + instruções de como obter a chave (passos acima)
3. Usuário cria o secret (ex: "tmdb-api-token") via SecretComponent e o seleciona nas settings
4. Plugin **valida a chave**: chamada de teste `GET /3/authentication` (Validate Key) ou a primeira busca
5. Token inválido/revogado → erro 401 → aviso amigável ("Token inválido, verifique nas configurações")

### Segurança
- Nunca logar, exibir ou expor o valor do token
- Nunca commit do token no repositório
- **Nota de transparência:** na v1.11.4 o SecretStorage ainda não criptografa os dados em repouso (armazena em LocalStorage) — documentado para o usuário; futuras versões do Obsidian usarão `electron.safeStorage`

---

## Passo 1 — Busca com Autocomplete no TMDB

### UX
- Usuário aciona `tnr-add` ou `tnr-add-cast`
- Abre uma interface de busca (modal) com um campo de texto
- Ao digitar, consulta `/search/multi` (filmes + séries) no TMDB (debounce ~300ms)
- Resultados aparecem como lista com **autocomplete** — cada item mostra:
  - Poster (thumbnail)
  - Título localizado + ano
  - Título original (se diferente)
  - Tipo (Filme / Série) + gêneros principais (opcional)
- Usuário navega (setas) e **clica** para selecionar (ou Enter)

### Requisitos de Busca
- Parâmetros: `query`, `language` (idioma ativo), `page=1`, `include_adult` (da settings)
- Filtro por `media_type` = `movie` ou `tv` (via `/search/multi`)
- Debounce para evitar excesso de chamadas (rate limit TMDB)
- **Cache local de respostas TMDB** por query+idioma (conforme tnr-data-spec) para respeitar o rate limit de 40 req/10s
- Estado de carregamento visível ("Buscando...")
- Tratar vazio ("Nenhum resultado") e erro ("Falha na busca — verifique token/idioma")
- Requer `tmdbSecretName` configurado no SecretStorage; avisar se não estiver

### Decisão de UI: Modal vs. EditorSuggest
Recomendado: **Modal customizado** (janela central) porque:
- Permite mostrar poster + múltiplas linhas por resultado
- Suporta clique do mouse (requisito explícito)
- Não interfere na edição do texto até a seleção final

Alternativa futura: `EditorSuggest` (popover inline no cursor) — não necessário na v1.

---

## Passo 2 — Inserção do Card no Cursor

### Comportamento
- Obter o editor ativo (`editor` do workspace)
- Capturar posição atual do cursor (`editor.getCursor()`)
- Inserir o bloco do card exatamente naquela linha/posição
- Mover o cursor para o fim do bloco inserido (continuidade de escrita)

### Dados do Card
Na seleção, buscar detalhes completos via `/movie/{id}` ou `/tv/{id}?language={lang}&append_to_response=credits,images,videos,external_ids` para enriquecer (conforme docs — minimizar chamadas):
- Título localizado, título original, ano
- Poster (`posterPath`) — imagem para o embed
- Sinopse (`overview`) — texto curto
- Diretor, principais atores
- Gêneros, duração, país de origem
- `tmdbId` — vínculo com perfil TNR e futuras sincronizações

### Formato dos Cards (Markdown + Embed)

Blocos de markdown que combinam **embed da imagem do poster** com informações. Modelo proposto para **um card** (comando `tnr-add`):

```markdown
> [!tnr-movie] **Ilha das Flores** (1989)
> ![poster](https://image.tmdb.org/t/p/w342/sGLv72iYI46tNldBSjYp4GIz1sw.jpg)
>
> **Diretor:** Jorge Furtado
> **Gêneros:** Documentário
> **Duração:** 13 min
> **País:** BR
>
> Documentário que narra a jornada de um tomate desde a plantação até o lixo, expondo as desigualdades sociais do Brasil.
>
> `tmdbId: 45318`
```

Para o comando `tnr-add-cast`, o mesmo card do filme/série é seguido de **um segundo card de elenco**, com avatares circulares (carrossel horizontal):

```markdown
> [!tnr-cast] Elenco
> ![[Paulo José]]
> ![[Júlia Barth]]
> ...
```

### Design de Referência (mockup)
- **`plan/card-design.html`** — mockup visual dos dois cards (abrir no navegador, alternar tema claro/escuro)
- **Card do filme/série** (`!tnr-movie` / `!tnr-series`):
  - Logo TNR discreto no canto superior direito
  - Poster à esquerda + informações à direita
  - Sem cabeçalho de título no callout (apenas o conteúdo)
  - Linhas de metadados (Diretor, Gêneros, Duração, País), sinopse e `tmdbId` discreto
- **Card de elenco** (`!tnr-cast`):
  - Callout separado abaixo do card do filme (espaçamento ~14px)
  - Cabeçalho com ícone de usuários + "Elenco"
  - Carrossel horizontal de avatares circulares (~78px) com nome abaixo
  - Suporta arrastar/drag para rolar

### Princípios do Card
- **Callout** (`> [!tnr-movie]`) para visual consistente e fácil de estilizar via CSS
- **Embed de imagem** usando a URL do poster TMDB (`https://image.tmdb.org/t/p/w342{path}` — tamanho padrão da API; thumbnails do modal usam `w92`)
- Campo oculto ou discreto com `tmdbId` para o plugin identificar o filme em operações futuras (sincronização TNR)
- Template configurável na settings (futuro) — v1 usa template padrão

---

## Comando Multi-idioma

| ID interno | en | pt-BR | Ação |
|-----------|-----|-------|------|
| `tnr-add` | Add movie/series | Adicionar filme/série | Insere apenas o card do filme/série |
| `tnr-add-cast` | Add movie/series with cast | Adicionar filme/série com elenco | Insere card do filme/série + card de elenco |

- ID fixo em inglês (imutável, referência interna)
- Nome exibido vem do dicionário i18n conforme idioma ativo
- Ao trocar de idioma, nome do comando muda, hotkeys continuam
- `tnr-add-cast` e `tnr-add-elenco` compartilham o mesmo ID interno (tradução do nome exibido apenas)

---

## Regra de Ouro: Pasta do Perfil é Somente Leitura

Os arquivos da pasta do perfil TNR (`profile.json`, `collection.json`, `lists.json`, `memories.json`, `diary.json`, `manifest.json` e `assets/`) são **fonte da verdade** exportados pelo app Movie Odyssey (TNR). O plugin **nunca deve editá-los**:

- **Leitura apenas** — o plugin lê, valida (SHA256 via `manifest.json`) e usa os dados como referência
- **Nenhuma escrita** — o plugin nunca cria, altera, move ou apaga arquivos dentro da pasta do perfil
- **Nenhum backup/cópia escrita lá dentro** — backups e artefatos do plugin ficam no vault do Obsidian, nunca na pasta do perfil
- **Enriquecimento é só em memória** — dados TMDB (posters, elenco, sinopses) completam o que o plugin mostra, mas não são gravados de volta nos JSONs
- **Edições do usuário** — ratings, tags, notas pessoais são lidos; quem escreve nesses arquivos é o app TNR, não o plugin

> Contraste com o fluxo de escrita "Obsidian → TNR" do `doc/tnr-data-spec.md` (seção *Escrita (Obsidian → TNR)*, marcada como **Opcional**): esta regra vale para a v1 e enquanto a sincronização reversa não existir. Se um dia for implementada, será via export/reimport explícito do usuário — nunca edição direta automática.

---

## Integração com Perfil TNR (v1 limitada)

Na v1, o `tnr-add` **não exige** a pasta do perfil configurada. O card contém `tmdbId` que servirá de ponte futura:

- Fase 2: detectar se o filme já está em `memories`/`collection` e enriquecer o card (apenas leitura da pasta do perfil)
- Fase 2: criar/atualizar nota de filme no vault (fora da pasta do perfil)

V1 entrega apenas o card com dados TMDB + embed.

---

## Chaves de Tradução (i18n) Necessárias

Seção `tnrAdd`:
- `tnrAdd.commandName` — "Add movie/series" / "Adicionar filme/série"
- `tnrAdd.commandNameCast` — "Add movie/series with cast" / "Adicionar filme/série com elenco"
- `tnrAdd.modalTitle` — "Search TMDB" / "Buscar no TMDB"
- `tnrAdd.searchPlaceholder` — "Type a movie or series title..." / "Digite o título do filme ou série..."
- `tnrAdd.searching` — "Searching..." / "Buscando..."
- `tnrAdd.noResults` — "No results" / "Nenhum resultado"
- `tnrAdd.error` — "Search failed. Check token and language." / "Falha na busca. Verifique token e idioma."
- `tnrAdd.missingSecret` — "TMDB token not configured in settings." / "Token do TMDB não configurado nas configurações."
- `tnrAdd.secretInvalid` — "Invalid TMDB token. Check it in settings." / "Token do TMDB inválido. Verifique nas configurações."
- `tnrAdd.getKeySteps` — "1. Create an account at themoviedb.org. 2. Settings → API → Request an API Key. 3. Copy the API Read Access Token. 4. Save it here." / "1. Crie uma conta em themoviedb.org. 2. Settings → API → Solicitar API Key. 3. Copie o API Read Access Token. 4. Salve aqui."
- `tnrAdd.cardTitle` — "Movie/series card" / "Card do filme/série" (label de callout, se usado)
- `tnrAdd.director` — "Director" / "Diretor"
- `tnrAdd.genres` — "Genres" / "Gêneros"
- `tnrAdd.duration` — "Duration" / "Duração"
- `tnrAdd.country` — "Country" / "País"
- `tnrAdd.overview` — "Overview" / "Sinopse"
- `tnrAdd.castTitle` — "Cast" / "Elenco"

---

## Componentes

```
src/
├── main.ts               # Registra comandos tnr-add e tnr-add-cast
├── i18n/                 # en.ts, pt-BR.ts, index.ts
├── settings/             # Interface de settings (language, profilePath, tmdbSecretName)
├── tmdb/
│   ├── service.ts        # Busca e detalhes no TMDB (movie/tv/series)
│   ├── types.ts          # Tipos de resposta
│   └── image.ts          # Helper de URL de imagens
├── commands/
│   ├── tnrAdd.ts         # Orquestra fluxo (abre modal, insere card do filme/série)
│   └── tmdbSearchModal.ts# Modal de busca com autocomplete
└── insertCard.ts         # Monta o markdown do(s) card(s) e insere no cursor
```

---

## Etapas de Implementação

1. **Fundação i18n + settings** (requisito transversal)
   - Estrutura `src/i18n/` (en, pt-BR, fallback)
   - Settings com `language`, `profilePath`, `tmdbSecretName`
   - Aba de configurações com dropdown de idioma e campo de caminho
   - Campo do token via `SecretComponent` (criar/selecionar secret) + instruções de obtenção da chave
   - Validação da chave (`GET /3/authentication`) no primeiro uso

2. **Serviço TMDB**
   - `searchMulti(query, language)` com debounce, cache local e tratamento de erro
   - `getDetails(id, mediaType, language)` com `append_to_response=credits,images,videos,external_ids` (filme ou série)
   - Cache de respostas por query/idioma e por id (respeitar rate limit)
   - Tratamento de 429 com `Retry-After` (backoff)
   - Helper de URL de poster/avatar (w342, w92)

3. **Modal de busca (`tmdbSearchModal`)**
   - Campo de busca com debounce
   - Renderização de resultados (poster + título + ano + tipo)
   - Navegação por teclado + clique para selecionar
   - Estados: carregando / vazio / erro

4. **Inserção do(s) card(s) (`insertCard`)**
   - Obter editor ativo e posição do cursor
   - Montar markdown do card do filme/série a partir dos dados
   - Se comando for `tnr-add-cast`: montar também o card de elenco (callout `!tnr-cast` com avatares) e inserir logo abaixo
   - Inserir no cursor e reposicionar cursor

5. **Comandos `tnr-add` e `tnr-add-cast`**
   - Registrar com nomes traduzidos
   - Orquestrar: validação de secret → (onboarding se ausente) → modal → inserção
   - `tnr-add-cast` passa flag `withCast=true` para o fluxo

6. **Estilização**
   - CSS para callouts `.tnr-movie`/`.tnr-series` (poster, layout do card)
   - CSS para callout `.tnr-cast` (carrossel horizontal de avatares circulares)
   - Estilos para tema claro/escuro conforme `styles.css` do plugin

---

## Critérios de Aceite

- [ ] Comando `tnr-add` aparece como "Add movie/series" (en) e "Adicionar filme/série" (pt-BR)
- [ ] Comando `tnr-add-cast` aparece como "Add movie/series with cast" (en) e "Adicionar filme/série com elenco" (pt-BR)
- [ ] Ao digitar no modal, busca no TMDB com debounce (filmes e séries) e exibe resultados com poster
- [ ] Usuário pode clicar em um resultado (ou navegar + Enter) para selecionar
- [ ] Com `tnr-add`: card com embed de poster + informações é inserido na posição do cursor
- [ ] Com `tnr-add-cast`: card do filme/série + card de elenco (carrossel de avatares) são inseridos abaixo, em callouts separados
- [ ] Cursor continua no ponto correto após a inserção
- [ ] Sem token configurado → aviso claro ao usuário + instruções de como obter a chave no TMDB
- [ ] Token inválido (401) → mensagem amigável indicando revisar o secret nas settings
- [ ] Chave nunca é exibida/logada; settings guardam apenas o nome do secret
- [ ] Erros da API (429 com `Retry-After`, rede, token inválido) → mensagem amigável
- [ ] Resultados respeitam o idioma configurado (`pt-BR` retorna títulos/sinopses em português)
- [ ] `tmdbId` presente no card para integração futura com o perfil TNR
- [ ] Visual dos cards conforme mockup `plan/card-design.html` (poster, metadados, carrossel de elenco)
- [ ] Pasta do perfil TNR é tratada como **somente leitura** — nenhum arquivo dentro dela é criado, alterado, movido ou apagado pelo plugin

---

## Fora de Escopo (v1)

- Criação de nota de filme separada no vault
- Sincronização com perfil TNR (memories/diary/collection)
- Embed da nota (`![[...]]`) — v1 usa embed de imagem do poster
- Templates customizáveis de card pelo usuário
- Idioma espanhol (entra após pt-BR/en estáveis)

---

## Decisões Registradas

1. **Modal central** (não popover inline) para suportar clique e resultados ricos
2. **Card = callout** `> [!tnr-movie]`/`> [!tnr-series]` com embed de poster via URL TMDB — simples, estilizável, sem dependências
3. **Elenco = callout separado** `> [!tnr-cast]` abaixo do card do filme — carrossel horizontal de avatares circulares com CSS
4. **`tmdbId` sempre presente** no card — ponte para sincronização futura com TNR
5. **i18n desde o início** — nenhum texto hard-coded
6. **V1 não depende da pasta do perfil** — apenas do token TMDB
7. **Template fixo na v1**, configurável no futuro
8. **Cada usuário gera a própria chave TMDB** — o plugin não embute chave alguma; o valor fica no SecretStorage e as settings guardam apenas o nome do secret
9. **Dois comandos** — `tnr-add` (só filme/série) e `tnr-add-cast` (filme/série + elenco); busca compartilhada via `/search/multi`
10. **Pasta do perfil = somente leitura** — o plugin nunca edita os JSONs do perfil; arquivos da pasta são fonte da verdade exportada pelo app TNR

### Decisões finais (confirmadas)
- **Identidade:** `manifest.id = tnrapp-obsidian` (imutável, define o nome da pasta em `.obsidian/plugins/`) com `name = "TNR - Track 'n' Review"` (exibição). Docs antigos permanecem como referência histórica.
- **Callout único:** filmes e séries usam o mesmo callout `!tnr-movie` (sem `!tnr-series` separado). O tipo (filme/série) aparece no conteúdo quando aplicável.
- **Elenco por URL TMDB:** avatares via `https://image.tmdb.org/t/p/w185{profile_path}` (sem embed de notas) dentro do callout `!tnr-cast`.

---

## Conformidade com os Documentos (doc/)

O plano foi verificado contra `doc/i18n-and-settings.md`, `doc/tnr-data-spec.md` e `doc/plugin-development-guide.md`:

| Preceito (doc) | Status | Nota |
|----------------|--------|------|
| i18n desde o início, chaves de tradução, IDs de comando fixos em inglês | OK | `tnrAdd.*` segue o padrão de seções |
| Idioma único controla UI + TMDB | OK | Card e busca usam `language` ativo |
| `tmdbId` como chave primária | OK | Presente em todo card |
| URL de poster via `https://image.tmdb.org/t/p/{size}{path}` | OK | Corrigido para tamanho padrão `w342` |
| `append_to_response=credits,images,videos,external_ids` | OK | Alinhado |
| Cache local TMDB + rate limit 40 req/10s | OK | Adicionado ao serviço TMDB |
| Tratamento de 429 com `Retry-After` | OK | Adicionado |
| Secret via SecretStorage (`tmdbSecretName`) | OK | Fluxo de validação no comando |
| `include_adult` vindo das settings | OK | Parâmetro da busca |

### Pendências detectadas
- **Nomenclatura:** o plugin foi renomeado para **TNR - Track 'n' Review**, mas `doc/plugin-development-guide.md` e `doc/i18n-and-settings.md` ainda referenciam **Pack Movies** / `obsidian-pack-movies` (manifest id, folder "Movies", texto das settings). Antes de implementar, decidir: manter repo/`manifest.json` id como `obsidian-pack-movies` (nome de exibição "TNR - Track 'n' Review") e atualizar os docs, ou renomear tudo. Recomendado: **manter o id do manifest** (imutável no registro de plugins) e usar "TNR - Track 'n' Review" como `name` de exibição.
- **Idioma espanhol:** listado como inicial no i18n doc, mas fica fora da v1 deste plano (entra depois). Sem conflito — só registrar que `es.ts` será adicionado após estabilização.

---

## Referências Cruzadas

- `plan/card-design.html` — mockup visual dos cards (filme/série + elenco)
- `doc/i18n-and-settings.md` — idioma único, chaves de tradução, settings
- `doc/tnr-data-spec.md` — estrutura dos dados TNR (`titleRef`, `tmdbId`)
- `doc/plugin-development-guide.md` — SecretStorage, comandos, modais no Obsidian