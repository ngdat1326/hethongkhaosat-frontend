import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';
import Logo from './common/Logo';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import 'swiper/css';
import 'swiper/css/navigation';
import { API_BASE_URL } from '../config';

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

const LandingPage: React.FC = () => {
    const [activeSurveys, setActiveSurveys] = React.useState<any[]>([]);
    const [showMobileLogin, setShowMobileLogin] = React.useState(false);
    const navigate = useNavigate();
    React.useEffect(() => {
        fetch(`${API_BASE_URL}/api/PublicSurvey/active`)
            .then(res => res.json())
            .then(data => setActiveSurveys(Array.isArray(data) ? data : []))
            .catch(() => setActiveSurveys([]));
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
            {/* Header */}
            <header className="bg-white py-0 border-b border-green-200" style={{ position: 'relative' }}>
                {/* Logo and navigation for larger screens */}
                <div className={`mx-auto flex flex-row items-center justify-center px-0 ${styles['header-logos']}`}>
                    <img src="/logo_benhvien_108.png" alt="logo 108" className={styles['logo108']} />
                    <img src="/logo-benh-vien-v3.png" alt="logo bên phải" className={styles['logoRight']} />
                    <img src="/logo_benhvien_108.png" alt="logo mobile" className={styles['logo-mobile']} />
                </div>

                {/* Login button for desktop */}
                <Link
                    to="/login"
                    className={`${styles['login-link']} hidden sm:inline-block hover:underline hover:text-green-700 transition-colors`}
                >
                    Đăng nhập nội bộ
                </Link>
                {/* Hamburger icon for mobile */}
                <button
                    className={styles['login-hamburger']}
                    aria-label="Đăng nhập nội bộ"
                    onClick={() => setShowMobileLogin(v => !v)}
                >
                    <span className={styles['hamburger-icon']}>
                        <span className={styles['hamburger-bar']}></span>
                        <span className={styles['hamburger-bar']}></span>
                        <span className={styles['hamburger-bar']}></span>
                    </span>
                </button>
                {/* Mobile login menu */}
                {showMobileLogin && (
                    <div className={styles['mobile-login-menu']}>
                        <button
                            onClick={() => { setShowMobileLogin(false); navigate('/login'); }}
                        >
                            Đăng nhập nội bộ
                        </button>
                    </div>
                )}
            </header>
            {/* Green bar under header */}
            <div className={styles['green-bar']}>
                <div className={styles['marquee']}>
                    <span className={styles['marquee-highlight']}>TRỰC CẤP CỨU 24/7</span>
                    <span className={styles['marquee-label']}>Theo yêu cầu ➞</span>
                    <span className={styles['marquee-highlight']}> Thứ 2 - Thứ 7: 6h30 - 17h00</span>
                    <span className={styles['marquee-label']}>/ Khám thường ➞</span>
                    <span className={styles['marquee-highlight']}>Thứ 2 - Thứ 6: 6h30 - 17h00</span>
                </div>
            </div>
            {/* Hero Section */}
            <section
                className="py-20 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden"
                style={{
                    backgroundImage: "url('/bv108.jpg')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                }}
            >
                {/* Overlay */}
                <div className="absolute inset-0 bg-white/10 bg-gradient-to-b from-white/65 to-green-50/65 pointer-events-none z-0"></div>
                <div className="relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                            Chia sẻ trải nghiệm của bạn
                        </h2>
                        <p className="text-xl text-gray-900 mb-8 max-w-2xl mx-auto">
                            Góp ý của bạn giúp chúng tôi cải thiện chất lượng dịch vụ và mang lại trải nghiệm tốt hơn cho tất cả bệnh nhân
                        </p>
                    </div>
                    {/* Slide khảo sát đang hoạt động */}
                    {activeSurveys.length > 0 && (
                        <div className="max-w-4xl mx-auto mt-12 relative">
                            <Swiper
                                spaceBetween={32}
                                slidesPerView={1}
                                navigation={{
                                    nextEl: '.custom-swiper-next',
                                    prevEl: '.custom-swiper-prev',
                                }}
                                autoplay={{ delay: 3000, disableOnInteraction: false }}
                                modules={[Navigation, Autoplay]}
                                className="pb-8"
                            >
                                {activeSurveys.map(survey => (
                                    <SwiperSlide key={survey.id}>
                                        <div className="relative rounded-lg shadow p-8 flex flex-col items-center border border-green-200 overflow-hidden" style={{ backgroundImage: "url('/bv_108_1.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
                                            <div className="absolute inset-0 bg-green-50/90 z-0"></div>
                                            <div className="relative z-10 w-full flex flex-col items-center">
                                                <h4 className="text-xl font-bold text-green-700 mb-2 text-center">{survey.title}</h4>
                                                <p className="text-gray-600 mb-2 text-center">{survey.description}</p>
                                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-gray-500 mb-2 justify-center items-center">
                                                    <span>Bắt đầu: {survey.startDate ? new Date(survey.startDate).toLocaleDateString('vi-VN') : '-'}</span>
                                                    <span className="hidden sm:inline">|</span>
                                                    <span>Kết thúc: {survey.endDate ? new Date(survey.endDate).toLocaleDateString('vi-VN') : '-'}</span>
                                                </div>
                                                <Link to={`/survey/${slugify(survey.title)}-${encodeId(survey.id)}`} className="mt-2 mb-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Tham gia khảo sát</Link>
                                            </div>
                                        </div>
                                    </SwiperSlide>
                                ))}
                                <div className="custom-swiper-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 cursor-pointer bg-green-100 hover:bg-green-200 rounded-full p-2 border border-green-300 shadow">
                                    <ChevronLeft className="w-6 h-6 text-green-700" />
                                </div>
                                <div className="custom-swiper-next absolute right-0 top-1/2 -translate-y-1/2 z-10 cursor-pointer bg-green-100 hover:bg-green-200 rounded-full p-2 border border-green-300 shadow">
                                    <ChevronRight className="w-6 h-6 text-green-700" />
                                </div>
                            </Swiper>
                        </div>
                    )}

                    {/* Features */}
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h3 className="text-3xl font-bold text-gray-900 mb-4">
                                Tại sao khảo sát của bạn quan trọng?
                            </h3>
                            <p className="text-lg text-gray-900">
                                Mọi phản hồi đều được ghi nhận và sử dụng để cải thiện dịch vụ
                            </p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="text-center p-6 bg-green-50 hover:bg-green-50 transition-colors border border-green-200 rounded-lg shadow-sm">
                                <span className="w-8 h-8 text-white text-3xl">👥</span>
                                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                                    Ẩn danh & Bảo mật
                                </h4>
                                <p className="text-gray-600">
                                    Không cần đăng nhập, thông tin hoàn toàn ẩn danh và được bảo mật tuyệt đối
                                </p>
                            </div>
                            <div className="text-center p-6 bg-green-50 hover:bg-green-50 transition-colors border border-green-200 rounded-lg shadow-sm">
                                <span className="w-8 h-8 text-white text-3xl">📊</span>
                                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                                    Cải tiến liên tục
                                </h4>
                                <p className="text-gray-600">
                                    Phản hồi của bạn giúp chúng tôi phát hiện và cải thiện những điểm chưa tốt
                                </p>
                            </div>
                            <div className="text-center p-6 bg-green-50 hover:bg-green-50 transition-colors border border-green-200 rounded-lg shadow-sm">
                                <span className="w-8 h-8 text-white text-3xl">❤️</span>
                                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                                    Chăm sóc tốt hơn
                                </h4>
                                <p className="text-gray-600">
                                    Mục tiêu của chúng tôi là mang lại trải nghiệm chăm sóc sức khỏe tốt nhất
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Footer */}
            <footer className="text-white py-8" style={{ backgroundColor: '#319243' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="flex items-center justify-center space-x-3 mb-4 flex-wrap">
                        <div className="flex-shrink-0 flex items-center justify-center">
                            <Logo size="xl" showText={false} imageUrl="logo.png" className="logo-header" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 sm:gap-0 sm:block">
                        <p className="text-green-100 uppercase text-xs sm:text-base">
                            © 2025 Bệnh viện Trung Ương Quân Đội 108
                        </p>
                        <p className="text-green-100 mt-2 sm:mt-0 text-xs sm:text-base">
                            Địa chỉ: Số 1 Trần Hưng Đạo, phường Hai Bà Trưng, Hà Nội
                        </p>
                        <p className="text-green-100 sm:mt-0 text-xs sm:text-base">
                            E-mail: bvtuqd108@benhvien108.vn
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;