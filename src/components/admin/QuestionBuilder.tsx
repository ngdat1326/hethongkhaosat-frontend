import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QuestionType } from '../../types/survey';
import type { Question, Survey } from '../../types/survey';
import {
  Plus,
  ArrowLeft,
  Save,
  Trash2,
  Edit,
  GripVertical,
  Circle,
  CheckSquare,
  Type,
  Star,
  AlertCircle,
  CheckCircle,
  GitBranch,
  ArrowRight,
  Link,
  ArrowUp,
  ArrowDown,
  List
} from 'lucide-react';
import QuestionModal from './QuestionModal';

// Sửa lại URL API đúng với backend (chữ hoa):
const API_DETAIL = 'https://localhost:7226/api/ManageSurvey/detail';

// API endpoints
const API_QUESTION = 'https://localhost:7226/api/ManageQuestion';
const API_OPTION = 'https://localhost:7226/api/ManageOption';
const API_BRANCH = 'https://localhost:7226/api/ManageQuestionBranch';
const API_UPDATE_ORDER = 'https://localhost:7226/api/ManageQuestion/update-order';

const QuestionBuilder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | undefined>(undefined);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [branchParentId, setBranchParentId] = useState<string | null>(null);
  const [questionTypes, setQuestionTypes] = useState<{ id: number; code: string; name: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    console.log('surveyId truyền lên API:', id); // Kiểm tra giá trị id
    // Lấy token từ localStorage hoặc context
    const token = localStorage.getItem('token');
    fetch(`${API_DETAIL}/${id}`, {
      headers:
      {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => {
        setSurvey({
          ...data.survey,
          startDate: new Date(data.survey.startDate),
          endDate: new Date(data.survey.endDate)
        });
        // Map dữ liệu từ API sang đúng định dạng Question của frontend
        setQuestions((data.questions || []).map((q: Record<string, any>) => ({
          id: q.id.toString(),
          text: q.content || '',
          type: q.questionType?.code === 'SingleChoice' ? QuestionType.SINGLE_CHOICE
            : q.questionType?.code === 'MultiChoice' ? QuestionType.MULTIPLE_CHOICE
            : q.questionType?.code === 'Scale' ? QuestionType.RATING
            : q.questionType?.code === 'Text' ? QuestionType.TEXT
            : QuestionType.TEXT,
          options: q.options?.map((opt: Record<string, any>) => ({
            id: opt.id?.toString(),
            content: opt.content,
            value: opt.value,
            nextQuestionId: opt.nextQuestionId?.toString() || (q.branches?.find((b: Record<string, any>) => b.optionId === opt.id)?.nextQuestionId?.toString())
          })) || [],
          required: q.isRequired,
          order: q.order,
          branches: q.branches?.map((b: Record<string, any>) => ({
            id: b.id?.toString(),
            currentQuestionId: b.currentQuestionId?.toString(),
            nextQuestionId: b.nextQuestionId?.toString(),
            conditionType: b.conditionType,
            optionIds: b.optionIds?.map((oid: string | number) => oid.toString()) || []
          })) || []
        }))); // end setQuestions
      })
      .catch((err) => {
        setSurvey(undefined);
        setQuestions([]);
        console.error('Lỗi lấy chi tiết khảo sát:', err);
      });
  }, [id]);

  // Lấy danh sách loại câu hỏi từ backend
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('https://localhost:7226/api/ManageQuestionType', {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        setQuestionTypes(Array.isArray(data) ? data : []);
      })
      .catch(() => setQuestionTypes([]));
  }, []);

  // Loại bỏ các câu hỏi đã là phân nhánh (id trùng với nextQuestionId của bất kỳ option nào)
  const getParentQuestions = () => {
    // Tìm tất cả nextQuestionId của các option trong tất cả câu hỏi
    const branchIds = questions.flatMap(q => (q.options || []).map(opt => opt.nextQuestionId?.toString()).filter(Boolean));
    // Chỉ lấy những câu hỏi không phải là phân nhánh
    return questions.filter(q => !branchIds.includes(q.id.toString())).sort((a, b) => a.order - b.order);
  };

  // Đệ quy render các câu hỏi phân nhánh nhiều cấp
  const handleAddBranchForQuestion = (questionId: string) => {
    setShowAddQuestion(true);
    setBranchParentId(questionId);
  };

  // Màu cho các cấp phân nhánh (viền nhạt, dễ nhìn, nhiều màu hơn)
  const branchBorderColors = [
    '#80deea', // Cấp 1 - xanh cyan nhạt
    '#ffe0b2', // Cấp 2 - cam nhạt
    '#d1c4e9', // Cấp 3 - tím nhạt
    '#c8e6c9', // Cấp 4 - xanh lá nhạt
    '#fff9c4', // Cấp 5 - vàng nhạt
    '#f8bbd0', // Cấp 6 - hồng nhạt
    '#b3e5fc', // Cấp 7 - xanh dương nhạt
    '#ffd180', // Cấp 8 - cam pastel
    '#b2dfdb', // Cấp 9 - teal nhạt
    '#f0f4c3', // Cấp 10 - vàng chanh nhạt
    '#f5e1ee', // Cấp 11 - hồng tím nhạt
    '#cfd8dc', // Cấp 12 - xám xanh nhạt
    '#e6ee9c', // Cấp 13 - xanh lá mạ nhạt
    '#ffecb3', // Cấp 14 - vàng kem nhạt
    '#b2baf6', // Cấp 15 - xanh tím nhạt
    '#f9bb87', // Cấp 16 - cam đất nhạt
    '#b2ebf2', // Cấp 17 - xanh biển nhạt
    '#e1bee7', // Cấp 18 - tím pastel
    '#c5e1a5', // Cấp 19 - xanh lá cây nhạt
    '#ffe082', // Cấp 20 - vàng cam nhạt
  ];

  // Đệ quy render các câu hỏi phân nhánh nhiều cấp, truyền thêm level
  const renderBranchQuestion = (questionId: string, parentQuestion?: Question, parentOptionContent?: string, parentBranchConditionText?: string, level: number = 0) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return null;
    // Tìm các option có nextQuestionId
    const branchOptions = (question.options || []).filter(opt => opt.nextQuestionId);
    // Render các branch thực tế (tổ hợp)
    const branchNodes = (question.branches || []).map((branch) => {
      const childQuestion = questions.find(q => q.id === String(branch.nextQuestionId));
      if (!childQuestion) return null;
      // Lấy content các option theo optionIds
      const optionContents = (question.options || [])
        .filter(opt => (branch.optionIds || []).map(String).includes(String(opt.id)))
        .map(opt => opt.content);
      let conditionText = '';
      if (branch.conditionType === 'AND') {
        conditionText = `Khi trả lời đồng thời: ${optionContents.join(' và ')}`;
      } else {
        conditionText = `Khi trả lời một trong: ${optionContents.join(', ')}`;
      }
      return (
        <div key={`branch-${branch.id}`} style={{ border: `2px solid ${branchBorderColors[level % branchBorderColors.length]}` }} className="p-4 mx-4 mb-3 bg-white">
          <QuestionCard
            question={childQuestion}
            index={questions.findIndex(q => q.id === childQuestion.id)}
            onEdit={() => setEditingQuestion(childQuestion)}
            onDelete={() => handleDeleteQuestion(childQuestion.id)}
            isChild={true}
            isBranch={true}
            allQuestions={questions}
            onAddBranch={handleAddBranchForQuestion}
          />
          <div className="mt-4">
            <div className="bg-green-50 border border-green-200 px-4 py-2 text-green-700 text-sm flex items-center gap-2 mb-4">
              <Link className="w-4 h-4 text-green-600" />
              <span><strong>Điều kiện hiển thị:</strong> {conditionText}</span>
            </div>
          </div>
          {/* Đệ quy render tiếp các nhánh con */}
          {renderBranchQuestion(childQuestion.id, question, undefined, undefined, level + 1)}
        </div>
      );
    });
    // Render các option có nextQuestionId (SingleChoice)
    const optionNodes = branchOptions.length > 0 && question.type === QuestionType.SINGLE_CHOICE && (!question.branches || question.branches.length === 0)
      ? branchOptions.map((opt) => {
          const childQuestion = questions.find(q => q.id === opt.nextQuestionId?.toString());
          if (!childQuestion) return null;
          return (
            <div key={`opt-${childQuestion.id}`} style={{ border: `2px solid ${branchBorderColors[level % branchBorderColors.length]}` }} className="p-4 mx-4 mb-3 bg-white">
              <QuestionCard
                question={childQuestion}
                index={questions.findIndex(q => q.id === childQuestion.id)}
                onEdit={() => setEditingQuestion(childQuestion)}
                onDelete={() => handleDeleteQuestion(childQuestion.id)}
                isChild={true}
                isBranch={true}
                allQuestions={questions}
                onAddBranch={handleAddBranchForQuestion}
              />
              <div className="mt-4">
                <div className="bg-green-50 border border-green-200 px-4 py-2 text-green-700 text-sm flex items-center gap-2 mb-4">
                  <Link className="w-4 h-4 text-green-600" />
                  <span><strong>Điều kiện hiển thị:</strong> Khi câu hỏi trước trả lời \"{opt.content}\"</span>
                </div>
              </div>
              {/* Đệ quy render tiếp các nhánh con */}
              {renderBranchQuestion(childQuestion.id, question, opt.content, undefined, level + 1)}
            </div>
          );
       }) : null;
    return (
      <>
        {branchNodes}
        {optionNodes}
      </>
    );
  };

  const renderQuestionTree = () => {
    const parentQuestions = getParentQuestions();
    return (
      <div>
        {parentQuestions.map((parentQuestion) => (
          <div key={parentQuestion.id} className="bg-white border border-gray-300 shadow-sm mb-3">
            <div className="p-6">
              <QuestionCard
                question={parentQuestion}
                index={questions.findIndex(q => q.id === parentQuestion.id)}
                onEdit={() => setEditingQuestion(parentQuestion)}
                onDelete={() => handleDeleteQuestion(parentQuestion.id)}
                isParent={true}
                allQuestions={questions}
                onAddBranch={handleAddBranchForQuestion}
              />
            </div>
            {/* Đệ quy render các nhánh con */}
            {renderBranchQuestion(parentQuestion.id, undefined, undefined, undefined, 1)}
            <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => {
                  if (parentQuestion.type !== QuestionType.TEXT) {
                    setShowAddQuestion(true);
                    setBranchParentId(parentQuestion.id);
                  }
                }}
                className={`flex items-center gap-2 text-sm font-semibold px-2 py-1 rounded transition-colors
                  ${parentQuestion.type === QuestionType.TEXT
                    ? 'text-gray-400 cursor-not-allowed bg-transparent border-none'
                    : 'text-green-600 hover:text-green-700 bg-transparent border-none'}`}
                disabled={parentQuestion.type === QuestionType.TEXT}
                style={{ boxShadow: 'none', minWidth: 0 }}
              >
                <Plus className="w-4 h-4" />
                <span>Thêm câu hỏi phân nhánh</span>
              </button>
              {parentQuestion.type === QuestionType.TEXT && (
                <div className="text-xs text-green-600 font-semibold mt-2">Không thể thêm câu hỏi phân nhánh cho câu hỏi dạng nhập văn bản.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Hàm lưu câu hỏi, option, branch
  //const handleSaveQuestions = async () => {
  //  if (!survey) return;
  //  const token = localStorage.getItem('token');
  //  try {
  //    for (const q of questions) {
  //      // Tìm đúng id loại câu hỏi từ backend
  //      const typeObj = questionTypes.find(t =>
  //        (q.type === QuestionType.SINGLE_CHOICE && t.code === 'SingleChoice') ||
  //        (q.type === QuestionType.MULTIPLE_CHOICE && t.code === 'MultiChoice') ||
  //        (q.type === QuestionType.TEXT && t.code === 'Text') ||
  //        (q.type === QuestionType.RATING && t.code === 'Scale')
  //      );
  //      const questionPayload = {
  //        surveyId: survey.id,
  //        content: q.text,
  //        questionTypeId: typeObj?.id,
  //        order: q.order,
  //        isRequired: q.required
  //      };
  //      let questionRes;
  //      if (!q.id || q.id.startsWith('new')) {
  //        // Tạo mới
  //        questionRes = await fetch(API_QUESTION, {
  //          method: 'POST',
  //          headers:
  //          {
  //            'Authorization': token ? `Bearer ${token}` : '',
  //            'Content-Type': 'application/json'
  //          },
  //          body: JSON.stringify(questionPayload)
  //        }).then(res => res.json());
  //        q.id = questionRes.id.toString();
  //      } else {
  //        // Cập nhật
  //        await fetch(`${API_QUESTION}/${q.id}`, {
  //          method: 'PUT',
  //          headers:
  //          {
  //            'Authorization': token ? `Bearer ${token}` : '',
  //            'Content-Type': 'application/json'
  //          },
  //          body: JSON.stringify(questionPayload)
  //        });
  //      }
  //      // Lưu option cho câu hỏi (nếu có)
  //      if (q.options && (q.type === QuestionType.SINGLE_CHOICE || q.type === QuestionType.MULTIPLE_CHOICE)) {
  //        for (const opt of q.options) {
  //          const optionPayload = {
  //            questionId: q.id,
  //            content: opt.content,
  //            value: opt.value || null
  //          };
  //          let optionRes;
  //          if (!opt.id || opt.id.startsWith('new')) {
  //            // Tạo mới
  //            optionRes = await fetch(API_OPTION, {
  //              method: 'POST',
  //              headers: {
  //                'Authorization': token ? `Bearer ${token}` : '',
  //                'Content-Type': 'application/json'
  //              },
  //              body: JSON.stringify(optionPayload)
  //            }).then(res => res.json());
  //            opt.id = optionRes.id.toString();
  //          } else {
  //            // Cập nhật
  //            await fetch(`${API_OPTION}/${opt.id}`, {
  //              method: 'PUT',
  //              headers: {
  //                'Authorization': token ? `Bearer ${token}` : '',
  //                'Content-Type': 'application/json'
  //              },
  //              body: JSON.stringify(optionPayload)
  //            });
  //          }
  //          // Lưu branch nếu có nextQuestionId
  //          if (opt.nextQuestionId) {
  //            const branchPayload = {
  //              currentQuestionId: q.id,
  //              optionId: opt.id,
  //              nextQuestionId: opt.nextQuestionId
  //            };
  //            await fetch(API_BRANCH, {
  //              method: 'POST',
  //              headers: {
  //                'Authorization': token ? `Bearer ${token}` : '',
  //                'Content-Type': 'application/json'
  //              },
  //              body: JSON.stringify(branchPayload)
  //            });
  //          }
  //        }
  //      }
  //    }
  //    alert('Lưu câu hỏi thành công!');
  //  } catch (err) {
  //    alert('Lỗi khi lưu câu hỏi!');
  //    console.error(err);
  //  }
  //};

  // Hàm xóa câu hỏi
  const handleDeleteQuestion = async (id: string) => {
    const token = localStorage.getItem('token');
    if (!window.confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;
    try {
      await fetch(`${API_QUESTION}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      // Sau khi xóa, fetch lại survey và questions từ backend
      if (survey?.id) {
        const res = await fetch(`${API_DETAIL}/${survey.id}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        const data = await res.json();
        setSurvey({
          ...data.survey,
          startDate: new Date(data.survey.startDate),
          endDate: new Date(data.survey.endDate)
        });
        setQuestions((data.questions || []).map((q: Record<string, any>) => ({
          id: q.id.toString(),
          text: q.content || '',
          type: q.questionType?.code === 'SingleChoice' ? QuestionType.SINGLE_CHOICE
            : q.questionType?.code === 'MultiChoice' ? QuestionType.MULTIPLE_CHOICE
            : q.questionType?.code === 'Scale' ? QuestionType.RATING
            : q.questionType?.code === 'Text' ? QuestionType.TEXT
            : QuestionType.TEXT,
          options: q.options?.map((opt: Record<string, any>) => ({
            id: opt.id?.toString(),
            content: opt.content,
            value: opt.value,
            nextQuestionId: opt.nextQuestionId?.toString() || (q.branches?.find((b: Record<string, any>) => b.optionId === opt.id)?.nextQuestionId?.toString())
          })) || [],
          required: q.isRequired,
          order: q.order,
          branches: q.branches?.map((b: Record<string, any>) => ({
            id: b.id?.toString(),
            currentQuestionId: b.currentQuestionId?.toString(),
            nextQuestionId: b.nextQuestionId?.toString(),
            conditionType: b.conditionType,
            optionIds: b.optionIds?.map((oid: string | number) => oid.toString()) || []
          })) || []
        })));
      }
      alert('Đã xóa câu hỏi!');
    } catch (err) {
      alert('Lỗi khi xóa câu hỏi!');
      console.error(err);
    }
  };

  // Hàm cập nhật câu hỏi
  const handleEditQuestion = async (question: Partial<Question>) => {
    setEditingQuestion(null);
    setQuestions(prev => {
      // Nếu là câu hỏi phân nhánh (Single Choice) và có condition (tức là sửa option phân nhánh)
      if (question.condition && question.condition.questionId && question.condition.value) {
        // Tìm câu hỏi gốc
        const parentIdx = prev.findIndex(q => q.id === question.condition!.questionId);
        if (parentIdx === -1) return prev.map(q => q.id === question.id ? { ...q, ...question } : q);
        const parent = prev[parentIdx];
        // Tìm option mới cần phân nhánh
        const optionIdx = parent.options?.findIndex(opt => opt.value === question.condition!.value);
        if (optionIdx === undefined || optionIdx === -1) return prev.map(q => q.id === question.id ? { ...q, ...question } : q);
        // Xóa nextQuestionId ở tất cả option đang trỏ đến câu hỏi này (nếu có)
        const updatedOptions = parent.options!.map(opt =>
          opt.nextQuestionId === question.id ? { ...opt, nextQuestionId: undefined } : opt
        );
        // Gán nextQuestionId mới cho option mới
        updatedOptions[optionIdx] = { ...updatedOptions[optionIdx], nextQuestionId: question.id };
        // Cập nhật lại câu hỏi gốc
        const updatedParent = { ...parent, options: updatedOptions };
        // Cập nhật lại danh sách câu hỏi
        return prev.map((q, idx) => {
          if (q.id === question.id) return { ...q, ...question };
          if (idx === parentIdx) return updatedParent;
          return q;
        });
      }
      // Nếu không phải phân nhánh thì cập nhật bình thường
      return prev.map(q => q.id === question.id ? { ...q, ...question } : q);
    });
  };

  // Hàm thêm câu hỏi
  const handleAddQuestion = async (question: Partial<Question>) => {
    setShowAddQuestion(false);
    // Nếu là câu hỏi phân nhánh
    if (question.condition && question.condition.questionId && question.condition.value) {
      // Tạo id mới cho câu hỏi phân nhánh
      const newId = `new_${Date.now()}`;
      // Thêm vào danh sách câu hỏi
      setQuestions(prev => {
        // Tìm câu hỏi gốc
        const parentIdx = prev.findIndex(q => q.id === question.condition!.questionId);
        if (parentIdx === -1) return [...prev, { ...question, id: newId } as Question];
        // Tìm option cần phânnhánh
        const parent = prev[parentIdx];
        const optionIdx = parent.options?.findIndex(opt => opt.value === question.condition!.value);
        if (optionIdx === undefined || optionIdx === -1) return [...prev, { ...question, id: newId } as Question];
        // Gán nextQuestionId cho option
        const updatedOptions = parent.options!.map((opt, idx) => idx === optionIdx ? { ...opt, nextQuestionId: newId } : opt);
        // Cập nhật lại câu hỏi gốc
        const updatedParent = { ...parent, options: updatedOptions };
        // Trả về danh sách mới
        return prev.map((q, idx) => idx === parentIdx ? updatedParent : q).concat([{ ...question, id: newId } as Question]);
      });
    } else {
      // Nếu là câu hỏi thường
      setQuestions(prev => [...prev, { ...question, id: `new_${Date.now()}` } as Question]);
    }
  };

  // Hàm cập nhật lại thứ tự câu hỏi từ OrderModal
  const handleReorderQuestions = async (orderedQuestions: Question[]) => {
    setQuestions(orderedQuestions);
    // Gửi thứ tự mới lên backend cho tất cả câu hỏi (bao gồm cả nhánh)
    try {
      const token = localStorage.getItem('token');
      const payload = orderedQuestions
        .filter(q => !isNaN(Number(q.id)) && Number.isInteger(Number(q.id)) && !String(q.id).startsWith('new_'))
        .map((q, idx) => ({ id: Number(q.id), order: idx + 1 }));
      console.log('Payload gửi lên:', payload);
      const res = await fetch(API_UPDATE_ORDER, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Lỗi khi cập nhật thứ tự câu hỏi');
      // Sau khi cập nhật thành công, reload lại danh sách câu hỏi từ backend
      if (id) {
        const res2 = await fetch(`${API_DETAIL}/${id}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        });
        const data = await res2.json();
        setSurvey({
          ...data.survey,
          startDate: new Date(data.survey.startDate),
          endDate: new Date(data.survey.endDate)
        });
        setQuestions((data.questions || []).map((q: Record<string, any>) => ({
          id: q.id.toString(),
          text: q.content || '',
          type: q.questionType?.code === 'SingleChoice' ? QuestionType.SINGLE_CHOICE
            : q.questionType?.code === 'MultiChoice' ? QuestionType.MULTIPLE_CHOICE
            : q.questionType?.code === 'Scale' ? QuestionType.RATING
            : q.questionType?.code === 'Text' ? QuestionType.TEXT
            : QuestionType.TEXT,
          options: q.options?.map((opt: Record<string, any>) => ({
            id: opt.id?.toString(),
            content: opt.content,
            value: opt.value,
            nextQuestionId: opt.nextQuestionId?.toString() || (q.branches?.find((b: Record<string, any>) => b.optionId === opt.id)?.nextQuestionId?.toString())
          })) || [],
          required: q.isRequired,
          order: q.order,
          branches: q.branches?.map((b: Record<string, any>) => ({
            id: b.id?.toString(),
            currentQuestionId: b.currentQuestionId?.toString(),
            nextQuestionId: b.nextQuestionId?.toString(),
            conditionType: b.conditionType,
            optionIds: b.optionIds?.map((oid: string | number) => oid.toString()) || []
          })) || []
        })));
      }
      alert('Cập nhật thứ tự thành công!');
    } catch (err) {
      alert('Lỗi khi cập nhật thứ tự câu hỏi!');
      console.error(err);
    }
  };

  if (!survey) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy khảo sát</h3>
        <button
          onClick={() => navigate('/admin/surveys')}
          className="text-green-600 hover:text-green-700"
        >
          Quay lại danh sách khảo sát
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/admin/surveys')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại</span>
          </button>
          <div>
            {/*<h2 className="text-2xl font-bold text-gray-900">Tạo câu hỏi</h2>*/}
            {/*<p className="text-gray-600">{survey.title}</p>*/}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowOrderModal(true)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            <List className="w-5 h-5" />
            <span>Sắp xếp thứ tự</span>
          </button>
          {/*<button*/}
          {/*  onClick={handleSaveQuestions}*/}
          {/*  className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white"*/}
          {/*>*/}
          {/*  <Save className="w-5 h-5" />*/}
          {/*  <span>Lưu câu hỏi</span>*/}
          {/*</button>*/}
        </div>
      </div>

      {/* Survey Info */}
      <div className="bg-white shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
                  <div>
                      <h2 className="text-2xl font-semibold text-gray-900">Tạo câu hỏi cho khảo sát</h2>
            <h1 className="text-3xl font-bold text-gray-900">{survey.title}</h1>
            <p className="text-gray-600 mt-1">{survey.description}</p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span>Từ: {survey.startDate.toLocaleDateString('vi-VN')}</span>
              <span>Đến: {survey.endDate.toLocaleDateString('vi-VN')}</span>
              <span className="flex items-center space-x-1">
                <CheckCircle className="w-4 h-4" />
                <span>{questions.length} câu hỏi</span>
              </span>
              <span className="flex items-center space-x-1">
                <GitBranch className="w-4 h-4" />
                <span>{questions.filter(q => q.branches && q.branches.length > 0).length} câu hỏi phân nhánh</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Branching Guide */}
      <div className="bg-green-50 border border-green-200 p-4">
        <div className="flex items-start space-x-3">
          <GitBranch className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-900 mb-1">Hướng dẫn tạo câu hỏi phân nhánh</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>• <strong>Câu hỏi gốc:</strong> Tạo câu hỏi chính trước</p>
              <p>• <strong>Câu hỏi phân nhánh:</strong> Sẽ hiển thị dựa trên câu trả lời của câu hỏi gốc</p>
              <p>• <strong>Điều kiện:</strong> Thiết lập điều kiện khi nào câu hỏi phân nhánh sẽ hiển thị</p>
              <p>• <strong>Thứ tự:</strong> Sử dụng "Sắp xếp thứ tự" để điều chỉnh vị trí câu hỏi</p>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Tree View */}
      <div className="bg-white shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Cấu trúc câu hỏi phân nhánh ({questions.length})
            </h3>
            <button
              onClick={() => setShowAddQuestion(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 hover:bg-green-700"
            >
              <Plus className="w-5 h-5" />
              <span>Thêm câu hỏi</span>
            </button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-12">
            <Type className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Chưa có câu hỏi nào</p>
            <button
              onClick={() => setShowAddQuestion(true)}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Tạo câu hỏi đầu tiên
            </button>
          </div>
        ) :
          (
          <div className="p-6">
            {renderQuestionTree()}
          </div>
        )}
      </div>

      {/* Order Modal */}
      {showOrderModal && (
        <OrderModal
          questions={questions}
          onSave={handleReorderQuestions}
          onCancel={() => setShowOrderModal(false)}
        />
      )}

      {/* Add/Edit Question Modal */}
      {(showAddQuestion || editingQuestion) && (
        <QuestionModal
          question={editingQuestion}
          questions={questions}
          surveyId={survey?.id ? String(survey.id) : undefined}
          parentQuestionId={showAddQuestion && branchParentId ? branchParentId : undefined}
          onSave={async (question) => {
            if (editingQuestion) {
              await handleEditQuestion(question);
            } else {
              await handleAddQuestion(question);
            }
            // Sau khi lưu, reload lại survey từ backend
            if (id) {
              const token = localStorage.getItem('token');
              fetch(`${API_DETAIL}/${id}`, {
                headers: {
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json'
                }
              })
                .then(res => res.json())
                .then(data => {
                  setSurvey({
                    ...data.survey,
                    startDate: new Date(data.survey.startDate),
                    endDate: new Date(data.survey.endDate)
                  });
                  setQuestions((data.questions || []).map((q: Record<string, any>) => ({
                    id: q.id.toString(),
                    text: q.content || '',
                    type: q.questionType?.code === 'SingleChoice' ? QuestionType.SINGLE_CHOICE
                      : q.questionType?.code === 'MultiChoice' ? QuestionType.MULTIPLE_CHOICE
                      : q.questionType?.code === 'Scale' ? QuestionType.RATING
                      : q.questionType?.code === 'Text' ? QuestionType.TEXT
                      : QuestionType.TEXT,
                    options: q.options?.map((opt: Record<string, any>) => ({
                      id: opt.id?.toString(),
                      content: opt.content,
                      value: opt.value,
                      nextQuestionId: opt.nextQuestionId?.toString() || (q.branches?.find((b: Record<string, any>) => b.optionId === opt.id)?.nextQuestionId?.toString())
                    })) || [],
                    required: q.isRequired,
                    order: q.order,
                    branches: q.branches?.map((b: Record<string, any>) => ({
                      id: b.id?.toString(),
                      currentQuestionId: b.currentQuestionId?.toString(),
                      nextQuestionId: b.nextQuestionId?.toString(),
                      conditionType: b.conditionType,
                      optionIds: b.optionIds?.map((oid: string | number) => oid.toString()) || []
                    })) || []
                  })));
                });
            }
            setShowAddQuestion(false);
            setEditingQuestion(null);
            setBranchParentId(null);
          }}
          onCancel={() => {
            setShowAddQuestion(false);
            setEditingQuestion(null);
            setBranchParentId(null);
          }}
        />
      )}

      
    </div>
  );
};

// Question Card Component
interface QuestionCardProps {
  question: Question;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  isParent?: boolean;
  isChild?: boolean;
  isBranch?: boolean; // mới thêm để phân biệt card phân nhánh
  allQuestions: Question[];
  onAddBranch?: (questionId: string) => void; // thêm prop này
}

const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  index, 
  onEdit, 
  onDelete, 
  isParent,
  isChild,
  isBranch,
  allQuestions,
  onAddBranch
}) => {
  return (
    <div className="flex items-start gap-4">
      {!isChild && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <GripVertical className="w-5 h-5 text-gray-300" />
          <span className="text-xs text-gray-400 font-semibold">#{question.order}</span>
        </div>
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          {question.type === QuestionType.SINGLE_CHOICE && <Circle className="w-5 h-5 text-green-600" />}
          {question.type === QuestionType.MULTIPLE_CHOICE && <CheckSquare className="w-5 h-5 text-green-600" />}
          {question.type === QuestionType.TEXT && <Type className="w-5 h-5 text-purple-600" />}
          {question.type === QuestionType.RATING && <Star className="w-5 h-5 text-yellow-600" />}
          <span className="text-sm font-medium text-gray-700">
            {question.type === QuestionType.SINGLE_CHOICE && 'Trắc nghiệm 1 lựa chọn'}
            {question.type === QuestionType.MULTIPLE_CHOICE && 'Trắc nghiệm nhiều lựa chọn'}
            {question.type === QuestionType.TEXT && 'Nhập văn bản'}
            {question.type === QuestionType.RATING && 'Đánh giá thang điểm'}
          </span>
          {isParent && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold">Câu hỏi gốc</span>
          )}
          {isBranch && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1 font-semibold">
              <GitBranch className="w-3 h-3" />
              Phân nhánh
            </span>
          )}
          {question.required && (
            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-semibold">Bắt buộc</span>
          )}
        </div>
        <div className="mb-2 text-base font-semibold text-gray-900">
          {question.text}
        </div>
        {/* Hiển thị options */}
        {(question.type === QuestionType.SINGLE_CHOICE || question.type === QuestionType.MULTIPLE_CHOICE) && question.options && (
          <div className="mb-2">
            <ul className="space-y-1">
              {question.options.map((option, optionIndex) => (
                <li key={optionIndex} className="flex items-center gap-2 text-gray-700 text-sm">
                  {question.type === QuestionType.SINGLE_CHOICE ? (
                    <input type="radio" disabled className="accent-green-500" />
                  ) : (
                    <input type="checkbox" disabled className="accent-green-500" />
                  )}
                  <span>{option.content}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Hiển thị rating range */}
        {question.type === QuestionType.RATING && (
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-semibold text-gray-700">Thang điểm:</span> 1 - {question.options && question.options.length > 0 ? question.options.length : (question.maxRating || 5)}
          </div>
        )}
        {/* Nút thêm câu hỏi phân nhánh cho câu phân nhánh */}
        {isBranch && onAddBranch && (
          <div className="mt-2">
            <button
              onClick={() => onAddBranch(question.id)}
              className={`flex items-center gap-2 text-sm font-semibold px-2 py-1 rounded transition-colors
                ${question.type === QuestionType.TEXT
                  ? 'text-gray-400 cursor-not-allowed bg-transparent border-none'
                  : 'text-green-600 hover:text-green-700 bg-transparent border-none'}`}
              disabled={question.type === QuestionType.TEXT}
              style={{ boxShadow: 'none', minWidth: 0 }}
            >
              <Plus className="w-4 h-4" />
              <span>{question.type === QuestionType.TEXT ? 'Không thể thêm câu hỏi phân nhánh cho câu hỏi dạng nhập văn bản.' : 'Thêm câu hỏi phân nhánh'}</span>
            </button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={onEdit}
          className="text-green-600 hover:text-green-700"
          title="Chỉnh sửa"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-700"
          title="Xóa"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Order Modal Component
interface OrderModalProps {
  questions: Question[];
  onSave: (questions: Question[]) => void;
  onCancel: () => void;
}

const OrderModal: React.FC<OrderModalProps> = ({ questions, onSave, onCancel }) => {
  const [orderedQuestions, setOrderedQuestions] = useState([...questions].sort((a, b) => a.order - b.order));

  // Xác định các id câu nhánh (id nằm trong nextQuestionId của bất kỳ option nào)
  const branchIds = questions.flatMap(q => (q.options || []).map(opt => opt.nextQuestionId?.toString()).filter(Boolean));

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...orderedQuestions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newQuestions.length) {
      [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
      setOrderedQuestions(newQuestions);
    }
  };

  const handleSave = () => {
    onSave(orderedQuestions);
    onCancel();
  };

  const branchingCount = orderedQuestions.filter(
    q => branchIds.includes(q.id.toString()) || q.condition
  ).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Sắp xếp thứ tự câu hỏi</h3>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>Tổng câu hỏi: {orderedQuestions.length} </span>
                <span>Phân nhánh: {branchingCount}</span>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {orderedQuestions.map((question, index) => {
              const isBranch = branchIds.includes(question.id.toString());
              return (
                <div
                  key={question.id}
                  className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold text-xs">
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {question.text}
                    </div>
                    <div className="flex items-center gap-2 mt-1">                    
                      {(question.condition || isBranch) && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-semibold flex items-center gap-1">
                          <GitBranch className="w-3 h-3" />
                          Phân nhánh
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveQuestion(index, 'up')}
                      disabled={index === 0 || isBranch}
                      className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      title="Di chuyển lên"
                    >
                      <ArrowUp className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => moveQuestion(index, 'down')}
                      disabled={index === orderedQuestions.length - 1 || isBranch}
                      className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      title="Di chuyển xuống"
                    >
                      <ArrowDown className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t">
          <div className="flex justify-end gap-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBuilder;