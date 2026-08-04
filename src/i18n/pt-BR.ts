import type { Dict } from "./en";

export const ptBR: Dict = {
  commands: {
    add: "Adicionar filme/série",
    addCast: "Adicionar filme/série com elenco",
    person: "Adicionar pessoa",
  },
  modal: {
    title: "Buscar no TMDB",
    searchPlaceholder:
      "Digite o título do filme ou série (ex.: \"Lost s01e03\")...",
    searching: "Buscando...",
    noResults: "Nenhum resultado",
    error: "Falha na busca. Verifique token e idioma.",
    movie: "Filme",
    series: "Série",
    season: "Temporada",
    episode: "Episódio",
    selected: "Selecionado",
    personTitle: "Buscar pessoa",
    personPlaceholder: "Digite o nome da pessoa...",
  },
  notices: {
    missingSecret: "Token do TMDB não configurado nas configurações.",
    invalidSecret: "Token do TMDB inválido. Verifique nas configurações.",
    getKeySteps:
      "1. Crie uma conta em themoviedb.org. 2. Settings → API → Solicitar API Key. 3. Copie o API Read Access Token. 4. Salve aqui.",
    invalidProfileFolder:
      "A pasta não contém manifest.json ou profile.json. Verifique o caminho do perfil.",
    insertOk: "Card inserido.",
    insertCastOk: "Cards (filme/série + elenco) inseridos.",
    insertPersonOk: "Card de pessoa inserido.",
    noProfile: "Pasta do perfil TNR não configurada. Estatísticas ocultas.",
    profileReadError: "Não foi possível ler memories.json da pasta do perfil:",
  },
  card: {
    director: "Diretor",
    genres: "Gêneros",
    duration: "Duração",
    country: "País",
    cast: "Elenco",
    season: "Temporada",
    episodes: "episódios",
    tmdbId: "tmdbId",
    expand: "Expandir",
    collapse: "Recolher",
    tmdbAttribution:
      "Informações recuperadas a partir do TMDB. O TMDB gentilmente cede sua API e não tem nenhuma ligação com o TNR.",
    birth: "Nascimento",
    death: "Falecimento",
    place: "Local",
    roles: "Funções",
    inMemory: "Na sua memória",
    filmsInMemory: "filmes na memória",
    avgRating: "nota média",
    theirFilms: "Seus filmes na memória",
    actor: "Ator",
    writer: "Roteirista",
    producer: "Produtor",
    profileHint: "Configure a pasta do perfil TNR nas configurações para exibir as estatísticas de memória.",
  },
  settings: {
    name: "Configurações",
    profileName: "Pasta do perfil TNR",
    profileDesc:
      "Pasta com os arquivos do TNR (profile.json, collection.json, etc.). Somente leitura.",
    profilePlaceholder: "Caminho da pasta do perfil TNR",
    browse: "Navegar",
    languageName: "Idioma",
    languageDesc: "Idioma do plugin e do TMDB",
    tokenName: "Token TMDB",
    tokenDesc:
      "Selecione o secret que armazena seu API Read Access Token do TMDB.",
    secretMissing: "Token do TMDB não configurado.",
    adultName: "Incluir conteúdo adulto",
  },
};
