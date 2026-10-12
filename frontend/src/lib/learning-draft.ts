export interface QuizDraft {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface LearningDraft {
  learningOutcomes: string[];
  prerequisites: string[];
  difficulty: '' | 'beginner' | 'intermediate' | 'advanced';
  references: string[];
  lastReviewedAt: string;
  seriesId: string;
  seriesOrder?: number;
  quizQuestions: QuizDraft[];
}

export const emptyLearningDraft: LearningDraft = {
  learningOutcomes: [],
  prerequisites: [],
  difficulty: '',
  references: [],
  lastReviewedAt: '',
  seriesId: '',
  seriesOrder: undefined,
  quizQuestions: []
};
