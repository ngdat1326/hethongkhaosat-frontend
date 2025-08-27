import React, { useState, useEffect } from 'react';
import { useSurvey } from '../contexts/SurveyContext';
import { useParams, useNavigate } from 'react-router-dom';
import { QuestionType } from '../types/survey';
import type { SurveyAnswer, Survey } from '../types/survey';
import Logo from './common/Logo';
import {
  CheckCircle,
  Heart,
  Clock,
  AlertCircle,
  Star,
  Send,
  Circle,
  CheckSquare,
  Type,
  ChevronRight
} from 'lucide-react';
import {
  buildSurveyFlow,
  resetSurveyFlow,
} from '../utils/surveyFlow';
import type { SurveyTreeNode } from '../utils/surveyFlow';
import { SurveyStatus } from '../types/survey';
import type { Branch } from '../types/survey';

function normalizeQuestionType(code: string): QuestionType {
  switch (code) {
    case 'SingleChoice':
      return QuestionType.SINGLE_CHOICE;
    case 'MultiChoice':
      return QuestionType.MULTIPLE_CHOICE;
    case 'Scale':
      return QuestionType.RATING;
    case 'Text':
      return QuestionType.TEXT;
    default:
      return QuestionType.TEXT;
  }
}

// Định nghĩa kiểu cho dữ liệu API trả về
interface APISurvey {
  id: string;
  title: string;
  description?: string;
  questions?: unknown[];
  status?: number;
}
interface APISurveyDetail {
  survey?: APISurvey;
  rootQuestions?: unknown[];
  questions?: unknown[];
  title?: string;
  description?: string;
  status?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// Thay thế any bằng unknown hoặc interface phù hợp
function normalizeSurveyTreeNode(node: Record<string, unknown>): SurveyTreeNode {
  return {
    id: String(node.id),
    text: node.content as string,
    type: normalizeQuestionType((node.questionType as { code?: string })?.code ?? ''),
    required: !!node.isRequired,
    order: node.order as number,
    options: Array.isArray(node.options)
      ? node.options.map((opt: Record<string, unknown>) => ({
          id: String(opt.id),
          content: opt.content as string,
          value: opt.value !== null && opt.value !== undefined ? String(opt.value) : String(opt.id),
          nextQuestion: opt.nextQuestion ? normalizeSurveyTreeNode(opt.nextQuestion as Record<string, unknown>) : undefined,
          conditionType: opt.conditionType as 'AND' | 'OR' | undefined,
          branchOptionIds: Array.isArray(opt.branchOptionIds) ? (opt.branchOptionIds as (string | number)[]).map(v => String(v)) : undefined,
        })
      ) : [],
    maxRating: node.maxRating as number | undefined,
    minRating: node.minRating as number | undefined,
    branches: node.branches as Branch[] || [],
  };
}

// Tách id từ slug ở cuối (dạng slug-base64id)
function decodeIdFromSlug(slug?: string): string | undefined {
  if (!slug) return undefined;
  const parts = slug.split('-');
  const base64Id = parts[parts.length - 1];
  try {
    return atob(base64Id);
  } catch {
    return undefined;
  }
}

const PatientSurvey: React.FC = () => {
  const { activeSurvey } = useSurvey();
  const { surveyId: rawSurveyId } = useParams<{ surveyId?: string }>();
  const surveyId = decodeIdFromSlug(rawSurveyId);
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<SurveyAnswer[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [surveyTree, setSurveyTree] = useState<SurveyTreeNode[] | null>(null);
  const [fetchedSurvey, setFetchedSurvey] = useState<Partial<Survey> | null>(null); // Lưu object survey từ API
  const [activeRootIndex, setActiveRootIndex] = useState(0);
  const [flow, setFlow] = useState<SurveyTreeNode[]>([]);
  const [pendingAnswers, setPendingAnswers] = useState<Record<string, string | string[] | number>>({});
  const [allFlows, setAllFlows] = useState<SurveyTreeNode[][]>([]);
  const [loading, setLoading] = useState(false);

  // Thêm state cho thông tin cá nhân
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Lấy dữ liệu và chuyển về tree
  useEffect(() => {
    if (surveyId) {
      setLoading(true);
      fetch(`/api/PublicSurvey/detail/${surveyId}`)
        .then(async res => {
          if (!res.ok) throw new Error('Không tìm thấy khảo sát');
          const text = await res.text();
          if (!text) throw new Error('Không có dữ liệu trả về từ server');
          const data = JSON.parse(text);
          setFetchedSurvey(data); // Lưu lại toàn bộ object
          setSurveyTree((data.rootQuestions || data.RootQuestions || []).map(normalizeSurveyTreeNode));
        })
        .catch(() => {
          setSurveyTree(null);
          setFetchedSurvey(null);
        })
        .finally(() => setLoading(false));
    } else if (activeSurvey) {
      setSurveyTree((activeSurvey.questions ? activeSurvey.questions : []).map(q => normalizeSurveyTreeNode(q as unknown as Record<string, unknown>)));
      setFetchedSurvey(activeSurvey);
    } else {
      setSurveyTree(null);
      setFetchedSurvey(null);
    }
  }, [activeSurvey, surveyId]);

  // Khi đổi root, reset flow
  useEffect(() => {
    if (surveyTree && surveyTree[activeRootIndex]) {
      setFlow([surveyTree[activeRootIndex]]);
    }
  }, [surveyTree, activeRootIndex]);

  // Khi trả lời, build lại flow
  useEffect(() => {
    if (surveyTree && surveyTree[activeRootIndex]) {
      setFlow(buildSurveyFlow(surveyTree[activeRootIndex], answers));
    }
  }, [answers, surveyTree, activeRootIndex]);

  // Khi dữ liệu khảo sát thay đổi, reset allFlows
  useEffect(() => {
    setAllFlows([]);
  }, [surveyTree]);

  // Khi activeRootIndex thay đổi, thêm flow mới vào allFlows
  useEffect(() => {
    if (surveyTree && surveyTree[activeRootIndex]) {
      const newFlow = buildSurveyFlow(surveyTree[activeRootIndex], answers);
      setAllFlows(prev => {
        const updated = [...prev];
        updated[activeRootIndex] = newFlow;
        return updated;
      });
    }
  }, [activeRootIndex, surveyTree, answers]);

  // Xử lý trả lời câu hỏi
  const handleAnswer = (questionId: string, value: string | string[] | number) => {
    // Nếu đổi đáp án ở giữa flow, reset các node con phía sau
    const idx = flow.findIndex(q => q.id === questionId);
    if (idx !== -1 && idx < flow.length - 1) {
      setAnswers(prev => {
        const newAnswers = prev.filter(a => flow.slice(0, idx + 1).some(q => q.id === a.questionId));
        const existing = newAnswers.find(a => a.questionId === questionId);
        if (existing) {
          existing.value = value;
        } else {
          newAnswers.push({ questionId, value });
        }
        return newAnswers;
      });
      setFlow(resetSurveyFlow(flow, idx));
    } else {
      setAnswers(prev => {
        const existing = prev.find(a => a.questionId === questionId);
        if (existing) {
          return prev.map(a => a.questionId === questionId ? { ...a, value } : a);
        }
        return [...prev, { questionId, value }];
      });
    }
    // Xóa pending khi đã lưu
    setPendingAnswers(prev => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  // Khi hết flow nhánh, tự động chuyển root tiếp theo
  useEffect(() => {
    if (!surveyTree || !surveyTree[activeRootIndex]) return;
    const lastNode = flow[flow.length - 1];
    const answer = answers.find(a => a.questionId === lastNode?.id)?.value;
    let shouldGoNext = false;
    if (lastNode && typeof answer !== 'undefined' && answer !== null && (!(Array.isArray(answer)) || answer.length > 0)) {
      if (lastNode.type === QuestionType.SINGLE_CHOICE && lastNode.options && lastNode.options.length > 0) {
        // Tìm option đã chọn
        const selectedOpt = lastNode.options.find(opt => String(opt.value ?? opt.id) === String(answer));
        if (selectedOpt && !selectedOpt.nextQuestion) shouldGoNext = true;
      } else if (lastNode.type === QuestionType.MULTIPLE_CHOICE && lastNode.options && lastNode.options.length > 0) {
        // Nếu tất cả option đã chọn đều không có nextQuestion
        const selectedOpts = lastNode.options.filter(opt => Array.isArray(answer) && answer.map(String).includes(String(opt.value ?? opt.id)));
        if (selectedOpts.length > 0 && selectedOpts.every(opt => !opt.nextQuestion)) shouldGoNext = true;
      } else if ((!lastNode.options || lastNode.options.length === 0) || (lastNode.type === QuestionType.TEXT || lastNode.type === QuestionType.RATING)) {
        // Text/Rating hoặc không có options
        shouldGoNext = true;
      }
    }
    if (shouldGoNext && activeRootIndex < (surveyTree.length - 1)) {
      const timer = setTimeout(() => setActiveRootIndex(activeRootIndex + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [flow, answers, surveyTree, activeRootIndex]);

  // Tính tổng số câu hỏi đã trả lời
  const allQuestions = allFlows.flat();
  const answeredCount = allQuestions.filter(q => {
    const ans = answers.find(a => a.questionId === q.id);
    return ans && ans.value !== undefined && ans.value !== null && (!(Array.isArray(ans.value)) || ans.value.length > 0);
  }).length;
  const progress = allQuestions.length > 0 ? (answeredCount / allQuestions.length) * 100 : 0;

  // Kiểm tra đã trả lời hết tất cả các câu hỏi
  const allAnswered = allQuestions.length > 0 && allQuestions.every(q => {
    const ans = answers.find(a => a.questionId === q.id);
    return ans && ans.value !== undefined && ans.value !== null && (!(Array.isArray(ans.value)) || ans.value.length > 0);
  });

  // Chuyển đổi đáp án sang đúng cấu trúc DTO backend
  // Sửa mapAnswersForBackend dùng SurveyAnswer thay vì any
  function mapAnswersForBackend(): object[] {
    const allQuestions: SurveyTreeNode[] = allFlows.flat();
    return answers.map(ans => {
      const question = allQuestions.find(q => q.id === ans.questionId);
      if (!question) return { questionId: Number(ans.questionId) };
      switch (question.type) {
        case QuestionType.SINGLE_CHOICE:
          return {
            questionId: Number(ans.questionId),
            optionId: typeof ans.value === 'number' ? ans.value : Number(ans.value),
            textAnswer: null,
            extraOptionIds: null
          };
        case QuestionType.RATING:
          return {
            questionId: Number(ans.questionId),
            optionId: null,
            textAnswer: String(ans.value),
            extraOptionIds: null
          };
        case QuestionType.MULTIPLE_CHOICE:
          return {
            questionId: Number(ans.questionId),
            optionId: null,
            textAnswer: null,
            extraOptionIds: Array.isArray(ans.value) ? JSON.stringify(ans.value.map(Number)) : null
          };
        case QuestionType.TEXT:
          return {
            questionId: Number(ans.questionId),
            optionId: null,
            textAnswer: String(ans.value),
            extraOptionIds: null
          };
        default:
          return {
            questionId: Number(ans.questionId),
            optionId: null,
            textAnswer: null,
            extraOptionIds: null
          };
      }
    });
  }

  // Gửi phản hồi
  const handleSubmit = async () => {
    if (!allAnswered) {
      setShowValidation(true);
      return;
    }
    try {
      const response = await fetch('/api/PublicSurvey/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId: (surveyId || activeSurvey?.id) as string,
          fullName,
          position,
          phoneNumber,
          companyName,
          answers: mapAnswersForBackend(),
        }),
      });
      if (!response.ok) throw new Error('Gửi khảo sát thất bại');
      setIsSubmitted(true);
    } catch {
      alert('Có lỗi xảy ra khi gửi khảo sát. Vui lòng thử lại!');
    }
  };

  // Lấy icon cho loại câu hỏi
  const getQuestionIcon = (type: QuestionType) => {
    switch (type) {
      case QuestionType.SINGLE_CHOICE:
        return <Circle className="w-6 h-6 text-blue-600" />;
      case QuestionType.MULTIPLE_CHOICE:
        return <CheckSquare className="w-6 h-6 text-green-600" />;
      case QuestionType.TEXT:
        return <Type className="w-6 h-6 text-purple-600" />;
      case QuestionType.RATING:
        return <Star className="w-6 h-6 text-yellow-600" />;
      default:
        return <Circle className="w-6 h-6 text-gray-600" />;
    }
  };

  // Lấy câu trả lời hiện tại
  const getCurrentAnswer = (questionId: string) => {
    const answer = answers.find(a => a.questionId === questionId);
    return answer?.value;
  };

  // Render câu hỏi
  const renderQuestion = (question: SurveyTreeNode, qIdx: number, rootIdx: number) => {
    const isAnswered = !!answers.find(a => a.questionId === question.id && a.value !== undefined && a.value !== null && (!(Array.isArray(a.value)) || a.value.length > 0));
    const isCurrentQuestion = (rootIdx === allFlows.length - 1) && (qIdx === allFlows[allFlows.length - 1].length - 1);
    const currentAnswer = getCurrentAnswer(question.id);
    const pendingValue = pendingAnswers[question.id] ?? currentAnswer;
    return (
      <div
        key={question.id}
        className={`transition-all duration-500 border-2 rounded-2xl p-8 mb-6 ${
          isAnswered && !isCurrentQuestion
            ? 'bg-white border-green-200'
            : isCurrentQuestion
            ? 'bg-white border-green-400'
            : 'bg-white border-gray-200'
        }`}
      >
        {/* Question Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start space-x-4 flex-1">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold"
              style={
                isAnswered && !isCurrentQuestion
                  ? { backgroundColor: '#22c55e', color: '#fff' } // xanh lá khi đã trả lời
                  : { backgroundColor: '#d0f5dd', color: '#319243' } // xanh lá pastel khi chưa trả lời
              }
            >
              {isAnswered && !isCurrentQuestion ? (
                <CheckCircle className="w-6 h-6" />
              ) : null}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                {getQuestionIcon(question.type)}
                <span className="text-sm font-medium text-gray-600">
                  {question.type === QuestionType.SINGLE_CHOICE && 'Chọn một đáp án'}
                  {question.type === QuestionType.MULTIPLE_CHOICE && 'Chọn nhiều đáp án'}
                  {question.type === QuestionType.TEXT && 'Nhập ý kiến'}
                  {question.type === QuestionType.RATING && 'Đánh giá'}
                </span>
                {question.required && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    Bắt buộc
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-800 leading-relaxed">
                {question.text}
              </h3>
            </div>
          </div>
        </div>
        {/* Question Content */}
        <div className="ml-16">
          {/* Single Choice */}
          {question.type === QuestionType.SINGLE_CHOICE && (
            <div className="space-y-3">
              {question.options?.map((option, optionIndex) => (
                <button
                  key={option.id || optionIndex}
                  onClick={() => handleAnswer(question.id, option.value ?? String(option.id))}
                  disabled={isAnswered && !isCurrentQuestion}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                    currentAnswer === option.value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
                  } ${isAnswered && !isCurrentQuestion ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      currentAnswer === option.value
                        ? 'border-green-500 bg-green-500'
                        : 'border-gray-300'
                    }`}>
                      {currentAnswer === option.value && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      )}
                    </div>
                    <span className="font-medium">{option.content}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {/* Multiple Choice */}
          {question.type === QuestionType.MULTIPLE_CHOICE && (
            <div className="space-y-3">
              {question.options?.map((option, optionIndex) => {
                const selectedOptions = Array.isArray(pendingValue) ? (pendingValue as (string | number)[]) : [];
                const isSelected = selectedOptions.includes(option.value ?? String(option.id));
                return (
                  <button
                    key={option.id || optionIndex}
                    onClick={() => {
                      if (isAnswered && !isCurrentQuestion) return;
                      const currentSelected = Array.isArray(pendingValue) ? (pendingValue as (string | number)[]) : [];
                      const newSelected = isSelected
                        ? currentSelected.filter((item) => item !== (option.value ?? String(option.id)))
                        : [...currentSelected, option.value ?? String(option.id)];
                      setPendingAnswers(prev => ({ ...prev, [question.id]: newSelected.map(String) }));
                    }}
                    disabled={isAnswered && !isCurrentQuestion}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 ${
                      isSelected
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                    } ${isAnswered && !isCurrentQuestion ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-medium">{option.content}</span>
                    </div>
                  </button>
                );
              })}
              {/* Nút Tiếp tục cho MULTIPLE_CHOICE */}
              {isCurrentQuestion && Array.isArray(pendingValue) && pendingValue.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => {
                      // Nếu flow không thay đổi (không đi nhánh), chuyển root tiếp theo
                      const prevFlow = buildSurveyFlow(question, answers);
                      handleAnswer(question.id, pendingValue || []);
                      setTimeout(() => {
                        const newFlow = buildSurveyFlow(question, [
                          ...answers.filter(a => a.questionId !== question.id),
                          { questionId: question.id, value: pendingValue }
                        ]);
                        if (
                          prevFlow.length === newFlow.length &&
                          activeRootIndex < (surveyTree?.length || 0) - 1
                        ) {
                          setActiveRootIndex(activeRootIndex + 1);
                        }
                      }, 100);
                    }}
                    className="flex items-center space-x-2 bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 transition-colors font-semibold"
                  >
                    <span>Tiếp tục</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Rating */}
          {question.type === QuestionType.RATING && (
            <div className="space-y-4">
              <div
                className={`w-full${(question.options?.length || question.maxRating || 5) > 5 ? ' overflow-x-auto' : ''}`}
              >
                <div
                  className="flex flex-col sm:grid"
                  style={{ gridTemplateColumns: `repeat(${question.options?.length || question.maxRating || 5}, 1fr)`, width: '100%' }}
                >
                  {Array.from({ length: question.options?.length || question.maxRating || 5 }, (_, i) => {
                    const rating = i + 1;
                    const isSelected = currentAnswer === rating;
                    return (
                      <div key={rating} className="flex items-center sm:flex-col sm:items-center justify-start sm:justify-center py-2">
                        {/* <span className="w-8 text-center text-gray-700 font-semibold text-base sm:hidden">{rating}</span> */}
                        <button
                          onClick={() => handleAnswer(question.id, rating)}
                          disabled={isAnswered && !isCurrentQuestion}
                          className={`mx-2 sm:mx-0 p-1 sm:p-3 transition-all duration-300 ${
                            isAnswered && !isCurrentQuestion ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                          }`}
                          style={{ width: 'auto' }}
                        >
                          <Star
                            className={`w-8 h-8 sm:w-12 sm:h-12 ${
                              isSelected || (typeof currentAnswer === 'number' && rating <= currentAnswer)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300 hover:text-yellow-300'
                            }`}
                          />
                        </button>
                        {/* Nhãn phụ luôn hiển thị, mobile bên phải sao, desktop dưới sao */}
                        <div className="ml-2 text-xs text-gray-700 font-semibold text-left sm:hidden" style={{minWidth:'90px'}}>
                          {rating} – {rating === 1 ? 'Không sử dụng' : rating === 2 ? 'Rất không hài lòng' : rating === 3 ? 'Không hài lòng' : rating === 4 ? 'Hài lòng' : rating === 5 ? 'Rất hài lòng' : ''}
                          {rating >= 2 && rating <= 5 && (
                            <span className="block text-gray-400">{rating === 2 ? '(hoặc: Rất kém)' : rating === 3 ? '(hoặc: Kém)' : rating === 4 ? '(hoặc: Tốt)' : rating === 5 ? '(hoặc: Rất tốt)' : ''}</span>
                          )}
                        </div>
                        {/* Desktop nhãn phụ */}
                        <div className="hidden sm:block text-xs mt-1 text-gray-700 font-semibold text-center" style={{minWidth:'90px'}}>
                          {rating} – {rating === 1 ? 'Không sử dụng' : rating === 2 ? 'Rất không hài lòng' : rating === 3 ? 'Không hài lòng' : rating === 4 ? 'Hài lòng' : rating === 5 ? 'Rất hài lòng' : ''}
                        </div>
                        {rating >= 2 && rating <= 5 && (
                          <div className="hidden sm:block text-xs text-gray-400 text-center" style={{minWidth:'90px'}}>
                            {rating === 2 ? '(hoặc: Rất kém)' : rating === 3 ? '(hoặc: Kém)' : rating === 4 ? '(hoặc: Tốt)' : rating === 5 ? '(hoặc: Rất tốt)' : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {currentAnswer && (
                <div className="mt-2 text-lg font-semibold text-yellow-600 text-center">
                  {currentAnswer}/{question.options?.length || question.maxRating || 5} sao
                </div>
              )}
            </div>
          )}
          {/* Text Input */}
          {question.type === QuestionType.TEXT && (
            <div className="space-y-4">
              <textarea
                value={typeof pendingValue === 'string' ? pendingValue : ''}
                onChange={(e) => setPendingAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                disabled={isAnswered && !isCurrentQuestion}
                rows={4}
                className={`w-full p-4 border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${
                  isAnswered && !isCurrentQuestion
                    ? 'bg-gray-50 border-gray-200 cursor-default'
                    : 'border-gray-300 focus:border-purple-500'
                }`}
                placeholder="Nhập ý kiến của bạn..."
              />
              {isCurrentQuestion && typeof pendingValue === 'string' && pendingValue.trim() !== '' && (
                <div className="flex justify-center">
                  <button
                    onClick={() => handleAnswer(question.id, pendingValue || '')}
                    className="flex items-center space-x-2 bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 transition-colors font-semibold"
                  >
                    <span>Tiếp tục</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}
          {/* Answer Display for completed questions */}
          {isAnswered && !isCurrentQuestion && (
            <div className="mt-4 p-4 bg-green-100 rounded-xl">
              <div className="flex items-center space-x-2 text-green-700 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Câu trả lời của bạn:</span>
              </div>
              <div className="text-green-800 font-medium">
                {question.type === QuestionType.MULTIPLE_CHOICE && Array.isArray(currentAnswer)
                  ? question.options
                    .filter(opt => currentAnswer.map(String).includes(String(opt.value ?? opt.id)))
                    .map(opt => opt.content)
                    .join(', ')
                  : question.type === QuestionType.SINGLE_CHOICE
                  ? (question.options.find(opt => String(opt.value ?? opt.id) === String(currentAnswer))?.content ?? String(currentAnswer))
                  : question.type === QuestionType.RATING
                  ? `${currentAnswer}/5 sao`
                  : String(currentAnswer)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#e6f9ec' }}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md w-full">
          <div className="text-8xl mb-6">⏳</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Đang tải khảo sát...</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Vui lòng chờ trong giây lát, hệ thống đang tải dữ liệu khảo sát.
          </p>
        </div>
      </div>
    );
  }

  if (!surveyTree) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md w-full">
          <div className="text-8xl mb-6">📋</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Không có khảo sát</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Hiện tại không có khảo sát nào đang hoạt động. Vui lòng liên hệ quầy lễ tân để được hỗ trợ.
          </p>
        </div>
      </div>
    );
  }

    if (!surveyTree && flow.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#e6f9ec' }}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md w-full">
          <div className="text-8xl mb-6">📋</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Không có câu hỏi phù hợp</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Hiện tại không có câu hỏi nào phù hợp để hiển thị. Vui lòng liên hệ quầy lễ tân để được hỗ trợ.
          </p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #e6f9ec 0%, #f8fff8 100%)' }}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-lg w-full">
          <div className="text-green-500 mb-8">
            <CheckCircle className="w-24 h-24 mx-auto" />
          </div>
          <h2 className="text-4xl font-bold text-gray-800 mb-6">Cảm ơn anh/chị!</h2>
          <p className="text-gray-600 mb-8 leading-relaxed text-lg">
            Phản hồi của anh/chị đã được ghi nhận thành công. Chúng tôi sẽ sử dụng những ý kiến quý báu này để không ngừng cải thiện chất lượng dịch vụ.
          </p>
          <div className="flex items-center justify-center text-red-500 bg-red-50 rounded-2xl p-4 border border-red-200 mb-6">
            <Heart className="w-6 h-6 mr-3 fill-current" />
            <span className="font-semibold text-lg">Chúc anh/chị sức khỏe và hạnh phúc!</span>
          </div>
          {/* Logo nhỏ lại, căn giữa, text xuống dưới 1 dòng */}
          <div className="flex flex-col items-center justify-center gap-2 mt-4">
            <Logo size="md" showText={false} imageUrl="/hospital-logo.png" className="logo-header mx-auto" />
            <span className="block text-base md:text-lg font-extrabold uppercase text-green-800">
              BỆNH VIỆN TRUNG ƯƠNG QUÂN ĐỘI 108
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Lấy tiêu đề khảo sát
  let surveyTitle = '';
  let surveyDescription = '';
  if (activeSurvey && activeSurvey.title) {
    surveyTitle = activeSurvey.title;
    surveyDescription = activeSurvey.description || '';
    if (fetchedSurvey && typeof (fetchedSurvey as APISurveyDetail).survey === 'object' && (fetchedSurvey as APISurveyDetail).survey !== null) {
      const surveyObj = (fetchedSurvey as APISurveyDetail).survey as APISurvey;
      surveyTitle = surveyObj.title || '';
      surveyDescription = surveyObj.description || '';
    } else if (fetchedSurvey) {
      surveyTitle = (fetchedSurvey as APISurvey).title || '';
      surveyDescription = (fetchedSurvey as APISurvey).description || '';
    }
  } else if (typeof window !== 'undefined' && (window as any).survey && (window as any).survey.title) {
    surveyTitle = (window as any).survey.title || '';
  }

  // Nếu khảo sát không hợp lệ, không hoạt động, hoặc không có câu hỏi phù hợp thì trả về chung 1 thông báo
  const surveyStatus = ((fetchedSurvey as APISurveyDetail)?.survey && typeof (fetchedSurvey as APISurveyDetail).survey?.status !== 'undefined')
    ? ((fetchedSurvey as APISurveyDetail).survey?.status)
    : (fetchedSurvey as APISurvey)?.status;
  if (!surveyTree || flow.length === 0 || (typeof surveyStatus !== 'undefined' && surveyStatus !== SurveyStatus.Active)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative" style={{
        backgroundImage: "url('/bv_108.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundColor: '#e6f9ec'
      }}>
        {/* Overlay màu xanh nhạt và blur giống trang survey */}
        <div className="absolute inset-0 z-0" style={{background: 'rgba(230,249,236,0.7)', backdropFilter: 'blur(1px)'}}></div>
        {/* Back button OUTSIDE the box */}
        <button
          onClick={() => navigate('/')}
          className="fixed top-8 left-8 px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold shadow hover:bg-green-200 transition-all"
          style={{zIndex: 50}}
        >
          ← Quay lại trang chính
        </button>
        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center max-w-md w-full relative z-10">
          <div className="text-8xl mb-6">📋</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Không có câu hỏi phù hợp</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Hiện tại không có câu hỏi nào phù hợp để hiển thị hoặc khảo sát không ở trạng thái hoạt động. Vui lòng liên hệ quầy lễ tân để được hỗ trợ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 relative" style={{
      backgroundImage: "url('/bv_108.jpg')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      backgroundColor: '#e6f9ec'
    }}>
      <div className="absolute inset-0 z-0" style={{background: 'rgba(230,249,236,0.7)', backdropFilter: 'blur(1px)'}}></div>
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="bg-white shadow-xl p-8 mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-2 sm:gap-0">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center justify-center mb-2 sm:mb-0 w-full sm:w-auto">
              <Logo size="xxlm" showText={false} imageUrl="/hospital-logo.png" className="logo-header mx-auto" />
            </div>
            <div className="w-full sm:ml-6 flex flex-col items-center sm:items-start text-center sm:text-left">
              <span className="hidden sm:block text-xl md:text-2xl font-extrabold uppercase tracking-widest text-green-800" style={{ letterSpacing: '0.1em' }}>
                BỆNH VIỆN TRUNG ƯƠNG QUÂN ĐỘI 108
              </span>
              <span
                className="block text-green-800 text-sm md:text-2xl mt-1 font-handwriting w-full text-center sm:text-left sm:whitespace-nowrap whitespace-normal"
                style={{ fontFamily: 'Dancing Script, Montserrat, Arial, Helvetica, sans-serif', fontStyle: 'italic', fontWeight: 500 }}
              >
                Chuyên sâu - Chuyên tâm - Vươn tầm quốc tế
              </span>
            </div>
          </div>

          {/* Survey Title phía trên progress bar */}
          {surveyTitle && (
            <div className="text-center mb-4">
              <span className="block text-2xl md:text-3xl font-extrabold text-green-700 tracking-wide drop-shadow-lg">
                {surveyTitle}
              </span>
              {/* Mô tả khảo sát nếu có */}
              {surveyDescription && (
                <div className="mt-1 text-base text-green-800/80 font-medium max-w-2xl mx-auto">
                  {surveyDescription}
                </div>
              )}
            </div>
          )}

          {/* Progress Bar */}
          <div className="relative">
            <div className="w-full bg-green-200 h-4 overflow-hidden">
              <div
                className="bg-green-500 h-4 transition-all duration-700 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-green opacity-30 animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Bắt đầu</span>
              <span>Hoàn thành</span>
            </div>
          </div>
        </div>
        {/* Thêm form nhập thông tin cá nhân */}
        <div className="bg-white shadow-lg p-6 mb-8 rounded-xl border border-gray-200">
          <h3 className="text-lg font-bold text-green-700 mb-4">Thông tin chung (không bắt buộc)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500" placeholder="Nhập họ tên" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input type="text" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500" placeholder="Nhập số điện thoại" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>
              <input type="text" value={position} onChange={e => setPosition(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500" placeholder="Nhập chức vụ" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị/Công ty</label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-green-500" placeholder="Nhập đơn vị/công ty" />
            </div>
          </div>
        </div>
        {/* Questions Display */}
        <div className="space-y-6">
          {allFlows.map((flowArr, rootIdx) =>
            flowArr.map((question, qIdx) =>
              renderQuestion(question, qIdx, rootIdx)
            )
          )}
        </div>
        {/* Submit Button */}
        {allAnswered && activeRootIndex >= (surveyTree?.length || 0) - 1 && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleSubmit}
              className="flex items-center space-x-3 px-12 py-4 font-semibold transition-all duration-300 transform bg-green-600 text-white hover:bg-green-700 hover:shadow-xl hover:scale-105 border-2 border-green-500"
            >
              <Send className="w-6 h-6" />
              <span>Hoàn thành khảo sát</span>
            </button>
          </div>
        )}
        {/* Validation Message */}
        {showValidation && (
          <div className="mt-6 flex items-center justify-center">
            <div className="flex items-center space-x-3 text-amber-700 bg-amber-50 p-4 border border-amber-200 animate-pulse">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Vui lòng trả lời tất cả câu hỏi bắt buộc để hoàn thành</span>
            </div>
          </div>
        )}
        {/* Help Section */}
        <div className="mt-8 text-center bg-white p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-center space-x-2 text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Thời gian ước tính: 2-3 phút</span>
          </div>
          <p className="text-sm text-gray-500 mb-2">
            🔒 Thông tin của anh/chị hoàn toàn ẩn danh và được bảo mật tuyệt đối
          </p>

        </div>
      </div>
    </div>
  );
};

export default PatientSurvey;