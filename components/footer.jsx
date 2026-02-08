"use client";

import { motion } from "framer-motion";

export function Footer() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="mt-auto pt-12 pb-6 text-center"
    >
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
        <span>Free & open. No ads. No tracking.</span>
        <span className="text-violet-500/40">|</span>
        <a
          href="https://beirux.com"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-violet-400"
        >
          BEIRUX
        </a>
      </div>
    </motion.footer>
  );
}
