"use client";

import { useState, useCallback } from "react";
import { isValidYouTubeUrl } from "@/lib/youtube";
import { ERROR_MESSAGES, ERROR_CODES } from "@/lib/constants";

export function useTranscript() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTranscript = useCallback(async (url, lang = "en") => {
    if (!isValidYouTubeUrl(url)) {
      setError({
        message: ERROR_MESSAGES[ERROR_CODES.INVALID_URL],
        code: ERROR_CODES.INVALID_URL,
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, lang }),
      });

      const result = await response.json();

      if (!result.success) {
        setError({
          message: result.error,
          code: result.code,
        });
        return;
      }

      setData(result.data);
    } catch (err) {
      setError({
        message: "Something went wrong. Please check your connection and try again.",
        code: "NETWORK_ERROR",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, fetchTranscript, reset };
}
