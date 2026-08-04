export type MediaType = "movie" | "tv";

export interface SearchResultItem {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  genre_ids?: number[];
}

export interface SearchMultiResponse {
  page: number;
  results: SearchResultItem[];
  total_results: number;
}

export interface PersonSearchItem {
  id: number;
  name?: string;
  profile_path?: string | null;
  known_for_department?: string;
  known_for?: SearchResultItem[];
  popularity?: number;
}

export interface PersonSearchResponse {
  page: number;
  results: PersonSearchItem[];
  total_results: number;
}

export interface PersonDetails {
  id: number;
  name?: string;
  birthday?: string | null;
  deathday?: string | null;
  biography?: string;
  known_for_department?: string;
  place_of_birth?: string | null;
  profile_path?: string | null;
}

export interface CastMember {
  id: number;
  name: string;
  character?: string | null;
  profile_path?: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

export interface MediaDetails {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  runtime?: number | null;
  episode_run_time?: number[] | null;
  genres?: Genre[];
  origin_country?: string[];
  poster_path?: string | null;
  credits?: Credits;
}

export interface EpisodeSummary {
  id: number;
  name: string;
  overview?: string;
  episode_number: number;
  season_number: number;
  air_date?: string;
  runtime?: number | null;
  still_path?: string | null;
  vote_average?: number;
}

export interface SeasonDetails {
  _id?: string;
  id: number;
  name?: string;
  overview?: string;
  air_date?: string;
  poster_path?: string | null;
  season_number: number;
  vote_average?: number;
  episodes?: EpisodeSummary[];
}

export interface EpisodeDetails {
  id: number;
  name?: string;
  overview?: string;
  air_date?: string;
  episode_number: number;
  season_number: number;
  runtime?: number | null;
  still_path?: string | null;
  crew?: CrewMember[];
  guest_stars?: CastMember[];
}

export type SearchHit =
  | { kind: "media"; item: SearchResultItem }
  | { kind: "season"; series: SearchResultItem; season: SeasonDetails }
  | { kind: "episode"; series: SearchResultItem; episode: EpisodeDetails };

export class TMDBError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
