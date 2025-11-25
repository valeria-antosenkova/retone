import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EscalationWarningProps {
  consecutiveNegativeCount: number;
}

export function EscalationWarning({
  consecutiveNegativeCount,
}: EscalationWarningProps) {
  return (
    <Alert
      variant="destructive"
      className="border-l-4 border-red-500 bg-gradient-to-r from-red-50 to-red-100/30 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-100">
          <AlertTriangle className="h-5 w-5 text-red-600" />
        </div>
        <div className="flex-1">
          <AlertTitle className="text-red-900 font-semibold mb-1">
            Take a moment to reflect
          </AlertTitle>
          <AlertDescription className="text-red-800">
            {consecutiveNegativeCount === 2 ? (
              <>
                You've sent{" "}
                <strong className="font-semibold">
                  {consecutiveNegativeCount} tense messages
                </strong>{" "}
                in a row. Consider taking a brief pause before continuing this
                conversation.
              </>
            ) : (
              <>
                This conversation shows signs of escalation (
                <strong className="font-semibold">
                  {consecutiveNegativeCount} consecutive tense messages
                </strong>
                ). A short break might help you respond more constructively.
              </>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
