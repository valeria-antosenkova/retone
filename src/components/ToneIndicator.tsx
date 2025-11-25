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
    <div className={cn("flex items-center gap-2", className)}>
      <Badge
        variant="outline"
        className={cn(
          "transition-all duration-300 ease-in-out",
          toneColors[analysis.tone]
        )}
      >
        <span className="mr-1">{analysis.emoji}</span>
        {analysis.label}
      </Badge>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
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
                "inline-flex items-center justify-center rounded-md px-2 py-1 text-sm font-medium focus:outline-none focus-visible:ring-2 gap-2",
                analysis.tone === "negative"
                  ? "bg-tone-negative-light text-tone-negative-foreground border-tone-negative"
                  : "bg-tone-positive-light text-tone-positive-foreground border-tone-positive"
              )}
            >
              {analysis.tone === "negative" ? (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"
                  ></path>
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path strokeWidth="2" d="M9 12l2 2 4-4"></path>
                </svg>
              )}
              {/* Visible title label so users know what the button does */}
              <span className="text-sm font-medium">Show feedback</span>
            </button>
          </PopoverTrigger>
          <PopoverContent side="top">
            <SuggestionPanel analysis={analysis} />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
