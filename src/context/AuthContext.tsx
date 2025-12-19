import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../utils/api';

interface User {
    id: string;
    userid: string;
    fullname: string;
    email: string;
    credits: number;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (userData: any) => void;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const res = await api.get('/me');
            setUser(res.data);
        } catch (err) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = (userData: any) => {
        setUser(userData);
    };

    const logout = async () => {
        try {
            await api.post('/logout');
            setUser(null);
            window.location.href = '/';
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
