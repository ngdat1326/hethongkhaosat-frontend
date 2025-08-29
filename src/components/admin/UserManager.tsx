import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import {
    Plus,
    Edit,
    Trash2,
    Search,
    Shield,
    User,
    Stethoscope,
    Settings,
    Check,
    X,
    AlertTriangle,
    RefreshCcw
} from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { API_BASE_URL } from '../../config';

// Map backend UserDto to frontend User
interface User {
    id: string;
    username: string;
    email: string;
    fullName: string;
    phoneNumber?: string;
    role?: string;
    departmentId?: number;
    departmentName?: string;
    isActive?: boolean;
}

// Department type
interface Department {
    id: number;
    name: string;
}

const API_BASE = `${API_BASE_URL}/api/ManageUser`;

const UserManager: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Create user form state
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        fullName: '',
        phoneNumber: '',
        departmentId: ''
    });

    // State for update modal
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateUser, setUpdateUser] = useState<User | null>(null);
    const [updateForm, setUpdateForm] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        departmentId: ''
    });

    // After fetching users, extract unique roles
    const [roles, setRoles] = useState<string[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10); // Now changeable
    const [totalPages, setTotalPages] = useState(1);

    const { user } = useAuth();

    // Move all hooks above any conditional logic

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const token = localStorage.getItem('token');
                // Fix endpoint to match your backend: /api/ManageDepartment
                const res = await fetch(`${API_BASE_URL}/api/ManageDepartment`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (!res.ok) throw new Error('Lỗi khi tải danh sách khoa');
                const data = await res.json();
                setDepartments(Array.isArray(data) && data.every((d) => 'id' in d && 'name' in d) ? data : []);
            } catch {
                setDepartments([]); // fallback to empty
            }
        };
        fetchDepartments();
    }, []);

    // Fetch users from API (with paging)
    const fetchUsers = async (page = 1, size = pageSize) => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const statusValue = getStatusQuery(statusFilter);
            let url = `${API_BASE}/list-user?page=${page}&pageSize=${size}` +
                (searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '') +
                (roleFilter !== 'all' ? `&role=${encodeURIComponent(roleFilter)}` : '') +
                (departmentFilter !== 'all' ? `&departmentId=${encodeURIComponent(departmentFilter)}` : '');
            if (statusValue !== undefined) {
                url += `&isActive=${statusValue}`;
            }
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Lỗi khi tải danh sách người dùng');
            const data = await res.json();
            setUsers(data.items.map((u: User) => ({
                id: u.id,
                username: u.username,
                email: u.email,
                fullName: u.fullName,
                phoneNumber: u.phoneNumber,
                role: u.role,
                departmentId: u.departmentId,
                departmentName: u.departmentName,
                isActive: u.isActive
            })));
            setTotalPages(data.totalPages || 1);
            const uniqueRoles = Array.from(new Set(data.items.map((u: User) => u.role).filter(Boolean)));
            setRoles(uniqueRoles as string[]);
        } catch (err) {
            setError((err as Error).message || 'Lỗi không xác định');
        } finally {
            setLoading(false);
        }
    };

    // Fetch users on mount and when filters/page/pageSize change
    useEffect(() => {
        fetchUsers(currentPage, pageSize);
        // eslint-disable-next-line
    }, [currentPage, searchTerm, roleFilter, departmentFilter, statusFilter, pageSize]);

    // When pageSize or any filter changes, reset to page 1
    useEffect(() => {
        setCurrentPage(1);
    }, [pageSize, searchTerm, roleFilter, departmentFilter, statusFilter]);

    const getRoleIcon = (role?: string) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return <Shield className="w-4 h-4 text-red-600" />;
            case 'coordinator':
                return <Settings className="w-4 h-4 text-blue-600" />;
            case 'doctor':
                return <Stethoscope className="w-4 h-4 text-green-600" />;
            default:
                return <User className="w-4 h-4 text-gray-600" />;
        }
    };

    // Validation error state for create and update
    const [createErrors, setCreateErrors] = useState<{ username?: string; fullName?: string; email?: string; phoneNumber?: string; departmentId?: string }>({});
    const [updateErrors, setUpdateErrors] = useState<{ fullName?: string; email?: string; phoneNumber?: string; departmentId?: string }>({});

    // Validate phone and email before create
    const validateEmail = (email: string) => /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email);
    const validatePhone = (phone: string) => /^\d{10,11}$/.test(phone);

    // Handle create user
    const handleCreateUser = async () => {
        // Validation
        const errors: { username?: string; fullName?: string; email?: string; phoneNumber?: string; departmentId?: string } = {};
        if (!newUser.username.trim()) errors.username = 'Tên đăng nhập không được để trống.';
        if (!newUser.fullName.trim()) errors.fullName = 'Họ tên không được để trống.';
        if (!newUser.email.trim()) errors.email = 'Email không được để trống.';
        else if (!validateEmail(newUser.email)) errors.email = 'Email không hợp lệ.';
        if (!newUser.phoneNumber.trim()) errors.phoneNumber = 'Số điện thoại không được để trống.';
        else if (!validatePhone(newUser.phoneNumber)) errors.phoneNumber = 'Số điện thoại phải có 10-11 chữ số.';
        if (!newUser.departmentId) errors.departmentId = 'Khoa không được để trống.';
        setCreateErrors(errors);
        if (Object.keys(errors).length > 0) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/create-user`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Username: newUser.username,
                    Email: newUser.email,
                    FullName: newUser.fullName,
                    PhoneNumber: newUser.phoneNumber,
                    DepartmentId: newUser.departmentId ? Number(newUser.departmentId) : null
                })
            });
            if (!res.ok) throw new Error('Lỗi khi tạo người dùng');
            setShowCreateModal(false);
            setNewUser({ username: '', email: '', fullName: '', phoneNumber: '', departmentId: '' });
            setCreateErrors({});
            await fetchUsers();
        } catch (err) {
            setError((err as Error).message || 'Lỗi không xác định');
        } finally {
            setLoading(false);
        }
    };

    // Open update modal and set form values
    const handleOpenUpdateModal = (user: User) => {
        setUpdateUser(user);
        setUpdateForm({
            fullName: user.fullName || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || '',
            departmentId: user.departmentId ? String(user.departmentId) : ''
        });
        setShowUpdateModal(true);
    };

    // Handle update user API call
    const handleUpdateUser = async () => {
        if (!updateUser) return;
        const errors: { fullName?: string; email?: string; phoneNumber?: string; departmentId?: string } = {};
        if (!updateForm.fullName.trim()) errors.fullName = 'Họ tên không được để trống.';
        if (!updateForm.email.trim()) errors.email = 'Email không được để trống.';
        else if (!validateEmail(updateForm.email)) errors.email = 'Email không hợp lệ.';
        if (!updateForm.phoneNumber.trim()) errors.phoneNumber = 'Số điện thoại không được để trống.';
        else if (!validatePhone(updateForm.phoneNumber)) errors.phoneNumber = 'Số điện thoại phải có 10-11 chữ số.';
        if (!updateForm.departmentId) errors.departmentId = 'Khoa không được để trống.';
        setUpdateErrors(errors);
        if (Object.keys(errors).length > 0) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/update-user/${updateUser.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    Email: updateForm.email,
                    FullName: updateForm.fullName,
                    PhoneNumber: updateForm.phoneNumber,
                    DepartmentId: updateForm.departmentId ? Number(updateForm.departmentId) : null
                })
            });
            if (!res.ok) throw new Error('Lỗi khi cập nhật người dùng');
            setShowUpdateModal(false);
            setUpdateUser(null);
            setUpdateErrors({});
            await fetchUsers();
        } catch (err) {
            setError((err as Error).message || 'Lỗi không xác định');
        } finally {
            setLoading(false);
        }
    };

    // Notification state
    const [notification, setNotification] = useState<string | null>(null);
    const [notificationType, setNotificationType] = useState<'success' | 'error' | null>(null);

    // Helper to show notification
    const showNotification = (msg: string, type: 'success' | 'error') => {
        setNotification(msg);
        setNotificationType(type);
        setTimeout(() => {
            setNotification(null);
            setNotificationType(null);
        }, 2000);
    };

    // Handle delete user
    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/delete-user/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Lỗi khi xóa người dùng');
            setUsers(users => users.filter(u => u.id !== userId));
            showNotification('Xóa người dùng thành công!', 'success');
        } catch (err) {
            showNotification((err as Error).message || 'Lỗi không xác định', 'error');
        }
    };

    // Handle toggle active status for user
    const handleToggleActive = async (userId: string, currentActive: boolean) => {
        if (!window.confirm(currentActive ? 'Bạn có chắc chắn muốn vô hiệu hóa tài khoản này?' : 'Bạn có chắc chắn muốn kích hoạt tài khoản này?')) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const isActiveValue = (!currentActive).toString();
            const res = await fetch(`${API_BASE}/set-active/${userId}?isActive=${isActiveValue}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Lỗi khi cập nhật trạng thái hoạt động');
            await fetchUsers(currentPage, pageSize);
            showNotification(currentActive ? 'Vô hiệu hóa tài khoản thành công!' : 'Kích hoạt tài khoản thành công!', 'success');
        } catch (err) {
            showNotification((err as Error).message || 'Lỗi không xác định', 'error');
        } finally {
            setLoading(false);
        }
    };

    // State for selected users (bulk actions)
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    // Helper: select all users on current page
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedUserIds(users.map(u => u.id));
        } else {
            setSelectedUserIds([]);
        }
    };
    // Helper: select single user
    const handleSelectUser = (userId: string, checked: boolean) => {
        setSelectedUserIds(prev => checked ? [...prev, userId] : prev.filter(id => id !== userId));
    };

    // Bulk delete by IDs only
    const handleBulkDelete = async () => {
        if (selectedUserIds.length === 0) return;
        if (!window.confirm('Bạn có chắc chắn muốn xóa các người dùng đã chọn?')) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE}/bulk-delete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userIds: selectedUserIds })
            });
            setSelectedUserIds([]);
            await fetchUsers(currentPage, pageSize);
        } catch (err) {
            setError((err as Error).message || 'Lỗi bulk delete');
        } finally {
            setLoading(false);
        }
    };

    // Bulk activate/deactivate by IDs only
    const handleBulkSetActive = async (isActive: boolean) => {
        if (selectedUserIds.length === 0) return;
        if (!window.confirm(`Bạn có chắc chắn muốn ${isActive ? 'kích hoạt' : 'vô hiệu hóa'} các người dùng đã chọn?`)) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            // Gửi đúng tên trường setActive cho backend
            await fetch(`${API_BASE}/bulk-set-active`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userIds: selectedUserIds, setActive: Boolean(isActive) })
            });
            setSelectedUserIds([]);
            await fetchUsers(currentPage, pageSize);
        } catch (err) {
            setError((err as Error).message || 'Lỗi bulk set active');
        } finally {
            setLoading(false);
        }
    };

    // Map departments to react-select options
    const departmentOptions = [
        { value: 'all', label: 'Tất cả khoa' },
        ...departments.map(dep => ({ value: String(dep.id), label: dep.name }))
    ];

    // Find selected department option
    const selectedDepartmentOption = departmentOptions.find(opt => opt.value === departmentFilter);

    // Map statusFilter to boolean or undefined for API
    const getStatusQuery = (status: string) => {
        if (status === 'active') return true;
        if (status === 'inactive') return false;
        return undefined;
    };

    // Reset filters and paging
    const handleResetFilters = () => {
        setSearchTerm('');
        setRoleFilter('all');
        setDepartmentFilter('all');
        setStatusFilter('all');
        setCurrentPage(1);
        setPageSize(10);
    };

    // Place conditional rendering after all hooks
    if (user?.role === 'User') {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="bg-white p-8 text-center">
                    <AlertTriangle className="mx-auto mb-4 w-12 h-12 text-red-600" />
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Bạn không có quyền truy cập vào trang này</h2>
                </div>
            </div>
        );
    }

    // Helper: check all selected users are active/inactive/lẫn lộn
    const allSelectedActive = selectedUserIds.length > 0 && selectedUserIds.every(id => {
        const u = users.find(u => u.id === id);
        return u && u.isActive;
    });
    const allSelectedInactive = selectedUserIds.length > 0 && selectedUserIds.every(id => {
        const u = users.find(u => u.id === id);
        return u && !u.isActive;
    });
    const mixedSelected = selectedUserIds.length > 0 && !allSelectedActive && !allSelectedInactive;
    // Nếu có user role admin được chọn thì không cho phép bulk active/inactive
    const hasAdminSelected = selectedUserIds.some(id => {
        const u = users.find(u => u.id === id);
        return u && u.role && u.role.toLowerCase() === 'admin';
    });

    // Reset password handler
    const handleResetPassword = async (userId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn đặt lại mật khẩu cho người dùng này?')) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/reset-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId })
            });
            if (!res.ok) throw new Error('Lỗi khi đặt lại mật khẩu');
            showNotification('Đặt lại mật khẩu thành công!', 'success');
        } catch (err) {
            showNotification((err as Error).message || 'Lỗi không xác định', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h2>
                    <p className="text-gray-600">Quản lý tài khoản và phân quyền trong hệ thống</p>
                </div>
                <button
                    style={{ backgroundColor: '#319243' }}
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-none hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>Thêm người dùng</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tìm kiếm
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên, email hoặc username..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vai trò
                        </label>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">Tất cả vai trò</option>
                            {roles.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Khoa
                        </label>
                        <div className="w-full">
                            <Select
                                options={departmentOptions}
                                value={selectedDepartmentOption}
                                onChange={option => setDepartmentFilter(option ? option.value : 'all')}
                                isSearchable
                                classNamePrefix="react-select"
                                placeholder="Chọn khoa..."
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        borderRadius: 0,
                                        minHeight: '40px',
                                        height: '40px',
                                        boxShadow: 'none',
                                    }),
                                    container: (base) => ({
                                        ...base,
                                        width: '100%',
                                    })
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Trạng thái
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">Tất cả</option>
                                <option value="active">Hoạt động</option>
                                <option value="inactive">Vô hiệu hóa</option>
                            </select>
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-none hover:bg-gray-300 whitespace-nowrap"
                                title="Làm mới bộ lọc"
                            >
                                Làm mới
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bulk Actions + Notification Row */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2">
                    <button
                        onClick={handleBulkDelete}
                        className={`px-3 py-1 text-xs flex items-center gap-1 transition-colors font-medium text-white ${loading || selectedUserIds.length === 0 || hasAdminSelected ? 'bg-red-100' : 'bg-red-300 hover:bg-red-400'}`}
                        disabled={loading || selectedUserIds.length === 0 || hasAdminSelected}
                    >
                        Xóa hàng loạt
                    </button>
                    <button
                        onClick={() => handleBulkSetActive(true)}
                        className={`px-3 py-1 text-xs flex items-center gap-1 transition-colors font-medium text-white ${loading || selectedUserIds.length === 0 || allSelectedActive || mixedSelected || hasAdminSelected ? 'bg-green-100' : 'bg-green-300 hover:bg-green-400'}`}
                        disabled={loading || selectedUserIds.length === 0 || allSelectedActive || mixedSelected || hasAdminSelected}
                    >
                        Kích hoạt hàng loạt
                    </button>
                    <button
                        onClick={() => handleBulkSetActive(false)}
                        className={`px-3 py-1 text-xs flex items-center gap-1 transition-colors font-medium text-white ${loading || selectedUserIds.length === 0 || allSelectedInactive || mixedSelected || hasAdminSelected ? 'bg-cyan-100' : 'bg-cyan-300 hover:bg-cyan-400'}`}
                        disabled={loading || selectedUserIds.length === 0 || allSelectedInactive || mixedSelected || hasAdminSelected}
                    >
                        Vô hiệu hóa hàng loạt
                    </button>
                </div>
                {notification && (
                    <div className={`px-2 py-1 rounded text-right font-medium text-xs ${notificationType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{notification}</div>
                )}
            </div>

            {/* Users List */}
            <div className="bg-white p-6 pb-8">
                <div className="border-b flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h3 className="text-lg font-medium text-gray-900">
                        Danh sách người dùng
                    </h3>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="pageSize" className="text-sm text-gray-700">Số dòng/trang:</label>
                        <select
                            id="pageSize"
                            value={pageSize}
                            onChange={e => setPageSize(Number(e.target.value))}
                            className="border border-gray-300 px-2 py-1 text-sm"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>
                {users.length === 0 ? (
                    <div className="text-center py-12">
                        <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">Không có người dùng nào phù hợp với bộ lọc</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="py-3 px-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedUserIds.length === users.length && users.length > 0}
                                                onChange={e => handleSelectAll(e.target.checked)}
                                            />
                                        </th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-900">Tên đăng nhập</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-900">Họ tên</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-900">Email</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-900">Số điện thoại</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-900">Vai trò</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-900">Khoa</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-900">Trạng thái</th>
                                        <th className="text-left py-3 px-4 font-medium text-gray-900">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="py-4 px-2 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIds.includes(user.id)}
                                                    onChange={e => handleSelectUser(user.id, e.target.checked)}
                                                />
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    {/* Checkbox for selecting individual user */}
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUserIds.includes(user.id)}
                                                        onChange={e => handleSelectUser(user.id, e.target.checked)}
                                                        className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                        aria-label={`Chọn ${user.username}`}
                                                    />
                                                    {user.username}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">{user.fullName}</td>
                                            <td className="py-4 px-4">{user.email}</td>
                                            <td className="py-4 px-4">{user.phoneNumber || '-'}</td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center space-x-2">
                                                    {getRoleIcon(user.role)}
                                                    <span className="text-sm font-medium">{user.role}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">{user.departmentName || '-'}</td>
                                            <td className="py-4 px-4">
                                                {user.isActive ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Đang hoạt động
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Vô hiệu hóa
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        className="text-blue-600 hover:text-blue-700"
                                                        title="Chỉnh sửa"
                                                        onClick={() => handleOpenUpdateModal(user)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    {user.role && user.role.toLowerCase() !== 'admin' && (
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    {/* Hide active/deactive button for admin users (case-insensitive) */}
                                                    {user.role && user.role.toLowerCase() !== 'admin' && (
                                                        <button
                                                            onClick={() => handleToggleActive(user.id, !!user.isActive)}
                                                            className={user.isActive ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : 'text-green-600 hover:bg-green-50 hover:text-green-700'}
                                                            title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                            style={{ padding: 0, background: 'none', border: 'none' }}
                                                        >
                                                            {user.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    {user.role && user.role.toLowerCase() !== 'admin' && (
                                                        <button
                                                            onClick={() => handleResetPassword(user.id)}
                                                            className="text-yellow-600 hover:text-yellow-700"
                                                            title="Đặt lại mật khẩu"
                                                            disabled={loading}
                                                            style={{ padding: 0, background: 'none', border: 'none' }}
                                                        >
                                                            <RefreshCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        <div className="flex justify-center items-center space-x-2 mt-4 mb-8">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded-none bg-gray-200 text-gray-700 disabled:opacity-50"
                            >
                                Trước
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`px-3 py-1 rounded-none ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded-none bg-gray-200 text-gray-700 disabled:opacity-50"
                            >
                                Sau
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Thêm người dùng mới</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tên đăng nhập
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Nhập tên đăng nhập"
                                    value={newUser.username}
                                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                />
                                {createErrors.username && <div className="text-red-600 text-xs mt-1">{createErrors.username}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Họ tên
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Nhập họ tên"
                                    value={newUser.fullName}
                                    onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                                />
                                {createErrors.fullName && <div className="text-red-600 text-xs mt-1">{createErrors.fullName}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Nhập email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                />
                                {createErrors.email && <div className="text-red-600 text-xs mt-1">{createErrors.email}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Số điện thoại
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Nhập số điện thoại"
                                    value={newUser.phoneNumber}
                                    onChange={e => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                                />
                                {createErrors.phoneNumber && <div className="text-red-600 text-xs mt-1">{createErrors.phoneNumber}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Khoa
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={newUser.departmentId}
                                    onChange={e => setNewUser({ ...newUser, departmentId: e.target.value })}
                                >
                                    <option value="">Chọn khoa</option>
                                    {departments.map(dep => (
                                        <option key={dep.id} value={dep.id}>{dep.name}</option>
                                    ))}
                                </select>
                                {createErrors.departmentId && <div className="text-red-600 text-xs mt-1">{createErrors.departmentId}</div>}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateUser}
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
                                disabled={loading}
                            >
                                {loading ? 'Đang tạo...' : 'Tạo người dùng'}
                            </button>
                        </div>
                        {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}
                    </div>
                </div>
            )}

            {/* Update User Modal */}
            {showUpdateModal && updateUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Cập nhật người dùng</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Nhập họ tên"
                                    value={updateForm.fullName}
                                    onChange={e => setUpdateForm({ ...updateForm, fullName: e.target.value })}
                                />
                                {updateErrors.fullName && <div className="text-red-600 text-xs mt-1">{updateErrors.fullName}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Nhập email"
                                    value={updateForm.email}
                                    onChange={e => setUpdateForm({ ...updateForm, email: e.target.value })}
                                />
                                {updateErrors.email && <div className="text-red-600 text-xs mt-1">{updateErrors.email}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Nhập số điện thoại"
                                    value={updateForm.phoneNumber}
                                    onChange={e => setUpdateForm({ ...updateForm, phoneNumber: e.target.value })}
                                />
                                {updateErrors.phoneNumber && <div className="text-red-600 text-xs mt-1">{updateErrors.phoneNumber}</div>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Khoa</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={updateForm.departmentId}
                                    onChange={e => setUpdateForm({ ...updateForm, departmentId: e.target.value })}
                                >
                                    <option value="">Chọn khoa</option>
                                    {departments.map(dep => (
                                        <option key={dep.id} value={dep.id}>{dep.name}</option>
                                    ))}
                                </select>
                                {updateErrors.departmentId && <div className="text-red-600 text-xs mt-1">{updateErrors.departmentId}</div>}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUpdateUser}
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700"
                                disabled={loading}
                            >
                                {loading ? 'Đang cập nhật...' : 'Cập nhật'}
                            </button>
                        </div>
                        {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManager;

// Fix: Polyfill Array.prototype.includes for environments that do not support it
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function<T>(this: T[], searchElement: T, fromIndex: number = 0): boolean {
      return this.indexOf(searchElement, fromIndex) !== -1;
    },
    configurable: true,
    writable: true
  });
}