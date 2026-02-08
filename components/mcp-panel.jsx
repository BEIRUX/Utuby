"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Terminal, Cpu, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { label: "Clone & install", command: "git clone https://github.com/BEIRUX/Utuby.git && cd Utuby && bun i" },
  { label: "Add to Claude Code", command: "claude mcp add utuby -- node ./mcp/server.mjs" },
];

export function McpPanel() {
  const [copiedIdx, setCopiedIdx] = useState(null);

  async function handleCopy(text, idx) {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="w-full"
    >
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] via-transparent to-fuchsia-500/[0.02] pointer-events-none" />

        {/* Header */}
        <div className="relative border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Cpu className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground/90">LLM Integration</h3>
              <p className="text-[10px] text-muted-foreground/40">Model Context Protocol</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative space-y-4 px-5 py-4">
          <p className="text-xs leading-relaxed text-foreground/60">
            Connect your AI directly to Utuby. Extract transcripts and video details without a browser — straight from your terminal.
          </p>

          {/* Features */}
          <div className="space-y-2.5">
            <Feature
              icon={<Zap className="h-3 w-3" />}
              text="Clean transcripts sized for LLM context windows"
            />
            <Feature
              icon={<Terminal className="h-3 w-3" />}
              text="Works with Claude Code, Claude Desktop, and any MCP client"
            />
            <Feature
              icon={<ArrowRight className="h-3 w-3" />}
              text="Video metadata, multi-language captions, and token estimates"
            />
          </div>

          {/* Setup steps */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-medium text-foreground/50">
              Quick setup
            </p>
            {STEPS.map((step, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[9px] font-medium text-violet-300/80">
                    {i + 1}
                  </span>
                  <span className="text-[10px] text-foreground/40">{step.label}</span>
                </div>
                <div className="group relative rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 pr-9">
                  <code className="block text-[10.5px] leading-relaxed text-violet-300/80 font-mono break-all">
                    {step.command}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(step.command, i)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-muted-foreground/30 hover:text-violet-300 hover:bg-violet-500/[0.08] opacity-60 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedIdx === i ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Available tools */}
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-foreground/50">
              6 tools your LLM gets
            </p>
            <div className="space-y-1.5">
              <ToolBadge
                name="get_transcript"
                desc="Full transcript — clean, summary, timestamped, or SRT"
              />
              <ToolBadge
                name="get_video_info"
                desc="Metadata, chapters, duration, captions"
              />
              <ToolBadge
                name="search_transcript"
                desc="Search within a transcript — returns matching segments"
              />
              <ToolBadge
                name="get_transcripts"
                desc="Batch extract from multiple videos at once"
              />
              <ToolBadge
                name="get_playlist"
                desc="Extract all transcripts from a playlist"
              />
              <ToolBadge
                name="get_comments"
                desc="Fetch top comments for sentiment analysis"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Feature({ icon, text }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-500/8 text-violet-400/60">
        {icon}
      </div>
      <span className="text-[11px] leading-relaxed text-foreground/50">{text}</span>
    </div>
  );
}

function ToolBadge({ name, desc }) {
  return (
    <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
      <code className="text-[11px] font-mono text-violet-300/70">{name}</code>
      <p className="mt-0.5 text-[10px] text-muted-foreground/40">{desc}</p>
    </div>
  );
}
