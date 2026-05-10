export interface Question {
  id: string;
  text: string;
  required: boolean;
}

export interface Section {
  name: string;
  duration_min: number;
  description?: string;
  questions: Question[];
  allow_followups: boolean;
  max_followups: number;
}

export interface RubricItem {
  name: string;
  weight: number;
  description: string;
}

export interface JobConfig {
  title: string;
  client_name?: string;
  description?: string;
  intro_message?: string;
  duration_minutes: number;
  sections: Section[];
  rubric: RubricItem[];
}

export interface TranscriptTurn {
  speaker: 'ai' | 'candidate';
  content: string;
  section_name?: string;
  question_index?: number;
}

export interface InterviewReport {
  overall_score: number;
  rubric_scores: Record<string, number>;
  strengths: string[];
  concerns: string[];
  summary: string;
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
}
