import { ToneAnalysis } from '@/utils/sentimentAnalysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionPanelProps {
  analysis: ToneAnalysis;
  className?: string;
}

export function SuggestionPanel({ analysis, className }: SuggestionPanelProps) {
  if (analysis.suggestions.length === 0 && analysis.tone !== 'negative') {
    return null;
  }

  return (
    <Card className={cn('border-l-4 transition-all duration-300', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          {analysis.hint}
        </CardTitle>
      </CardHeader>
      {analysis.suggestions.length > 0 && (
        <CardContent className="pt-0">
          <ul className="space-y-2">
            {analysis.suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <span className="text-primary mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
