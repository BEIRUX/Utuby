"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Captions, ExternalLink } from "lucide-react";

export function VideoPreview({ data }) {
  const [imgError, setImgError] = useState(false);

  const thumbnailUrl = imgError
    ? `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`
    : data.thumbnail;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <div className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 backdrop-blur-xl transition-all hover:border-white/[0.1]">
        {/* Subtle gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.04] to-fuchsia-500/[0.02] opacity-0 transition-opacity group-hover:opacity-100" />

        <div className="relative flex flex-col sm:flex-row gap-4">
          {/* Thumbnail */}
          <a
            href={`https://youtube.com/watch?v=${data.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block shrink-0 overflow-hidden rounded-lg sm:w-40 aspect-video bg-white/[0.03]"
          >
            <Image
              src={thumbnailUrl}
              alt={data.title || "Video thumbnail"}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
              unoptimized
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
              <ExternalLink className="h-5 w-5 text-white" />
            </div>
          </a>

          {/* Info */}
          <div className="flex flex-col justify-center gap-2 min-w-0">
            <h2 className="text-sm font-medium leading-snug text-foreground/90 line-clamp-2">
              {data.title || "Untitled Video"}
            </h2>
            {data.description && (
              <p className="text-xs text-muted-foreground/60 line-clamp-2">
                {data.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="secondary"
                className="bg-violet-500/10 text-violet-300 border-violet-500/20 text-[10px] uppercase tracking-wider"
              >
                <Captions className="mr-1 h-3 w-3" />
                {data.lang || "en"}
              </Badge>
              <span className="text-[10px] text-muted-foreground/40">
                {data.subtitles.length} segments
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
