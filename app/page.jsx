"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UrlInput } from "@/components/url-input";
import { VideoPreview } from "@/components/video-preview";
import { TranscriptViewer } from "@/components/transcript-viewer";
import { ExportControls } from "@/components/export-controls";
import { LoadingState } from "@/components/loading-state";
import { ErrorDisplay } from "@/components/error-display";
import { McpPanel } from "@/components/mcp-panel";
import { FeaturesSection } from "@/components/features-section";
import { Footer } from "@/components/footer";
import { useTranscript } from "@/hooks/use-transcript";

/* ── Floating background orbs ── */
function BackgroundOrbs() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Primary violet orb — top-right */}
      <div
        className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,1) 0%, rgba(139,92,246,0) 70%)",
          animation: "orb-drift 20s ease-in-out infinite",
        }}
      />
      {/* Secondary fuchsia orb — bottom-left */}
      <div
        className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full opacity-[0.05]"
        style={{
          background:
            "radial-gradient(circle, rgba(192,38,211,1) 0%, rgba(192,38,211,0) 70%)",
          animation: "orb-drift-reverse 25s ease-in-out infinite",
        }}
      />
      {/* Small accent orb — center */}
      <div
        className="absolute left-1/2 top-1/3 h-[300px] w-[300px] -translate-x-1/2 rounded-full opacity-[0.04]"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,1) 0%, rgba(99,102,241,0) 70%)",
          animation: "orb-drift 18s ease-in-out infinite 5s",
        }}
      />
      {/* Faint grid lines for depth */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
    </div>
  );
}

/* ── Brand mark ── */
function BrandHero({ hasResults }) {
  return (
    <motion.div
      layout
      className="flex flex-col items-center"
      animate={{
        paddingTop: hasResults ? "2rem" : "0",
        paddingBottom: hasResults ? "1.5rem" : "0",
      }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.h1
        layout
        className="font-[family-name:var(--font-display)] italic tracking-tight text-center"
        animate={{
          fontSize: hasResults ? "2rem" : "clamp(3rem, 8vw, 5.5rem)",
        }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <span
          className="bg-gradient-to-b from-white via-white/90 to-violet-200/60 bg-clip-text text-transparent"
          style={{
            filter: "drop-shadow(0 0 40px rgba(139,92,246,0.2))",
          }}
        >
          Utuby
        </span>
      </motion.h1>

      <AnimatePresence>
        {!hasResults && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10, height: 0, marginTop: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-4 text-sm tracking-wide text-muted-foreground/50"
          >
            Extract YouTube transcripts instantly
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main page ── */
export default function Home() {
  const { data, isLoading, error, fetchTranscript, reset } = useTranscript();
  const resultsRef = useRef(null);

  const hasResults = !!data;

  function handleSubmit(url) {
    fetchTranscript(url);
  }

  function handleRetry() {
    reset();
  }

  return (
    <main className="noise-overlay relative flex min-h-svh flex-col items-center px-4 sm:px-6">
      <BackgroundOrbs />

      {/* ── Hero + Input ── */}
      <header
        className="flex w-full flex-col items-center"
        style={{ maxWidth: hasResults ? "72rem" : "48rem" }}
      >
        <motion.div
          layout
          className="flex w-full flex-col items-center"
          animate={{
            paddingTop: hasResults ? "2rem" : "min(22vh, 10rem)",
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <BrandHero hasResults={hasResults} />

          <motion.div
            layout
            className="mt-8 w-full max-w-3xl"
            animate={{ marginTop: hasResults ? "0.5rem" : "2rem" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <UrlInput
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onReset={reset}
            />
          </motion.div>
        </motion.div>
      </header>

      {/* ── Landing content (visible before extraction) ── */}
      <AnimatePresence>
        {!hasResults && !isLoading && !error && (
          <motion.section
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            aria-label="Features and integrations"
            className="mt-10 w-full max-w-4xl"
          >
            <div className="flex flex-col lg:flex-row gap-5">
              {/* Left — Features grid */}
              <div className="flex-1 min-w-0">
                <FeaturesSection />
              </div>
              {/* Right — MCP panel */}
              <div className="w-full lg:w-80 shrink-0">
                <McpPanel />
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Results area ── */}
      <section
        ref={resultsRef}
        aria-label="Transcript results"
        className="mt-5 w-full pb-8"
        style={{ maxWidth: hasResults ? "72rem" : "48rem" }}
      >
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto"
            >
              <LoadingState />
            </motion.div>
          )}

          {error && !isLoading && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto"
            >
              <ErrorDisplay error={error} onRetry={handleRetry} />
            </motion.div>
          )}

          {data && !isLoading && !error && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col lg:flex-row gap-5"
            >
              {/* Left — Transcript content */}
              <article className="flex-1 min-w-0 space-y-3">
                <VideoPreview data={data} />
                <ExportControls data={data} />
                <TranscriptViewer subtitles={data.subtitles} />
              </article>

              {/* Right — MCP panel */}
              <aside className="w-full lg:w-80 xl:w-96 shrink-0">
                <div className="lg:sticky lg:top-6">
                  <McpPanel />
                </div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <Footer />
    </main>
  );
}
