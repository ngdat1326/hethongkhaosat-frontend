import React, { useState, useEffect } from 'react';
import { useSurvey } from '../../contexts/SurveyContext';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList
} from 'recharts';
import { MessageSquare} from 'lucide-react';
import { API_BASE_URL } from '../../config';

const COLORS = ['#3366cc', '#ff9900', '#dc3912', '#109618', '#990099', '#0099c6', '#dd4477', '#66aa00'];

interface AnalyticsOption {
  optionId: number;
  content: string;
  count: number;
  percent: number;
}
interface AnalyticsQuestion {
  questionId: number;
  questionContent: string;
  type: string;
  totalAnswers: number;
  options?: AnalyticsOption[];
  average?: number;
  counts?: Record<string, number>;
}

const Analytics: React.FC = () => {
  const { surveys } = useSurvey();
  const [selectedSurvey, setSelectedSurvey] = useState<string>('all');
  const [analytics, setAnalytics] = useState<AnalyticsQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedSurvey === 'all') {
      setAnalytics(null);
      return;
    }
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/api/SurveyAnalytics/${selectedSurvey}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' }
    })
      .then(async res => {
        if (!res.ok) throw new Error('Không thể lấy dữ liệu thống kê');
        const data: AnalyticsQuestion[] = await res.json();
        setAnalytics(data);
      })
      .catch((err: Error) => setError(err.message || 'Lỗi không xác định'))
      .finally(() => setLoading(false));
  }, [selectedSurvey]);

  // Render stars for rating scale, chia kỹ mức 0.25/0.5/0.75
  const renderStars = (max: number, avg: number) => (
    <div className="flex flex-col items-center w-full">
      <div className="text-center font-bold text-base mb-2">Đánh giá trung bình ({avg.toFixed(2)})</div>
      <div className="flex justify-center gap-12 w-full">
        {Array.from({ length: max }, (_, i) => {
          let fill = '#E0E0E0';
          const starValue = i + 1;
          if (avg >= starValue) fill = '#FFD600'; // full star
          else if (avg > i) {
            const decimal = avg - i;
            if (decimal >= 0.75) fill = 'url(#star75' + i + ')';
            else if (decimal >= 0.5) fill = 'url(#star50' + i + ')';
            else if (decimal >= 0.25) fill = 'url(#star25' + i + ')';
            // else: empty
          }
          return (
            <div key={i} className="flex flex-col items-center">
              <span className="font-medium text-base mb-1">{starValue}</span>
              <svg
                width="36" height="36" viewBox="0 0 24 24"
                fill={fill}
                stroke="#FFD600"
                strokeWidth="0"
              >
                <defs>
                  <linearGradient id={`star75${i}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="75%" stopColor="#FFD600" />
                    <stop offset="75%" stopColor="#E0E0E0" />
                  </linearGradient>
                  <linearGradient id={`star50${i}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="50%" stopColor="#FFD600" />
                    <stop offset="50%" stopColor="#E0E0E0" />
                  </linearGradient>
                  <linearGradient id={`star25${i}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="25%" stopColor="#FFD600" />
                    <stop offset="25%" stopColor="#E0E0E0" />
                  </linearGradient>
                </defs>
                <polygon points="12,2 15,9 22,9.3 17,14.1 18.5,21 12,17.5 5.5,21 7,14.1 2,9.3 9,9" />
              </svg>
            </div>
          );
        })}
      </div>
    </div>
  );

  // PieChart giống Google Form, % nằm trong biểu đồ, tooltip custom, KHÔNG có đường thẳng thừa
  const renderPieChart = (q: AnalyticsQuestion) => {
    // Custom label để vẽ % vào giữa từng phần
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderPieLabel = (props: any) => {
      const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
      const RADIAN = Math.PI / 180;
      const percent = q.totalAnswers > 0 ? value / q.totalAnswers : 0;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      return percent > 0 ? (
        <text x={x} y={y} fill="#fff" fontSize={16} fontWeight={600} textAnchor="middle" dominantBaseline="central">
          {(percent * 100).toFixed(1)}%
        </text>
      ) : null;
    };
    // Custom tooltip giống Google Form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderPieTooltip = (props: any) => {
      if (!props.active || !props.payload || !props.payload.length) return null;
      const d = props.payload[0].payload;
      const percent = q.totalAnswers > 0 ? d.count / q.totalAnswers : 0;
      return (
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 10, fontSize: 15, fontWeight: 500, color: '#222', border: '1px solid #eee' }}>
          <div>{d.content}</div>
          <div style={{ fontWeight: 400 }}>{d.count} ({(percent * 100).toFixed(1)}%)</div>
        </div>
      );
    };
    return (
      <div key={q.questionId} className="bg-white rounded-xl p-4 mb-6 border">
        <div className="text-base font-semibold text-gray-900 mb-1">{q.questionContent}</div>
        <div className="text-sm text-gray-600 mb-4">{q.totalAnswers} câu trả lời</div>
        <div className="flex flex-row items-center gap-8">
          <ResponsiveContainer width={260} height={220}>
            <PieChart>
              <Pie
                data={q.options || []}
                dataKey="count"
                nameKey="content"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={renderPieLabel}
                labelLine={false}
                isAnimationActive={false}
                stroke="#fff"
                activeShape={undefined}
              >
                {(q.options || []).map((opt, i) => (
                  <Cell key={opt.optionId} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={renderPieTooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-2">
            {(q.options || []).map((opt, i) => (
              <div key={opt.optionId} className="flex items-center gap-2 text-base">
                <span className="inline-block w-4 h-4 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></span>
                <span className="font-medium text-gray-900">{opt.content}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // BarChart ngang giống Google Form, KHÔNG có nút sao chép, label nằm trong bar nếu đủ rộng, ngoài nếu không đủ
  const renderMultipleChoiceBar = (q: AnalyticsQuestion) => {
    const data = (q.options || []).map(opt => ({
      ...opt,
      label: opt.content,
      percent: q.totalAnswers > 0 ? (opt.count / q.totalAnswers) * 100 : 0
    }));
    // Custom label cho từng bar, tự động căn trong hoặc ngoài bar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderBarLabel = (props: any) => {
      const { x, y, width, value, index } = props;
      const percent = data[index]?.percent || 0;
      const labelText = `${value} (${percent.toFixed(1)}%)`;
      // Nếu bar đủ rộng thì label nằm trong bar, không thì nằm ngoài
      const minWidthForInside = 80;
      if (width > minWidthForInside) {
        return (
          <text x={Number(x) + width - 8} y={Number(y) + 16} fill="#fff" fontSize={15} fontWeight={600} textAnchor="end">
            {labelText}
          </text>
        );
      } else {
        return (
          <text x={Number(x) + width + 8} y={Number(y) + 16} fill="#673ab7" fontSize={15} fontWeight={600} textAnchor="start">
            {labelText}
          </text>
        );
      }
    };
    // Custom YAxis tick để tránh chồng chữ
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderYAxisTick = (props: any) => {
      const { x, y, payload } = props;
      return (
        <text x={x - 4} y={y + 6} textAnchor="end" fontSize={15} fontWeight={500} fill="#444" style={{ whiteSpace: 'pre-line' }}>
          {String(payload.value)}
        </text>
      );
    };
    return (
      <div key={q.questionId} className="bg-white rounded-xl p-4 mb-6 border">
        <div className="text-base font-semibold text-gray-900 mb-1">{q.questionContent}</div>
        <div className="text-sm text-gray-600 mb-4">{q.totalAnswers} câu trả lời</div>
        <ResponsiveContainer width="100%" height={Math.max(180, 44 * data.length)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 40, left: 120, bottom: 8 }}
            barCategoryGap={24}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} domain={[0, Math.max(1, ...data.map(d => d.count))]} tickFormatter={v => v.toLocaleString('vi-VN', { minimumFractionDigits: 1 })} />
            <YAxis type="category" dataKey="label" width={110} tick={renderYAxisTick} />
            <Tooltip formatter={(value: number) => `${value} lượt`} />
            <Bar dataKey="count" fill="#673ab7" minPointSize={2} radius={[4, 4, 4, 4]} barSize={24} isAnimationActive={false}>
              <LabelList dataKey="count" content={renderBarLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // BarChart dọc cho Rating/Scale, hỗ trợ thang điểm động (minRating/maxRating)
  const renderRatingChart = (q: AnalyticsQuestion) => {
    const min = typeof (q as any).minRating === 'number' ? (q as any).minRating : 1;
    const max = typeof (q as any).maxRating === 'number' ? (q as any).maxRating : 5;
    const avg = q.average || 0;
    const counts = q.counts || {};
    const total = q.totalAnswers || 0;
    const data = Array.from({ length: max - min + 1 }, (_, i) => {
      const score = (min + i).toString();
      const count = counts[score] || 0;
      const percent = total > 0 ? (count / total) * 100 : 0;
      return { score, count, percent };
    });
    // Custom label cho từng bar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const renderBarLabel = (props: any) => {
      const { x, y, value, index } = props;
      const percent = Array.isArray(data) && typeof index === 'number' && data[index] && typeof data[index].percent === 'number' ? data[index].percent : 0;
      return (
        <text x={Number(x) + 16} y={Number(y) - 8} fill="#673ab7" fontSize={15} fontWeight={600}>
          {value} ({percent.toFixed(1)}%)
        </text>
      );
    };
    return (
      <div key={q.questionId} className="bg-white rounded-xl p-4 mb-6 border">
        <div className="text-base font-semibold text-gray-900 mb-1">{q.questionContent}</div>
        <div className="bg-[#f8f9fa] rounded-xl p-6 mb-4">
          {renderStars(max, avg)}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="score" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value: number) => `${value} lượt`} />
            <Bar dataKey="count" fill="#673ab7" barSize={32} radius={[4, 4, 4, 4]} isAnimationActive={false}>
              <LabelList dataKey="count" position="top" content={renderBarLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render text answers giống Google Form, KHÔNG có nút sao chép
  const renderTextAnswers = (q: AnalyticsQuestion) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answers: string[] = (q as any).answers || [];
    return (
      <div key={q.questionId} className="bg-white rounded-xl p-4 mb-6 border">
        <div className="text-base font-semibold text-gray-900 mb-1">{q.questionContent}</div>
        <div className="text-sm text-gray-600 mb-4">{q.totalAnswers} câu trả lời</div>
        <div className="flex flex-col gap-3">
          {answers.map((ans, i) => (
            <div key={i} className="bg-[#f8f9fa] rounded-md px-4 py-3 text-gray-900 text-base">{ans}</div>
          ))}
        </div>
      </div>
    );
  };

  // Render chart cho từng loại câu hỏi
  const renderChart = (q: AnalyticsQuestion) => {
    if (q.type === 'SingleChoice') {
      return renderPieChart(q);
    }
    if (q.type === 'MultiChoice' || q.type === 'MultipleChoice') {
      return renderMultipleChoiceBar(q);
    }
    if (q.type === 'Scale' || q.type === 'Rating') {
      return renderRatingChart(q);
    }
    if (q.type === 'Text' || q.type === 'TEXT') {
      return renderTextAnswers(q);
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Thống kê & Báo cáo</h2>
          <p className="text-gray-600">Phân tích dữ liệu phản hồi từ bệnh nhân</p>
        </div>
      </div>
      <div className="bg-white shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Khảo sát</label>
            <select
              value={selectedSurvey}
              onChange={e => setSelectedSurvey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Tất cả khảo sát</option>
              {surveys.map(survey => (
                <option key={survey.id} value={survey.id}>{survey.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {selectedSurvey === 'all' ? (
        <div className="bg-white shadow-sm flex flex-col items-center justify-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-500">Vui lòng chọn khảo sát để xem thống kê</p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Đang tải thống kê...</div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">{error}</div>
      ) : !analytics || analytics.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Không có dữ liệu thống kê cho khảo sát này</div>
      ) : (
        <div>
          {analytics.map(renderChart)}
        </div>
      )}
    </div>
  );
};

export default Analytics;