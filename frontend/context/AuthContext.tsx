'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, getToken, setToken, removeToken, User } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (
        username: string,
        email: string,
        password: string,
        firstName?: string,
        lastName?: string,
        cvFile?: File
    ) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const refreshUser = async () => {
        const token = getToken();
        if (!token) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        const response = await authApi.getCurrentUser();
        if (response.data) {
            setUser(response.data);
        } else {
            removeToken();
            setUser(null);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        refreshUser();
    }, []);

    const login = async (email: string, password: string) => {
        const response = await authApi.login(email, password);
        if (response.data) {
            setToken(response.data.access_token);
            setUser(response.data.user);
            setIsLoading(false);
            return { success: true };
        }
        return { success: false, error: response.error };
    };

    const register = async (
        username: string,
        email: string,
        password: string,
        firstName?: string,
        lastName?: string,
        cvFile?: File
    ) => {
        // Step 1: create the account
        const response = await authApi.register(username, email, password, firstName, lastName, cvFile);
        if (!response.data) {
            return { success: false, error: response.error || 'Registration failed' };
        }

        // Step 2: auto-login with the same credentials
        const loginResponse = await authApi.login(email, password);
        if (!loginResponse.data) {
            // Account was created but auto-login failed — send to login page
            router.push('/login');
            return { success: false, error: loginResponse.error || 'Account created! Please log in.' };
        }

        // Step 3: store token and fetch user
        setToken(loginResponse.data.access_token);
        await refreshUser();
        router.push('/dashboard');
        return { success: true };
    };

    const logout = () => {
        removeToken();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
