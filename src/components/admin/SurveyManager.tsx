import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useSurvey } from '../../contexts/SurveyContext';
import SurveyCreator from './SurveyCreator';
import QuestionBuilder from './QuestionBuilder';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Pause, 
  Copy, 
  Calendar,
  Users,
  CheckCircle,
  MoreHorizontal,
  X,
  FileText
} from 'lucide-react';
import { SurveyStatus } from '../../types/survey';
import type { Survey } from '../../types/survey';
import { QRCodeCanvas } from 'qrcode.react';

interface Department { id: number; name: string; }
interface User { id: string; fullName: string; username: string; }

const statusMap: Record<number, { label: string; color: string; bg: string; icon?: React.ReactNode }> = {
  [SurveyStatus.Draft]: { label: 'Nháp', color: 'text-gray-700', bg: 'bg-gray-100' },
  [SurveyStatus.Active]: { label: 'Đang hoạt động', color: 'text-green-800', bg: 'bg-green-100' },
  [SurveyStatus.Paused]: { label: 'Tạm dừng', color: 'text-yellow-800', bg: 'bg-yellow-100' }, 
  [SurveyStatus.Closed]: { label: 'Đã đóng', color: 'text-red-800', bg: 'bg-red-100' },
  [SurveyStatus.Archived]: { label: 'Lưu trữ', color: 'text-blue-800', bg: 'bg-blue-100' },
};

