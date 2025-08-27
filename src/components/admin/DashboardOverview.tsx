import React, { useEffect, useState } from 'react';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';

// Định nghĩa kiểu dữ liệu cho survey trong dashboardSummary
interface DashboardSurvey {
  surveyId: number;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  questionCount: number;
  responseCount: number;
}

interface DashboardSummary {
  totalSurveys: number;
  totalResponses: number;
  responsesToday: number;
  surveys: DashboardSurvey[];
}

const DashboardOverview: React.FC = () => {
  // State cho dữ liệu tổng hợp từ API
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>({
    totalSurveys: 0,
    totalResponses: 0,
    responsesToday: 0,
    surveys: []
  });

  // Gọi API để lấy dữ liệu tổng hợp cho dashboard
  useEffect(() => {
    async function fetchSummary() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/Dashboard/summary', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error('Không thể lấy dữ liệu tổng hợp dashboard');
        const data = await res.json();
        setDashboardSummary(data);
      } catch {
        setDashboardSummary({ totalSurveys: 0, totalResponses: 0, responsesToday: 0, surveys: [] });
      }
    }
    fetchSummary();
  }, []);

  const stats = [
    {
      label: 'Tổng khảo sát đang hoạt động',
      value: dashboardSummary.totalSurveys,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Tổng phản hồi',
      value: dashboardSummary.totalResponses,
      icon: MessageSquare,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      label: 'Phản hồi hôm nay',
      value: dashboardSummary.responsesToday,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
  ];

  const activeSurveys = dashboardSummary.surveys;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Current Survey Status - Horizontal Slider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Khảo sát hiện tại</h3>
            {activeSurveys.length > 0 ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Đang hoạt động
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <AlertCircle className="w-3 h-3 mr-1" />
                Không hoạt động
              </span>
            )}
          </div>
          {activeSurveys.length > 0 ? (
            <Swiper spaceBetween={16} slidesPerView={1} navigation modules={[Navigation]}>
              {activeSurveys.map((survey) => {
                return (
                  <SwiperSlide key={survey.surveyId}>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-bold text-green-900 text-3xl">{survey.title}</h4>
                        <p className="text-sm text-black-900 text-2xl">{survey.description}</p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Số câu hỏi:</span>
                        <span className="font-medium">{survey.questionCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Phản hồi:</span>
                        <span className="font-medium">{survey.responseCount}</span>
                      </div>
                    </div>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Không có khảo sát nào đang hoạt động</p>
            </div>
          )}
        </div>
        {/* Thông báo/tips/hướng dẫn cho admin */}
        <div className="bg-white shadow-sm p-6 border border-gray-100 flex flex-col justify-center items-center">
          <div className="mb-4">
            <TrendingUp className="w-10 h-10 text-green-500 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Hướng dẫn sử dụng Dashboard</h3>
          <ul className="text-gray-700 text-sm space-y-2 list-disc pl-5 text-left">
            <li>Xem nhanh số lượng khảo sát đang hoạt động và phản hồi mới nhất.</li>
            <li>Trượt ngang để xem chi tiết từng khảo sát hiện tại.</li>
            <li>Sử dụng các thao tác nhanh bên dưới để tạo khảo sát, xem phản hồi hoặc thống kê.</li>
            <li>Nhấn vào từng khảo sát để xem chi tiết hoặc chỉnh sửa.</li>
            <li>Liên hệ quản trị viên nếu cần hỗ trợ thêm.</li>
          </ul>
          <div className="mt-4 text-xs text-gray-400 text-center">Tip: Dashboard sẽ tự động cập nhật số liệu khi có phản hồi mới.</div>
        </div>
      </div>


      {/* Quick Actions */}
      <div className="bg-white shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 bg-blue-50 hover:bg-blue-100 transition-colors">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Tạo khảo sát mới</span>
          </button>
          <button className="flex items-center space-x-3 p-4 bg-green-50 hover:bg-green-100 transition-colors">
            <MessageSquare className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">Xem phản hồi</span>
          </button>
          <button className="flex items-center space-x-3 p-4 bg-purple-50 hover:bg-purple-100 transition-colors">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-900">Xem thống kê</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;