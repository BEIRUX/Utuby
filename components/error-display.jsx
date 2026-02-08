"use client";

import { motion } from "framer-motion";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorDisplay({ error, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="relative overflow-hidden rounded-xl border border-red-500/20 bg-red-500/[0.04] p-6 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.05] to-transparent" />
        <div className="relative flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-medium text-red-300">
              {error?.code === "NO_CAPTIONS"
                ? "No Captions Available"
                : "Something Went Wrong"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {error?.message || "An unexpected error occurred."}
            </p>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-2 border-red-500/20 text-red-300 hover:bg-red-500/10 hover:text-red-200"
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
