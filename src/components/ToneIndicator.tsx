import { ToneAnalysis } from "@/utils/sentimentAnalysis";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { SuggestionPanel } from "@/components/SuggestionPanel";
import { AlertTriangle } from "lucide-react";

interface ToneIndicatorProps {
  analysis: ToneAnalysis;
  className?: string;
  showEscalation?: boolean;
  consecutiveNegativeCount?: number;
}

export function ToneIndicator({
  analysis,
  className,
  showEscalation = false,
  consecutiveNegativeCount = 0,
}: ToneIndicatorProps) {
  const toneColors = {
    positive:
      "bg-tone-positive-light text-tone-positive-foreground border-tone-positive",
    neutral:
      "bg-tone-neutral-light text-tone-neutral-foreground border-tone-neutral",
    negative:
      "bg-tone-negative-light text-tone-negative-foreground border-tone-negative",
  };

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {/* Elegant inline display */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Animated emoji with subtle glow */}
        <div className="relative group">
          <span
            className={cn(
              "text-xl transition-all duration-300 ease-out inline-block",
              "group-hover:scale-110"
            )}
            title={analysis.label}
          >
            {analysis.emoji}
          </span>
          {analysis.tone === "negative" && (
            <span className="absolute inset-0 blur-md opacity-30 bg-red-400 rounded-full animate-pulse" />
          )}
        </div>

        {/* Smooth gradient progress bar */}
        <div className="flex-1 h-2 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full overflow-hidden shadow-inner min-w-[100px] max-w-[140px]">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out rounded-full",
              "shadow-sm",
              analysis.tone === "positive" &&
                "bg-gradient-to-r from-green-400 to-emerald-500",
              analysis.tone === "neutral" &&
                "bg-gradient-to-r from-blue-400 to-cyan-500",
              analysis.tone === "negative" &&
                "bg-gradient-to-r from-red-400 to-rose-500"
            )}
            style={{ width: `${analysis.confidence * 100}%` }}
          />
        </div>

        {/* Refined emotion label with fade-in */}
        {analysis.emotion && (
          <span className="text-xs font-medium text-gray-600 capitalize px-2 py-1 bg-gray-50 rounded-full border border-gray-200 animate-in fade-in duration-300">
            {analysis.emotion}
          </span>
        )}

        {/* Compact escalation warning - inline */}
        {showEscalation && consecutiveNegativeCount >= 2 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 animate-in fade-in duration-300">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
            <span className="text-xs font-medium text-red-700 whitespace-nowrap">
              {consecutiveNegativeCount} tense in a row
            </span>
          </div>
        )}

        {/* Enhanced feedback button with label */}
        {(analysis.suggestions.length > 0 || analysis.tone === "negative") && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                title={
                  analysis.tone === "negative"
                    ? "Review suggestions"
                    : "View insights"
                }
                aria-label="Feedback"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300",
                  "hover:scale-105 active:scale-95",
                  "shadow-sm hover:shadow-md",
                  "text-xs font-medium",
                  analysis.tone === "negative"
                    ? "text-red-700 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border border-red-200"
                    : "text-blue-700 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border border-blue-200"
                )}
              >
                <svg
                  className="h-3.5 w-3.5 transition-transform duration-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span>Feedback</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="end"
              className="w-80 p-0 shadow-xl border rounded-xl animate-in slide-in-from-bottom-2 duration-200"
              sideOffset={10}
            >
              <SuggestionPanel analysis={analysis} />
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Elegant collapsible details */}
      {analysis.modelName && (
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 transition-colors duration-200 list-none flex items-center gap-1.5 select-none">
            <svg
              className="h-3 w-3 transition-transform duration-200 group-open:rotate-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="font-medium">Analysis Details</span>
          </summary>
          <div className="mt-2 pl-5 text-xs text-gray-500 space-y-1 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Confidence:</span>
              <span className="font-semibold text-gray-700">
                {(analysis.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Model:</span>
              <span className="font-mono text-xs text-gray-600">
                {analysis.modelName.replace(/\s*\(.*?\)\s*/g, "").trim()}
              </span>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
