"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <span className="text-7xl font-[family-name:var(--font-display)] italic bg-gradient-to-b from-white/80 to-violet-300/30 bg-clip-text text-transparent">
          404
        </span>
        <p className="text-sm text-muted-foreground/50">
          This page doesn&apos;t exist.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-2 border-white/[0.08] bg-white/[0.02]">
          <Link href="/">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Utuby
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
