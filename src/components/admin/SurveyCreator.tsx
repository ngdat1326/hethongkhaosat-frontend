import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSurvey } from '../../contexts/SurveyContext';
import { 
  Save, 
  ArrowLeft, 
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import { API_BASE_URL } from '../../config';

interface Department {
  id: number;
  name: string;
}

const SurveyCreator: React.FC = () => {
  const navigate = useNavigate();
  const { createSurvey } = useSurvey();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    departmentId: ''
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/ManageDepartment`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Lỗi khi tải danh sách khoa');
        const data = await res.json();
        setDepartments(Array.isArray(data) ? data : []);
      } catch {
        setDepartments([]);
      }
    };
    fetchDepartments();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Tên khảo sát là bắt buộc';
    if (!formData.description.trim()) newErrors.description = 'Mô tả khảo sát là bắt buộc';
    if (!formData.startDate) newErrors.startDate = 'Ngày bắt đầu là bắt buộc';
    if (!formData.endDate) newErrors.endDate = 'Ngày kết thúc là bắt buộc';
    if (!formData.departmentId) newErrors.departmentId = 'Khoa là bắt buộc';
    if (formData.startDate) {
      const start = new Date(formData.startDate);
      const now = new Date();
      now.setHours(0,0,0,0); // ignore time part
      if (start <= now) newErrors.startDate = 'Ngày bắt đầu phải lớn hơn ngày hiện tại';
    }
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) newErrors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await createSurvey({
        title: formData.title,
        description: formData.description,
        questions: [],
        isActive: false,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        createdBy: 'admin',
        departmentId: Number(formData.departmentId)
      });
      navigate('/admin/surveys');
    } catch (error) {
      console.error('Error creating survey:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

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
            <h2 className="text-2xl font-bold text-gray-900">Tạo đợt khảo sát mới</h2>
            <p className="text-gray-600">Thiết lập thông tin cơ bản cho đợt khảo sát</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white  shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tên khảo sát */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên khảo sát <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-4 py-3 border  focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ví dụ: Khảo sát hài lòng bệnh nhân tháng 1/2025"
            />
            {errors.title && (
              <div className="flex items-center space-x-1 mt-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.title}</span>
              </div>
            )}
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả khảo sát <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className={`w-full px-4 py-3 border  focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Mô tả mục đích và nội dung của khảo sát..."
            />
            {errors.description && (
              <div className="flex items-center space-x-1 mt-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.description}</span>
              </div>
            )}
          </div>

          {/* Khoa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Khoa <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.departmentId}
              onChange={e => handleInputChange('departmentId', e.target.value)}
              className={`w-full px-4 py-3 border  focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.departmentId ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Chọn khoa</option>
              {departments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
            {errors.departmentId && (
              <div className="flex items-center space-x-1 mt-1 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{errors.departmentId}</span>
              </div>
            )}
          </div>

          {/* Thời gian */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border  focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.startDate && (
                <div className="flex items-center space-x-1 mt-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.startDate}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 border  focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
              </div>
              {errors.endDate && (
                <div className="flex items-center space-x-1 mt-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.endDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin hướng dẫn */}
          <div className="bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-start space-x-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Bước tiếp theo</h4>
                <p className="text-sm text-blue-700">
                  Sau khi tạo đợt khảo sát, bạn sẽ được chuyển đến trang tạo câu hỏi để thiết kế nội dung khảo sát.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/admin/surveys')}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center space-x-2 px-6 py-3  font-medium transition-colors ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>{isSubmitting ? 'Đang tạo...' : 'Tạo khảo sát'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyCreator;