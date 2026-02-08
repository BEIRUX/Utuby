#!/usr/bin/env node

/**
 * Utuby MCP Server
 *
 * Exposes YouTube transcript extraction as MCP tools so that LLMs
 * (Claude Code, Claude Co-Work, etc.) can directly fetch transcripts
 * and video details from YouTube videos.
 *
 * Built with the official @modelcontextprotocol/sdk.
 *
 * Setup — add to your Claude Code MCP config:
 *   {
 *     "mcpServers": {
 *       "utuby": {
 *         "command": "node",
 *         "args": ["<absolute-path-to>/mcp/server.mjs"]
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ─── YouTube extraction logic (self-contained for portability) ───

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

const YOUTUBE_URL_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
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

function parseCaptions(xml) {
  const subtitles = [];
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

  const textRegex =
    /<text\s+start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([\s\S]*?)<\/text>/g;
  while ((match = textRegex.exec(xml)) !== null) {
    const start = match[1] || "0";
    const dur = match[2] || "0";
    const rawText = match[3] || "";
    const text = decodeEntities(rawText.replace(/<[^>]+>/g, "")).trim();
    if (text) subtitles.push({ start, dur, text });
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

async function extractTranscript(videoId, lang = "en") {
  const playerRes = await fetch(INNERTUBE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": ANDROID_UA,
    },
    body: JSON.stringify({ videoId, context: ANDROID_CONTEXT }),
  });

  if (!playerRes.ok) throw new Error(`InnerTube API error: ${playerRes.status}`);
  const data = await playerRes.json();

  if (data.playabilityStatus?.status !== "OK") {
    throw new Error(data.playabilityStatus?.reason || "Video unavailable");
  }

  const title = data.videoDetails?.title || "";
  const description = data.videoDetails?.shortDescription || "";
  const channelName = data.videoDetails?.author || "";
  const lengthSeconds = data.videoDetails?.lengthSeconds || "";
  const viewCount = data.videoDetails?.viewCount || "";

  const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!tracks || tracks.length === 0) {
    return { title, description, channelName, lengthSeconds, viewCount, subtitles: [], availableLanguages: [] };
  }

  const availableLanguages = tracks.map((t) => ({
    code: t.languageCode,
    name: t.name?.simpleText || t.languageCode,
    kind: t.kind || "manual",
  }));

  const track = findBestTrack(tracks, lang);
  if (!track) {
    return { title, description, channelName, lengthSeconds, viewCount, subtitles: [], availableLanguages };
  }

  const capRes = await fetch(track.baseUrl, { headers: { "User-Agent": ANDROID_UA } });
  if (!capRes.ok) throw new Error(`Caption fetch error: ${capRes.status}`);

  const xml = await capRes.text();
  const subtitles = parseCaptions(xml);

  return { title, description, channelName, lengthSeconds, viewCount, subtitles, availableLanguages };
}

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
  return [
    h.toString().padStart(2, "0"),
    m.toString().padStart(2, "0"),
    s.toString().padStart(2, "0"),
  ].join(":") + `,${ms.toString().padStart(3, "0")}`;
}

// ─── MCP Server ───

const server = new McpServer({
  name: "utuby",
  version: "1.0.0",
});

// Tool: get_transcript
server.tool(
  "get_transcript",
  "Extract the full transcript from a YouTube video. Returns clean flowing text optimized for LLM consumption, along with video metadata. Accepts any YouTube URL format.",
  {
    url: z.string().describe("YouTube video URL (any format: watch, shorts, embed, youtu.be, etc.)"),
    lang: z.string().default("en").describe("Preferred caption language code (default: 'en')"),
    format: z.enum(["clean", "timestamped", "srt"]).default("clean").describe("Output format: 'clean' (flowing paragraphs for LLM), 'timestamped' (with timestamps), 'srt' (SubRip format)"),
  },
  async ({ url, lang, format }) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return {
        content: [{ type: "text", text: "Invalid YouTube URL. Supported formats: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/embed/" }],
        isError: true,
      };
    }

    const result = await extractTranscript(videoId, lang);

    if (!result.subtitles || result.subtitles.length === 0) {
      const langHint = result.availableLanguages.length > 0
        ? `. Available languages: ${result.availableLanguages.map((l) => l.code).join(", ")}`
        : "";
      return {
        content: [{ type: "text", text: `No captions found for this video${langHint}` }],
        isError: true,
      };
    }

    let output;

    if (format === "timestamped") {
      const lines = result.subtitles.map((sub) => `[${formatTimestamp(sub.start)}] ${sub.text}`);
      const header = result.title ? `${result.title}\n${"=".repeat(result.title.length)}\n\n` : "";
      output = header + lines.join("\n");
    } else if (format === "srt") {
      output = result.subtitles
        .map((sub, i) => {
          const startSec = parseFloat(sub.start);
          const endSec = startSec + parseFloat(sub.dur);
          return `${i + 1}\n${formatSrtTime(startSec)} --> ${formatSrtTime(endSec)}\n${sub.text}`;
        })
        .join("\n\n");
    } else {
      // Clean format — optimized for LLM consumption
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
      lines.push("");
      lines.push(text);
      output = lines.join("\n");
    }

    return { content: [{ type: "text", text: output }] };
  }
);

// Tool: get_video_info
server.tool(
  "get_video_info",
  "Get metadata about a YouTube video without the full transcript. Returns title, description, channel, duration, view count, and available caption languages.",
  {
    url: z.string().describe("YouTube video URL"),
  },
  async ({ url }) => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return {
        content: [{ type: "text", text: "Invalid YouTube URL." }],
        isError: true,
      };
    }

    const result = await extractTranscript(videoId);

    const info = [];
    info.push(`Title: ${result.title || "Unknown"}`);
    if (result.channelName) info.push(`Channel: ${result.channelName}`);
    info.push(`URL: https://youtube.com/watch?v=${videoId}`);
    if (result.lengthSeconds) info.push(`Duration: ${formatDuration(result.lengthSeconds)}`);
    if (result.viewCount) info.push(`Views: ${parseInt(result.viewCount).toLocaleString()}`);
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

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
