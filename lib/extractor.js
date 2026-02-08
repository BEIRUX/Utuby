/**
 * YouTube transcript extractor.
 *
 * Strategy:
 *  1. Fetch the YouTube watch page HTML and extract ytInitialPlayerResponse
 *     (works from datacenter IPs because it looks like a normal browser visit)
 *  2. Fall back to the ANDROID InnerTube API if HTML parsing fails
 */

const INNERTUBE_API =
  "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

const WEB_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20250101.00.00",
    hl: "en",
    gl: "US",
  },
};

const ANDROID_CONTEXT = {
  client: {
    clientName: "ANDROID",
    clientVersion: "19.09.37",
    androidSdkVersion: 30,
    hl: "en",
    gl: "US",
  },
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const ANDROID_UA =
  "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip";

/**
 * Fetch transcript and video details for a YouTube video.
 * Tries multiple strategies — each one attempts to get player data AND working captions.
 */
export async function extractTranscript(videoId, lang = "en") {
  const strategies = [
    () => tryInnerTube(videoId, ANDROID_CONTEXT, ANDROID_UA),
    () => tryWatchPage(videoId),
    () => tryInnerTube(videoId, WEB_CONTEXT, BROWSER_UA),
  ];

  let lastData = null;

  for (const strategy of strategies) {
    const data = await strategy();
    if (!data) continue;

    if (data.playabilityStatus?.status !== "OK") {
      lastData = lastData || data;
      continue;
    }

    lastData = data;

    const tracks =
      data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) continue;

    const track = findBestTrack(tracks, lang);
    if (!track) continue;

    // Strip fmt=srv3 to get standard <text> XML format
    const capUrl = track.baseUrl.replace(/&fmt=srv3/, "");
    const subtitles = await fetchCaptions(capUrl);

    if (subtitles.length > 0) {
      const title = data.videoDetails?.title || "";
      const description = data.videoDetails?.shortDescription || "";
      return { title, description, subtitles };
    }
  }

  // All strategies exhausted
  if (!lastData) {
    throw new Error("Could not retrieve video data from YouTube");
  }

  if (lastData.playabilityStatus?.status !== "OK") {
    const reason = lastData.playabilityStatus?.reason || "Video unavailable";
    throw new Error(reason);
  }

  const title = lastData.videoDetails?.title || "";
  const description = lastData.videoDetails?.shortDescription || "";
  return { title, description, subtitles: [] };
}

/**
 * Fetch and parse caption XML. Returns empty array on failure.
 */
async function fetchCaptions(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    if (!xml || xml.length < 10) return [];
    return parseCaptions(xml);
  } catch {
    return [];
  }
}

/**
 * Strategy 1: Fetch the YouTube watch page and extract ytInitialPlayerResponse.
 */
async function tryWatchPage(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Find the start of ytInitialPlayerResponse JSON
    const marker = "var ytInitialPlayerResponse = ";
    let idx = html.indexOf(marker);
    if (idx === -1) {
      // Alternative assignment pattern
      const marker2 = "ytInitialPlayerResponse = ";
      idx = html.indexOf(marker2);
      if (idx === -1) return null;
      idx += marker2.length;
    } else {
      idx += marker.length;
    }

    // Extract the JSON object by counting braces
    const json = extractJsonObject(html, idx);
    if (!json) return null;

    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Extract a complete JSON object from a string starting at `start` by counting braces.
 */
function extractJsonObject(str, start) {
  if (str[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < str.length; i++) {
    const ch = str[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return str.slice(start, i + 1);
    }
  }

  return null;
}

/**
 * Strategy 2/3: Call the InnerTube player API with a given client context.
 */
async function tryInnerTube(videoId, context, userAgent) {
  try {
    const res = await fetch(INNERTUBE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": userAgent,
      },
      body: JSON.stringify({
        videoId,
        context,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();

    // Check if we actually got caption tracks
    if (data.captions?.playerCaptionsTracklistRenderer?.captionTracks) {
      return data;
    }

    // If playability is not OK, still return so we can show the error
    if (data.playabilityStatus?.status !== "OK") {
      return data;
    }

    return null;
  } catch {
    return null;
  }
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
