import type { Question, SurveyAnswer, Branch } from '../types/survey';
import { QuestionType } from '../types/survey';

// L?y danh s�ch c�c c�u g?c, s?p x?p theo order
export function getRootQuestions(questions: Question[]): Question[] {
  return questions.filter(q => (q as any).isRoot).sort((a, b) => a.order - b.order);
}

// L?y nextQuestionId cho 1 c�u h?i v� ?�p �n
export function getNextQuestionId(question: Question, value: string | string[] | number): string | undefined {
  // 1. N?u l� SINGLE_CHOICE, ?u ti�n nextQuestionId c?a option ?� ch?n
  if (question.type === QuestionType.SINGLE_CHOICE && question.options && value) {
    const opt = question.options.find(o => o.value === value);
    if (opt?.nextQuestionId) {
      return opt.nextQuestionId;
    }
  }
  // 2. N?u c� branches, ki?m tra ?i?u ki?n branch
  if (question.branches && question.branches.length > 0 && value) {
    for (const branch of question.branches) {
      const selected = Array.isArray(value) ? value.map(String) : [String(value)];
      const branchOptionIds = branch.optionIds.map(String);
      const match = branch.conditionType === 'AND'
        ? (branchOptionIds.every(id => selected.includes(id)) && selected.length === branchOptionIds.length && selected.every(id => branchOptionIds.includes(id)))
        : branchOptionIds.some(id => selected.includes(id));
      if (match) {
        return branch.nextQuestionId;
      }
    }
  }
  return undefined;
}

// Ki?m tra ?� tr? l?i h?t t?t c? c�u h?i trong flow ch?a
export function isFlowAnswered(questionIds: string[], answers: SurveyAnswer[]): boolean {
  return questionIds.every(qid => {
    const ans = answers.find(a => a.questionId === qid);
    return ans && ans.value !== undefined && ans.value !== null && (!(Array.isArray(ans.value)) || ans.value.length > 0);
  });
}

// L?y danh s�ch c�u h?i ?ang hi?n th? theo flow nh�nh (theo m?ng id)
export function getVisibleQuestions(questions: Question[], questionFlowIds: string[]): Question[] {
  return questionFlowIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];
}

// X�c ??nh t?t c? c�c id c�u nh�nh con (descendants) c?a m?t c�u h?i khi ??i ?�p �n
export function getBranchDescendants(
  questions: Question[],
  parentQuestionId: string,
  parentOptionId?: string
): string[] {
  // T�m t?t c? c�c c�u h?i c� ParentQuestionId = parentQuestionId (v� n?u c�, ParentOptionId = parentOptionId)
  const directChildren = questions.filter(q => {
    // @ts-ignore
    return q.parentQuestionId === parentQuestionId && (parentOptionId ? q.parentOptionId === parentOptionId : true);
  });
  let allDescendants: string[] = [];
  for (const child of directChildren) {
    allDescendants.push(child.id);
    // ?? quy t�m ti?p c�c nh�nh con c?a child
    // @ts-ignore
    allDescendants = allDescendants.concat(getBranchDescendants(questions, child.id, child.parentOptionId));
  }
  return allDescendants;
}

// Tree node cho kh?o s�t d?ng c�y (d�ng cho flow m?i)
export interface SurveyTreeNode {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  order: number;
  options: SurveyTreeOption[];
  maxRating?: number;
  minRating?: number;
  branches?: Branch[]; // S? d?ng Branch import t? types/survey
  // ... c�c tr??ng kh�c n?u c?n ...
}

export interface SurveyTreeOption {
  id: string;
  content: string;
  value: string | number;
  nextQuestion?: SurveyTreeNode;
  conditionType?: 'AND' | 'OR' | null;
  branchOptionIds?: (string | number)[] | null;
}

// So s�nh hai m?ng ?� sort, lo?i b? null/undefined
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
}

// Gom nh�m c�c option th�nh c�c nh�m nh�nh d?a tr�n branchOptionIds + conditionType
function groupBranchOptions(options: SurveyTreeOption[]) {
  const branchGroups: Record<string, SurveyTreeOption[]> = {};
  options.forEach(opt => {
    if (opt.conditionType && opt.branchOptionIds) {
      const key = opt.branchOptionIds.join(',') + '_' + opt.conditionType;
      if (!branchGroups[key]) branchGroups[key] = [];
      branchGroups[key].push(opt);
    }
  });
  return branchGroups;
}

