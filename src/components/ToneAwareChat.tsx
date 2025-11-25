import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToneIndicator } from "@/components/ToneIndicator";
import { SuggestionPanel } from "@/components/SuggestionPanel";
import { MessageBubble } from "@/components/MessageBubble";
import { EscalationWarning } from "@/components/EscalationWarning";
import {
  analyzeTone,
  ToneAnalysis,
  initializeSentimentAnalysis,
} from "@/utils/sentimentAnalysis";
import { Send, Loader2, Eye, EyeOff, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { io } from "socket.io-client";
import { metricsTracker } from "@/utils/metricsTracker";
import "../pages/style/home.css";

interface Message {
  id: string;
  text: string;
  tone: ToneAnalysis;
  timestamp: string;
  author: string;
  isUser: boolean;
}

const socket = io("http://localhost:3001");

export function ToneAwareChat() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const room = urlParams.get("room");
  const user = urlParams.get("user");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<ToneAnalysis>({
    tone: "neutral",
    confidence: 0,
    label: "Neutral",
    emoji: "😐",
    hint: "Start typing to see tone analysis",
    suggestions: [],
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [feedbackMode, setFeedbackMode] = useState(true); // true = Feedback Mode, false = Control Mode
  const [consecutiveNegativeCount, setConsecutiveNegativeCount] = useState(0);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [currentMessageId, setCurrentMessageId] = useState<string>("");
  const [lastInputSnapshot, setLastInputSnapshot] = useState("");
  const [editCount, setEditCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (!room) return;

    metricsTracker.createSession(room, true);
    socket.emit("join-room", room, user);

    socket.on("chat-history", (history) => {
      console.log("Received chat-history:", history);
      const filtered = (history || []).filter(
        (h) =>
          !(
            h.author === "System" &&
            typeof h.text === "string" &&
            h.text.includes("joined")
          )
      );
      setMessages(filtered);
    });

    socket.on("new-message", (msg) => {
      if (
        msg.author === "System" &&
        typeof msg.text === "string" &&
        msg.text.includes("joined")
      )
        return;
      setMessages((prev) => [...prev, msg]);

      if (msg.author && msg.id && msg.tone && msg.author !== user) {
        metricsTracker.trackMessage(
          room,
          msg.author,
          msg.id,
          msg.tone,
          msg.text.length
        );
      }
    });

    socket.on("user-list", (users) => {
      setConnectedUsers(users || []);
    });
    socket.on("user-joined", (username) => {
      setConnectedUsers((prev) => {
        if (prev.includes(username)) return prev;
        return [...prev, username];
      });
    });
    socket.on("user-left", (username) => {
      setConnectedUsers((prev) => prev.filter((u) => u !== username));
    });

    return () => {
      socket.off("chat-history");
      socket.off("new-message");
      socket.off("user-list");
      socket.off("user-joined");
      socket.off("user-left");

      if (room) {
        metricsTracker.clearSession(room);
      }
    };
  }, [room, user]);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await initializeSentimentAnalysis();
        setIsModelLoading(false);
        toast({
          title: "Ready!",
          description: "Tone analysis is now active",
        });
      } catch (error) {
        console.error("Failed to load model:", error);
        setIsModelLoading(false);
        toast({
          title: "Error",
          description: "Failed to load tone analysis model",
          variant: "destructive",
        });
      }
    };
    loadModel();
  }, [toast]);

  useEffect(() => {
    if (isModelLoading) return;

    const analyzeText = async () => {
      if (input.trim()) {
        setIsAnalyzing(true);
        const analysis = await analyzeTone(input);
        setCurrentAnalysis(analysis);
        setIsAnalyzing(false);
      } else {
        setCurrentAnalysis({
          tone: "neutral",
          confidence: 0,
          label: "Neutral",
          emoji: "😐",
          hint: "Start typing to see tone analysis",
          suggestions: [],
        });
      }
    };

    const debounceTimer = setTimeout(analyzeText, 300);
    return () => clearTimeout(debounceTimer);
  }, [input, isModelLoading]);

  // Track edits during typing (after 3s pause)
  useEffect(() => {
    if (!input.trim() || !feedbackMode) {
      setLastInputSnapshot("");
      setEditCount(0);
      setCurrentMessageId("");
      return;
    }

    const editDetectionTimer = setTimeout(() => {
      if (lastInputSnapshot && lastInputSnapshot !== input) {
        const newEditCount = editCount + 1;
        setEditCount(newEditCount);

        if (!currentMessageId) {
          const msgId = Date.now().toString();
          setCurrentMessageId(msgId);
        }

        if (currentMessageId) {
          metricsTracker.trackMessageEdit(room, user, currentMessageId);
        }
      }
      setLastInputSnapshot(input);
    }, 3000);

    return () => clearTimeout(editDetectionTimer);
  }, [
    input,
    feedbackMode,
    lastInputSnapshot,
    editCount,
    currentMessageId,
    room,
    user,
  ]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: currentMessageId || Date.now().toString(),
      text: input,
      tone: currentAnalysis,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      author: user,
      isUser: true,
    };

    socket.emit("send-message", room, newMessage);

    if (currentAnalysis.tone === "negative") {
      const newCount = consecutiveNegativeCount + 1;
      setConsecutiveNegativeCount(newCount);

      if (newCount >= 2) {
        metricsTracker.trackEscalation(room, user);
      }
    } else {
      setConsecutiveNegativeCount(0);
    }

    metricsTracker.trackMessage(
      room,
      user,
      newMessage.id,
      currentAnalysis,
      input.length
    );

    setInput("");
    setLastInputSnapshot("");
    setEditCount(0);
    setCurrentMessageId("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExportData = () => {
    if (!room) return;

    metricsTracker.endSession(room);
    metricsTracker.downloadAsJSON(room);
    metricsTracker.downloadAsCSV(room);

    toast({
      title: "Data Exported",
      description:
        "Session metrics have been downloaded as JSON and CSV files.",
    });
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              <a href="/" style={{ fontVariant: "small-caps" }}>
                ReToned Chatroom
              </a>
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Room Code: </span>
              <span className="inline-flex items-center px-3 py-1 rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100 text-sm font-medium">
                {room}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connected users indicator */}
            {connectedUsers.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Connected</span>
                <div className="flex items-center gap-2">
                  {connectedUsers.map((uname) => {
                    const name = uname || "Host";
                    const isMe = name === user;
                    return (
                      <div
                        key={name}
                        title={isMe ? `${name} (you)` : name}
                        aria-current={isMe ? "true" : undefined}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
                          isMe
                            ? "bg-sky-50 text-sky-700 font-semibold ring-1 ring-sky-200"
                            : "bg-muted/50 text-muted-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            isMe ? "bg-sky-500" : "bg-green-500"
                          )}
                        />
                        <span>{isMe ? `${name} (you)` : name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Right-aligned feedback + export */}
            <div className="flex items-center gap-3 pl-5 border-l border-border ml-auto">
              {feedbackMode ? (
                <Eye className="h-4 w-4 text-muted-foreground" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex items-center gap-2">
                <Label htmlFor="feedback-mode" className="text-sm font-medium">
                  {feedbackMode ? "Feedback Mode" : "Control Mode"}
                </Label>
                <Switch
                  id="feedback-mode"
                  checked={feedbackMode}
                  onCheckedChange={setFeedbackMode}
                />
              </div>

              <Button
                onClick={handleExportData}
                variant="outline"
                size="sm"
                className="gap-2 h-9 whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6">
          {/* Messages Area */}
          <Card className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-6">
              <div>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message.text}
                    tone={message.tone.tone}
                    timestamp={message.timestamp}
                    author={message.author}
                    isUser={message.author === user}
                    showTone={feedbackMode}
                  />
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Input Area */}
          <div className="space-y-4">
            {/* Tone Indicator - only show in Feedback Mode */}
            {feedbackMode && (
              <Card className="p-4 bg-gradient-to-r from-blue-50/50 to-transparent border-blue-100">
                {isModelLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading tone analysis...</span>
                  </div>
                ) : (
                  <ToneIndicator
                    analysis={currentAnalysis}
                    className="w-full"
                  />
                )}
              </Card>
            )}

            {/* Escalation Warning - only show in Feedback Mode */}
            {feedbackMode && consecutiveNegativeCount >= 2 && (
              <EscalationWarning
                consecutiveNegativeCount={consecutiveNegativeCount}
              />
            )}

            {/* Input Box */}
            <Card className="p-4 shadow-sm">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message here..."
                  className="min-h-[100px] resize-none"
                  disabled={isModelLoading}
                />
                <div className="relative">
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    disabled={!input.trim() || isModelLoading}
                    className="h-[100px]"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                  {feedbackMode &&
                    !isModelLoading &&
                    (currentAnalysis.suggestions.length > 0 ||
                      currentAnalysis.tone === "negative") && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -top-1 -right-1 h-2 w-2 rounded-full ring-1 ring-background",
                          currentAnalysis.tone === "negative"
                            ? "bg-tone-negative"
                            : "bg-tone-positive"
                        )}
                      />
                    )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
