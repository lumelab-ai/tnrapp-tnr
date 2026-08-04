# Internacionalização (i18n) e Página de Configurações

## Visão Geral

O plugin deve ser **multi-idioma desde o início**. O usuário escolhe um idioma em uma página de configurações, e esse idioma afeta duas coisas:

1. **Interface do plugin** — comandos, labels, modais, notificações, aba de settings
2. **Dados do TMDB** — títulos, sinopses, gêneros retornados pela API no idioma escolhido

Além disso, a página de configurações também define o **caminho da pasta do perfil TNR**.

---

## Conceito: Idioma Único vs. Idiomas Separados

O requisito define **um único idioma escolhido pelo usuário** que controla tanto a UI quanto as buscas no TMDB. Isso simplifica a UX: um dropdown "Idioma" na página de configurações.

**Decisão de arquitetura:** manter apenas uma configuração de idioma que serve para os dois fins. Caso futuro precise separar (UI em inglês, conteúdo em português, por exemplo), a estrutura deve permitir adicionar um segundo campo sem quebrar.

| Configuração | Controla |
|--------------|----------|
| `language` | Labels da UI + parâmetro `language` da API TMDB |

---

## Sistema de Traduções (i18n)

### Princípio
Todos os textos visíveis ao usuário devem vir de um **dicionário de traduções**, nunca hard-coded. Uma string de chave única no código aponta para o texto traduzido conforme o idioma ativo.

### Estrutura de Arquivos de Idioma
```
src/
└── i18n/
    ├── en.ts          # Inglês (default)
    ├── pt-BR.ts       # Português do Brasil
    ├── es.ts          # Espanhol
    └── index.ts       # Resolve idioma ativo + fallback
```

### Formato do Dicionário
Um objeto de chaves → traduções. As chaves são organizadas por seção da UI.

Exemplos de seções:
- `commands` — nomes e descrições dos comandos
- `settings` — labels e descrições da página de configurações
- `modals` — títulos, placeholders, botões de modais
- `notices` — mensagens de sucesso/erro exibidas ao usuário
- `settingsTab` — seções da aba de configurações

### Idiomas Suportados (Inicial)
| Código | Idioma | Observação |
|--------|--------|------------|
| `en` | Inglês | Idioma de fallback padrão |
| `pt-BR` | Português do Brasil | Idioma do autor/usuário |
| `es` | Espanhol | Bônus, baixo custo |

A lista é expansível — adicionar um idioma = criar um arquivo de tradução + adicionar ao dropdown.

### Fallback
Se uma chave não existir no idioma ativo, usar na ordem:
1. Idioma ativo
2. Inglês (`en`)
3. Se nada existir, exibir a chave (nunca quebrar)

---

## Impacto do Idioma na API TMDB

### Parâmetro `language`
Todas as chamadas ao TMDB devem enviar o parâmetro `language` com o código do idioma ativo.

**Formato:** `ISO 639-1` + `-` + `ISO 3166-1` (ex: `pt-BR`, `en-US`, `es-ES`).

| Endpoint | Impacto do language |
|----------|---------------------|
| `/search/movie` | Títulos e sinopses localizados |
| `/movie/{id}` | Título, sinopse, tagline localizados |
| `/genre/movie/list` | **Nomes dos gêneros localizados** (crucial) |
| `/movie/popular`, `/top_rated` | Resultados localizados |
| `/discover/movie` | Filtros de idioma via `with_original_language` |

### Regras e Armadilhas

1. **Gêneros dependem do idioma**
   - A lista de gêneros (`/genre/movie/list?language=pt-BR`) retorna "Documentário", em `en-US` retorna "Documentary"
   - **Cache de gêneros por idioma** — não reutilizar a lista de um idioma para outro
   - O TNR já armazena gêneros localizados nos `titleRef` (ex: "Documentário")

2. **Nem tudo é traduzível**
   - `posterPath`, `backdropPath` — imagens não mudam com idioma
   - `original_title`, `original_language` — sempre no idioma original de produção
   - `release_date`, `runtime` — não mudam

3. **Títulos podem não estar localizados**
   - Filmes sem tradução no idioma escolhido retornam o título original
   - Guardar `title` (localizado) e `originalTitle` separados no frontmatter

4. **Buscar gêneros no idioma ativo na inicialização**
   - Carregar e cachear a lista de gêneros quando o plugin inicia ou quando o idioma muda

### Exemplo Conceitual
- Idioma ativo: `pt-BR`
- Busca por "ilha das flores" → TMDB retorna `title: "Ilha das Flores"`, `overview` em português
- Se o idioma ativo fosse `en-US` → retornaria `title: "Isle of Flowers"`, sinopse em inglês

---

## Comandos Multi-idioma

### Princípio
- **IDs de comando:** sempre em inglês, imutáveis (são referências internas)
- **Nomes exibidos:** traduzidos via dicionário no idioma ativo

