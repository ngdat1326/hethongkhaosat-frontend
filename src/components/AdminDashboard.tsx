import React, { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import {
    BarChart3,
    FileText,
    Users,
    LogOut,
    Menu,
    X,
    Home,
    MessageSquare,
    Activity,
    ChevronDown
} from 'lucide-react';
import DashboardOverview from './admin/DashboardOverview';
import SurveyManager from './admin/SurveyManager';
import ResponseManager from './admin/ResponseManager';
import Analytics from './admin/Analytics';
import UserManager from './admin/UserManager';
import ChangePasswordModal from './ChangePasswordModal';
import Logo from './common/Logo';

const AdminDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    const menuItems = [
        { path: '/admin', icon: Home, label: 'Trang tổng quan', exact: true },
        { path: '/admin/surveys', icon: FileText, label: 'Quản lý khảo sát' },
        { path: '/admin/responses', icon: MessageSquare, label: 'Phản hồi' },
        { path: '/admin/analytics', icon: BarChart3, label: 'Thống kê' },
        { path: '/admin/users', icon: Users, label: 'Người dùng' },
    ];

    const isActive = (path: string, exact?: boolean) => {
        if (exact) {
            return location.pathname === path;
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
                <div className="flex items-center justify-between min-h-16 px-4 py-2 border-b" style={{ backgroundColor: '#319243' }}>
                    <div className="flex flex-col items-center flex-1 min-w-0 py-2">
                        <div className="flex-shrink-0 flex items-center justify-center">
                            <Logo size="lg" showText={false} imageUrl="/logo.png" className="logo-header" />
                        </div>
                        <h1 className="text-base font-bold text-white text-center leading-tight">
                            BỆNH VIỆN TRUNG ƯƠNG<br />QUÂN ĐỘI 108
                        </h1>
                        <p className="text-xs text-green-100 text-center">Hệ thống quản lý</p>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-white hover:text-green-100 p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <nav className="mt-6 px-3">
                    <div className="space-y-1">
                        {menuItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center space-x-3 px-3 py-2 transition-colors ${isActive(item.path, item.exact)
                                        ? 'bg-green-50 text-green-700 border-r-2 border-green-600'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </div>
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                    <div className="flex items-center justify-between">
                        <div className="relative">
                            <div
                                className="flex items-center space-x-3 cursor-pointer group"
                                onClick={() => setProfileMenuOpen((open) => !open)}
                                tabIndex={0}
                                onBlur={() => setTimeout(() => setProfileMenuOpen(false), 150)}
                                title="Tùy chọn tài khoản"
                            >
                                <div className="w-8 h-8 bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                                    {user?.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 group-hover:underline">{user?.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                                </div>
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                            </div>
                            {profileMenuOpen && (
                                <div className="absolute left-0 bottom-12 w-44 bg-white border rounded-none shadow-lg z-50 animate-fade-in">
                                    <button
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                        onClick={() => { setShowChangePassword(true); setProfileMenuOpen(false); }}
                                    >
                                        Đổi mật khẩu
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={logout}
                            className="text-gray-500 hover:text-red-600 transition-colors"
                            title="Đăng xuất"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 lg:ml-0">
                {/* Header */}
                <header className="bg-white shadow-sm border-b" style={{ backgroundColor: '#319243' }}>
                    <div className="flex items-center justify-between h-16 px-6">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden text-white hover:text-green-100"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <div>
                                <h2 className="text-xl font-semibold text-white">
                                    {menuItems.find(item => isActive(item.path, item.exact))?.label || 'Tổng quan'}
                                </h2>
                                <p className="text-sm text-green-100">
                                    Hệ thống khảo sát hài lòng bệnh nhân
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 text-white">
                                <Activity className="w-5 h-5" />
                                <p className="text-sm font-medium text-white-900">Xin chào, {user?.name}</p>                          
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="p-6">
                    <Routes>
                        <Route index element={<DashboardOverview />} />
                        <Route path="surveys/*" element={<SurveyManager />} />
                        <Route path="responses" element={<ResponseManager />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="users" element={<UserManager />} />
                    </Routes>
                </main>
            </div>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
        </div>
    );
};

export default AdminDashboard;