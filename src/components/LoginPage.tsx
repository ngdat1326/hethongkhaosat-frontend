import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/useAuth';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';
import Logo from './common/Logo';
import { API_BASE_URL } from '../config';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    // OTP states
    const [requireOtp, setRequireOtp] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpMessage, setOtpMessage] = useState('');
    // Đếm ngược OTP
    const [otpCountdown, setOtpCountdown] = useState(180); 
    const otpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Gửi lại OTP
    const [resendLoading, setResendLoading] = useState(false);
    const [resendDisabled, setResendDisabled] = useState(false);
    const [resendMessage, setResendMessage] = useState('');

    useEffect(() => {
        if (user) {
            navigate('/admin', { replace: true });
        }
    }, [user, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setRequireOtp(false);
        setOtpError('');
        setOtpMessage('');
        try {
            const result = await login(username, password);
            if (result === true) {
                navigate('/admin');
            } else if (typeof result === 'string') {
                setError(result || 'Tài khoản của bạn đã bị vô hiệu hóa. Hãy liên hệ với quản trị viên');
            } else if (typeof result === 'object' && result.requireOtp) {
                setRequireOtp(true);
                setOtpMessage(result.message || 'Vui lòng kiểm tra email để lấy mã OTP xác thực.');
            } else {
                setError('Tên đăng nhập hoặc mật khẩu không chính xác');
            }
        } catch {
            setError('Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    // Xác thực OTP
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setOtpError('');
        setOtpLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/Auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, otpCode })
            });
            const data = await response.json();
            if (response.ok && data.token && data.refreshToken) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('refreshToken', data.refreshToken);
                window.location.href = '/admin';
            } else {
                setOtpError(data.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
            }
        } catch {
            setOtpError('Đã xảy ra lỗi khi xác thực OTP.');
        } finally {
            setOtpLoading(false);
        }
    };

    // Gửi lại OTP
    const handleResendOtp = async () => {
        if (!username) {
            setResendMessage('Vui lòng nhập tên đăng nhập trước khi gửi lại OTP.');
            return;
        }
        setResendLoading(true);
        setResendMessage('');
        setOtpError('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/Auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            setResendMessage(data.message || '');
            if (data.message && data.message.includes('quá số lần')) {
                setResendDisabled(true);
            }
            if (data.message && data.message.toLowerCase().includes('đã gửi lại mã otp')) {
                setOtpCountdown(180); // reset lại đếm ngược nếu gửi lại thành công
            }
        } catch {
            setResendMessage('Đã xảy ra lỗi khi gửi lại OTP.');
        } finally {
            setResendLoading(false);
        }
    };

    // Format mm:ss
    const formatCountdown = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Khi requireOtp true thì bắt đầu đếm ngược
    useEffect(() => {
        if (requireOtp) {
            setOtpCountdown(180);
            if (otpTimerRef.current) clearInterval(otpTimerRef.current);
            otpTimerRef.current = setInterval(() => {
                setOtpCountdown(prev => {
                    if (prev <= 1) {
                        if (otpTimerRef.current) clearInterval(otpTimerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (otpTimerRef.current) clearInterval(otpTimerRef.current);
        }
        return () => {
            if (otpTimerRef.current) clearInterval(otpTimerRef.current);
        };
    }, [requireOtp]);

    return (
        <>
            <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#e3f3e3' }}>
                <div className="max-w-md w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex flex-col items-center justify-center">
                            <div className="flex-shrink-0 flex items-center justify-center">
                                <Logo size="xxl" showText={false} imageUrl="/logo.png" className="logo-header" />
                            </div>
                            <span
                              className="text-3xl md:text-3xl font-extrabold uppercase whitespace-nowrap text-center inline-block"
                              style={{ color: '#319243', marginBottom: '1rem' }}
                            >
                              BỆNH VIỆN TRUNG ƯƠNG
                              <br className="block sm:hidden" />
                              <span className="hidden sm:inline"> </span>QUÂN ĐỘI 108
                            </span>
                        </div>
                    </div>

                    {/* Login Form hoặc OTP Form */}
                    <div className="bg-white shadow-lg p-8" style={{ border: 'none' }}>
                        <h1 style={{ marginBottom: '3rem' }} className="text-xl font-bold text-gray-900 mb-2 text-center">Hệ thống quản lý khảo sát bệnh viện</h1>
                        {!requireOtp ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                                    Tên đăng nhập
                                </label>
                                <input
                                    type="text"
                                    id="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Nhập tên đăng nhập"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Mật khẩu
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex items-center justify-center space-x-2 py-3 px-4  font-medium transition-all text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'hover:opacity-90 active:opacity-80'
                                    }`}
                                style={{ backgroundColor: loading ? undefined : '#319243' }}
                            >
                                {loading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                ) : (
                                    <>
                                        <span>Đăng nhập</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                        ) : (
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="text-green-700 text-center font-semibold mb-2">
                                {otpCountdown > 0 ? (
                                    <>
                                        {otpMessage || 'Vui lòng kiểm tra email để lấy mã OTP xác thực.'}
                                        <br />
                                        <span className="text-sm text-gray-700">Mã OTP sẽ hết hạn sau: <span className="font-bold">{formatCountdown(otpCountdown)}</span></span>
                                    </>
                                ) : (
                                    <span className="text-red-600">Mã OTP đã hết hạn, vui lòng đăng nhập lại để nhận mã mới.</span>
                                )}
                            </div>
                            <div>
                                <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-2">
                                    Mã OTP
                                </label>
                                <div className="flex flex-row gap-2 items-center">
                                    <input
                                        type="text"
                                        id="otpCode"
                                        required
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        placeholder="Nhập mã OTP từ email"
                                        maxLength={10}
                                        disabled={otpCountdown === 0}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={resendLoading || resendDisabled || otpCountdown === 0}
                                        className={`flex items-center justify-center px-3 py-2 font-medium transition-all border border-green-600 text-green-700 bg-white whitespace-nowrap ${
                                            (resendLoading || resendDisabled || otpCountdown === 0)
                                                ? 'opacity-60 cursor-not-allowed'
                                                : 'hover:bg-green-50 active:bg-green-100'
                                        }`}
                                    >
                                        {resendLoading ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600" />
                                        ) : (
                                            <span>Gửi lại OTP</span>
                                        )}
                                    </button>
                                </div>
                            </div>
                            {otpError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                                    {otpError}
                                </div>
                            )}
                            {resendMessage && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm">
                                    {resendMessage}
                                </div>
                            )}
                            <button
                                type="submit"
                                disabled={otpLoading || otpCountdown === 0}
                                className={`w-full flex items-center justify-center space-x-2 py-3 px-4 font-medium transition-all text-white ${(otpLoading || otpCountdown === 0) ? 'bg-gray-400 cursor-not-allowed' : 'hover:opacity-90 active:opacity-80'}`}
                                style={{ backgroundColor: (otpLoading || otpCountdown === 0) ? undefined : '#319243' }}
                            >
                                {otpLoading ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                ) : (
                                    <>
                                        <span>Xác thực OTP</span>
                                        <Shield className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoginPage;
