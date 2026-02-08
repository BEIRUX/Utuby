"use client";

import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, ChevronDown, ChevronUp, List, AlignLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatTimestamp } from "@/lib/format";

export function TranscriptViewer({ subtitles }) {
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState("timestamps"); // "timestamps" | "paragraph"
  const containerRef = useRef(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return subtitles;
    const q = search.toLowerCase();
    return subtitles.filter((sub) => sub.text.toLowerCase().includes(q));
  }, [subtitles, search]);

  const displayed = isExpanded ? filtered : filtered.slice(0, 50);
  const hasMore = filtered.length > 50 && !isExpanded;

  const paragraphText = useMemo(() => {
    const subs = search.trim() ? filtered : subtitles;
    return subs.map((sub) => sub.text).join(" ").replace(/\s+/g, " ").trim();
  }, [subtitles, filtered, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="w-full"
    >
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent pointer-events-none" />

        {/* Header */}
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-foreground/80">Transcript</h3>
            <span className="text-[10px] text-muted-foreground/40 bg-white/[0.04] px-2 py-0.5 rounded-full">
              {filtered.length} / {subtitles.length}
            </span>

            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
              <button
                onClick={() => setViewMode("timestamps")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-all ${
                  viewMode === "timestamps"
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-muted-foreground/40 hover:text-muted-foreground/60"
                }`}
                title="Timestamped lines"
              >
                <List className="h-3 w-3" />
                Lines
              </button>
              <button
                onClick={() => setViewMode("paragraph")}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-all ${
                  viewMode === "paragraph"
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-muted-foreground/40 hover:text-muted-foreground/60"
                }`}
                title="Clean paragraph view"
              >
                <AlignLeft className="h-3 w-3" />
                Paragraph
              </button>
            </div>
          </div>

          {/* Search within transcript */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search transcript..."
              className="h-8 border-white/[0.06] bg-white/[0.03] pl-8 text-xs placeholder:text-muted-foreground/30 focus-visible:ring-violet-500/30"
            />
          </div>
        </div>

        {/* Transcript content */}
        <div
          ref={containerRef}
          className="relative max-h-[32rem] overflow-y-auto px-4 py-2 scrollbar-thin"
        >
          {viewMode === "paragraph" ? (
            /* Paragraph view */
            paragraphText ? (
              <p className="text-sm leading-relaxed text-foreground/70 whitespace-pre-wrap">
                {paragraphText}
              </p>
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground/40">
                No matching lines found
              </div>
            )
          ) : (
            /* Timestamped lines view */
            <>
              {displayed.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground/40">
                  No matching lines found
                </div>
              ) : (
                <div className="space-y-0.5">
                  {displayed.map((sub, i) => (
                    <motion.div
                      key={`${sub.start}-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.5) }}
                      className="group flex gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/[0.03]"
                    >
                      <button
                        onClick={() => {
                          window.open(
                            `https://youtube.com/watch?v=${new URLSearchParams(window.location.search).get("v") || ""}&t=${Math.floor(parseFloat(sub.start))}`,
                            "_blank"
                          );
                        }}
                        className="shrink-0 pt-0.5 text-[10px] font-mono text-violet-400/60 tabular-nums transition-colors hover:text-violet-300 w-12 text-right"
                      >
                        {formatTimestamp(sub.start)}
                      </button>
                      <span className="text-sm leading-relaxed text-foreground/70 group-hover:text-foreground/90 transition-colors">
                        {sub.text}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}

              {hasMore && (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] py-2.5 text-xs text-muted-foreground/50 transition-all hover:border-violet-500/20 hover:text-violet-400"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show all {filtered.length} lines
                </button>
              )}

              {isExpanded && filtered.length > 50 && (
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] py-2.5 text-xs text-muted-foreground/50 transition-all hover:border-violet-500/20 hover:text-violet-400"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  Collapse
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
