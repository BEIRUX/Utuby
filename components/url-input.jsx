"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isValidYouTubeUrl } from "@/lib/youtube";

export function UrlInput({ onSubmit, isLoading, onReset }) {
  const [url, setUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const isValid = url.trim().length === 0 || isValidYouTubeUrl(url);
  const canSubmit = isValidYouTubeUrl(url) && !isLoading;

  function handleSubmit(e) {
    e.preventDefault();
    if (canSubmit) {
      onSubmit(url);
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text");
    if (isValidYouTubeUrl(pasted)) {
      e.preventDefault();
      setUrl(pasted);
      onSubmit(pasted);
    }
  }

  function handleClear() {
    setUrl("");
    onReset?.();
    inputRef.current?.focus();
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        className={`
          relative flex items-center gap-2 rounded-2xl border p-1.5
          backdrop-blur-xl transition-all duration-300
          ${isFocused
            ? "border-violet-500/40 bg-white/[0.05] shadow-[0_0_30px_-5px_rgba(139,92,246,0.15)]"
            : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.12]"
          }
          ${!isValid ? "border-red-500/40" : ""}
        `}
      >
        <div className="flex items-center pl-3">
          <Search className={`h-4 w-4 transition-colors ${isFocused ? "text-violet-400" : "text-muted-foreground/50"}`} />
        </div>

        <Input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Paste a YouTube URL..."
          className="flex-1 border-0 bg-transparent text-sm placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
          disabled={isLoading}
        />

        {url && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <Button
          type="submit"
          disabled={!canSubmit}
          size="sm"
          className="relative rounded-xl bg-violet-600 px-5 text-white hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
            />
          ) : (
            <>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Extract
            </>
          )}
        </Button>
      </div>

      {!isValid && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-center text-xs text-red-400/80"
        >
          Please enter a valid YouTube URL
        </motion.p>
      )}
    </motion.form>
  );
}
