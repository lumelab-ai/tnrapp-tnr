# TNR - Track n Review

Obsidian plugin que busca filmes, séries e pessoas no **TMDB** e insere cards
com embed (com ou sem elenco) na posição do cursor. Ele também lê os dados do
seu perfil do app **Track 'n' Review** (grátis no iPhone, em breve no Android)
para exibir estatísticas como nota média e filmes na memória.

## Funcionalidades

- Busca com autocomplete no TMDB para filmes, séries, temporadas e episódios.
- Cards embed com poster, título, ano, diretor, gêneros, duração, país,
  sinopse e atribuição ao TMDB.
- Card de elenco com carrossel dos atores principais.
- Busca direta por temporada/episódio (ex.: `Lost s01e03`).
- Cards de pessoa com foto, funções e — com o perfil configurado — as
  estatísticas da sua memória.
- Interface e dados localizados (pt-BR, en-US).

## Requisitos

- Obsidian 1.13.0 ou superior.
- Uma conta gratuita no [TMDB](https://www.themoviedb.org/).
- (Opcional) O app **Track 'n' Review** no iPhone com o perfil exportado (uma
  pasta com `profile.json`, `collection.json`, `memories.json`, `diary.json`,
  `lists.json` e `manifest.json`).

## Configuração

Abra **Configurações → Plugins da comunidade → TNR - Track n Review**.

1. **Token TMDB** — cole seu *API Read Access Token* (Settings → API → API Key
   (v3 auth) no themoviedb.org). Ele é guardado de forma segura no cofre.
2. **Idioma** — escolha o idioma do plugin e dos dados do TMDB.
3. **Pasta do perfil TNR** *(opcional)* — clique em **Navegar** e selecione a
   pasta com os arquivos do seu perfil do Track 'n' Review. O plugin **só
   lê** esses arquivos. Com a pasta configurada, os cards de pessoa mostram as
   estatísticas de memória.
4. **Incluir conteúdo adulto** *(opcional)* — permite que buscas retornem
   títulos adultos.

## Como usar

Abra a paleta de comandos (`Cmd+P`) e use um dos comandos:

| Comando | O que faz |
|---------|-----------|
| **Adicionar filme/série** | Abre a busca no TMDB e insere um card do título selecionado. |
| **Adicionar filme/série com elenco** | Igual ao anterior, mas insere também o card do elenco. |
| **Adicionar pessoa** | Busca uma pessoa e insere um card com foto e estatísticas da memória. |

### Busca por série, temporada e episódio

| O que você quer | Como digitar | Exemplo |
|-----------------|--------------|---------|
| A série inteira | Só o título | `Lost` |
| Uma temporada | `Título sN` | `Lost s01` |
| Um episódio | `Título sNeMM` | `Lost s01e03` |

O padrão não diferencia maiúsculas/minúsculas (`s` = temporada, `e` =
episódio). Se a temporada/episódio não existir, a busca cai para uma busca
normal por título. Os resultados podem ser navegados com as setas e
confirmados com `Enter`, ou clicados com o mouse.

### Cards

![Busca no TMDB com autocomplete](doc/img/screenshots/search.png)

**Card de filme** — poster, título, ano, título original, diretor, gêneros,
duração, país e sinopse com expandir/recolher. O logo do TNR leva ao
tnrapp.com e o rodapé à página do TMDB.

![Card de filme](doc/img/screenshots/Only%20movie.png)

**Card de filme + elenco** — o card do filme seguido de um carrossel com os
avatares do elenco principal (até 11).

![Card de filme com elenco](doc/img/screenshots/Movie%20card%20and%20cast.png)

**Card de série** — mesmo layout do filme, com nome da série, ano de estreia e
duração dos episódios.

![Card de série](doc/img/screenshots/Series%20-%20all%20series.png)

**Card de temporada** — nome da série com subtítulo "Temporada N", poster da
temporada e contagem de episódios.

![Card de temporada](doc/img/screenshots/Series%20-%20only%20the%20season.png)

**Card de episódio** — imagem 16:9 (still), nome do episódio, subtítulo
"Série · S01E03", duração e sinopse. Com o comando "com elenco", inclui
também o carrossel dos participantes do episódio.

![Card de episódio](doc/img/screenshots/Series%20-%20Only%20the%20episode.png)

**Card de pessoa** — foto, nome, função (Ator / Diretor / Roteirista /
Produtor), nascimento, falecimento, local e biografia. Com o perfil
configurado, mostra a seção "Na sua memória" com a quantidade de filmes que
você registrou e sua nota média, seguida do carrossel desses filmes.

![Card de pessoa](doc/img/screenshots/person.png)
