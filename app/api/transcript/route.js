import { extractTranscript } from "@/lib/extractor";
import { extractVideoId } from "@/lib/youtube";
import { ERROR_CODES, ERROR_MESSAGES, RATE_LIMIT } from "@/lib/constants";

export const runtime = "nodejs";

// In-memory rate limiting
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  // Clean stale entry
  if (entry && now - entry.windowStart > RATE_LIMIT.WINDOW_MS) {
    rateLimitMap.delete(ip);
  }

  const current = rateLimitMap.get(ip);
  if (!current) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }

  if (current.count >= RATE_LIMIT.MAX_REQUESTS) {
    return true;
  }

  current.count++;
  return false;
}

export async function POST(request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (checkRateLimit(ip)) {
      return Response.json(
        {
          success: false,
          error: ERROR_MESSAGES[ERROR_CODES.RATE_LIMITED],
          code: ERROR_CODES.RATE_LIMITED,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { url, lang = "en" } = body;

    const videoId = extractVideoId(url);
    if (!videoId) {
      return Response.json(
        {
          success: false,
          error: ERROR_MESSAGES[ERROR_CODES.INVALID_URL],
          code: ERROR_CODES.INVALID_URL,
        },
        { status: 400 }
      );
    }

    const result = await extractTranscript(videoId, lang);

    if (!result.subtitles || result.subtitles.length === 0) {
      return Response.json(
        {
          success: false,
          error: ERROR_MESSAGES[ERROR_CODES.NO_CAPTIONS],
          code: ERROR_CODES.NO_CAPTIONS,
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: {
        videoId,
        title: result.title,
        description: result.description,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        subtitles: result.subtitles,
        lang,
      },
    });
  } catch (error) {
    console.error("Transcript extraction error:", error);

    return Response.json(
      {
        success: false,
        error: ERROR_MESSAGES[ERROR_CODES.EXTRACTION_FAILED],
        code: ERROR_CODES.EXTRACTION_FAILED,
      },
      { status: 500 }
    );
  }
}
