import type { Question, SurveyAnswer, Branch } from '../types/survey';
import { QuestionType } from '../types/survey';

// L?y danh sách các câu g?c, s?p x?p theo order
export function getRootQuestions(questions: Question[]): Question[] {
  return questions.filter(q => (q as any).isRoot).sort((a, b) => a.order - b.order);
}

// L?y nextQuestionId cho 1 câu h?i và ?áp án
export function getNextQuestionId(question: Question, value: string | string[] | number): string | undefined {
  // 1. N?u là SINGLE_CHOICE, ?u tiên nextQuestionId c?a option ?ã ch?n
  if (question.type === QuestionType.SINGLE_CHOICE && question.options && value) {
    const opt = question.options.find(o => o.value === value);
    if (opt?.nextQuestionId) {
      return opt.nextQuestionId;
    }
  }
  // 2. N?u có branches, ki?m tra ?i?u ki?n branch
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

// Ki?m tra ?ã tr? l?i h?t t?t c? câu h?i trong flow ch?a
export function isFlowAnswered(questionIds: string[], answers: SurveyAnswer[]): boolean {
  return questionIds.every(qid => {
    const ans = answers.find(a => a.questionId === qid);
    return ans && ans.value !== undefined && ans.value !== null && (!(Array.isArray(ans.value)) || ans.value.length > 0);
  });
}

// L?y danh sách câu h?i ?ang hi?n th? theo flow nhánh (theo m?ng id)
export function getVisibleQuestions(questions: Question[], questionFlowIds: string[]): Question[] {
  return questionFlowIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];
}

// Xác ??nh t?t c? các id câu nhánh con (descendants) c?a m?t câu h?i khi ??i ?áp án
export function getBranchDescendants(
  questions: Question[],
  parentQuestionId: string,
  parentOptionId?: string
): string[] {
  // Tìm t?t c? các câu h?i có ParentQuestionId = parentQuestionId (và n?u có, ParentOptionId = parentOptionId)
  const directChildren = questions.filter(q => {
    // @ts-ignore
    return q.parentQuestionId === parentQuestionId && (parentOptionId ? q.parentOptionId === parentOptionId : true);
  });
  let allDescendants: string[] = [];
  for (const child of directChildren) {
    allDescendants.push(child.id);
    // ?? quy tìm ti?p các nhánh con c?a child
    // @ts-ignore
    allDescendants = allDescendants.concat(getBranchDescendants(questions, child.id, child.parentOptionId));
  }
  return allDescendants;
}

// Tree node cho kh?o sát d?ng cây (dùng cho flow m?i)
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
  // ... các tr??ng khác n?u c?n ...
}

export interface SurveyTreeOption {
  id: string;
  content: string;
  value: string | number;
  nextQuestion?: SurveyTreeNode;
  conditionType?: 'AND' | 'OR' | null;
  branchOptionIds?: (string | number)[] | null;
}

// So sánh hai m?ng ?ã sort, lo?i b? null/undefined
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  for (let i = 0; i < sortedA.length; i++) {
    if (sortedA[i] !== sortedB[i]) return false;
  }
  return true;
}

// Gom nhóm các option thành các nhóm nhánh d?a trên branchOptionIds + conditionType
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

// Duy?t flow nhánh: tr? v? m?ng các node theo flow ?ã ch?n
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
      // Gom nhóm nhánh cho SingleChoice
      const branchGroups = groupBranchOptions(currentNode.options);
      for (const key in branchGroups) {
        const group = branchGroups[key];
        const conditionType = group[0].conditionType;
        const branchOptionIds = group[0].branchOptionIds?.map(String) || [];
        const selected = [String(answer)];
        const nextQuestion = group.find(o => o.nextQuestion != null)?.nextQuestion;
        if (conditionType === 'AND') {
          // ?úng và ??: selected ph?i ch?a t?t c? branchOptionIds và không th?a
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
      // N?u không kh?p ?i?u ki?n nhánh, KHÔNG ?i nextQuestion n?u option là nhánh
      if (!branchMatched) {
        const selectedOpt = currentNode.options.find(opt => String(opt.value ?? opt.id) === String(answer));
        if (selectedOpt && (!selectedOpt.conditionType && !selectedOpt.branchOptionIds) && selectedOpt.nextQuestion) {
          nextNode = selectedOpt.nextQuestion;
        }
      }
    } else if (currentNode.type === QuestionType.MULTIPLE_CHOICE && Array.isArray(answer)) {
      // Gom nhóm nhánh cho MultiChoice
      const branchGroups = groupBranchOptions(currentNode.options);
      const selected = answer.filter(x => x !== null && x !== undefined).map(String);
      for (const key in branchGroups) {
        const group = branchGroups[key];
        const conditionType = group[0].conditionType;
        const branchOptionIds = group[0].branchOptionIds?.map(String) || [];
        const nextQuestion = group.find(o => o.nextQuestion != null)?.nextQuestion;
        if (conditionType === 'AND') {
          // ?úng và ??: selected ph?i ch?a t?t c? branchOptionIds và không th?a
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
      // N?u không kh?p ?i?u ki?n nhánh, KHÔNG ?i nextQuestion n?u option là nhánh
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
      // N?u không còn nhánh ?? ?i, break và báo hi?u k?t thúc flow nhánh
      break;
    }
  }
  // N?u flow ch? có rootNode (không ?i nhánh), return flow nh? c?
  // N?u flow có nhi?u node (có ?i nhánh), nh?ng không còn nextNode, coi nh? k?t thúc nhánh, frontend s? t? chuy?n sang root ti?p theo
  return flow;
}

// Reset flow khi ??i ?áp án: c?t flow t?i nodeIndex
export function resetSurveyFlow(
  flow: SurveyTreeNode[],
  nodeIndex: number
): SurveyTreeNode[] {
  return flow.slice(0, nodeIndex + 1);
}
