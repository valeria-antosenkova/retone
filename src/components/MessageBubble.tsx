import { ToneType } from "@/utils/sentimentAnalysis";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MessageBubbleProps {
  message: string;
  tone: ToneType;
  timestamp: string;
  author: string;
  isUser?: boolean;
  showTone?: boolean;
}

export function MessageBubble({
  message,
  tone,
  timestamp,
  author,
  isUser = false,
  showTone = true,
}: MessageBubbleProps) {
  const bgColors = {
    positive: isUser ? "bg-blue-700 text-white" : "bg-muted text-foreground",
    neutral: isUser ? "bg-blue-700 text-white" : "bg-muted text-foreground",
    negative: isUser ? "bg-blue-700 text-white" : "bg-muted text-foreground",
  };

  return (
    <div
      className={cn(
        "flex gap-3 mb-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={
            isUser ? "bg-blue-700 text-white" : "bg-muted text-muted-foreground"
          }
        >
          {author ? author.charAt(0) : "RC"}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex flex-col gap-1 max-w-[70%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "px-4 py-2 rounded-2xl break-words relative group",
            bgColors[tone],
            isUser ? "rounded-tr-sm" : "rounded-tl-sm"
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message}</p>
        </div>
        <span className="text-xs text-muted-foreground px-2">{timestamp}</span>
      </div>
    </div>
  );
}
