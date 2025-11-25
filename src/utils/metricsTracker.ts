import { ToneAnalysis } from "./sentimentAnalysis";

export interface MessageMetric {
  id: string;
  userId: string;
  timestamp: number;
  tone: ToneAnalysis;
  messageLength: number;
  timeSinceLastMessage: number; // milliseconds
  timeSinceLastEscalation: number | null; // milliseconds, null if no prior escalation
  isAfterEscalation: boolean;
  wasEdited: boolean;
  editCount: number;
}

export interface UserMetrics {
  userId: string;
  messages: MessageMetric[];
  totalMessages: number;
  editedMessages: number;
  escalationCount: number;
  escalationTimestamps: number[];
  averageToneScore: number; // -1 (negative) to 1 (positive)
  toneScores: number[];
  averageTimePerMessage: number; // milliseconds
  averageTimeAfterEscalation: number; // milliseconds
  generalSlowdownRate: number; // percentage change in typing speed
  postEscalationSlowdownRate: number; // percentage change after escalation
}

export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime: number | null;
  users: Map<string, UserMetrics>;
  totalMessages: number;
  totalEscalations: number;
}

class MetricsTracker {
  private sessions: Map<string, SessionMetrics> = new Map();

  createSession(sessionId: string, overwrite: boolean = true): void {
    // If overwrite is true (default), delete existing session data
    if (overwrite && this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
    }

    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        startTime: Date.now(),
        endTime: null,
        users: new Map(),
        totalMessages: 0,
        totalEscalations: 0,
      });
    }
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  clearAllSessions(): void {
    this.sessions.clear();
  }

  private getUserMetrics(sessionId: string, userId: string): UserMetrics {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.users.has(userId)) {
      session.users.set(userId, {
        userId,
        messages: [],
        totalMessages: 0,
        editedMessages: 0,
        escalationCount: 0,
        escalationTimestamps: [],
        averageToneScore: 0,
        toneScores: [],
        averageTimePerMessage: 0,
        averageTimeAfterEscalation: 0,
        generalSlowdownRate: 0,
        postEscalationSlowdownRate: 0,
      });
    }

    return session.users.get(userId)!;
  }

  trackMessage(
    sessionId: string,
    userId: string,
    messageId: string,
    tone: ToneAnalysis,
    messageLength: number
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const userMetrics = this.getUserMetrics(sessionId, userId);
    const now = Date.now();

    // Calculate time since last message
    let timeSinceLastMessage = 0;
    if (userMetrics.messages.length > 0) {
      const lastMessage = userMetrics.messages[userMetrics.messages.length - 1];
      timeSinceLastMessage = now - lastMessage.timestamp;
    }

    // Calculate time since last escalation
    let timeSinceLastEscalation: number | null = null;
    let isAfterEscalation = false;
    if (userMetrics.escalationTimestamps.length > 0) {
      const lastEscalation =
        userMetrics.escalationTimestamps[
          userMetrics.escalationTimestamps.length - 1
        ];
      timeSinceLastEscalation = now - lastEscalation;
      // Consider "after escalation" if within 5 minutes
      isAfterEscalation = timeSinceLastEscalation < 5 * 60 * 1000;
    }

    const messageMetric: MessageMetric = {
      id: messageId,
      userId,
      timestamp: now,
      tone,
      messageLength,
      timeSinceLastMessage,
      timeSinceLastEscalation,
      isAfterEscalation,
      wasEdited: false,
      editCount: 0,
    };

    userMetrics.messages.push(messageMetric);
    userMetrics.totalMessages++;
    session.totalMessages++;

    // Convert tone to score: positive = 1, neutral = 0, negative = -1
    const toneScore =
      tone.tone === "positive" ? 1 : tone.tone === "negative" ? -1 : 0;
    userMetrics.toneScores.push(toneScore);

    this.updateUserMetrics(sessionId, userId);
  }

  trackMessageEdit(sessionId: string, userId: string, messageId: string): void {
    const userMetrics = this.getUserMetrics(sessionId, userId);
    const message = userMetrics.messages.find((m) => m.id === messageId);

    if (message) {
      if (!message.wasEdited) {
        message.wasEdited = true;
        userMetrics.editedMessages++;
      }
      message.editCount++;
    }
  }

  trackEscalation(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const userMetrics = this.getUserMetrics(sessionId, userId);
    userMetrics.escalationCount++;
    userMetrics.escalationTimestamps.push(Date.now());
    session.totalEscalations++;

    this.updateUserMetrics(sessionId, userId);
  }

  private updateUserMetrics(sessionId: string, userId: string): void {
    const userMetrics = this.getUserMetrics(sessionId, userId);

    // Calculate average tone score
    if (userMetrics.toneScores.length > 0) {
      userMetrics.averageToneScore =
        userMetrics.toneScores.reduce((sum, score) => sum + score, 0) /
        userMetrics.toneScores.length;
    }

    // Calculate average time per message (general)
    const messageTimes = userMetrics.messages
      .filter((m) => m.timeSinceLastMessage > 0)
      .map((m) => m.timeSinceLastMessage);

    if (messageTimes.length > 0) {
      userMetrics.averageTimePerMessage =
        messageTimes.reduce((sum, time) => sum + time, 0) / messageTimes.length;
    }

    // Calculate average time per message after escalation
    const postEscalationTimes = userMetrics.messages
      .filter((m) => m.isAfterEscalation && m.timeSinceLastMessage > 0)
      .map((m) => m.timeSinceLastMessage);

    if (postEscalationTimes.length > 0) {
      userMetrics.averageTimeAfterEscalation =
        postEscalationTimes.reduce((sum, time) => sum + time, 0) /
        postEscalationTimes.length;
    }

    // Calculate slowdown rates
    if (userMetrics.messages.length > 2) {
      // General slowdown: compare first half vs second half
      const midpoint = Math.floor(userMetrics.messages.length / 2);
      const firstHalf = userMetrics.messages.slice(0, midpoint);
      const secondHalf = userMetrics.messages.slice(midpoint);

      const avgFirstHalf = this.calculateAverageTime(firstHalf);
      const avgSecondHalf = this.calculateAverageTime(secondHalf);

      if (avgFirstHalf > 0) {
        userMetrics.generalSlowdownRate =
          ((avgSecondHalf - avgFirstHalf) / avgFirstHalf) * 100;
      }

      // Post-escalation slowdown
      if (
        userMetrics.averageTimePerMessage > 0 &&
        userMetrics.averageTimeAfterEscalation > 0
      ) {
        userMetrics.postEscalationSlowdownRate =
          ((userMetrics.averageTimeAfterEscalation -
            userMetrics.averageTimePerMessage) /
            userMetrics.averageTimePerMessage) *
          100;
      }
    }
  }

  private calculateAverageTime(messages: MessageMetric[]): number {
    const times = messages
      .filter((m) => m.timeSinceLastMessage > 0)
      .map((m) => m.timeSinceLastMessage);
    if (times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = Date.now();
    }
  }

  exportSessionData(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const usersData = Array.from(session.users.entries()).map(
      ([userId, metrics]) => ({
        userId,
        totalMessages: metrics.totalMessages,
        editedMessages: metrics.editedMessages,
        editRate:
          metrics.totalMessages > 0
            ? (metrics.editedMessages / metrics.totalMessages) * 100
            : 0,
        escalationCount: metrics.escalationCount,
        averageToneScore: metrics.averageToneScore,
        toneDistribution: this.calculateToneDistribution(metrics.toneScores),
        averageTimePerMessage: this.formatTime(metrics.averageTimePerMessage),
        averageTimeAfterEscalation: this.formatTime(
          metrics.averageTimeAfterEscalation
        ),
        generalSlowdownRate: metrics.generalSlowdownRate.toFixed(2) + "%",
        postEscalationSlowdownRate:
          metrics.postEscalationSlowdownRate.toFixed(2) + "%",
        detailedMessages: metrics.messages.map((m) => ({
          id: m.id,
          timestamp: new Date(m.timestamp).toISOString(),
          tone: m.tone.label,
          toneConfidence: (m.tone.confidence * 100).toFixed(1) + "%",
          messageLength: m.messageLength,
          timeSinceLastMessage: this.formatTime(m.timeSinceLastMessage),
          isAfterEscalation: m.isAfterEscalation,
          wasEdited: m.wasEdited,
          editCount: m.editCount,
        })),
      })
    );

    return {
      sessionId,
      sessionDuration: session.endTime
        ? this.formatTime(session.endTime - session.startTime)
        : "ongoing",
      totalMessages: session.totalMessages,
      totalEscalations: session.totalEscalations,
      users: usersData,
      summary: {
        averageMessagesPerUser:
          session.users.size > 0
            ? session.totalMessages / session.users.size
            : 0,
        averageEscalationsPerUser:
          session.users.size > 0
            ? session.totalEscalations / session.users.size
            : 0,
        overallToneScore: this.calculateOverallToneScore(session),
      },
    };
  }

  private calculateToneDistribution(toneScores: number[]): any {
    if (toneScores.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    const positive = toneScores.filter((s) => s === 1).length;
    const neutral = toneScores.filter((s) => s === 0).length;
    const negative = toneScores.filter((s) => s === -1).length;

    return {
      positive: ((positive / toneScores.length) * 100).toFixed(1) + "%",
      neutral: ((neutral / toneScores.length) * 100).toFixed(1) + "%",
      negative: ((negative / toneScores.length) * 100).toFixed(1) + "%",
    };
  }

  private calculateOverallToneScore(session: SessionMetrics): number {
    let totalScore = 0;
    let totalScores = 0;

    session.users.forEach((userMetrics) => {
      totalScore += userMetrics.toneScores.reduce((sum, s) => sum + s, 0);
      totalScores += userMetrics.toneScores.length;
    });

    return totalScores > 0 ? totalScore / totalScores : 0;
  }

  private formatTime(milliseconds: number): string {
    if (milliseconds === 0) return "N/A";
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  downloadAsJSON(sessionId: string, filename?: string): void {
    const data = this.exportSessionData(sessionId);
    if (!data) return;

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      filename || `session-metrics-${sessionId}-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  downloadAsCSV(sessionId: string, filename?: string): void {
    const data = this.exportSessionData(sessionId);
    if (!data) return;

    // Create CSV for messages
    const headers = [
      "User ID",
      "Message ID",
      "Timestamp",
      "Tone",
      "Tone Confidence",
      "Message Length",
      "Time Since Last Message",
      "After Escalation",
      "Was Edited",
      "Edit Count",
    ];

    const rows: string[][] = [headers];

    data.users.forEach((user: any) => {
      user.detailedMessages.forEach((msg: any) => {
        rows.push([
          user.userId,
          msg.id,
          msg.timestamp,
          msg.tone,
          msg.toneConfidence,
          msg.messageLength.toString(),
          msg.timeSinceLastMessage,
          msg.isAfterEscalation.toString(),
          msg.wasEdited.toString(),
          msg.editCount.toString(),
        ]);
      });
    });

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      filename || `session-metrics-${sessionId}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const metricsTracker = new MetricsTracker();
