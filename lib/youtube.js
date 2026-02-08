import { YOUTUBE_URL_PATTERNS } from "./constants";

/**
 * Extract video ID from any YouTube URL format.
 * Returns null if the URL doesn't match any known pattern.
 */
export function extractVideoId(url) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();

  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Check if a string is a valid YouTube URL.
 */
export function isValidYouTubeUrl(url) {
  return extractVideoId(url) !== null;
}

/**
 * Get the thumbnail URL for a YouTube video.
 */
export function getThumbnailUrl(videoId, quality = "hqdefault") {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}
