#!/usr/bin/env node

/**
 * Utuby MCP Server v2
 *
 * Exposes YouTube transcript extraction as MCP tools so that LLMs
 * (Claude Code, Claude Co-Work, etc.) can directly fetch transcripts
 * and video details from YouTube videos.
 *
 * Tools:
 *   get_transcript    — Extract transcript (clean/timestamped/srt/summary)
 *   get_video_info    — Video metadata, chapters, available captions
 *   get_transcripts   — Batch extract from multiple URLs
 *   get_playlist      — Extract all video transcripts from a playlist
 *   search_transcript — Search within a video's transcript
 *   get_comments      — Fetch top comments for a video
 *
 * Setup — add to your Claude Code MCP config:
 *   claude mcp add utuby -- node ./mcp/server.mjs
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── Security: Rate limiting & limits ───

const LIMITS = {
  MAX_URLS_PER_BATCH: 10,
  MAX_PLAYLIST_VIDEOS: 25,
  MAX_COMMENTS: 100,
  MAX_URL_LENGTH: 500,
  MAX_QUERY_LENGTH: 200,
  RATE_WINDOW_MS: 60_000,
  RATE_MAX_REQUESTS: 30,
  REQUEST_TIMEOUT_MS: 15_000,
};

const rateLimitState = { windowStart: Date.now(), count: 0 };

function checkRateLimit() {
  const now = Date.now();
  if (now - rateLimitState.windowStart > LIMITS.RATE_WINDOW_MS) {
    rateLimitState.windowStart = now;
    rateLimitState.count = 0;
  }
  rateLimitState.count++;
  return rateLimitState.count > LIMITS.RATE_MAX_REQUESTS;
}

function rateLimitError() {
  return {
    content: [{ type: "text", text: `Rate limited. Max ${LIMITS.RATE_MAX_REQUESTS} requests per minute. Please wait and retry.` }],
    isError: true,
  };
}

function validateUrl(url) {
  if (!url || typeof url !== "string") return "URL is required.";
  if (url.length > LIMITS.MAX_URL_LENGTH) return "URL too long.";
  const id = extractVideoId(url);
  if (!id) return "Invalid YouTube URL. Supported: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/";
  return null;
}

// ─── YouTube InnerTube APIs ───

const INNERTUBE_PLAYER =
  "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false";
const INNERTUBE_BROWSE =
  "https://www.youtube.com/youtubei/v1/browse?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false";
const INNERTUBE_NEXT =
  "https://www.youtube.com/youtubei/v1/next?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false";

const WEB_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240101.00.00",
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

const ANDROID_UA = "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip";

async function fetchWithTimeout(url, options, timeoutMs = LIMITS.REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── URL extraction ───

const YOUTUBE_URL_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
];

const PLAYLIST_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?.*list=([a-zA-Z0-9_-]+)/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*list=([a-zA-Z0-9_-]+)/,
];

function extractVideoId(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractPlaylistId(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  for (const pattern of PLAYLIST_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// ─── Caption parsing ───

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/").replace(/&apos;/g, "'").replace(/\n/g, " ");
}

function parseCaptions(xml) {
  const subtitles = [];
  const pRegex = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g;
  let match, foundP = false;

  while ((match = pRegex.exec(xml)) !== null) {
    foundP = true;
    const text = decodeEntities((match[3] || "").replace(/<[^>]+>/g, "")).trim();
    if (text) {
      subtitles.push({
        start: (parseInt(match[1], 10) / 1000).toString(),
        dur: (parseInt(match[2] || "0", 10) / 1000).toString(),
        text,
      });
    }
  }
  if (foundP) return subtitles;

  const textRegex = /<text\s+start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([\s\S]*?)<\/text>/g;
  while ((match = textRegex.exec(xml)) !== null) {
    const text = decodeEntities((match[3] || "").replace(/<[^>]+>/g, "")).trim();
    if (text) subtitles.push({ start: match[1] || "0", dur: match[2] || "0", text });
  }
  return subtitles;
}

function findBestTrack(tracks, lang) {
  return (
    tracks.find((t) => t.languageCode === lang && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode === lang) ||
    tracks.find((t) => t.languageCode.startsWith(lang) && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode.startsWith(lang)) ||
    tracks[0]
  );
}

// ─── Chapter parsing ───

function parseChapters(description) {
  if (!description) return [];
  const chapterRegex = /(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—]?\s*(.+)/g;
  const chapters = [];
  let match;

  while ((match = chapterRegex.exec(description)) !== null) {
    const timeParts = match[1].split(":").map(Number);
    let seconds;
    if (timeParts.length === 3) {
      seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
    } else {
      seconds = timeParts[0] * 60 + timeParts[1];
    }
    chapters.push({ time: seconds, timestamp: match[1], title: match[2].trim() });
  }

  return chapters.length >= 2 ? chapters : [];
}

// ─── Core extraction ───

async function extractTranscript(videoId, lang = "en") {
  const playerRes = await fetchWithTimeout(INNERTUBE_PLAYER, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": ANDROID_UA },
    body: JSON.stringify({ videoId, context: ANDROID_CONTEXT }),
  });

  if (!playerRes.ok) throw new Error(`YouTube API error: ${playerRes.status}`);
  const data = await playerRes.json();

  if (data.playabilityStatus?.status !== "OK") {
    throw new Error(data.playabilityStatus?.reason || "Video unavailable");
  }

  const title = data.videoDetails?.title || "";
  const description = data.videoDetails?.shortDescription || "";
  const channelName = data.videoDetails?.author || "";
  const lengthSeconds = data.videoDetails?.lengthSeconds || "";
  const viewCount = data.videoDetails?.viewCount || "";
  const chapters = parseChapters(description);

  const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) {
    return { title, description, channelName, lengthSeconds, viewCount, chapters, subtitles: [], availableLanguages: [] };
  }

  const availableLanguages = tracks.map((t) => ({
    code: t.languageCode,
    name: t.name?.simpleText || t.languageCode,
    kind: t.kind || "manual",
  }));

  const track = findBestTrack(tracks, lang);
  if (!track) {
    return { title, description, channelName, lengthSeconds, viewCount, chapters, subtitles: [], availableLanguages };
  }

  const capRes = await fetchWithTimeout(track.baseUrl, { headers: { "User-Agent": ANDROID_UA } });
  if (!capRes.ok) throw new Error(`Caption fetch error: ${capRes.status}`);

  const xml = await capRes.text();
  const subtitles = parseCaptions(xml);

  return { title, description, channelName, lengthSeconds, viewCount, chapters, subtitles, availableLanguages };
}

// ─── Playlist extraction ───

async function fetchPlaylistVideos(playlistId) {
  const res = await fetchWithTimeout(INNERTUBE_BROWSE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": ANDROID_UA },
    body: JSON.stringify({
      browseId: `VL${playlistId}`,
      context: WEB_CONTEXT,
    }),
  });

  if (!res.ok) throw new Error(`Playlist fetch error: ${res.status}`);
  const data = await res.json();

  const contents =
    data.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
      ?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer
      ?.contents?.[0]?.playlistVideoListRenderer?.contents || [];

  const videos = [];
  for (const item of contents) {
    const renderer = item.playlistVideoRenderer;
    if (!renderer?.videoId) continue;
    videos.push({
      videoId: renderer.videoId,
      title: renderer.title?.runs?.[0]?.text || "",
      lengthSeconds: renderer.lengthSeconds || "",
    });
    if (videos.length >= LIMITS.MAX_PLAYLIST_VIDEOS) break;
  }

  const playlistTitle =
    data.metadata?.playlistMetadataRenderer?.title || "";

  return { playlistTitle, videos };
}

// ─── Comment extraction ───

async function fetchComments(videoId, maxComments = 20) {
  const count = Math.min(maxComments, LIMITS.MAX_COMMENTS);

  // First, get the continuation token for comments
  const nextRes = await fetchWithTimeout(INNERTUBE_NEXT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId,
      context: WEB_CONTEXT,
    }),
  });

  if (!nextRes.ok) throw new Error(`Comments fetch error: ${nextRes.status}`);
  const nextData = await nextRes.json();

  // Find the comments section continuation token
  const results = nextData.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
  let continuationToken = null;

  for (const item of results) {
    const section = item.itemSectionRenderer;
    if (section?.contents?.[0]?.continuationItemRenderer) {
      continuationToken = section.contents[0].continuationItemRenderer
        .continuationEndpoint?.continuationCommand?.token;
      break;
    }
  }

  if (!continuationToken) return [];

  // Fetch actual comments
  const commentsRes = await fetchWithTimeout(INNERTUBE_NEXT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      continuation: continuationToken,
      context: WEB_CONTEXT,
    }),
  });

  if (!commentsRes.ok) return [];
  const commentsData = await commentsRes.json();

  const commentItems =
    commentsData.onResponseReceivedEndpoints?.[1]?.reloadContinuationItemsCommand
      ?.continuationItems ||
    commentsData.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction
      ?.continuationItems || [];

  const comments = [];
  for (const item of commentItems) {
    const renderer = item.commentThreadRenderer?.comment?.commentRenderer;
    if (!renderer) continue;

    const text = renderer.contentText?.runs?.map((r) => r.text).join("") || "";
    const author = renderer.authorText?.simpleText || "";
    const likes = renderer.voteCount?.simpleText || "0";
    const time = renderer.publishedTimeText?.runs?.[0]?.text || "";

    if (text) {
      comments.push({ author, text, likes, time });
    }
    if (comments.length >= count) break;
  }

  return comments;
}

// ─── Formatting helpers ───

function formatTimestamp(seconds) {
  const num = parseFloat(seconds);
  if (isNaN(num) || num < 0) return "0:00";
  const h = Math.floor(num / 3600);
  const m = Math.floor((num % 3600) / 60);
  const s = Math.floor(num % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(totalSeconds) {
  const num = parseInt(totalSeconds, 10);
  if (isNaN(num)) return "unknown";
  const h = Math.floor(num / 3600);
  const m = Math.floor((num % 3600) / 60);
  const s = num % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatSrtTime(t) {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const ms = Math.round((t % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

function deepLink(videoId, seconds) {
  return `https://youtube.com/watch?v=${videoId}&t=${Math.floor(parseFloat(seconds))}s`;
}

function truncateToTokenBudget(text, maxTokens) {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxChars * 0.8 ? truncated.slice(0, lastSpace) : truncated) + "\n\n[...truncated to ~" + maxTokens + " tokens]";
}

// ─── Format transcript output ───

function formatTranscriptOutput(result, videoId, lang, format, maxTokens) {
  let output;

  if (format === "timestamped") {
    const lines = result.subtitles.map(
      (sub) => `[${formatTimestamp(sub.start)}](${deepLink(videoId, sub.start)}) ${sub.text}`
    );
    const header = result.title ? `${result.title}\n${"=".repeat(Math.min(result.title.length, 60))}\n\n` : "";
    output = header + lines.join("\n");

  } else if (format === "srt") {
    output = result.subtitles
      .map((sub, i) => {
        const startSec = parseFloat(sub.start);
        const endSec = startSec + parseFloat(sub.dur);
        return `${i + 1}\n${formatSrtTime(startSec)} --> ${formatSrtTime(endSec)}\n${sub.text}`;
      })
      .join("\n\n");

  } else if (format === "summary") {
    output = formatSummary(result, videoId);

  } else {
    // Clean format
    const text = result.subtitles.map((sub) => sub.text).join(" ").replace(/\s+/g, " ").trim();
    const lines = [];
    if (result.title) lines.push(`Video: "${result.title}"`);
    if (result.channelName) lines.push(`Channel: ${result.channelName}`);
    lines.push(`Source: https://youtube.com/watch?v=${videoId}`);
    if (result.lengthSeconds) lines.push(`Duration: ${formatDuration(result.lengthSeconds)}`);
    if (result.viewCount) lines.push(`Views: ${parseInt(result.viewCount).toLocaleString()}`);
    if (result.availableLanguages.length > 0) lines.push(`Caption language: ${lang}`);
    lines.push(`Segments: ${result.subtitles.length}`);
    lines.push(`Approximate tokens: ~${Math.ceil(text.length / 4)}`);
    if (result.chapters.length > 0) {
      lines.push(`Chapters: ${result.chapters.map((c) => `${c.timestamp} ${c.title}`).join(" | ")}`);
    }
    lines.push("");
    lines.push(text);
    output = lines.join("\n");
  }

  if (maxTokens && maxTokens > 0) {
    output = truncateToTokenBudget(output, maxTokens);
  }

  return output;
}

function formatSummary(result, videoId) {
  const lines = [];
  if (result.title) lines.push(`# ${result.title}`);
  lines.push(`Source: https://youtube.com/watch?v=${videoId}`);
  if (result.channelName) lines.push(`Channel: ${result.channelName}`);
  if (result.lengthSeconds) lines.push(`Duration: ${formatDuration(result.lengthSeconds)}`);
  lines.push("");

  if (result.chapters.length > 0) {
    // Split by chapters
    for (let i = 0; i < result.chapters.length; i++) {
      const chapter = result.chapters[i];
      const nextTime = i + 1 < result.chapters.length ? result.chapters[i + 1].time : Infinity;

      const subs = result.subtitles.filter((sub) => {
        const t = parseFloat(sub.start);
        return t >= chapter.time && t < nextTime;
      });

      const chapterText = subs.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim();
      lines.push(`## [${chapter.timestamp}] ${chapter.title}`);
      lines.push(chapterText);
      lines.push("");
    }
  } else {
    // Split by time gaps (~2 min chunks)
    const CHUNK_SEC = 120;
    let chunkStart = 0;
    let chunkSubs = [];

    for (const sub of result.subtitles) {
      const t = parseFloat(sub.start);
      if (t >= chunkStart + CHUNK_SEC && chunkSubs.length > 0) {
        lines.push(`## ${formatTimestamp(chunkStart)} – ${formatTimestamp(t)}`);
        lines.push(chunkSubs.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim());
        lines.push("");
        chunkStart = t;
        chunkSubs = [];
      }
      chunkSubs.push(sub);
    }
    if (chunkSubs.length > 0) {
      const lastTime = parseFloat(chunkSubs[chunkSubs.length - 1].start);
      lines.push(`## ${formatTimestamp(chunkStart)} – ${formatTimestamp(lastTime)}`);
      lines.push(chunkSubs.map((s) => s.text).join(" ").replace(/\s+/g, " ").trim());
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ─── MCP Server ───

const server = new McpServer({
  name: "utuby",
  version: "2.0.0",
});

// Tool: get_transcript
server.tool(
  "get_transcript",
  "Extract the full transcript from a YouTube video. Returns clean flowing text optimized for LLM consumption, with video metadata and chapter markers. Supports multiple output formats and token budget truncation.",
  {
    url: z.string().describe("YouTube video URL (any format)"),
    lang: z.string().default("en").describe("Preferred caption language code (default: 'en')"),
    format: z.enum(["clean", "timestamped", "srt", "summary"]).default("clean").describe("'clean' = flowing paragraphs, 'timestamped' = with clickable timestamps, 'srt' = SubRip, 'summary' = chunked by chapters/time"),
    max_tokens: z.number().optional().describe("Max approximate token budget. Truncates intelligently if transcript exceeds this."),
  },
  async ({ url, lang, format, max_tokens }) => {
    if (checkRateLimit()) return rateLimitError();
    const err = validateUrl(url);
    if (err) return { content: [{ type: "text", text: err }], isError: true };

    const videoId = extractVideoId(url);
    const result = await extractTranscript(videoId, lang);

    if (!result.subtitles?.length) {
      const hint = result.availableLanguages.length > 0
        ? `. Available languages: ${result.availableLanguages.map((l) => l.code).join(", ")}` : "";
      return { content: [{ type: "text", text: `No captions found${hint}` }], isError: true };
    }

    const output = formatTranscriptOutput(result, videoId, lang, format, max_tokens);
    return { content: [{ type: "text", text: output }] };
  }
);

// Tool: get_video_info
server.tool(
  "get_video_info",
  "Get metadata about a YouTube video without the full transcript. Returns title, description, channel, duration, view count, chapters, and available caption languages.",
  {
    url: z.string().describe("YouTube video URL"),
  },
  async ({ url }) => {
    if (checkRateLimit()) return rateLimitError();
    const err = validateUrl(url);
    if (err) return { content: [{ type: "text", text: err }], isError: true };

    const videoId = extractVideoId(url);
    const result = await extractTranscript(videoId);

    const info = [];
    info.push(`Title: ${result.title || "Unknown"}`);
    if (result.channelName) info.push(`Channel: ${result.channelName}`);
    info.push(`URL: https://youtube.com/watch?v=${videoId}`);
    if (result.lengthSeconds) info.push(`Duration: ${formatDuration(result.lengthSeconds)}`);
    if (result.viewCount) info.push(`Views: ${parseInt(result.viewCount).toLocaleString()}`);
    if (result.chapters.length > 0) {
      info.push("");
      info.push("Chapters:");
      for (const ch of result.chapters) {
        info.push(`  ${ch.timestamp} — ${ch.title}`);
      }
    }
    if (result.description) {
      info.push("");
      info.push("Description:");
      info.push(result.description);
    }
    if (result.availableLanguages.length > 0) {
      info.push("");
      info.push(
        `Available captions: ${result.availableLanguages
          .map((l) => `${l.name} (${l.code}${l.kind === "asr" ? ", auto" : ""})`)
          .join(", ")}`
      );
    }
    info.push("");
    info.push(`Has transcript: ${result.subtitles.length > 0 ? "Yes" : "No"} (${result.subtitles.length} segments)`);

    return { content: [{ type: "text", text: info.join("\n") }] };
  }
);

// Tool: get_transcripts (batch)
server.tool(
  "get_transcripts",
  `Batch extract transcripts from multiple YouTube videos (max ${LIMITS.MAX_URLS_PER_BATCH}). Returns all transcripts concatenated with clear separators. Useful for comparing videos or processing multiple at once.`,
  {
    urls: z.array(z.string()).min(1).max(LIMITS.MAX_URLS_PER_BATCH).describe("Array of YouTube video URLs"),
    lang: z.string().default("en").describe("Preferred caption language"),
    format: z.enum(["clean", "timestamped", "summary"]).default("clean").describe("Output format for all transcripts"),
    max_tokens: z.number().optional().describe("Max token budget per video"),
  },
  async ({ urls, lang, format, max_tokens }) => {
    if (checkRateLimit()) return rateLimitError();

    const sections = [];
    for (const url of urls) {
      const videoId = extractVideoId(url);
      if (!videoId) {
        sections.push(`\n${"─".repeat(60)}\n⚠ Skipped invalid URL: ${url}\n`);
        continue;
      }

      try {
        const result = await extractTranscript(videoId, lang);
        if (!result.subtitles?.length) {
          sections.push(`\n${"─".repeat(60)}\n⚠ No captions: ${result.title || videoId}\n`);
          continue;
        }
        const output = formatTranscriptOutput(result, videoId, lang, format, max_tokens);
        sections.push(`\n${"━".repeat(60)}\n${output}`);
      } catch (e) {
        sections.push(`\n${"─".repeat(60)}\n⚠ Error for ${videoId}: ${e.message}\n`);
      }
    }

    return { content: [{ type: "text", text: `Batch results (${urls.length} videos):\n${sections.join("\n")}` }] };
  }
);

// Tool: get_playlist
server.tool(
  "get_playlist",
  `Extract transcripts from all videos in a YouTube playlist (max ${LIMITS.MAX_PLAYLIST_VIDEOS} videos). Pass a playlist URL and get all transcripts with clear separators.`,
  {
    url: z.string().describe("YouTube playlist URL (must contain list= parameter)"),
    lang: z.string().default("en").describe("Preferred caption language"),
    format: z.enum(["clean", "timestamped", "summary"]).default("clean").describe("Output format"),
    max_tokens: z.number().optional().describe("Max token budget per video"),
  },
  async ({ url, lang, format, max_tokens }) => {
    if (checkRateLimit()) return rateLimitError();

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
      return { content: [{ type: "text", text: "Invalid playlist URL. Must contain a list= parameter." }], isError: true };
    }

    const { playlistTitle, videos } = await fetchPlaylistVideos(playlistId);

    if (videos.length === 0) {
      return { content: [{ type: "text", text: "No videos found in this playlist. It may be private or empty." }], isError: true };
    }

    const header = [`Playlist: "${playlistTitle || playlistId}"`, `Videos: ${videos.length}`, ""];
    const sections = [];

    for (const video of videos) {
      try {
        const result = await extractTranscript(video.videoId, lang);
        if (!result.subtitles?.length) {
          sections.push(`\n${"─".repeat(60)}\n⚠ No captions: ${video.title || video.videoId}\n`);
          continue;
        }
        const output = formatTranscriptOutput(result, video.videoId, lang, format, max_tokens);
        sections.push(`\n${"━".repeat(60)}\n${output}`);
      } catch (e) {
        sections.push(`\n${"─".repeat(60)}\n⚠ Error for "${video.title}": ${e.message}\n`);
      }
    }

    return { content: [{ type: "text", text: header.join("\n") + sections.join("\n") }] };
  }
);

// Tool: search_transcript
server.tool(
  "search_transcript",
  "Search within a YouTube video's transcript. Returns only matching segments with timestamps and context, saving tokens when you only need specific parts of a long video.",
  {
    url: z.string().describe("YouTube video URL"),
    query: z.string().describe("Search query (case-insensitive)"),
    lang: z.string().default("en").describe("Preferred caption language"),
    context_lines: z.number().default(1).describe("Number of surrounding segments to include for context (default: 1)"),
  },
  async ({ url, query, lang, context_lines }) => {
    if (checkRateLimit()) return rateLimitError();
    const err = validateUrl(url);
    if (err) return { content: [{ type: "text", text: err }], isError: true };
    if (!query || query.length > LIMITS.MAX_QUERY_LENGTH) {
      return { content: [{ type: "text", text: `Query is required and must be under ${LIMITS.MAX_QUERY_LENGTH} characters.` }], isError: true };
    }

    const videoId = extractVideoId(url);
    const result = await extractTranscript(videoId, lang);

    if (!result.subtitles?.length) {
      return { content: [{ type: "text", text: "No captions found for this video." }], isError: true };
    }

    const q = query.toLowerCase();
    const subs = result.subtitles;
    const matchIndices = new Set();

    for (let i = 0; i < subs.length; i++) {
      if (subs[i].text.toLowerCase().includes(q)) {
        for (let j = Math.max(0, i - context_lines); j <= Math.min(subs.length - 1, i + context_lines); j++) {
          matchIndices.add(j);
        }
      }
    }

    if (matchIndices.size === 0) {
      return { content: [{ type: "text", text: `No matches found for "${query}" in "${result.title}".` }] };
    }

    const sorted = [...matchIndices].sort((a, b) => a - b);
    const lines = [`Search results for "${query}" in "${result.title}"`, `Matches: ${sorted.filter((i) => subs[i].text.toLowerCase().includes(q)).length} segments`, ""];

    let lastIdx = -2;
    for (const idx of sorted) {
      if (idx > lastIdx + 1) lines.push("  ...");
      const sub = subs[idx];
      const isMatch = sub.text.toLowerCase().includes(q);
      const prefix = isMatch ? "►" : " ";
      lines.push(`${prefix} [${formatTimestamp(sub.start)}](${deepLink(videoId, sub.start)}) ${sub.text}`);
      lastIdx = idx;
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// Tool: get_comments
server.tool(
  "get_comments",
  `Fetch top comments from a YouTube video (max ${LIMITS.MAX_COMMENTS}). Useful for understanding audience sentiment and reception.`,
  {
    url: z.string().describe("YouTube video URL"),
    count: z.number().default(20).describe(`Number of comments to fetch (max ${LIMITS.MAX_COMMENTS}, default: 20)`),
  },
  async ({ url, count }) => {
    if (checkRateLimit()) return rateLimitError();
    const err = validateUrl(url);
    if (err) return { content: [{ type: "text", text: err }], isError: true };

    const videoId = extractVideoId(url);
    const comments = await fetchComments(videoId, count);

    if (comments.length === 0) {
      return { content: [{ type: "text", text: "No comments found. Comments may be disabled for this video." }] };
    }

    const lines = [`Top ${comments.length} comments for https://youtube.com/watch?v=${videoId}`, ""];
    for (const c of comments) {
      lines.push(`@${c.author} (${c.likes} likes, ${c.time})`);
      lines.push(`  ${c.text}`);
      lines.push("");
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