// Duy?t flow nh�nh: tr? v? m?ng c�c node theo flow ?� ch?n
export function buildSurveyFlow(
  rootNode: SurveyTreeNode,
  answers: SurveyAnswer[]
): SurveyTreeNode[] {
  const flow: SurveyTreeNode[] = [rootNode];
  let currentNode = rootNode;
  while (true) {
    const answer = answers.find(a => a.questionId === currentNode.id)?.value;
    if (typeof answer === 'undefined' || answer === null || (Array.isArray(answer) && answer.length === 0)) {
      break;
    }
    let nextNode: SurveyTreeNode | undefined;
    let branchMatched = false;
    if (
      currentNode.type === QuestionType.SINGLE_CHOICE ||
      currentNode.type === QuestionType.RATING
    ) {
      // Gom nh�m nh�nh cho SingleChoice
      const branchGroups = groupBranchOptions(currentNode.options);
      for (const key in branchGroups) {
        const group = branchGroups[key];
        const conditionType = group[0].conditionType;
        const branchOptionIds = group[0].branchOptionIds?.map(String) || [];
        const selected = [String(answer)];
        const nextQuestion = group.find(o => o.nextQuestion != null)?.nextQuestion;
        if (conditionType === 'AND') {
          // ?�ng v� ??: selected ph?i ch?a t?t c? branchOptionIds v� kh�ng th?a
          const isMatch = arraysEqual(selected, branchOptionIds);
          if (isMatch && nextQuestion) {
            nextNode = nextQuestion;
            branchMatched = true;
            break;
          }
        }
        if (conditionType === 'OR') {
          const isMatch = branchOptionIds.some(id => selected.includes(id));
          if (isMatch && nextQuestion) {
            nextNode = nextQuestion;
            branchMatched = true;
            break;
          }
        }
      }
      // N?u kh�ng kh?p ?i?u ki?n nh�nh, KH�NG ?i nextQuestion n?u option l� nh�nh
      if (!branchMatched) {
        const selectedOpt = currentNode.options.find(opt => String(opt.value ?? opt.id) === String(answer));
        if (selectedOpt && (!selectedOpt.conditionType && !selectedOpt.branchOptionIds) && selectedOpt.nextQuestion) {
          nextNode = selectedOpt.nextQuestion;
        }
      }
    } else if (currentNode.type === QuestionType.MULTIPLE_CHOICE && Array.isArray(answer)) {
      // Gom nh�m nh�nh cho MultiChoice
      const branchGroups = groupBranchOptions(currentNode.options);
      const selected = answer.filter(x => x !== null && x !== undefined).map(String);
      for (const key in branchGroups) {
        const group = branchGroups[key];
        const conditionType = group[0].conditionType;
        const branchOptionIds = group[0].branchOptionIds?.map(String) || [];
        const nextQuestion = group.find(o => o.nextQuestion != null)?.nextQuestion;
        if (conditionType === 'AND') {
          // ?�ng v� ??: selected ph?i ch?a t?t c? branchOptionIds v� kh�ng th?a
          const isMatch = arraysEqual(selected, branchOptionIds);
          if (isMatch && nextQuestion) {
            nextNode = nextQuestion;
            branchMatched = true;
            break;
          }
        }
        if (conditionType === 'OR') {
          const isMatch = branchOptionIds.some(id => selected.includes(id));
          if (isMatch && nextQuestion) {
            nextNode = nextQuestion;
            branchMatched = true;
            break;
          }
        }
      }
      // N?u kh�ng kh?p ?i?u ki?n nh�nh, KH�NG ?i nextQuestion n?u option l� nh�nh
      if (!branchMatched) {
        const nextOpt = currentNode.options.find(opt =>
          selected.includes(String(opt.value ?? opt.id)) &&
          (!opt.conditionType && !opt.branchOptionIds) &&
          opt.nextQuestion
        );
        if (nextOpt && nextOpt.nextQuestion) {
          nextNode = nextOpt.nextQuestion;
        }
      }
    }
    if (nextNode) {
      flow.push(nextNode);
      currentNode = nextNode;
    } else {
      // N?u kh�ng c�n nh�nh ?? ?i, break v� b�o hi?u k?t th�c flow nh�nh
      break;
    }
  }
  // N?u flow ch? c� rootNode (kh�ng ?i nh�nh), return flow nh? c?
  // N?u flow c� nhi?u node (c� ?i nh�nh), nh?ng kh�ng c�n nextNode, coi nh? k?t th�c nh�nh, frontend s? t? chuy?n sang root ti?p theo
  return flow;
}

// Reset flow khi ??i ?�p �n: c?t flow t?i nodeIndex
export function resetSurveyFlow(
  flow: SurveyTreeNode[],
  nodeIndex: number
): SurveyTreeNode[] {
  return flow.slice(0, nodeIndex + 1);
}
