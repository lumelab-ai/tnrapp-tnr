export const en = {
  commands: {
    add: "Add movie/series",
    addCast: "Add movie/series with cast",
    person: "Add person",
  },
  modal: {
    title: "Search TMDB",
    searchPlaceholder:
      "Type a movie or series title (e.g. \"Lost s01e03\")...",
    searching: "Searching...",
    noResults: "No results",
    error: "Search failed. Check token and language.",
    movie: "Movie",
    series: "Series",
    season: "Season",
    episode: "Episode",
    selected: "Selected",
    personTitle: "Search person",
    personPlaceholder: "Type a person name...",
  },
  notices: {
    missingSecret:
      "TMDB token not configured in settings.",
    invalidSecret: "Invalid TMDB token. Check it in settings.",
    getKeySteps:
      "1. Create an account at themoviedb.org. 2. Settings → API → Request an API Key. 3. Copy the API Read Access Token. 4. Save it here.",
    invalidProfileFolder:
      "Folder does not contain manifest.json or profile.json. Check the profile path.",
    insertOk: "Card inserted.",
    insertCastOk: "Cards (movie/series + cast) inserted.",
    insertPersonOk: "Person card inserted.",
    noProfile: "TNR profile folder not configured. Memory stats hidden.",
    profileReadError: "Could not read memories.json from profile folder:",
  },
  card: {
    director: "Director",
    genres: "Genres",
    duration: "Duration",
    country: "Country",
    cast: "Cast",
    season: "Season",
    episodes: "episodes",
    tmdbId: "tmdbId",
    expand: "Expand",
    collapse: "Collapse",
    tmdbAttribution:
      "Information retrieved from TMDB. TMDB kindly provides its API and has no affiliation with TNR.",
    birth: "Birth",
    death: "Death",
    place: "Place",
    roles: "Roles",
    inMemory: "In your memory",
    filmsInMemory: "films in memory",
    avgRating: "average rating",
    theirFilms: "Their films in memory",
    actor: "Actor",
    writer: "Writer",
    producer: "Producer",
    profileHint: "Set the TNR profile folder in settings to show memory stats.",
  },
  settings: {
    name: "Settings",
    profileName: "TNR profile folder",
    profileDesc:
      "Folder with TNR files (profile.json, collection.json, etc.). Read-only.",
    profilePlaceholder: "Path to TNR profile folder",
    browse: "Browse",
    languageName: "Language",
    languageDesc: "Plugin and TMDB language",
    tokenName: "TMDB API Token",
    tokenDesc:
      "Select the secret that stores your TMDB API Read Access Token.",
    secretMissing: "TMDB token not configured.",
    adultName: "Include adult content",
  },
};

export type Dict = typeof en;
