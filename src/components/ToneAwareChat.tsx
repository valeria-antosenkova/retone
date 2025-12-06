import { useState, useEffect, useRef } from "react";
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
import {
  Send,
  Loader2,
  Eye,
  EyeOff,
  Download,
  AlertTriangle,
} from "lucide-react";
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

const serverIP = window.location.hostname;
const socket = io("http://"+serverIP+":3001");

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
  const [sleepOnItTimer, setSleepOnItTimer] = useState<number | null>(null);
  const [sleepOnItCountdown, setSleepOnItCountdown] = useState<number>(0);
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const sendMessageNow = (messageText: string, analysis: ToneAnalysis) => {
    const newMessage: Message = {
      id: currentMessageId || Date.now().toString(),
      text: messageText,
      tone: analysis,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      author: user,
      isUser: true,
    };

    socket.emit("send-message", room, newMessage);

    if (analysis.tone === "negative") {
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
      analysis,
      messageText.length
    );

    setInput("");
    setLastInputSnapshot("");
    setEditCount(0);
    setCurrentMessageId("");
    setPendingMessage("");
    setSleepOnItCountdown(0);
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    // Sleep on it mode: delay negative messages by 5 seconds
    if (feedbackMode && currentAnalysis.tone === "negative") {
      setPendingMessage(input);
      setSleepOnItCountdown(5);

      const timer = window.setInterval(() => {
        setSleepOnItCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setSleepOnItTimer(null);
            // Send the message after countdown
            sendMessageNow(input, currentAnalysis);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setSleepOnItTimer(timer);
    } else {
      // Send immediately for non-negative messages
      sendMessageNow(input, currentAnalysis);
    }
  };

  const handleCancelSend = () => {
    if (sleepOnItTimer) {
      clearInterval(sleepOnItTimer);
      setSleepOnItTimer(null);
    }
    setSleepOnItCountdown(0);
    setPendingMessage("");

    toast({
      title: "Message cancelled",
      description: "Take your time to reconsider your message.",
    });
  };

  const handleSendNow = () => {
    if (sleepOnItTimer) {
      clearInterval(sleepOnItTimer);
      setSleepOnItTimer(null);
    }

    if (pendingMessage) {
      sendMessageNow(pendingMessage, currentAnalysis);
    }
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
      <header className="border-b bg-gradient-to-r from-white via-blue-50/30 to-white backdrop-blur-sm shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Left: Branding & Room */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">
                  <a
                    href="/"
                    style={{ fontVariant: "small-caps" }}
                    className="text-gray-900"
                  >
                    Re-
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Tone
                    </span>
                  </a>
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Room:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-semibold shadow-sm">
                    {room}
                  </span>
                </div>
              </div>

              {/* Connected Users */}
              {connectedUsers.length > 0 && (
                <div className="flex items-center gap-2 pl-6 border-l border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-medium text-gray-600">
                      {connectedUsers.length} online
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {connectedUsers.map((uname) => {
                      const name = uname || "Host";
                      const isMe = name === user;
                      return (
                        <div
                          key={name}
                          title={isMe ? `${name} (you)` : name}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                            isMe
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              isMe ? "bg-white" : "bg-green-500"
                            )}
                          />
                          <span className="max-w-[100px] truncate">
                            {isMe ? "You" : name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 shadow-sm">
                {feedbackMode ? (
                  <Eye className="h-3.5 w-3.5 text-blue-600" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-gray-400" />
                )}
                <Label
                  htmlFor="feedback-mode"
                  className="text-xs font-medium text-gray-700 cursor-pointer"
                >
                  {feedbackMode ? "Feedback On" : "Feedback Off"}
                </Label>
                <Switch
                  id="feedback-mode"
                  checked={feedbackMode}
                  onCheckedChange={setFeedbackMode}
                />
              </div>

              {/* Export Button */}
              <Button
                onClick={handleExportData}
                variant="outline"
                size="sm"
                className="gap-2 h-9 px-3 bg-white hover:bg-gray-50 border-gray-200 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Export</span>
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
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </Card>

          {/* Input Area */}
          <div className="space-y-3">
            {/* Sleep on it countdown */}
            {sleepOnItCountdown > 0 && (
              <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-md animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center">
                      <svg className="h-12 w-12 -rotate-90">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          className="text-amber-200"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 20}`}
                          strokeDashoffset={`${
                            2 * Math.PI * 20 * (1 - sleepOnItCountdown / 5)
                          }`}
                          className="text-amber-600 transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute text-lg font-bold text-amber-700">
                        {sleepOnItCountdown}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">
                        Sleep on it...
                      </p>
                      <p className="text-xs text-amber-700">
                        Taking a moment before sending this message
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSendNow}
                      size="sm"
                      variant="outline"
                      className="border-amber-300 hover:bg-amber-100 text-amber-900 font-medium"
                    >
                      Send Now
                    </Button>
                    <Button
                      onClick={handleCancelSend}
                      size="sm"
                      variant="outline"
                      className="border-red-300 hover:bg-red-50 text-red-700 font-medium"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Beautiful Input Box with Inline Tone Indicator */}
            <Card className="p-5 shadow-lg border-gray-200/60 backdrop-blur-sm bg-white/95 relative overflow-hidden group hover:shadow-xl transition-shadow duration-300">
              {/* Subtle gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="flex gap-4 relative z-10">
                <div className="flex-1 space-y-3">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message here..."
                    className="min-h-[80px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 bg-transparent placeholder:text-gray-400 text-gray-900 outline-none"
                    disabled={isModelLoading}
                  />

                  {/* Always show separator and tone indicator area */}
                  <div className="pt-3 border-t border-gray-100">
                    {feedbackMode && !isModelLoading ? (
                      <div className="animate-in slide-in-from-top-2 duration-300">
                        <ToneIndicator
                          analysis={currentAnalysis}
                          className="w-full"
                          showEscalation={true}
                          consecutiveNegativeCount={consecutiveNegativeCount}
                        />
                      </div>
                    ) : (
                      <div className="h-8 flex items-center">
                        <span className="text-xs text-gray-400">
                          {isModelLoading ? "Loading..." : "Feedback is off"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Refined send button */}
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  disabled={
                    !input.trim() || isModelLoading || sleepOnItCountdown > 0
                  }
                  className={cn(
                    "h-11 w-11 shrink-0 rounded-full shadow-md transition-all duration-300",
                    "hover:shadow-lg hover:scale-105 active:scale-95",
                    "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                    "disabled:from-gray-300 disabled:to-gray-400"
                  )}
                  title="Send message"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Elegant loading overlay */}
              {isModelLoading && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center rounded-lg animate-in fade-in duration-200">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">
                      Loading analysis...
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
