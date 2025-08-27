export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  RATING = 'rating',
  TEXT = 'text',
  CONDITIONAL = 'conditional'
}

export enum SurveyStatus {
  Draft = 0,
  Active = 1,
  Paused = 2,
  Closed = 3,
  Archived = 4
}

export interface BranchOption {
  id: string;
  content: string;
  value: string;
  nextQuestionId?: string;
}

export interface Branch {
  id: string;
  currentQuestionId: string;
  nextQuestionId: string;
  conditionType: 'AND' | 'OR';
  optionIds: string[];
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: BranchOption[];
  required: boolean;
  order: number;
  minRating?: number;
  maxRating?: number;
  condition?: {
    questionId: string;
    value: string;
    operator?: 'equals' | 'contains' | 'not_equals';
  };
  isConditional?: boolean;
  parentQuestionId?: string;
  branches?: Branch[]; // Thêm thu?c tính này ?? h? tr? phân nhánh t? h?p
}

export interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  isActive: boolean;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  createdBy: string;
  departmentId?: number;
  status?: number; // 0: Draft, 1: Active, 2: Paused, 3: Closed, 4: Archived
}

export interface SurveyAnswer {
  questionId: string;
  value: string | string[] | number;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: SurveyAnswer[];
  submittedAt: Date;
  deviceFingerprint?: string;
}

export interface SurveyTreeNode {
  id: string;
  questionId?: string;
  parentId?: string;
  surveyId?: string;
  order?: number;
  conditionType?: 'AND' | 'OR' | null;
  branchOptionIds?: (string | number)[] | null;
}

export interface SurveyTreeOption {
  id: string;
  content: string;
  value: string | number;
  nextQuestion?: SurveyTreeNode;
  conditionType?: 'AND' | 'OR' | null;
  branchOptionIds?: (string | number)[] | null;
}