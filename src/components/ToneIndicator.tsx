import { ToneAnalysis } from "@/utils/sentimentAnalysis";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { SuggestionPanel } from "@/components/SuggestionPanel";

interface ToneIndicatorProps {
  analysis: ToneAnalysis;
  className?: string;
}

export function ToneIndicator({ analysis, className }: ToneIndicatorProps) {
  const toneColors = {
    positive:
      "bg-tone-positive-light text-tone-positive-foreground border-tone-positive",
    neutral:
      "bg-tone-neutral-light text-tone-neutral-foreground border-tone-neutral",
    negative:
      "bg-tone-negative-light text-tone-negative-foreground border-tone-negative",
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Badge
        variant="outline"
        className={cn(
          "transition-all duration-300 ease-in-out whitespace-nowrap",
          toneColors[analysis.tone]
        )}
      >
        <span className="mr-1">{analysis.emoji}</span>
        {analysis.label}
      </Badge>
      <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden min-w-[120px]">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            analysis.tone === "positive" && "bg-tone-positive",
            analysis.tone === "neutral" && "bg-tone-neutral",
            analysis.tone === "negative" && "bg-tone-negative"
          )}
          style={{ width: `${analysis.confidence * 100}%` }}
        />
      </div>
      {/* Feedback button next to the colored bar */}
      {(analysis.suggestions.length > 0 || analysis.tone === "negative") && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              title="Show feedback"
              aria-label="Show feedback"
              className={cn(
                "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 gap-2 shadow-sm hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
                analysis.tone === "negative"
                  ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300"
                  : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 hover:border-purple-300"
              )}
            >
              {analysis.tone === "negative" ? (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" />
                  <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    strokeWidth="2"
                  />
                </svg>
              )}
              <span>Feedback</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="end"
            className="w-96 p-0 shadow-xl border-purple-200 rounded-xl"
            sideOffset={12}
            collisionPadding={16}
          >
            <SuggestionPanel analysis={analysis} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
