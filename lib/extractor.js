/**
 * Custom YouTube transcript extractor using InnerTube API.
 * Uses the ANDROID client which reliably returns caption tracks.
 */

const INNERTUBE_API =
  "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false";

const ANDROID_CONTEXT = {
  client: {
    clientName: "ANDROID",
    clientVersion: "19.09.37",
    androidSdkVersion: 30,
    hl: "en",
    gl: "US",
  },
};

const ANDROID_UA =
  "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip";

/**
 * Fetch transcript and video details for a YouTube video.
 */
export async function extractTranscript(videoId, lang = "en") {
  // 1. Call InnerTube player API
  const playerRes = await fetch(INNERTUBE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": ANDROID_UA,
    },
    body: JSON.stringify({
      videoId,
      context: ANDROID_CONTEXT,
    }),
  });

  if (!playerRes.ok) {
    throw new Error(`InnerTube API error: ${playerRes.status}`);
  }

  const data = await playerRes.json();

  if (data.playabilityStatus?.status !== "OK") {
    const reason =
      data.playabilityStatus?.reason || "Video unavailable";
    throw new Error(reason);
  }

  const title = data.videoDetails?.title || "";
  const description = data.videoDetails?.shortDescription || "";

  // 2. Get caption tracks
  const tracks =
    data.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!tracks || tracks.length === 0) {
    return { title, description, subtitles: [] };
  }

  // 3. Find best matching track
  const track = findBestTrack(tracks, lang);
  if (!track) {
    return { title, description, subtitles: [] };
  }

  // 4. Fetch caption XML
  const capRes = await fetch(track.baseUrl, {
    headers: { "User-Agent": ANDROID_UA },
  });

  if (!capRes.ok) {
    throw new Error(`Caption fetch error: ${capRes.status}`);
  }

  const xml = await capRes.text();

  // 5. Parse captions
  const subtitles = parseCaptions(xml);

  return { title, description, subtitles };
}

/**
 * Find the best caption track for the requested language.
 */
function findBestTrack(tracks, lang) {
  // Prefer manual captions over ASR
  let track = tracks.find(
    (t) => t.languageCode === lang && t.kind !== "asr"
  );
  if (track) return track;

  // ASR in requested language
  track = tracks.find((t) => t.languageCode === lang);
  if (track) return track;

  // Partial match (e.g. "en" matches "en-US")
  track = tracks.find(
    (t) => t.languageCode.startsWith(lang) && t.kind !== "asr"
  );
  if (track) return track;

  track = tracks.find((t) => t.languageCode.startsWith(lang));
  if (track) return track;

  // Fallback: first available
  return tracks[0];
}

/**
 * Parse caption XML. Handles both formats:
 * - Android format: <p t="1360" d="1680">text</p>  (times in ms)
 * - Web format: <text start="1.36" dur="1.68">text</text> (times in seconds)
 */
function parseCaptions(xml) {
  const subtitles = [];

  // Try Android format first: <p t="ms" d="ms">
  const pRegex = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  let foundP = false;

  while ((match = pRegex.exec(xml)) !== null) {
    foundP = true;
    const startMs = parseInt(match[1], 10);
    const durMs = parseInt(match[2] || "0", 10);
    const rawText = match[3] || "";
    const text = decodeEntities(rawText.replace(/<[^>]+>/g, "")).trim();

    if (text) {
      subtitles.push({
        start: (startMs / 1000).toString(),
        dur: (durMs / 1000).toString(),
        text,
      });
    }
  }

  if (foundP) return subtitles;

  // Fallback: Web format <text start="sec" dur="sec">
  const textRegex =
    /<text\s+start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([\s\S]*?)<\/text>/g;

  while ((match = textRegex.exec(xml)) !== null) {
    const start = match[1] || "0";
    const dur = match[2] || "0";
    const rawText = match[3] || "";
    const text = decodeEntities(rawText.replace(/<[^>]+>/g, "")).trim();

    if (text) {
      subtitles.push({ start, dur, text });
    }
  }

  return subtitles;
}

/**
 * Decode HTML entities.
 */
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&apos;/g, "'")
    .replace(/\n/g, " ");
}
