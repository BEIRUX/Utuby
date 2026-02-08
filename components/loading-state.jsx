"use client";

import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl mx-auto space-y-6"
    >
      {/* Video preview skeleton */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent" />
        <div className="relative flex gap-4">
          <Skeleton className="h-24 w-40 shrink-0 rounded-lg bg-white/[0.06]" />
          <div className="flex-1 space-y-3 py-1">
            <Skeleton className="h-5 w-3/4 bg-white/[0.06]" />
            <Skeleton className="h-4 w-1/2 bg-white/[0.06]" />
            <Skeleton className="h-4 w-1/4 bg-white/[0.06]" />
          </div>
        </div>
      </div>

      {/* Transcript skeleton */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent" />
        <div className="relative space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-6 w-32 bg-white/[0.06]" />
            <Skeleton className="h-6 w-20 bg-white/[0.06]" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-4 w-14 shrink-0 bg-white/[0.06]" />
              <Skeleton
                className="h-4 bg-white/[0.06]"
                style={{ width: `${55 + Math.random() * 40}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pulsing indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/60">
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="h-2 w-2 rounded-full bg-violet-500/60"
        />
        <span>Extracting transcript...</span>
      </div>
    </motion.div>
  );
}
