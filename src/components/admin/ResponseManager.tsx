import React, { useState, useEffect } from 'react';
import {
  Eye,
  MessageSquare,
  FileSpreadsheet
} from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import { API_BASE_URL } from '../../config';

interface Survey {
  id: string | number;
  title: string;
  questions?: { id: string | number; content?: string; text?: string; questionContent?: string }[]; // Không dùng any
}
interface SurveyAnswer {
  questionId: number;
  questionContent: string;
  questionTypeCode?: string;
  optionId?: number | null;
  optionContent?: string | null;
  textAnswer?: string | null;
  extraOptions?: { optionId: number; content: string }[] | null;
  answerContent?: string | null; // Thêm trường answerContent cho đúng backend
  maxRating?: number; // Thêm maxRating nếu cần cho Scale
}
interface SurveyResponse {
  responseId: number;
  surveyId: string | number;
  respondentId: string | null;
  submittedAt: string;
  answers: SurveyAnswer[];
  fullName?: string;
  position?: string;
  phoneNumber?: string;
  companyName?: string;
}

const ResponseManager: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<'all' | string | number>('all');
  const [dateRange, setDateRange] = useState('30');
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [showCustomExportModal, setShowCustomExportModal] = useState(false);
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  useEffect(() => {
    async function fetchSurveys() {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/api/ManageSurvey`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Không thể lấy danh sách khảo sát');
        const data = await res.json();
        // Lấy chi tiết từng survey để lấy danh sách câu hỏi
        const surveysList: Survey[] = await Promise.all(
          (Array.isArray(data) ? data : []).map(async (s) => {
            let questions = [];
            try {
              const detailRes = await fetch(`${API_BASE_URL}/api/ManageSurvey/detail/${s.id ?? s.surveyId}`,
                { headers: { Authorization: `Bearer ${token}` } });
              if (detailRes.ok) {
                const detailData = await detailRes.json();
                questions = detailData.questions || [];
              }
            } catch { /* ignore survey error */ }
            return { id: s.id ?? s.surveyId, title: s.title ?? s.name ?? '', questions };
          })
        );
        setSurveys(surveysList);
      } catch {
        // ignore survey error
      }
    }
    fetchSurveys();
  }, []);

  useEffect(() => {
    async function fetchResponses() {
      setLoading(true);
      setError('');
      // Nếu chưa chọn khảo sát cụ thể thì không gọi API, chỉ reset responses
      if (selectedSurveyId === 'all') {
        setResponses([]);
        setLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const url = `${API_BASE_URL}/api/PublicSurvey/responses/${selectedSurveyId}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(' không thể lấy danh sách phản hồi');
        const data = await res.json();
        const responsesList: SurveyResponse[] = Array.isArray(data)
          ? data.map((r) => ({
              ...r,
              surveyId: r.surveyId ?? r.surveyID ?? r.survey_id ?? '',
            }))
          : [];
        setResponses(responsesList);
      } catch (err) {
        setError((err as Error).message || 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    }
    fetchResponses();
  }, [selectedSurveyId]);

  // Filter by survey, date
  const filteredResponses = responses.filter(r => {
    let matchesSurvey = true;
    if (selectedSurveyId !== 'all') {
      matchesSurvey = String(r.surveyId) === String(selectedSurveyId);
    }
    let matchesDate = true;
    if (dateRange !== 'all') {
      const responseDate = new Date(r.submittedAt);
      const today = new Date();
      switch (dateRange) {
        case '7': {
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = responseDate >= weekAgo;
          break;
        }
        case '30': {
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = responseDate >= monthAgo;
          break;
        }
        case '90': {
          const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
          matchesDate = responseDate >= threeMonthsAgo;
          break;
        }
        case '365': {
          const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
          matchesDate = responseDate >= yearAgo;
          break;
        }
      }
    }
    return matchesSurvey && matchesDate;
  })
  // Sắp xếp mới nhất lên đầu
  .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  // Phân trang
  const pageCount = Math.max(1, Math.ceil(filteredResponses.length / pageSize));
  const pagedResponses = filteredResponses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset về trang đầu khi filter thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSurveyId, dateRange]);

  // Xuất Excel từ backend
  const exportExcelFromBackend = async () => {
    if (!selectedSurveyId || selectedSurveyId === 'all') return;
    // Tính toán fromDate và toDate dựa trên dateRange
    let fromDate: string | null = null;
    let toDate: string | null = null;
    if (dateRange !== 'all') {
      const today = new Date();
      // Đặt toDate là cuối ngày hôm nay
      toDate = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      let from: Date | undefined;
      switch (dateRange) {
        case '7': {
          from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        }
        case '30': {
          from = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        }
        case '90': {
          from = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        }
        case '365': {
          from = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        }
        default: {
          from = undefined;
        }
      }
      // Đặt fromDate là đầu ngày
      fromDate = from ? new Date(from.setHours(0, 0, 0, 0)).toISOString() : null;
    }
    // Tạo query string
    let query = '';
    if (fromDate && toDate) {
      query = `?fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`;
    }
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/Report/export-excel/${selectedSurveyId}${query}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    if (!res.ok) {
      alert('Lỗi khi xuất Excel!');
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Lấy tên file từ header Content-Disposition, ưu tiên filename* (UTF-8), fallback filename (ASCII)
    let fileName = '';
    const disposition = res.headers.get('Content-Disposition');
    if (disposition) {
      // Ưu tiên filename* (UTF-8)
      const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;\n]+)/);
      if (matchUtf8) {
        fileName = decodeURIComponent(matchUtf8[1]);
      } else {
        // Fallback filename (ASCII)
        const matchNormal = disposition.match(/filename="?([^";\n]+)"?/);
        if (matchNormal) {
          fileName = matchNormal[1];
        }
      }
    }
    // Nếu không lấy được tên file thì đặt mặc định
    if (!fileName) fileName = 'report.xlsx';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // Xuất Excel theo khoảng thời gian tự chọn
  const exportExcelCustomRange = async () => {
    if (!selectedSurveyId || selectedSurveyId === 'all') return;
    if (!customFromDate || !customToDate) {
      alert('Vui lòng chọn đủ cả từ ngày và đến ngày!');
      return;
    }
    const fromDate = new Date(customFromDate);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(customToDate);
    toDate.setHours(23, 59, 59, 999);
    const query = `?fromDate=${encodeURIComponent(fromDate.toISOString())}&toDate=${encodeURIComponent(toDate.toISOString())}`;
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/Report/export-excel/${selectedSurveyId}${query}`, {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    if (!res.ok) {
      alert('Lỗi khi xuất Excel!');
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    let fileName = '';
    const disposition = res.headers.get('Content-Disposition');
    if (disposition) {
      const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;\n]+)/);
      if (matchUtf8) {
        fileName = decodeURIComponent(matchUtf8[1]);
      } else {
        const matchNormal = disposition.match(/filename="?([^";\n]+)"?/);
        if (matchNormal) {
          fileName = matchNormal[1];
        }
      }
    }
    if (!fileName) fileName = 'report.xlsx';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    setShowCustomExportModal(false);
  };

  // Helper: chuyển điểm rating thành nhãn
  const getRatingLabel = (value: string | number | undefined) => {
    switch (Number(value)) {
      case 1: return '1 – Không sử dụng';
      case 2: return '2 – Rất không hài lòng (hoặc: Rất kém)';
      case 3: return '3 – Không hài lòng (hoặc: Kém)';
      case 4: return '4 – Hài lòng (hoặc: Tốt)';
      case 5: return '5 – Rất hài lòng (hoặc: Rất tốt)';
      default: return value;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý phản hồi</h2>
          <p className="text-gray-600">Xem và quản lý các phản hồi từ bệnh nhân</p>
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Khảo sát</label>
            <select
              value={selectedSurveyId}
              onChange={e => setSelectedSurveyId(e.target.value === 'all' ? 'all' : e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả khảo sát</option>
              {surveys.map(survey => (
                <option key={survey.id} value={survey.id}>{survey.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Khoảng thời gian</label>
            <select
              value={dateRange}
              onChange={e => setDateRange(e.target.value)
}
              className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">7 ngày qua</option>
              <option value="30">30 ngày qua</option>
              <option value="90">3 tháng qua</option>
              <option value="365">1 năm qua</option>
              <option value="all">Tất cả thời gian</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 rounded-none hover:bg-gray-50 transition-colors">
              <span>Lọc nâng cao</span>
            </button>
          </div>
        </div>
      </div>
      {/* Responses List */}
      {selectedSurveyId === 'all' ? (
        <div className="bg-white shadow-sm flex flex-col items-center justify-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-500">Vui lòng chọn khảo sát để xem phản hồi</p>
        </div>
      ) : (
      <div className="bg-white shadow-sm">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Danh sách phản hồi ({filteredResponses.length})</h3>
          <div className="flex gap-4">
            <button
              onClick={exportExcelFromBackend}
              className="flex items-center space-x-2 text-green-600 hover:text-green-800 text-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel (theo bộ lọc)</span>
            </button>
            <button
              onClick={() => setShowCustomExportModal(true)}
              className="flex items-center space-x-2 text-green-600 hover:text-green-800 text-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel (theo thời gian tự chọn)</span>
            </button>
          </div>
        </div>
        {/* Hiển thị thông báo đang tải khảo sát nếu loading */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Đang tải khảo sát...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">{error}</div>
        ) : filteredResponses.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-500">Không có phản hồi nào phù hợp với bộ lọc</p>
          </div>
        ) : (
          <div>
            {/* Virtualized table header */}
            <div className="grid grid-cols-9 bg-gray-50 border border-gray-300">
              <div className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">STT</div>
              <div className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">Họ tên</div>
              <div className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">SĐT</div>
              <div className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">Chức vụ</div>
              <div className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">Đơn vị/Công ty</div>
              <div className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">Thời gian gửi</div>
              <div className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r">Số câu hỏi đã trả lời</div>
              <div className="px-4 py-3 text-left text-sm font-medium text-gray-900">Chi tiết</div>
            </div>
            {/* Virtualized table body */}
            <List
              height={480}
              itemCount={pagedResponses.length}
              itemSize={48}
              width={"100%"}
            >
              {({ index, style }: { index: number; style: React.CSSProperties }) => {
                const r = pagedResponses[index];
                // Helper: hiển thị "Không cung cấp" nếu trống
                const displayOrDefault = (value: string | undefined) => value && value.trim() ? value : <span style={{color:'#999'}}>Không cung cấp</span>;
                return (
                  <div
                    key={r.responseId}
                    style={style}
                    className="grid grid-cols-9 border-b border-gray-300 items-center hover:bg-gray-50"
                  >
                    <div className="px-4 py-3 text-sm text-gray-900 border-r">{(currentPage - 1) * pageSize + index + 1}</div>
                    <div className="px-4 py-3 text-sm text-gray-900 border-r">{displayOrDefault(r.fullName)}</div>
                    <div className="px-4 py-3 text-sm text-gray-900 border-r">{displayOrDefault(r.phoneNumber)}</div>
                    <div className="px-4 py-3 text-sm text-gray-900 border-r">{displayOrDefault(r.position)}</div>
                    <div className="px-4 py-3 text-sm text-gray-900 border-r">{displayOrDefault(r.companyName)}</div>
                    <div className="px-4 py-3 text-sm text-gray-900 border-r">{new Date(r.submittedAt).toLocaleString('vi-VN')}</div>
                    <div className="px-4 py-3 text-sm text-gray-900 border-r">{r.answers.length}</div>
                    <div className="px-4 py-3 text-sm">
                      <button
                        className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm"
                        onClick={() => setSelectedResponse(r)}
                      >
                        <Eye className="w-4 h-4" />
                        <span>Xem chi tiết</span>
                      </button>
                    </div>
                  </div>
                );
              }}
            </List>
            <div className="flex justify-center items-center mt-4 space-x-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="px-3 py-1 border rounded">Trang trước</button>
              <span>Trang {currentPage} / {pageCount}</span>
              <button disabled={currentPage === pageCount} onClick={() => setCurrentPage(currentPage + 1)} className="px-3 py-1 border rounded">Trang sau</button>
            </div>
          </div>
        )}
      </div>
      )}
      {/* Modal chi tiết phản hồi */}
      {selectedResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-lg"
              onClick={() => setSelectedResponse(null)}
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-4 text-green-700">Chi tiết phản hồi #{selectedResponse.responseId}</h3>
            <div className="mb-2 text-sm text-gray-600">Người trả lời: <span className="font-semibold">{selectedResponse.respondentId || 'Ẩn danh'}</span></div>
            <div className="mb-2 text-sm text-gray-600">Thời gian gửi: <span className="font-semibold">{new Date(selectedResponse.submittedAt).toLocaleString('vi-VN')}</span></div>
            <table className="w-full border-collapse border border-gray-300 mt-4">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-900">STT</th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-900">Nội dung câu hỏi</th>
                  <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-900">Nội dung trả lời</th>
                </tr>
              </thead>
              <tbody>
                {selectedResponse.answers.map((ans, idx) => {
                  let answerDisplay = ans.answerContent || '';
                  // Nếu là câu hỏi rating (Scale), hiển thị nhãn thay vì số
                  if (ans.questionTypeCode === 'Scale' && ans.answerContent) {
                      answerDisplay = getRatingLabel(ans.answerContent != null ? String(ans.answerContent) : '') as string;
                  }
                  return (
                    <tr key={ans.questionId}>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{idx + 1}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">{ans.questionContent || ''}</td>
                      <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900" style={{ whiteSpace: 'pre-line' }}>{answerDisplay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Modal chọn khoảng thời gian xuất excel */}
      {showCustomExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-lg"
              onClick={() => setShowCustomExportModal(false)}
            >×</button>
            <h3 className="text-xl font-bold mb-4 text-green-700">Xuất Excel theo thời gian tự chọn</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
              <input type="date" value={customFromDate} onChange={e => setCustomFromDate(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
              <input type="date" value={customToDate} onChange={e => setCustomToDate(e.target.value)} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCustomExportModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded">Hủy</button>
              <button onClick={exportExcelCustomRange} className="px-4 py-2 bg-green-600 text-white rounded font-semibold">Xuất Excel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseManager;