import React, { useEffect, useState } from 'react';
import { QuestionType } from '../types/survey';

interface BranchOption {
  id: string;
  content: string;
  value: string;
  nextQuestionId?: string;
}
interface Branch {
  id: string;
  currentQuestionId: string;
  nextQuestionId: string;
  conditionType: 'AND' | 'OR';
  optionIds: string[];
}
interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: BranchOption[];
  required: boolean;
  order: number;
  minRating?: number;
  maxRating?: number;
  branches?: Branch[];
  condition?: {
    questionId: string;
    value: string;
    operator?: 'equals' | 'contains' | 'not_equals';
  };
}
interface SurveyDetailDto {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

// Chuẩn hóa dữ liệu từ API giống PatientSurvey
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

function normalizeSurveyData(apiData: any) {
  return {
    id: String(apiData.survey.id),
    title: apiData.survey.title,
    description: apiData.survey.description,
    questions: apiData.questions.map((q: any) => ({
      id: String(q.id),
      text: q.content,
      order: q.order,
      required: q.isRequired,
      type: normalizeQuestionType(q.questionType?.code),
      options: q.options?.map((opt: any) => ({
        id: String(opt.id),
        content: opt.content,
        value: opt.value ?? String(opt.id),
        nextQuestionId: opt.nextQuestionId ? String(opt.nextQuestionId) : undefined,
      })) || [],
      branches: q.branches || [],
      minRating: q.minRating,
      maxRating: q.maxRating,
      condition: q.condition,
    }))
  };
}

const SurveyQuestions: React.FC<{ surveyId: string }> = ({ surveyId }) => {
  const [survey, setSurvey] = useState<SurveyDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`/api/PublicSurvey/detail/${surveyId}`)
      .then(async res => {
        if (!res.ok) {
          // Nếu không thành công, ném lỗi với status
          throw new Error(`Lỗi server: ${res.status}`);
        }
        // Nếu response không có nội dung, ném lỗi
        const text = await res.text();
        if (!text) throw new Error('Không có dữ liệu trả về từ server');
        const data = JSON.parse(text);
        // Sử dụng chuẩn hóa dữ liệu
        const surveyData = normalizeSurveyData(data);
        setSurvey(surveyData);
        setCurrentQuestionId(surveyData.questions?.[0]?.id || null);
        setLoading(false);
      })
      .catch(err => {
        console.error('Survey fetch error:', err);
        setSurvey(null);
        setLoading(false);
      });
  }, [surveyId]);

  if (loading) return <div>Đang tải khảo sát...</div>;
  if (!survey) return <div>Không tìm thấy khảo sát.</div>;

  // Tìm câu hỏi hiện tại
  const currentQuestion = survey.questions.find(q => q.id === currentQuestionId);

  // Xử lý trả lời và chuyển nhánh
  const handleAnswer = (question: Question, value: any) => {
    setAnswers(prev => ({ ...prev, [question.id]: value }));
    // Nếu có nhánh, chuyển tiếp theo nextQuestionId
    if (question.options && question.type === QuestionType.SINGLE_CHOICE) {
      const selectedOption = question.options.find(opt => opt.value === value);
      if (selectedOption?.nextQuestionId) {
        setCurrentQuestionId(selectedOption.nextQuestionId);
        return;
      }
    }
    // Nếu có branches (multi/scale), kiểm tra điều kiện
    if (question.branches && question.branches.length > 0) {
      for (const branch of question.branches) {
        const selectedValues = Array.isArray(value) ? value : [value];
        const match = branch.optionIds.every(id => selectedValues.includes(id));
        if (match) {
          setCurrentQuestionId(branch.nextQuestionId);
          return;
        }
      }
    }
    // Nếu không có nhánh, chuyển sang câu hỏi tiếp theo
    const idx = survey.questions.findIndex(q => q.id === question.id);
    if (idx < survey.questions.length - 1) {
      setCurrentQuestionId(survey.questions[idx + 1].id);
    } else {
      setCurrentQuestionId(null);
    }
  };

  // Hiển thị câu hỏi
  if (!currentQuestion) {
    return <div>Đã hoàn thành khảo sát. Xin cảm ơn!</div>;
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold mb-4">{survey.title}</h2>
      <p className="mb-6 text-gray-700">{survey.description}</p>
      <div className="mb-8 p-4 border rounded-lg bg-gray-50">
        <div className="font-semibold text-lg mb-3">{currentQuestion.text}</div>
        {/* Single Choice */}
        {currentQuestion.type === QuestionType.SINGLE_CHOICE && currentQuestion.options && (
          <div className="space-y-2">
            {currentQuestion.options.map(opt => (
              <button
                key={opt.id}
                className={`block w-full text-left p-3 border rounded-lg transition-all duration-200 ease-in-out hover:bg-green-50 flex items-center ${
                  answers[currentQuestion.id] === opt.value
                    ? 'bg-green-100 border-green-500'
                    : 'border-gray-200'
                }`}
                onClick={() => handleAnswer(currentQuestion, opt.value)}
              >
                {opt.content}
                {answers[currentQuestion.id] === opt.value && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-green-600 ml-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12l2 2 4-4m0 8l4-4 2 2"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
        {/* Multiple Choice */}
        {currentQuestion.type === QuestionType.MULTIPLE_CHOICE && currentQuestion.options && (
          <div className="space-y-2">
            {currentQuestion.options.map(opt => (
              <label key={opt.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(opt.value)}
                  onChange={e => {
                    const prev = Array.isArray(answers[currentQuestion.id]) ? answers[currentQuestion.id] : [];
                    const newValue = e.target.checked
                      ? [...prev, opt.value]
                      : prev.filter((v: string) => v !== opt.value);
                    handleAnswer(currentQuestion, newValue);
                  }}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="flex-grow">{opt.content}</span>
                {Array.isArray(answers[currentQuestion.id]) && answers[currentQuestion.id].includes(opt.value) && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12l2 2 4-4m0 8l4-4 2 2"
                    />
                  </svg>
                )}
              </label>
            ))}
            <button
              className="mt-3 px-4 py-2 w-full bg-green-600 text-white rounded transition-all duration-200 hover:bg-green-700"
              onClick={() => handleAnswer(currentQuestion, answers[currentQuestion.id] || [])}
            >
              Tiếp tục
            </button>
          </div>
        )}
        {/* Rating */}
        {currentQuestion.type === QuestionType.RATING && (
          <div className="space-x-2">
            {Array.from({ length: currentQuestion.maxRating || 5 }, (_, i) => i + (currentQuestion.minRating || 1)).map(rating => (
              <button
                key={rating}
                className={`px-4 py-2 rounded-full border transition-all duration-200 flex items-center justify-center ${
                  answers[currentQuestion.id] === rating
                    ? 'bg-yellow-200 border-yellow-500'
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
                onClick={() => handleAnswer(currentQuestion, rating)}
              >
                {rating}
                {answers[currentQuestion.id] === rating && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-yellow-600 ml-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12l2 2 4-4m0 8l4-4 2 2"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
        {/* Text */}
        {currentQuestion.type === QuestionType.TEXT && (
          <div>
            <textarea
              className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              rows={3}
              value={answers[currentQuestion.id] || ''}
              onChange={e => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
            />
            <button
              className="mt-3 px-4 py-2 w-full bg-green-600 text-white rounded transition-all duration-200 hover:bg-green-700"
              onClick={() => handleAnswer(currentQuestion, answers[currentQuestion.id] || '')}
            >
              Tiếp tục
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyQuestions;
