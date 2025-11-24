import { ToneType } from '@/utils/sentimentAnalysis';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MessageBubbleProps {
  message: string;
  tone: ToneType;
  timestamp: string;
  author: string
  isUser?: boolean;
  showTone?: boolean;
}

export function MessageBubble({ message, tone, timestamp, author, isUser = false, showTone = true }: MessageBubbleProps) {
  const bgColors = {
    positive: isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
    neutral: isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
    negative: isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
  };

  return (
    <div className={cn('flex gap-3 mb-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
          {author ? author.charAt(0) : "RC"}
        </AvatarFallback>
      </Avatar>
      <div className={cn('flex flex-col gap-1 max-w-[70%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'px-4 py-2 rounded-2xl break-words',
            bgColors[tone],
            isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message}</p>
        </div>
        <span className="text-xs text-muted-foreground px-2">{timestamp}</span>
      </div>
    </div>
  );
}
