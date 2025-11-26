import { pipeline } from "@huggingface/transformers";

export type ToneType = "positive" | "neutral" | "negative";

export interface ToneAnalysis {
  tone: ToneType;
  confidence: number;
  label: string;
  emoji: string;
  hint: string;
  suggestions: string[];
  emotion?: string;
  modelName?: string;
}

let emotionPipeline: any = null;
let loadedModelName: string = "Not loaded";

// Initialize the emotion detection pipeline
export async function initializeSentimentAnalysis() {
  if (!emotionPipeline) {
    try {
      // Try Twitter RoBERTa sentiment (trained on real conversations)
      console.log(
        "[Sentiment] Attempting to load Twitter RoBERTa sentiment model..."
      );

      emotionPipeline = await pipeline(
        "text-classification",
        "Xenova/twitter-roberta-base-sentiment-latest"
      );

      loadedModelName = "RoBERTa Sentiment";
      console.log(
        "[Sentiment] ✓ Twitter sentiment model loaded - conversation-optimized!"
      );
    } catch (error) {
      console.warn(
        "[Sentiment] Twitter model failed, trying DistilBERT SST-2:",
        error
      );

      try {
        // Try Twitter RoBERTa sentiment (trained on real conversations)
        emotionPipeline = await pipeline(
          "text-classification",
          "Xenova/twitter-roberta-base-sentiment-latest"
        );

        loadedModelName = "Twitter RoBERTa Sentiment";
        console.log("[Sentiment] ✓ Twitter sentiment model loaded");
      } catch (twitterError) {
        console.warn(
          "[Sentiment] Twitter model failed, trying DistilBERT SST-2:",
          twitterError
        );

        try {
          emotionPipeline = await pipeline(
            "text-classification",
            "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
          );

          loadedModelName = "DistilBERT SST-2 (positive/negative only)";
          console.log("[Sentiment] ✓ DistilBERT SST-2 loaded");
        } catch (sst2Error) {
          console.warn(
            "[Sentiment] DistilBERT SST-2 failed, using 5-star fallback:",
            sst2Error
          );

          // Final fallback to star-based sentiment
          emotionPipeline = await pipeline(
            "text-classification",
            "Xenova/bert-base-multilingual-uncased-sentiment"
          );

          loadedModelName = "BERT Sentiment (5-star fallback)";
          console.log("[Sentiment] ✓ Fallback model loaded");
        }
      }
    }
  }
  return emotionPipeline;
}

