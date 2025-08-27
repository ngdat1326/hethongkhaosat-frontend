import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

export interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<boolean | string | { requireOtp: boolean; message: string }>; // sửa kiểu trả về
    logout: () => void;
    isAuthenticated: boolean;
    refreshToken: () => Promise<boolean>;
    accessToken: string | null;
}

interface JwtPayload {
    sub?: string;
    email?: string;
    FullName?: string;
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"?: string;
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"?: string;
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
    exp?: number;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isTokenExpired(token: string): boolean {
    try {
        const decoded = jwtDecode<JwtPayload>(token);
        if (!decoded.exp) return true;
        const now = Math.floor(Date.now() / 1000);
        return decoded.exp < now;
    } catch {
        return true;
    }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [accessToken, setAccessToken] = useState<string | null>(localStorage.getItem('token'));

    // Helper: decode and set user from token
    const setUserFromToken = (token: string) => {
        const decoded = jwtDecode<JwtPayload>(token);
        setUser({
            id: decoded.sub || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || '',
            email: decoded.email || decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || '',
            name: decoded.FullName || '',
            role: decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || ''
        });
        setIsAuthenticated(true);
    };

    // Restore session on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        const refreshTokenValue = localStorage.getItem('refreshToken');
        console.log('[AuthProvider] On mount. token:', token, 'refreshToken:', refreshTokenValue);
        if (token && !isTokenExpired(token)) {
            console.log('[AuthProvider] Token valid, restoring user from token.');
            setAccessToken(token);
            setUserFromToken(token);
        } else if (refreshTokenValue) {
            // Try to refresh if access token is missing/expired
            (async () => {
                console.log('[AuthProvider] Token expired or missing, trying to refresh...');
                const response = await fetch('https://localhost:7226/api/Auth/refresh-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: refreshTokenValue })
                });
                if (response.ok) {
                    const data = await response.json();
                    const newToken = data.token;
                    const newRefreshToken = data.refreshToken;
                    console.log('[AuthProvider] Refresh success. New token:', newToken);
                    if (newToken) {
                        localStorage.setItem('token', newToken);
                        setAccessToken(newToken);
                        setUserFromToken(newToken);
                    }
                    if (newRefreshToken) {
                        localStorage.setItem('refreshToken', newRefreshToken);
                    }
                } else {
                    console.log('[AuthProvider] Refresh failed. Logging out.');
                    setUser(null);
                    setIsAuthenticated(false);
                    setAccessToken(null);
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                }
            })();
        } else {
            console.log('[AuthProvider] No token or refresh token. Logging out.');
            setUser(null);
            setIsAuthenticated(false);
            setAccessToken(null);
        }
    }, []);

    // Login: store both tokens
    const login = async (username: string, password: string): Promise<boolean | string | { requireOtp: boolean; message: string }> => {
        try {
            const response = await fetch('https://localhost:7226/api/Auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.status === 403) {
                let message = '';
                try {
                    const data = await response.json();
                    message = data.message || '';
                } catch {
                    message = await response.text();
                }
                return message || 'Tài khoản của bạn đã bị vô hiệu hóa. Hãy liên hệ với quản trị viên';
            }

            if (!response.ok) return false;

            const data = await response.json();
            if (data.requireOtp) {
                // Nếu cần OTP, trả về requireOtp và message
                return { requireOtp: true, message: data.message || 'Vui lòng kiểm tra email để lấy mã OTP xác thực.' };
            }
            const token = data.token;
            const refreshToken = data.refreshToken;
            localStorage.setItem('token', token);
            setAccessToken(token);
            if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken);
            }
            setUserFromToken(token);
            return true;
        } catch (err) {
            console.error('Login failed', err);
            return false;
        }
    };

    // Refresh token logic
    const refreshToken = useCallback(async (): Promise<boolean> => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return false;
        try {
            const response = await fetch('https://localhost:7226/api/Auth/refresh-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
            if (!response.ok) return false;
            const data = await response.json();
            const newToken = data.token;
            const newRefreshToken = data.refreshToken;
            if (newToken) {
                localStorage.setItem('token', newToken);
                setAccessToken(newToken);
                setUserFromToken(newToken);
            }
            if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken);
            }
            return true;
        } catch (err) {
            console.error('Refresh token failed', err);
            return false;
        }
    }, []);

    // Logout: clear both tokens
    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        setAccessToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated, refreshToken, accessToken }}>
            {children}
        </AuthContext.Provider>
    );
};
