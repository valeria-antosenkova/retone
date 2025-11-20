import { pipeline } from '@huggingface/transformers';

export type ToneType = 'positive' | 'neutral' | 'negative';

export interface ToneAnalysis {
  tone: ToneType;
  confidence: number;
  label: string;
  emoji: string;
  hint: string;
  suggestions: string[];
}

let emotionPipeline: any = null;

// Initialize the emotion detection pipeline
export async function initializeSentimentAnalysis() {
  if (!emotionPipeline) {
    emotionPipeline = await pipeline(
      'text-classification',
      'Xenova/bert-base-multilingual-uncased-sentiment'
    );
  }
  return emotionPipeline;
}

// Analyze the tone of a text
export async function analyzeTone(text: string): Promise<ToneAnalysis> {
  if (!text.trim()) {
    return {
      tone: 'neutral',
      confidence: 0,
      label: 'Neutral',
      emoji: '😐',
      hint: 'Start typing to see tone analysis',
      suggestions: []
    };
  }

  try {
    const classifier = await initializeSentimentAnalysis();
    const result = await classifier(text);
    
    const sentiment = result[0];
    const stars = parseInt(sentiment.label.split(' ')[0]);
    const confidence = sentiment.score;
    
    // Map star ratings to tones (1-5 stars)
    let tone: ToneType;
    let label: string;
    let emoji: string;
    let hint: string;
    let suggestions: string[] = [];
    
    // 5 stars - Very positive
    if (stars === 5 && confidence > 0.7) {
      tone = 'positive';
      label = 'Very Positive';
      emoji = '😊';
      hint = 'Your message radiates warmth and positivity!';
      suggestions = [];
    } else if (stars === 5) {
      tone = 'positive';
      label = 'Positive';
      emoji = '🙂';
      hint = 'Your message has positive energy.';
      suggestions = ['Consider adding more enthusiasm to amplify the positivity'];
    }
    // 4 stars - Positive
    else if (stars === 4 && confidence > 0.6) {
      tone = 'positive';
      label = 'Friendly';
      emoji = '🙂';
      hint = 'Your message has a nice positive tone.';
      suggestions = ['You could add more warmth with phrases like "I appreciate"'];
    } else if (stars === 4) {
      tone = 'positive';
      label = 'Pleasant';
      emoji = '😊';
      hint = 'Your message feels upbeat.';
      suggestions = [];
    }
    // 3 stars - Neutral
    else if (stars === 3) {
      tone = 'neutral';
      label = 'Neutral';
      emoji = '😐';
      hint = 'Your message is clear and balanced.';
      suggestions = [
        'Consider adding warmth with a friendly greeting',
        'Express appreciation if applicable',
        'Use more engaging language to connect better'
      ];
    }
    // 2 stars - Somewhat negative
    else if (stars === 2 && confidence > 0.6) {
      tone = 'negative';
      label = 'Critical';
      emoji = '😟';
      hint = 'Your message sounds somewhat negative or critical.';
      suggestions = [
        'Consider softening with "I think" or "In my view"',
        'Add appreciation for their effort or time',
        'Replace "but" with "and" for a more collaborative tone',
        'Use questions instead of statements to invite dialogue'
      ];
    } else if (stars === 2) {
      tone = 'neutral';
      label = 'Slightly Tense';
      emoji = '😐';
      hint = 'Your message has a slightly negative undertone.';
      suggestions = [
        'Add a positive opener to balance the tone',
        'Consider your word choice - avoid absolutes like "never" or "always"',
        'Frame feedback as suggestions rather than demands'
      ];
    }
    // 1 star - Very negative
    else if (stars === 1 && confidence > 0.7) {
      tone = 'negative';
      label = 'Very Harsh';
      emoji = '😠';
      hint = 'Your message may come across as harsh or confrontational.';
      suggestions = [
        'Start with acknowledgment: "I understand your perspective"',
        'Replace direct criticism with suggestions: "Perhaps we could..."',
        'Use collaborative language: "Let\'s work together to..."',
        'Soften with phrases like "I wonder if" or "It might help to"'
      ];
    } else if (stars === 1) {
      tone = 'negative';
      label = 'Tense';
      emoji = '😤';
      hint = 'Your message shows frustration or strong disagreement.';
      suggestions = [
        'Acknowledge the issue without assigning blame',
        'Suggest solutions instead of pointing out problems',
        'Use softer language like "I noticed" instead of "You did"'
      ];
    }
    // Fallback
    else {
      tone = 'neutral';
      label = 'Neutral';
      emoji = '😐';
      hint = 'Your message is clear and balanced.';
      suggestions = [
        'Consider adding warmth with a friendly greeting',
        'Express appreciation if applicable'
      ];
    }
    
    return {
      tone,
      confidence,
      label,
      emoji,
      hint,
      suggestions
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {
      tone: 'neutral',
      confidence: 0,
      label: 'Neutral',
      emoji: '😐',
      hint: 'Analysis unavailable',
      suggestions: []
    };
  }
}
