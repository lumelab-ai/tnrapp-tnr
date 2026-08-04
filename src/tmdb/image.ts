const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null | undefined, size = "w342"): string {
  if (!path) return "";
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export function profileUrl(path: string | null | undefined, size = "w185"): string {
  if (!path) return "";
  return `${IMAGE_BASE_URL}/${size}${path}`;
}
