import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface EscalationWarningProps {
  consecutiveNegativeCount: number;
}

export function EscalationWarning({ consecutiveNegativeCount }: EscalationWarningProps) {
  return (
    <Alert variant="destructive" className="border-l-4 border-destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Take a moment to reflect</AlertTitle>
      <AlertDescription>
        {consecutiveNegativeCount === 2 ? (
          <>
            You've sent <strong>{consecutiveNegativeCount} tense messages</strong> in a row. 
            Consider taking a brief pause before continuing this conversation.
          </>
        ) : (
          <>
            This conversation shows signs of escalation (<strong>{consecutiveNegativeCount} consecutive tense messages</strong>). 
            A short break might help you respond more constructively.
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
