import { ToneAnalysis } from '@/utils/sentimentAnalysis';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ToneIndicatorProps {
  analysis: ToneAnalysis;
  className?: string;
}

export function ToneIndicator({ analysis, className }: ToneIndicatorProps) {
  const toneColors = {
    positive: 'bg-tone-positive-light text-tone-positive-foreground border-tone-positive',
    neutral: 'bg-tone-neutral-light text-tone-neutral-foreground border-tone-neutral',
    negative: 'bg-tone-negative-light text-tone-negative-foreground border-tone-negative',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge
        variant="outline"
        className={cn(
          'transition-all duration-300 ease-in-out',
          toneColors[analysis.tone]
        )}
      >
        <span className="mr-1">{analysis.emoji}</span>
        {analysis.label}
      </Badge>
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500 ease-out',
            analysis.tone === 'positive' && 'bg-tone-positive',
            analysis.tone === 'neutral' && 'bg-tone-neutral',
            analysis.tone === 'negative' && 'bg-tone-negative'
          )}
          style={{ width: `${analysis.confidence * 100}%` }}
        />
      </div>
    </div>
  );
}