const SurveyEditModal: React.FC<{
  open: boolean;
  onClose: () => void;
  survey: Survey | null;
  departments: Department[];
  onSave: (id: string, data: Partial<Survey>) => Promise<void>;
}> = ({ open, onClose, survey, departments, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    departmentId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (survey) {
      setFormData({
        title: survey.title || '',
        description: survey.description || '',
        startDate: survey.startDate ? new Date(survey.startDate).toISOString().slice(0, 10) : '',
        endDate: survey.endDate ? new Date(survey.endDate).toISOString().slice(0, 10) : '',
        departmentId: survey.departmentId ? String(survey.departmentId) : ''
      });
      setErrors({});
    }
  }, [survey]);

  if (!open || !survey) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Tên khảo sát là bắt buộc';
    if (!formData.description.trim()) newErrors.description = 'Mô tả khảo sát là bắt buộc';
    if (!formData.startDate) newErrors.startDate = 'Ngày bắt đầu là bắt buộc';
    if (!formData.endDate) newErrors.endDate = 'Ngày kết thúc là bắt buộc';
    if (!formData.departmentId) newErrors.departmentId = 'Khoa là bắt buộc';
    // Bỏ validate ngày bắt đầu phải lớn hơn ngày hiện tại khi chỉnh sửa
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) newErrors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    await onSave(survey.id, {
      title: formData.title,
      description: formData.description,
      startDate: formData.startDate ? new Date(formData.startDate) : undefined,
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      departmentId: formData.departmentId ? Number(formData.departmentId) : undefined
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white shadow-lg w-full max-w-lg p-6 relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={onClose}><X className="w-5 h-5" /></button>
        <h2 className="text-xl font-bold mb-4">Chỉnh sửa khảo sát</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên khảo sát</label>
            <input type="text" className="w-full border px-3 py-2" value={formData.title} onChange={e => handleChange('title', e.target.value)} required />
            {errors.title && <div className="text-red-600 text-xs mt-1">{errors.title}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mô tả</label>
            <textarea className="w-full border px-3 py-2" value={formData.description} onChange={e => handleChange('description', e.target.value)} required />
            {errors.description && <div className="text-red-600 text-xs mt-1">{errors.description}</div>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Khoa</label>
            <select className="w-full border px-3 py-2" value={formData.departmentId} onChange={e => handleChange('departmentId', e.target.value)} required>
              <option value="">Chọn khoa</option>
              {departments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
            {errors.departmentId && <div className="text-red-600 text-xs mt-1">{errors.departmentId}</div>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
              <input type="date" className="w-full border px-3 py-2" value={formData.startDate} onChange={e => handleChange('startDate', e.target.value)} required />
              {errors.startDate && <div className="text-red-600 text-xs mt-1">{errors.startDate}</div>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ngày kết thúc</label>
              <input type="date" className="w-full border px-3 py-2" value={formData.endDate} onChange={e => handleChange('endDate', e.target.value)} required />
              {errors.endDate && <div className="text-red-600 text-xs mt-1">{errors.endDate}</div>}
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700" onClick={onClose}>Hủy</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white" disabled={isSubmitting}>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SurveyList: React.FC = () => {
  const { surveys = [], deleteSurvey, setSurveyStatus, updateSurvey } = useSurvey();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [statusMenu, setStatusMenu] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ open: boolean; survey: Survey | null }>({ open: false, survey: null });
  const [qrSurvey, setQrSurvey] = useState<Survey | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch departments
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('https://localhost:7226/api/ManageDepartment', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Lỗi khi tải danh sách khoa');
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : []);
      } catch {
        setDepartments([]);
      }
    };
    // Fetch users (for creator name)
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('https://localhost:7226/api/ManageUser/list-user?page=1&pageSize=1000', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Lỗi khi tải danh sách người dùng');
        const data = await res.json();
        setUsers(Array.isArray(data.items) ? data.items : []);
      } catch {
        setUsers([]);
      }
    };
    fetchDepartments();
    fetchUsers();
  }, []);

  const getDepartmentName = (id: number) => departments.find(d => d.id === id)?.name || '-';
  const getUserName = (id: string) => {
    const user = users.find(u => u.id === id);
    return user ? user.fullName || user.username : '-';
  };

  const handleStatusChange = async (surveyId: string, status: number) => {
    const statusLabel = statusMap[status]?.label || 'trạng thái mới';
    if (window.confirm(`Bạn có chắc chắn muốn chuyển khảo sát sang trạng thái "${statusLabel}"?`)) {
      await setSurveyStatus(surveyId, status);
    }
    setStatusMenu(null);
  };

  const handleDelete = (surveyId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khảo sát này?')) {
      deleteSurvey(surveyId);
    }
  };

  const handleEdit = (survey: Survey) => {
    setEditModal({ open: true, survey });
  };

  const handleSaveEdit = async (id: string, data: Partial<Survey>) => {
    await updateSurvey(id, data);
  };

  function slugify(text: string) {
    return text
      .toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function encodeId(id: string | number) {
    return btoa(String(id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý khảo sát</h2>
          <p className="text-gray-600">Tạo, chỉnh sửa và quản lý các khảo sát</p>
        </div>
        <Link
          style={{ backgroundColor: '#319243' }}
          to="/admin/surveys/create"
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Tạo khảo sát mới</span>
        </Link>
      </div>

      {/* Surveys List */}
      <SurveyEditModal
        open={editModal.open}
        onClose={() => setEditModal({ open: false, survey: null })}
        survey={editModal.survey}
        departments={departments}
        onSave={handleSaveEdit}
      />
      <div className="bg-white shadow-sm">
        {surveys.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Chưa có khảo sát nào</p>
            <Link
              to="/admin/surveys/create"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Tạo khảo sát đầu tiên
            </Link>
          </div>
        ) : (
                      <div className="overflow-x-auto h-screen">
                          <table className="w-full ">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Tên khảo sát</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Phạm vi khảo sát</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Người tạo</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Trạng thái</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Thời gian</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {surveys.map((survey: Survey) => (
                  <tr key={survey.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <h4 className="font-medium text-gray-900">{survey.title}</h4>
                        <p className="text-sm text-gray-600">{survey.description}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getDepartmentName(survey.departmentId!)}</td>
                    <td className="py-3 px-4">{getUserName(survey.createdBy)}</td>
                    <td className="py-3 px-4 relative group">
                      <button
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusMap[survey.status ?? 0].bg} ${statusMap[survey.status ?? 0].color}`}
                        onClick={() => setStatusMenu(survey.id)}
                        type="button"
                      >
                        {statusMap[survey.status ?? 0].icon}
                        {statusMap[survey.status ?? 0].label}
                        <MoreHorizontal className="w-4 h-4 ml-1" />
                      </button>
                      {statusMenu === survey.id && (
                        <div className="absolute z-10 bg-white border rounded shadow-md mt-2 right-0 min-w-[140px]">
                          {Object.entries(statusMap).map(([key, value]) => (
                            <button
                              key={key}
                              className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-sm ${survey.status === Number(key) ? 'font-bold' : ''}`}
                              onClick={() => handleStatusChange(survey.id, Number(key))}
                            >
                              {value.icon} {value.label}
                            </button>
                          ))}
                          <button
                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 text-sm"
                            onClick={() => setStatusMenu(null)}
                          >
                            Đóng
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Calendar className="w-3 h-3" />
                          <span>{survey.startDate ? new Date(survey.startDate).toLocaleDateString('vi-VN') : '-'}</span>
                        </div>
                        <div className="text-gray-500">
                          đến {survey.endDate ? new Date(survey.endDate).toLocaleDateString('vi-VN') : '-'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(survey)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/surveys/questions/${survey.id}`)}
                          className="text-green-600 hover:text-green-700"
                          title="Tạo câu hỏi khảo sát"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(survey.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setQrSurvey(survey)}
                          className="text-gray-600 hover:text-green-700"
                          title="Tạo mã QR khảo sát"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 16h4v4h-4v-4zm6 0h4v4h-4v-4z" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrSurvey && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow-lg relative">
            <button className="absolute top-2 right-2" onClick={() => setQrSurvey(null)}>×</button>
            <h3 className="text-lg font-bold mb-4">QR khảo sát: {qrSurvey.title}</h3>
            <div className="flex flex-col items-center">
              <QRCodeCanvas
                id="qr-canvas-download"
                value={`http://108.108.13.94:3000/survey/${slugify(qrSurvey.title)}-${encodeId(qrSurvey.id)}`}
                size={220}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={true}
                ref={qrCanvasRef}
              />
              <button
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                onClick={() => {
                  const canvas = document.getElementById('qr-canvas-download') as HTMLCanvasElement;
                  if (!canvas) return;
                  const url = canvas.toDataURL('image/png');
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `qr_khaosat_${qrSurvey.id}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                Tải xuống ảnh QR
              </button>
            </div>
            <div className="mt-4 text-center text-sm text-gray-600">
              Quét QR để trả lời khảo sát này
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SurveyManager: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SurveyList />} />
      <Route path="/create" element={<SurveyCreator />} />
      <Route path="/questions/:id" element={<QuestionBuilder />} />
      <Route path="/edit/:id" element={<div>Chỉnh sửa khảo sát (Đang phát triển)</div>} />
    </Routes>
  );
};

export default SurveyManager;