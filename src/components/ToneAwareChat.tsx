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
import { Send, Loader2, Eye, EyeOff } from "lucide-react";
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
import "../pages/style/home.css";

interface Message {
  id: string;
  text: string;
  tone: ToneAnalysis;
  timestamp: string;
  author: string;
  isUser: boolean;
}
/*
    {
      id: 'initial',
      text: 'Hey! How are you doing today?',
      tone: { tone: 'positive', confidence: 0.95, label: 'Positive', emoji: '😊', hint: '', suggestions: [] },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUser: false
    }*/
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
  const { toast } = useToast();
  useEffect(() => {
    if (!room) return;
    // Join the room on mount
    socket.emit("join-room", room, user);

    // Listen for history and new messages
    socket.on("chat-history", (history) => {
      console.log("Received chat-history:", history);
      // Filter out system join messages from chat history
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
    });
    // Listen for user list and user join/leave events
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

    // Cleanup on unmount
    return () => {
      socket.off("chat-history");
      socket.off("new-message");
      socket.off("user-list");
      socket.off("user-joined");
      socket.off("user-left");
      // socket.disconnect(); // optional if you want to keep session persistent
    };
  }, [room]);

  useEffect(() => {
    // Initialize the model on component mount
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

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: input,
      tone: currentAnalysis,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      author: user,
      isUser: true,
    };
    // Update local state immediately
    // setMessages(prev => [...prev, newMessage]);

    // Send directly to server
    socket.emit("send-message", room, newMessage);

    // Update escalation counter
    if (currentAnalysis.tone === "negative") {
      setConsecutiveNegativeCount((prev) => prev + 1);
    } else {
      setConsecutiveNegativeCount(0);
    }
    setInput("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
              <span className="inline-flex items-center px-3 py-1 rounded-md bg-purple-50 text-purple-700 ring-1 ring-purple-100 text-sm font-medium">
                {room}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Connected users indicator */}
            {connectedUsers.length > 0 && (
              <div className="flex items-center gap-2 pr-6 border-r border-border">
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
                          "inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm",
                          isMe
                            ? "bg-sky-50 text-sky-700 font-semibold ring-1 ring-sky-200"
                            : "bg-muted/5 text-muted-foreground"
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
              <Card className="p-4 bg-gradient-to-r from-purple-50/50 to-transparent border-purple-100">
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
            {feedbackMode &&
              consecutiveNegativeCount >= 2 &&
              currentAnalysis.tone === "negative" && (
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
                {/* Inline feedback popover trigger */}
                {/* Inline feedback popover removed — we keep feedback available via the ToneIndicator next to the bar */}
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