### Exemplos
| ID interno | en | pt-BR | es |
|-----------|----|-------|----|
| `search-movie` | Search movie | Buscar filme | Buscar película |
| `sync-from-tnr` | Sync from TNR | Sincronizar com TNR | Sincronizar con TNR |
| `sync-to-tnr` | Sync to TNR | Exportar para TNR | Exportar a TNR |
| `create-movie-note` | Create movie note | Criar nota de filme | Crear nota de película |
| `open-settings` | Open settings | Abrir configurações | Abrir ajustes |

### Observação Importante
Ao alterar o idioma, os **nomes** dos comandos mudam, mas os IDs permanecem os mesmos — hotkeys e referências continuam funcionando.

---

## Página de Configurações

### Estrutura da Aba
```
Settings → Community Plugins → Pack Movies
└── Perfil TNR
    └── Caminho da pasta do perfil [input de texto + botão navegar]
└── Idioma
    └── Idioma do plugin e do TMDB [dropdown]
└── (futuro) Preferências de conteúdo
    └── Idioma original apenas?
    └── Incluir conteúdo adulto?
    └── Pasta de destino das notas
```

### Campo 1: Caminho da Pasta do Perfil
- **Tipo:** campo de texto com botão para navegar no filesystem
- **Descrição:** "Pasta onde estão os arquivos do perfil TNR (profile.json, collection.json, etc.)"
- **Validação:** ao salvar, verificar se a pasta contém `manifest.json` ou `profile.json`
- **Feedback:** mensagem de erro se a pasta não for válida; mensagem de sucesso se ok

### Campo 2: Idioma
- **Tipo:** dropdown com opções de idiomas suportados
- **Descrição:** "Idioma do plugin e dos dados retornados pelo TMDB"
- **Comportamento:** ao mudar, aplicar imediatamente na UI (relabelar comandos, recarregar labels da aba) e recarregar gêneros do TMDB
- **Mudança deve ser persistida** nas settings do plugin

### Fluxo ao Mudar o Idioma
1. Usuário seleciona novo idioma no dropdown
2. Plugin salva `language` nas settings
3. UI é atualizada: nomes de comandos, labels, descrições
4. Cache de gêneros do TMDB é invalidado e recarregado no novo idioma
5. Notas futuras usam o novo idioma para busca/enriquecimento

---

## Estrutura de Settings Sugerida

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `profilePath` | texto | vazio | Caminho da pasta do perfil TNR |
| `language` | dropdown | `en` | Idioma do plugin e do TMDB |
| `defaultGenrePath` | (interno) | `pt-BR` | (futuro) idioma dos gêneros no frontmatter |
| `targetFolder` | texto | `Movies` | (futuro) pasta de destino das notas |
| `includeAdult` | toggle | `false` | (futuro) incluir conteúdo adulto |

**Obs:** `tmdbSecretName` (do SecretStorage) é separado — define qual secret contém o token do TMDB.

---

## Passos para Implementar (Checklist)

### i18n Foundation
- [ ] Criar estrutura `src/i18n/` com dicionários `en`, `pt-BR`, `es`
- [ ] Criar função `t(key)` que resolve traduções com fallback
- [ ] Mover todos os textos hard-coded para chaves de tradução
- [ ] Implementar relabeling de comandos ao mudar idioma

### Settings
- [ ] Criar interface de settings com `profilePath` e `language`
- [ ] Criar aba de configurações com dropdown de idioma + input de caminho
- [ ] Validar caminho do perfil (presença de `manifest.json`)
- [ ] Persistir mudanças via `saveSettings()`

### TMDB Language
- [ ] Enviar `language` configurado em todas as chamadas
- [ ] Cache de gêneros por idioma
- [ ] Recarregar gêneros ao mudar idioma
- [ ] Salvar `title` e `originalTitle` separados no frontmatter

### Integração TNR
- [ ] Usar `titleRef` como base; completar campos ausentes via TMDB no idioma ativo
- [ ] Na primeira execução, perguntar o idioma e o caminho do perfil

---

## Decisões Registradas

1. **Idioma único** controla UI + TMDB (simplicidade). Estrutura permite separar no futuro.
2. **Inglês é o fallback** universal.
3. **IDs de comandos são fixos em inglês**; apenas nomes exibidos são traduzidos.
4. **Gêneros são traduzidos por idioma** e cacheados separadamente.
5. **Título original sempre preservado** junto ao título localizado.
6. **SecretStorage** guarda apenas o token do TMDB — não é config de idioma/pasta.

---

## Referências

- TMDB `language` param: formato `ISO 639-1-ISO 3166-1`
- TMDB `/genre/movie/list`: nomes de gêneros localizados
- Obsidian `Plugin.addCommand()`: nomes exibidos podem mudar em runtime
- Obsidian `PluginSettingTab`: renderização dinâmica permite relabel em mudança de idioma