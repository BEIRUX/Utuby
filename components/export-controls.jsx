"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Copy, Download, FileText, FileVideo, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  subtitlesToText,
  subtitlesToClean,
  subtitlesToSrt,
  downloadFile,
} from "@/lib/format";

export function ExportControls({ data }) {
  const [copiedLlm, setCopiedLlm] = useState(false);
  const [copiedTs, setCopiedTs] = useState(false);

  const cleanText = useMemo(
    () => subtitlesToClean(data.subtitles, data.title, data.videoId),
    [data.subtitles, data.title, data.videoId]
  );

  const tokenEstimate = useMemo(() => {
    const count = Math.ceil(cleanText.length / 4);
    if (count >= 1000) return `~${(count / 1000).toFixed(1)}k tokens`;
    return `~${count} tokens`;
  }, [cleanText]);

  async function handleCopyLlm() {
    await navigator.clipboard.writeText(cleanText);
    setCopiedLlm(true);
    setTimeout(() => setCopiedLlm(false), 2000);
  }

  async function handleCopyTimestamps() {
    const text = subtitlesToText(data.subtitles, data.title);
    await navigator.clipboard.writeText(text);
    setCopiedTs(true);
    setTimeout(() => setCopiedTs(false), 2000);
  }

  function handleDownloadTxt() {
    const text = subtitlesToText(data.subtitles, data.title);
    const filename = `${sanitizeFilename(data.title || data.videoId)}.txt`;
    downloadFile(text, filename, "text/plain");
  }

  function handleDownloadSrt() {
    const srt = subtitlesToSrt(data.subtitles);
    const filename = `${sanitizeFilename(data.title || data.videoId)}.srt`;
    downloadFile(srt, filename, "text/srt");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="w-full"
    >
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl px-3 py-2.5">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/[0.03] to-transparent pointer-events-none" />

        {/* Primary: Copy for LLM */}
        <Button
          size="sm"
          onClick={handleCopyLlm}
          className="relative bg-violet-600 text-white hover:bg-violet-500 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all"
        >
          {copiedLlm ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5 text-green-300" />
              Copied
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Copy for LLM
            </>
          )}
        </Button>

        {/* Secondary: Copy with Timestamps */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyTimestamps}
          className="border-white/[0.08] bg-white/[0.02] text-foreground/70 hover:border-violet-500/30 hover:bg-violet-500/[0.06] hover:text-violet-300"
        >
          {copiedTs ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5 text-green-400" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copy with Timestamps
            </>
          )}
        </Button>

        {/* Spacer pushes downloads to right */}
        <div className="flex-1" />

        {/* Token estimate */}
        <span className="text-[11px] text-muted-foreground/40 tabular-nums px-1">
          {tokenEstimate}
        </span>

        {/* Download TXT */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadTxt}
          className="text-foreground/50 hover:text-violet-300 hover:bg-violet-500/[0.06] px-2"
          title="Download TXT"
        >
          <FileText className="h-4 w-4" />
          <span className="sr-only">Download TXT</span>
        </Button>

        {/* Download SRT */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadSrt}
          className="text-foreground/50 hover:text-violet-300 hover:bg-violet-500/[0.06] px-2"
          title="Download SRT"
        >
          <FileVideo className="h-4 w-4" />
          <span className="sr-only">Download SRT</span>
        </Button>
      </div>
    </motion.div>
  );
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().slice(0, 80) || "transcript";
}
