export const YOUTUBE_URL_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
];

export const ERROR_CODES = {
  INVALID_URL: "INVALID_URL",
  NO_CAPTIONS: "NO_CAPTIONS",
  RATE_LIMITED: "RATE_LIMITED",
  EXTRACTION_FAILED: "EXTRACTION_FAILED",
};

export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_URL]: "Please enter a valid YouTube URL.",
  [ERROR_CODES.NO_CAPTIONS]:
    "No captions found for this video. It may not have subtitles available.",
  [ERROR_CODES.RATE_LIMITED]:
    "Too many requests. Please wait a moment and try again.",
  [ERROR_CODES.EXTRACTION_FAILED]:
    "Failed to extract the transcript. The video may be private, deleted, or unavailable.",
};

export const RATE_LIMIT = {
  MAX_REQUESTS: 10,
  WINDOW_MS: 60 * 1000,
};