// Analyze the tone of a text
export async function analyzeTone(text: string): Promise<ToneAnalysis> {
  if (!text.trim()) {
    return {
      tone: "neutral",
      confidence: 0,
      label: "Neutral",
      emoji: "😐",
      hint: "Start typing to see tone analysis",
      suggestions: [],
    };
  }

  // Advanced emotion detection with context-aware patterns

  // Apology patterns - check first for neutral tone
  const apologyPatterns =
    /\b(sorry|apologize|apologies|my bad|my mistake|i was wrong|forgive me|excuse me|i apologize|my apologies|i'm sorry|i regret)\b/i;

  // Love & affection - expanded with intensity markers
  const lovePatterns =
    /\b(love|adore|cherish|treasure|affection|care deeply|mean everything|mean the world|heart|devoted|fond of|passionate about|deeply appreciate|grateful for)\b/i;

  // Fear & anxiety - with various intensities
  const fearPatterns =
    /\b(scared|afraid|terrified|fear|worried|anxious|nervous|frightened|panic|concerned|uneasy|apprehensive|dread|intimidated|wary)\b/i;

  // Sadness & disappointment - nuanced expressions
  const sadnessPatterns =
    /\b(sad|depressed|heartbroken|miserable|unhappy|disappointed|devastated|crying|tears|grief|sorrow|melancholy|dejected|down|blue|hurt|pain)\b/i;

  // Surprise & amazement - positive and neutral variations
  const surprisePatterns =
    /\b(wow|omg|amazing|incredible|unbelievable|shocked|surprised|astonished|can't believe|blown away|speechless|mind-blowing|astounded|flabbergasted)\b/i;

  // Joy & excitement - high energy positive emotions
  const joyPatterns =
    /\b(thrilled|excited|elated|delighted|overjoyed|ecstatic|happy|cheerful|joyful|pleased|glad|wonderful|fantastic|excellent|great job|awesome|brilliant)\b/i;

  // Anger & frustration - varying intensities
  const angerPatterns =
    /\b(furious|enraged|livid|irate|mad|angry|frustrated|irritated|annoyed|infuriated|outraged|pissed|rage|unacceptable|ridiculous)\b/i;

  // Disgust & contempt
  const disgustPatterns =
    /\b(disgusting|revolting|repulsive|gross|nasty|vile|appalling|horrible|terrible|awful|pathetic|despicable|contemptible)\b/i;

  // Gratitude & appreciation
  const gratitudePatterns =
    /\b(thank you|thanks|grateful|appreciate|appreciation|thankful|bless|blessing|indebted)\b/i;

  // Confidence & pride
  const confidencePatterns =
    /\b(confident|proud|accomplished|achieved|succeeded|nailed it|crushed it|killed it|excellent work|well done)\b/i;

  const isApology = apologyPatterns.test(text);
  const isLove = lovePatterns.test(text);
  const isFear = fearPatterns.test(text);
  const isSadness = sadnessPatterns.test(text);
  const isSurprise = surprisePatterns.test(text);
  const isJoy = joyPatterns.test(text);
  const isAnger = angerPatterns.test(text);
  const isDisgust = disgustPatterns.test(text);
  const isGratitude = gratitudePatterns.test(text);
  const isConfidence = confidencePatterns.test(text);

  // Priority order: apology > specific emotions > run ML model

  // IMMEDIATELY return for apologies - don't run through emotion model
  if (isApology) {
    console.log("[APOLOGY DETECTED - BYPASSING MODEL]:", text);
    return {
      tone: "neutral",
      confidence: 0.9,
      label: "Apologetic",
      emoji: "🙏",
      hint: "Your message shows accountability and willingness to make things right.",
      suggestions: [
        "Consider what specific action you'll take to prevent this in the future",
        "Acknowledge the impact on the other person",
        "Make a genuine commitment to change",
      ],
      emotion: "remorse",
      modelName: "Pattern-based detection",
    };
  }

  // Gratitude - warm positive emotion
  if (isGratitude) {
    console.log("[GRATITUDE DETECTED - KEYWORD MATCH]:", text);
    return {
      tone: "positive",
      confidence: 0.9,
      label: "Grateful",
      emoji: "🙏",
      hint: "Your message expresses sincere appreciation.",
      suggestions: [],
      emotion: "gratitude",
      modelName: "Pattern-based detection",
    };
  }

  // Confidence & Pride
  if (isConfidence) {
    console.log("[CONFIDENCE DETECTED - KEYWORD MATCH]:", text);
    return {
      tone: "positive",
      confidence: 0.85,
      label: "Confident",
      emoji: "💪",
      hint: "Your message shows self-assurance and accomplishment.",
      suggestions: [],
      emotion: "confidence",
      modelName: "Pattern-based detection",
    };
  }

  // Joy - check for strong joy keywords before ML model
  if (isJoy) {
    console.log("[JOY DETECTED - KEYWORD MATCH]:", text);
    return {
      tone: "positive",
      confidence: 0.88,
      label: "Joyful",
      emoji: "😊",
      hint: "Your message radiates happiness and enthusiasm!",
      suggestions: [],
      emotion: "joy",
      modelName: "Pattern-based detection",
    };
  }

  // Return for love detection
  if (isLove) {
    console.log("[LOVE DETECTED - KEYWORD MATCH]:", text);
    return {
      tone: "positive",
      confidence: 0.85,
      label: "Loving",
      emoji: "❤️",
      hint: "Your message radiates warmth and deep care.",
      suggestions: [],
      emotion: "love",
      modelName: "Pattern-based detection",
    };
  }

  // Disgust - strong negative emotion
  if (isDisgust) {
    console.log("[DISGUST DETECTED - KEYWORD MATCH]:", text);
    return {
      tone: "negative",
      confidence: 0.87,
      label: "Disgusted",
      emoji: "🤢",
      hint: "Your message shows strong disapproval that could be perceived as harsh.",
      suggestions: [
        "Separate the behavior from the person",
        "State your boundaries clearly but respectfully",
        "Explain the impact rather than just condemning",
      ],
      emotion: "disgust",
      modelName: "Pattern-based detection",
    };
  }

  // Anger - strong negative emotion
  if (isAnger) {
    console.log("[ANGER DETECTED - KEYWORD MATCH]:", text);
    return {
      tone: "negative",
      confidence: 0.88,
      label: "Harsh",
      emoji: "😠",
      hint: "Your message contains strong negative emotions that might escalate tension.",
      suggestions: [
        "Pause and take a breath before sending",
        "Focus on the specific issue, not personal attacks",
        "Express what you need instead of what went wrong",
      ],
      emotion: "anger",
      modelName: "Pattern-based detection",
    };
  }

  // Return for fear detection
  if (isFear) {
    console.log("[FEAR DETECTED - KEYWORD MATCH]:", text);
    return {
      tone: "neutral",
      confidence: 0.85,
      label: "Fearful",
      emoji: "😨",
      hint: "Your message reveals worry or uncertainty about what's ahead.",
      suggestions: [
        "Identify the specific concern you're facing",
        "Ask for reassurance or clarity if needed",
        "Sharing your fears helps others understand your perspective",
      ],
      emotion: "fear",
      modelName: "Pattern-based detection",
    };
  }

  // Return for sadness detection
  if (isSadness) {
    console.log("[SADNESS DETECTED - KEYWORD MATCH]:", text);
    return {
      tone: "neutral",
      confidence: 0.85,
      label: "Sad",
      emoji: "😢",
      hint: "Your message conveys sadness.",
      suggestions: [
        "Explain what led to this feeling",
        "Share how others can help or support you",
        "It's okay to express sadness - it shows you care",
      ],
      emotion: "sadness",
      modelName: "Pattern-based detection",
    };
  }

  // Return for surprise detection
  if (isSurprise) {
    console.log("[SURPRISE DETECTED - KEYWORD MATCH]:", text);
    return {
      tone: "neutral",
      confidence: 0.83,
      label: "Surprised",
      emoji: "😮",
      hint: "Your message shows you're reacting to unexpected information.",
      suggestions: [
        "Indicate if you're pleasantly or unpleasantly surprised",
        "Ask follow-up questions to understand better",
      ],
      emotion: "surprise",
      modelName: "Pattern-based detection",
    };
  }

  try {
    const classifier = await initializeSentimentAnalysis();
    const results = await classifier(text, { top_k: null });

    // Get the top result
    const topResult = results[0];
    let label = topResult.label.toLowerCase();
    let confidence = topResult.score;

    console.log("[DEBUG] Raw label from model:", topResult.label);
    console.log("[DEBUG] Normalized label:", label);

    // Log all detected emotions for testing/debugging
    console.log("=== EMOTION DETECTION ===");
    console.log("Text:", text);
    console.log(
      "Top result:",
      topResult.label,
      `(${(confidence * 100).toFixed(1)}%)`
    );
    console.log("========================\n");

    let tone: ToneType;
    let displayLabel: string;
    let emoji: string;
    let hint: string;
    let suggestions: string[] = [];
    let emotion: string = label;

    // Handle DistilRoBERTa emotion model (7 emotions)
    if (label === "joy") {
      tone = "positive";
      displayLabel = "Joy";
      emoji = "😊";
      hint = "Your message radiates happiness and positive energy!";
      suggestions = [];
    } else if (label === "anger") {
      tone = "negative";
      displayLabel = "Angry";
      emoji = "😠";
      hint =
        "Your message contains strong negative emotions that might escalate tension.";
      suggestions = [
        "Pause and take a breath before sending",
        "Focus on the specific issue, not personal attacks",
        "Express what you need instead of what went wrong",
      ];
    } else if (label === "sadness") {
      tone = "negative";
      displayLabel = "Sad";
      emoji = "😢";
      hint = "Your message expresses vulnerability and disappointment.";
      suggestions = [
        "Be specific about what's troubling you",
        "Let others know how they can support you",
        "Expressing sadness is valid - it opens the door to understanding",
      ];
    } else if (label === "fear") {
      tone = "negative";
      displayLabel = "Fearful";
      emoji = "😨";
      hint = "Your message reveals worry or uncertainty about what's ahead.";
      suggestions = [
        "Identify the specific concern you're facing",
        "Ask for reassurance or clarity if needed",
        "Sharing your fears helps others understand your perspective",
      ];
    } else if (label === "disgust") {
      tone = "negative";
      displayLabel = "Disgusted";
      emoji = "🤢";
      hint =
        "Your message shows strong disapproval that could be perceived as harsh.";
      suggestions = [
        "Separate the behavior from the person",
        "State your boundaries clearly but respectfully",
        "Explain the impact rather than just condemning",
      ];
    } else if (label === "surprise") {
      tone = "neutral";
      displayLabel = "Surprised";
      emoji = "😮";
      hint = "Your message shows you're reacting to unexpected information.";
      suggestions = [
        "Indicate if you're pleasantly or unpleasantly surprised",
        "Ask follow-up questions to understand better",
      ];
    } else if (label === "neutral") {
      tone = "neutral";
      displayLabel = "Neutral";
      emoji = "😐";
      hint = "Your message is calm, balanced, and factual.";
      suggestions = [];
    }
    // Handle DistilBERT SST-2 sentiment (POSITIVE/NEGATIVE) - fallback
    else if (label === "positive") {
      tone = "positive";
      displayLabel = "Positive";
      emoji = "😊";
      emotion = "joy";
      hint = "Your message has an uplifting and encouraging tone.";
      suggestions = [];
    } else if (label === "negative") {
      tone = "negative";
      displayLabel = "Negative";
      emoji = "😠";
      emotion = "anger";
      hint = "Your message carries a critical or frustrated tone.";
      suggestions = [
        "Try rephrasing with a more constructive approach",
        "Focus on solutions rather than problems",
        "Consider the impact your words might have",
      ];
    }
    // Handle star-based sentiment model (final fallback)
    else if (label.includes("star")) {
      const stars = parseInt(label);
      if (stars >= 4) {
        tone = "positive";
        displayLabel = "Positive";
        emoji = "😊";
        emotion = "joy";
        hint = "Your message communicates warmth and optimism.";
        suggestions = [];
      } else if (stars === 3) {
        tone = "neutral";
        displayLabel = "Neutral";
        emoji = "😐";
        emotion = "neutral";
        hint = "Your message maintains a balanced, objective tone.";
        suggestions = [];
      } else {
        tone = "negative";
        displayLabel = "Negative";
        emoji = "😠";
        emotion = "anger";
        hint = "Your message leans toward criticism or dissatisfaction.";
        suggestions = [
          "Reframe negatively to highlight what could improve",
          "Offer alternatives alongside your concerns",
        ];
      }
    }
    // Handle other emotion labels (shouldn't reach here but fallback)
    else if (["love"].includes(label)) {
      tone = "positive";
      displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
      emoji = label === "love" ? "❤️" : "😊";
      hint =
        label === "love"
          ? "Your message radiates warmth and care."
          : "Your message conveys joy and enthusiasm!";
      suggestions =
        confidence > 0.8 ? [] : ["Consider adding more warmth or enthusiasm"];
    }
    // Neutral - Surprise
    else if (label === "surprise") {
      tone = "neutral";
      displayLabel = "Surprised";
      emoji = "😮";
      hint = "Your message expresses surprise or discovery.";
      suggestions = ["Clarify whether this is positive or negative surprise"];
    }
    // Negative - Fear
    else if (label === "fear") {
      tone = "negative";
      displayLabel = "Fearful";
      emoji = "😨";
      hint = "Your message conveys anxiety or concern.";
      suggestions = [
        "Share what you're concerned about specifically",
        "Suggest solutions or ways to address the concern",
      ];
    }
    // Negative - Anger
    else if (label === "anger") {
      tone = "negative";
      displayLabel = "Angry";
      emoji = "😠";
      hint = "Your message shows frustration or strong disagreement.";
      suggestions = [
        "Take a breath and express the underlying issue",
        'Use "I" statements: "I feel frustrated when..."',
        "Suggest solutions instead of focusing on the problem",
      ];
    }
    // Negative - Sadness
    else if (label === "sadness") {
      tone = "negative";
      displayLabel = "Sad";
      emoji = "😢";
      hint = "Your message conveys sadness.";
      suggestions = [
        "Explain what led to this feeling",
        "Share how others can help or support you",
      ];
    }
    // Fallback for star-based sentiment
    else if (label.includes("star")) {
      const stars = parseInt(label.split(" ")[0]);
      if (stars >= 4) {
        tone = "positive";
        displayLabel = "Positive";
        emoji = "😊";
        emotion = "joy";
        hint = "Your message has positive energy.";
        suggestions = [];
      } else if (stars === 3) {
        tone = "neutral";
        displayLabel = "Neutral";
        emoji = "😐";
        emotion = "neutral";
        hint = "Your message is clear and balanced.";
        suggestions = ["Consider adding warmth to engage better"];
      } else {
        tone = "negative";
        displayLabel = "Negative";
        emoji = "😤";
        emotion = "anger";
        hint = "Your message has a critical tone.";
        suggestions = ["Consider softening your language"];
      }
    } else {
      tone = "neutral";
      displayLabel = "Neutral";
      emoji = "😐";
      emotion = "neutral";
      hint = "Your message is clear and balanced.";
      suggestions = [
        "Consider adding warmth with a friendly greeting",
        "Express appreciation if applicable",
      ];
    }

    return {
      tone,
      confidence,
      label: displayLabel,
      emoji,
      hint,
      suggestions,
      emotion,
      modelName: loadedModelName,
    };
  } catch (error) {
    console.error("Error analyzing emotion:", error);
    return {
      tone: "neutral",
      confidence: 0,
      label: "Neutral",
      emoji: "😐",
      hint: "Analysis unavailable",
      suggestions: [],
      modelName: "Error",
    };
  }
}
