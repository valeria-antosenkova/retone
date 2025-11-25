import { ToneAnalysis } from "@/utils/sentimentAnalysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestionPanelProps {
  analysis: ToneAnalysis;
  className?: string;
}

export function SuggestionPanel({ analysis, className }: SuggestionPanelProps) {
  if (analysis.suggestions.length === 0 && analysis.tone !== "negative") {
    return null;
  }

  const isNegative = analysis.tone === "negative";

  return (
    <div className={cn("overflow-hidden", className)}>
      {/* Header with gradient background */}
      <div
        className={cn(
          "px-5 py-4 border-b",
          isNegative
            ? "bg-gradient-to-r from-red-50 to-red-100/50 border-red-100"
            : "bg-gradient-to-r from-purple-50 to-purple-100/50 border-purple-100"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg",
              isNegative
                ? "bg-red-100 text-red-600"
                : "bg-purple-100 text-purple-600"
            )}
          >
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <h3
              className={cn(
                "text-sm font-semibold",
                isNegative ? "text-red-900" : "text-purple-900"
              )}
            >
              {isNegative ? "Tone Alert" : "Writing Tips"}
            </h3>
            <p
              className={cn(
                "text-xs mt-0.5",
                isNegative ? "text-red-700" : "text-purple-700"
              )}
            >
              {analysis.hint}
            </p>
          </div>
        </div>
      </div>

      {/* Suggestions list */}
      {analysis.suggestions.length > 0 && (
        <div className="px-5 py-4 bg-white">
          <ul className="space-y-3">
            {analysis.suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed"
              >
                <div
                  className={cn(
                    "mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold",
                    isNegative
                      ? "bg-red-100 text-red-600"
                      : "bg-purple-100 text-purple-600"
                  )}
                >
                  {index + 1}
                </div>
                <span className="flex-1">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
