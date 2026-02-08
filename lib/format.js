/**
 * Format seconds to HH:MM:SS or MM:SS timestamp.
 */
export function formatTimestamp(seconds) {
  const num = parseFloat(seconds);
  if (isNaN(num) || num < 0) return "0:00";

  const h = Math.floor(num / 3600);
  const m = Math.floor((num % 3600) / 60);
  const s = Math.floor(num % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Convert subtitles array to plain text with timestamps.
 */
export function subtitlesToText(subtitles, title = "") {
  const lines = subtitles.map(
    (sub) => `[${formatTimestamp(sub.start)}] ${sub.text}`
  );

  const header = title ? `${title}\n${"=".repeat(title.length)}\n\n` : "";
  return header + lines.join("\n");
}

/**
 * Convert subtitles to clean flowing text optimized for LLM consumption.
 * Strips timestamps, merges lines into paragraphs, prepends video context.
 */
export function subtitlesToClean(subtitles, title = "", videoId = "") {
  const text = subtitles
    .map((sub) => sub.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const lines = [];
  if (title) lines.push(`Video: "${title}"`);
  if (videoId) lines.push(`Source: https://youtube.com/watch?v=${videoId}`);
  if (lines.length) lines.push("");

  lines.push(text);
  return lines.join("\n");
}

/**
 * Convert subtitles array to SRT format.
 */
export function subtitlesToSrt(subtitles) {
  return subtitles
    .map((sub, index) => {
      const startSeconds = parseFloat(sub.start);
      const duration = parseFloat(sub.dur);
      const endSeconds = startSeconds + duration;

      return `${index + 1}\n${formatSrtTime(startSeconds)} --> ${formatSrtTime(endSeconds)}\n${sub.text}`;
    })
    .join("\n\n");
}

/**
 * Format seconds to SRT time format: HH:MM:SS,mmm
 */
function formatSrtTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds % 1) * 1000);

  return [
    h.toString().padStart(2, "0"),
    m.toString().padStart(2, "0"),
    s.toString().padStart(2, "0"),
  ].join(":") + `,${ms.toString().padStart(3, "0")}`;
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content, filename, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
