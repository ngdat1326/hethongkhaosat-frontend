import React, { useState, useEffect } from 'react';
import { QuestionType } from '../../types/survey';
import type { Question } from '../../types/survey';
import { X, Circle, CheckSquare, Type, Star, GitBranch, Plus, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../../config';

// Thêm các endpoint API
const API_QUESTION = `${API_BASE_URL}/api/ManageQuestion`;
const API_OPTION = `${API_BASE_URL}/api/ManageOption`;
const API_BRANCH = `${API_BASE_URL}/api/ManageQuestionBranch`;

interface QuestionModalProps {
    question?: Question | null;
    questions: Question[];
    surveyId?: string;
    parentQuestionId?: string; // Thêm props này
    onSave: (question: Partial<Question>) => void;
    onCancel: () => void;
    onDelete?: (id: string) => void;
}

const typeOptions = [
    { value: QuestionType.SINGLE_CHOICE, label: 'Trắc nghiệm 1 lựa chọn', icon: <Circle className="w-5 h-5 text-green-600" /> },
    { value: QuestionType.MULTIPLE_CHOICE, label: 'Trắc nghiệm nhiều lựa chọn', icon: <CheckSquare className="w-5 h-5 text-green-600" /> },
    { value: QuestionType.TEXT, label: 'Nhập văn bản', icon: <Type className="w-5 h-5 text-purple-600" /> },
    { value: QuestionType.RATING, label: 'Đánh giá thang điểm', icon: <Star className="w-5 h-5 text-yellow-600" /> },
];

const QuestionModal: React.FC<QuestionModalProps> = ({ question, questions, surveyId, parentQuestionId: propParentQuestionId, onSave, onCancel, onDelete }) => {
    const [type, setType] = useState<QuestionType>(question?.type || QuestionType.SINGLE_CHOICE);
    const [text, setText] = useState<string>(question?.text || '');
    const [isBranch, setIsBranch] = useState<boolean>(!!question?.isConditional);
    const [required, setRequired] = useState<boolean>(!!question?.required);
    const [options, setOptions] = useState<{ content: string; value?: string; id?: string }[]>(question?.options ? question.options.map(o => ({ content: o.content, value: o.value, id: o.id })) : [{ content: '' }, { content: '' }]);
    const [minRating, setMinRating] = useState<number>(question?.minRating || 1);
    const [maxRating, setMaxRating] = useState<number>(question?.maxRating || 5);
    const [loading, setLoading] = useState(false);
    const [questionTypes, setQuestionTypes] = useState<{ id: number; code: string; name: string }[]>([]);
    // Thêm state cho điều kiện phân nhánh (mới)
    const [parentQuestionId, setParentQuestionId] = useState<string>(question?.condition?.questionId || propParentQuestionId || '');
    const [branchOptionIds, setBranchOptionIds] = useState<string[]>([]); // optionIds cho branch
    const [branchConditionType, setBranchConditionType] = useState<'AND' | 'OR'>('AND');

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`${API_BASE_URL}/api/ManageQuestionType`, {
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

    // Nếu có parentQuestionId truyền vào thì chỉ hiển thị đúng câu đó
    const branchIds = questions.flatMap(q => (q.options || []).map(opt => opt.nextQuestionId)).filter(Boolean);
    const validParentQuestions = propParentQuestionId
        ? questions.filter(q => q.id === propParentQuestionId)
        : questions.filter(q => q.id !== question?.id && !branchIds.includes(q.id));
    const parentQuestion = validParentQuestions.find(q => q.id === (parentQuestionId || ''));
    const parentOptions = parentQuestion?.options || [];

    // Thêm biến kiểm tra tất cả option đã có phân nhánh (single choice)
    const allOptionsBranched = parentQuestion && parentQuestion.type === QuestionType.SINGLE_CHOICE && parentOptions.length > 0 && parentOptions.every(opt => !!opt.nextQuestionId);

    const handleOptionChange = (idx: number, value: string) => {
        setOptions(opts => opts.map((opt, i) => i === idx ? { ...opt, content: value } : opt));
    };

    const handleAddOption = () => {
        setOptions(opts => [...opts, { content: '' }]);
    };

    const handleRemoveOption = async (idx: number) => {
        const opt = options[idx];
        // Kiểm tra option này có phải là option của câu hỏi gốc có phân nhánh không
        // Tìm trong danh sách questions, có câu hỏi nào có condition.questionId === question?.id && condition.value === opt.value
        const isBranchRootOption = questions.some(q => q.condition && q.condition.questionId === question?.id && q.condition.value === (opt.id || opt.value));
        if (isBranchRootOption) {
            if (!window.confirm('Xóa lựa chọn này sẽ xóa luôn liên kết tới câu hỏi phân nhánh. Bạn có chắc chắn muốn xóa không?')) return;
        } else {
            if (!window.confirm('Bạn có chắc muốn xóa lựa chọn này?')) return;
        }
        if (opt.id) {
            // Nếu option đã có id, gọi API xóa
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${API_OPTION}/${opt.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    }
                });
                if (!res.ok) {
                    alert('Lỗi khi xóa lựa chọn!');
                    return;
                }
            } catch (err) {
                console.error(err);
                return;
            }
        }
        setOptions(opts => opts.filter((_, i) => i !== idx));
    };

    // Thêm/sửa câu hỏi
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return alert('Vui lòng nhập nội dung câu hỏi!');
        if ((type === QuestionType.SINGLE_CHOICE || type === QuestionType.MULTIPLE_CHOICE) && options.filter(opt => opt.content.trim()).length < 2) {
            return alert('Câu hỏi trắc nghiệm phải có ít nhất 2 lựa chọn!');
        }
        if (type === QuestionType.RATING && (minRating >= maxRating)) {
            return alert('Thang điểm không hợp lệ!');
        }
        if (isBranch && (!parentQuestionId || branchOptionIds.length === 0)) {
            return alert('Vui lòng chọn câu hỏi gốc và lựa chọn điều kiện!');
        }
        // Nếu là single choice và tất cả option đã có phân nhánh thì không cho submit
        if (isBranch && parentQuestion?.type === QuestionType.SINGLE_CHOICE && allOptionsBranched) {
            return alert('Tất cả lựa chọn đã có câu hỏi phân nhánh. Không thể thêm mới.');
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Lấy đúng id loại câu hỏi từ backend
            const typeObj = questionTypes.find(t =>
                (type === QuestionType.SINGLE_CHOICE && t.code === 'SingleChoice') ||
                (type === QuestionType.MULTIPLE_CHOICE && t.code === 'MultiChoice') ||
                (type === QuestionType.TEXT && t.code === 'Text') ||
                (type === QuestionType.RATING && t.code === 'Scale')
            );
            const questionPayload: any = {
                surveyId: surveyId ? Number(surveyId) : undefined,
                content: text,
                questionTypeId: typeObj?.id,
                order: question?.order || questions.length + 1,
                isRequired: required,
                condition: isBranch ? {
                    questionId: parentQuestionId,
                    value: branchOptionIds.join(','),
                    operator: branchConditionType === 'AND' ? 'equals' : 'contains'
                } : undefined
            };
            let questionRes;
            let response;
            if (!question?.id || question.id.startsWith('new')) {
                response = await fetch(API_QUESTION, {
                    method: 'POST',
                    headers:
                    {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(questionPayload)
                });
            } else {
                response = await fetch(`${API_QUESTION}/${question.id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(questionPayload)
                });
            }
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Lỗi tạo/cập nhật câu hỏi:', errorText);
                alert('Lỗi tạo/cập nhật câu hỏi! Xem chi tiết ở console.');
                setLoading(false);
                return;
            }
            questionRes = await response.json();
            // Tạo/sửa option
            let optionIds: string[] = [];
            if (type === QuestionType.SINGLE_CHOICE || type === QuestionType.MULTIPLE_CHOICE) {
                for (const opt of options.filter(opt => opt.content.trim())) {
                    const optionPayload = {
                        questionId: questionRes.id,
                        content: opt.content,
                        value: opt.value || null
                    };
                    let optionRes;
                    let optionResponse;
                    if (!opt.id || opt.id.startsWith('new')) {
                        optionResponse = await fetch(API_OPTION, {
                            method: 'POST',
                            headers: {
                                'Authorization': token ? `Bearer ${token}` : '',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(optionPayload)
                        });
                    } else {
                        optionResponse = await fetch(`${API_OPTION}/${opt.id}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': token ? `Bearer ${token}` : '',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(optionPayload)
                        });
                    }
                    if (!optionResponse.ok) {
                        const errorText = await optionResponse.text();
                        console.error('Lỗi tạo/cập nhật lựa chọn:', errorText);
                        alert('Lỗi tạo/cập nhật lựa chọn! Xem chi tiết ở console.');
                        setLoading(false);
                        return;
                    }
                    optionRes = await optionResponse.json();
                    opt.id = optionRes.id;
                    if (opt.id) optionIds.push(opt.id);
                }
            }
            // Nếu là câu hỏi thang điểm, tạo options từ minRating-maxRating
            if (type === QuestionType.RATING) {
                // Sử dụng API replace-for-question cho rating
                const ratingOptions = [];
                for (let i = minRating; i <= maxRating; i++) {
                    ratingOptions.push({ questionId: questionRes.id, content: String(i), value: String(i) });
                }
                const replaceRes = await fetch(`${API_OPTION}/replace-for-question/${questionRes.id}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(ratingOptions)
                });
                if (!replaceRes.ok) {
                    const errorText = await replaceRes.text();
                    console.error('Lỗi cập nhật thang điểm:', errorText);
                    alert('Lỗi cập nhật thang điểm! Xem chi tiết ở console.');
                    setLoading(false);
                    return;
                }
            }
            // Nếu là câu hỏi phân nhánh, tạo branch mới với optionIds và conditionType
            if (isBranch && parentQuestionId && branchOptionIds.length > 0) {
                let branchType = branchConditionType;
                if (parentQuestion?.type === QuestionType.RATING) {
                    branchType = 'OR';
                }
                await fetch(API_BRANCH, {
                    method: 'POST',
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : '',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        currentQuestionId: parentQuestionId,
                        nextQuestionId: questionRes.id,
                        conditionType: branchType,
                        optionIds: branchOptionIds
                    })
                });
            }
            setLoading(false);
            onSave({
                ...question,
                id: questionRes.id,
                type,
                text,
                required,
                isConditional: isBranch,
                minRating: type === QuestionType.RATING ? minRating : undefined,
                maxRating: type === QuestionType.RATING ? maxRating : undefined,
                options: options.map((opt, idx) => ({
                    id: opt.id || optionIds[idx],
                    content: opt.content,
                    value: opt.value || opt.content
                })),
                order: question?.order || questions.length + 1
            });
        } catch (err) {
            setLoading(false);
            alert('Lỗi khi lưu câu hỏi!');
            console.error(err);
        }
    };

    // Xóa câu hỏi
    const handleDelete = async () => {
        if (!question?.id) return;
        if (!window.confirm('Bạn có chắc muốn xóa câu hỏi này?')) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_QUESTION}/${question.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });
            setLoading(false);
            if (onDelete) onDelete(question.id);
            onCancel();
        } catch (err) {
            setLoading(false);
            alert('Lỗi khi xóa câu hỏi!');
            console.error(err);
        }
    };

    // Thêm sự kiện onPaste vào input đáp án. Khi dán nhiều dòng, sẽ tự động tách thành nhiều lựa chọn mới giống Google Form.
    const handlePasteOption = (e: React.ClipboardEvent<HTMLInputElement>, idx: number) => {
        const pasted = (e.clipboardData || (window as any).clipboardData).getData('text');
        const items = pasted
            .split(/\r?\n/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
        if (items.length > 1) {
            e.preventDefault();
            setOptions(opts => {
                const before = opts.slice(0, idx);
                const after = opts.slice(idx + items.length);
                const newOptions = items.map(content => ({ content }));
                return [...before, ...newOptions, ...after];
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 font-sans">
            <div className="bg-white  max-w-lg w-full shadow-lg max-h-[90vh] flex flex-col">
                <form className="flex-1 overflow-y-auto p-8 space-y-6 relative" onSubmit={handleSubmit}>
                    <button type="button" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600" onClick={onCancel}><X className="w-6 h-6" /></button>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{question ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}</h2>
                    {/* Loại câu hỏi */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Loại câu hỏi <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-2 gap-3">
                            {typeOptions.map(opt => (
                                <button type="button" key={opt.value} className={`flex items-center gap-2 px-4 py-3 border ${type === opt.value ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white'} font-medium text-gray-900`} onClick={() => setType(opt.value)}>
                                    {opt.icon}
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Phân nhánh */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input type="checkbox" checked={isBranch} onChange={e => setIsBranch(e.target.checked)} className="accent-green-600" />
                            <GitBranch className="w-4 h-4 text-green-600" /> Đây là câu hỏi phân nhánh
                        </label>
                        {isBranch && (
                            <div className="bg-green-50 border border-green-200 p-4 mt-3">
                                <div className="flex gap-4 items-center mb-2">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-green-900 mb-1">Câu hỏi gốc <span className="text-red-500">*</span></label>
                                        <select className="w-full border border-gray-300 px-3 py-2" value={parentQuestionId} onChange={e => { setParentQuestionId(e.target.value); setBranchOptionIds([]); }} required>
                                            <option value="">Chọn câu hỏi gốc</option>
                                            {validParentQuestions.map(q => (
                                                <option key={q.id} value={q.id}>{q.text}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-green-900 mb-1">Kiểu điều kiện <span className="text-red-500">*</span></label>
                                        <select
                                            className="w-full border border-gray-300 px-3 py-2"
                                            value={parentQuestion?.type === QuestionType.RATING ? 'OR' : branchConditionType}
                                            onChange={e => setBranchConditionType(e.target.value as 'AND' | 'OR')}
                                            required
                                        >
                                            {parentQuestion?.type !== QuestionType.RATING && parentQuestion?.type !== QuestionType.SINGLE_CHOICE && <option value="AND">Chọn tất cả (AND)</option>}
                                            <option value="OR">Chỉ cần 1 (OR)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <label className="block text-sm font-medium text-green-900 mb-1">Lựa chọn điều kiện <span className="text-red-500">*</span></label>
                                    {/* Nếu là rating scale hoặc nhiều lựa chọn thì cho chọn nhiều đáp án, nhưng với rating scale thì disable nếu option đã có phân nhánh */}
                                    {parentQuestion?.type === QuestionType.RATING || parentQuestion?.type === QuestionType.MULTIPLE_CHOICE ? (
                                        <div className="flex flex-wrap gap-3">
                                            {parentOptions.map(opt => {
                                                const isOptionBranched = !!opt.nextQuestionId;
                                                return (
                                                    <label key={opt.id} className={`flex items-center gap-2 bg-white border border-green-200 px-2 py-1 cursor-pointer ${isOptionBranched ? 'opacity-50' : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={branchOptionIds.includes(opt.id!)}
                                                            onChange={e => {
                                                                if (e.target.checked) setBranchOptionIds(ids => [...ids, opt.id!]);
                                                                else setBranchOptionIds(ids => ids.filter(id => id !== opt.id));
                                                            }}
                                                            disabled={isOptionBranched}
                                                        />
                                                        {opt.content}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : parentQuestion?.type === QuestionType.SINGLE_CHOICE ? (
                                        <div className="flex flex-col gap-2">
                                            {parentOptions.map(opt => {
                                                const isOptionBranched = !!opt.nextQuestionId;
                                                return (
                                                    <label key={opt.id} className={`flex items-center gap-2 bg-white border border-green-200 px-2 py-1 cursor-pointer ${isOptionBranched ? 'opacity-50' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            name="branchOptionRadio"
                                                            value={opt.id}
                                                            checked={branchOptionIds.includes(opt.id!)}
                                                            onChange={() => setBranchOptionIds([opt.id!])}
                                                            disabled={isOptionBranched || allOptionsBranched}
                                                        />
                                                        {opt.content}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                    {/* Thông báo nếu tất cả lựa chọn đã có phân nhánh (rating scale/multiple choice) */}
                                    {(parentQuestion?.type === QuestionType.RATING || parentQuestion?.type === QuestionType.MULTIPLE_CHOICE) && parentOptions.length > 0 && parentOptions.every(opt => !!opt.nextQuestionId) && (
                                        <div className="text-xs text-red-600 mt-2">Tất cả lựa chọn đã có câu hỏi phân nhánh. Không thể thêm mới.</div>
                                    )}
                                </div>
                                {/* Disable nếu tất cả option đã có phân nhánh */}
                                {parentQuestion?.type === QuestionType.SINGLE_CHOICE && allOptionsBranched && (
                                    <div className="text-xs text-red-600 mt-2">Tất cả lựa chọn đã có câu hỏi phân nhánh. Không thể thêm mới.</div>
                                )}
                                {/* Kiểu điều kiện chỉ là OR nếu là rating scale */}
                                {parentQuestion?.type === QuestionType.RATING && (
                                    <input type="hidden" value="OR" />
                                )}
                                <div className="text-xs text-green-700 bg-green-100 px-2 py-1 mt-2">
                                    <strong>Lưu ý:</strong> Câu hỏi này sẽ chỉ hiển thị khi người dùng trả lời câu hỏi gốc thỏa mãn điều kiện trên.
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Nội dung câu hỏi */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nội dung câu hỏi <span className="text-red-500">*</span></label>
                        <textarea className="w-full border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500" rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="Nhập nội dung câu hỏi..." required />
                    </div>
                    {/* Các lựa chọn */}
                    {(type === QuestionType.SINGLE_CHOICE || type === QuestionType.MULTIPLE_CHOICE) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Các lựa chọn <span className="text-red-500">*</span></label>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2" style={{background: '#fff'}}> {/* Thêm thanh cuộn */}
                                {options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 border border-gray-300 px-3 py-2"
                                            value={opt.content}
                                            onChange={e => handleOptionChange(idx, e.target.value)}
                                            onPaste={e => handlePasteOption(e, idx)}
                                            placeholder={`Lựa chọn ${idx + 1}`}
                                            required
                                        />
                                        {options.length > 2 && (
                                            <button type="button" className="text-red-500 hover:text-red-700" onClick={() => handleRemoveOption(idx)}><X className="w-4 h-4" /></button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" className="flex items-center gap-2 text-green-600 hover:text-green-700 mt-2" onClick={handleAddOption}>
                                    <Plus className="w-4 h-4" /> Thêm lựa chọn
                                </button>
                            </div>
                        </div>
                    )}
                    {/* Thang điểm */}
                    {type === QuestionType.RATING && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Thang điểm</label>
                            <div className="flex items-center gap-4 mb-2">
                                <span className="text-gray-600">Số lượng thang điểm:</span>
                                <select
                                    className="border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                    value={maxRating}
                                    onChange={e => {
                                        setMaxRating(Number(e.target.value));
                                        setMinRating(1); // Luôn là 1
                                    }}
                                >
                                    {[...Array(6)].map((_, i) => {
                                        const val = i + 5;
                                        return <option key={val} value={val}>{val}</option>;
                                    })}
                                </select>
                            </div>
                            {/* Preview các số và icon sao */}
                            <div className="flex gap-6 items-center justify-center mt-2">
                                {[...Array(maxRating)].map((_, i) => (
                                    <div key={i} className="flex flex-col items-center">
                                        <span className="text-gray-700 text-sm mb-1">{i + 1}</span>
                                        <Star className="w-7 h-7 text-yellow-400" fill="none" strokeWidth={2} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Bắt buộc */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className="accent-red-600" />
                            Câu hỏi bắt buộc
                        </label>
                    </div>
                    {/* Nút hành động */}
                    <div className="flex justify-between gap-3 pt-2 sticky bottom-0 bg-white pb-4">
                        {question?.id && (
                            <button type="button" className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold flex items-center gap-2" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4" /> Xóa
                            </button>
                        )}
                        <div className="flex gap-2">
                            <button type="button" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold" onClick={onCancel}>Hủy</button>
                            <button type="submit" disabled={loading || (parentQuestion?.type === QuestionType.SINGLE_CHOICE && allOptionsBranched)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold">{question ? 'Lưu' : 'Thêm câu hỏi'}</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuestionModal;
// This component provides a modal for creating or editing survey questions.