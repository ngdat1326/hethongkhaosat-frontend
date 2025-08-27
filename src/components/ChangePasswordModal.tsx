import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const passwordRequirements = [
    { test: (pw: string) => pw.length >= 6, message: 'Ít nhất 6 ký tự.' },
    { test: (pw: string) => /[A-Z]/.test(pw), message: 'Ít nhất 1 chữ hoa.' },
    { test: (pw: string) => /[a-z]/.test(pw), message: 'Ít nhất 1 chữ thường.' },
    { test: (pw: string) => /[0-9]/.test(pw), message: 'Ít nhất 1 chữ số.' },
    { test: (pw: string) => /[^a-zA-Z0-9]/.test(pw), message: 'Ít nhất 1 ký tự đặc biệt.' },
];

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pwErrors, setPwErrors] = useState<string[]>([]);

    const validatePassword = (pw: string) => {
        return passwordRequirements.filter(req => !req.test(pw)).map(req => req.message);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setPwErrors([]);
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Vui lòng điền đầy đủ thông tin.');
            return;
        }
        const pwErrs = validatePassword(newPassword);
        if (pwErrs.length > 0) {
            setPwErrors(pwErrs);
            setError('Mật khẩu mới không đáp ứng yêu cầu.');
            return;
        }
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('https://localhost:7226/api/Auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword
                })
            });
            const data = await res.json();
            if (!res.ok) {
                let msg = data.message || 'Đổi mật khẩu thất bại.';
                const msgLower = msg.toLowerCase();
                if (msgLower.includes('mật khẩu cũ không đúng')) {
                    setError('Mật khẩu cũ không đúng. Vui lòng nhập lại');
                } else if (msgLower.includes('mật khẩu mới và xác nhận mật khẩu không khớp')) {
                    setError('Xác nhận mật khẩu mới không khớp. Vui lòng nhập lại');
                } else {
                    setError(msg);
                }
            } else {
                setSuccess('Đổi mật khẩu thành công!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                if (onSuccess) onSuccess();
                setTimeout(() => {
                    setSuccess('');
                    onClose();
                }, 1200);
            }
        } catch {
            setError('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 font-sans">
            <div className="bg-white p-6 w-full max-w-md shadow-lg relative font-sans">
                <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    onClick={onClose}
                    disabled={loading}
                >
                    ×
                </button>
                <h2 className="text-lg font-bold mb-4 text-center font-sans">Đổi mật khẩu</h2>
                <form onSubmit={handleSubmit} className="space-y-4 font-sans">
                    <div>
                        <label className="block text-sm font-medium mb-1 font-sans">Mật khẩu hiện tại</label>
                        <div className="relative">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                className="w-full px-3 py-2 border border-gray-300 font-sans pr-12"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(v => !v)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                tabIndex={-1}
                            >
                                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 font-sans">Mật khẩu mới</label>
                        <div className="relative">
                            <input
                                type={showNew ? 'text' : 'password'}
                                className="w-full px-3 py-2 border border-gray-300 font-sans pr-12"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(v => !v)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                tabIndex={-1}
                            >
                                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        {pwErrors.length > 0 && (
                            <ul className="text-xs text-red-500 mt-1 list-disc list-inside">
                                {pwErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                            </ul>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1 font-sans">Xác nhận mật khẩu mới</label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                className="w-full px-3 py-2 border border-gray-300 font-sans pr-12"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(v => !v)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                tabIndex={-1}
                            >
                                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    {error && <div className="text-red-600 text-sm font-sans">{error}</div>}
                    {success && <div className="text-green-600 text-sm font-sans">{success}</div>}
                    <button
                        type="submit"
                        className="w-full py-2 px-4 rounded-none text-white font-medium font-sans"
                        style={{ backgroundColor: '#319243' }}
                        disabled={loading}
                    >
                        {loading ? 'Đang đổi...' : 'Đổi mật khẩu'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
