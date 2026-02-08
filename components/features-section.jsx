"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Captions,
  Globe,
  Search,
  ListVideo,
  MessageSquareText,
  Timer,
  FileDown,
} from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "LLM-Ready Output",
    desc: "Clean, flowing text stripped of timestamps — sized for context windows",
  },
  {
    icon: Captions,
    title: "Multiple Formats",
    desc: "Timestamped, clean paragraph, SRT, or summarized by chapter",
  },
  {
    icon: Globe,
    title: "Multi-Language",
    desc: "Extract captions in any available language on the video",
  },
  {
    icon: Search,
    title: "Transcript Search",
    desc: "Find exact moments — search within any transcript instantly",
  },
  {
    icon: ListVideo,
    title: "Batch & Playlists",
    desc: "Extract from multiple videos or entire playlists at once",
  },
  {
    icon: MessageSquareText,
    title: "Comment Extraction",
    desc: "Pull top comments for sentiment analysis and research",
  },
  {
    icon: Timer,
    title: "Token Estimates",
    desc: "Know exactly how much context a transcript will consume",
  },
  {
    icon: FileDown,
    title: "TXT & SRT Export",
    desc: "Download transcripts as plain text or subtitle files",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function FeaturesSection() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full"
    >
      <p className="mb-4 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/30">
        What you get
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {FEATURES.map((f) => (
          <motion.div
            key={f.title}
            variants={item}
            className="group relative overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5 backdrop-blur transition-all hover:border-violet-500/20 hover:bg-white/[0.04]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
            <div className="relative">
              <div className="mb-2.5 flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400/70 border border-violet-500/10">
                <f.icon className="h-3.5 w-3.5" />
              </div>
              <h4 className="text-[12px] font-medium text-foreground/80 leading-tight">
                {f.title}
              </h4>
              <p className="mt-1 text-[10.5px] leading-snug text-muted-foreground/40">
                {f.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
