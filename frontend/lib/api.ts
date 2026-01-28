const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

interface LoginResponse {
    access_token: string;
    token_type: string;
}

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    is_admin: boolean;
    is_active: boolean;
    last_login: string | null;
    created_at: string;
    profile?: UserProfile;
}

interface UserProfile {
    id: number;
    user_id: number;
    phone: string | null;
    cv_file_path: string | null;
    cv_parsed_text: string | null;
    profile_picture: string | null;
    bio: string | null;
    created_at: string;
    updated_at: string;
}

interface Interview {
    id: number;
    user_id: number;
    interview_type: 'technical' | 'behavioral' | 'hr' | 'mixed';
    job_description: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    generated_questions: string[] | null;
    scheduled_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
}

// Token management
export const setToken = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', token);
    }
};

export const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('access_token');
    }
    return null;
};

export const removeToken = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
    }
};

// API request helper
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const token = getToken();

    const headers: HeadersInit = {
        ...options.headers,
    };

    if (!(options.body instanceof FormData) && !(headers as Record<string, string>)['Content-Type']) {
        (headers as Record<string, string>)['Content-Type'] = 'application/json';
    }

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMsg = `Error: ${response.status}`;

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMsg = errorData.detail;
                } else {
                    // Handle FastAPI validation errors which are often lists of objects
                    errorMsg = typeof errorData.detail === 'object'
                        ? JSON.stringify(errorData.detail)
                        : String(errorData.detail);
                }
            }

            return { error: errorMsg };
        }

        const data = await response.json();
        return { data };
    } catch (error) {
        console.error('API Request Error:', error);
        return { error: 'Network error. Please try again.' };
    }
}

// Auth API
export const authApi = {
    login: async (email: string, password: string): Promise<ApiResponse<LoginResponse>> => {
        const formData = new URLSearchParams();
        formData.append('username', email);
        formData.append('password', password);

        return apiRequest<LoginResponse>('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString(),
        });
    },

    register: async (
        username: string,
        email: string,
        password: string,
        firstName?: string,
        lastName?: string,
        cvFile?: File
    ): Promise<ApiResponse<User>> => {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('email', email);
        formData.append('password', password);
        if (firstName) formData.append('first_name', firstName);
        if (lastName) formData.append('last_name', lastName);
        if (cvFile) formData.append('cv_file', cvFile);

        return apiRequest<User>('/auth/register', {
            method: 'POST',
            body: formData,
        });
    },

    getCurrentUser: async (): Promise<ApiResponse<User>> => {
        return apiRequest<User>('/auth/me');
    },

    forgotPassword: async (email: string): Promise<ApiResponse<{ message: string }>> => {
        return apiRequest<{ message: string }>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },

    resetPassword: async (token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
        return apiRequest<{ message: string }>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, new_password: newPassword }),
        });
    },
};

// Interview API
export const interviewApi = {
    list: async (): Promise<ApiResponse<Interview[]>> => {
        return apiRequest<Interview[]>('/interviews');
    },

    create: async (data: {
        interview_type?: string;
        job_description?: string;
        scheduled_at?: string;
    }): Promise<ApiResponse<Interview>> => {
        return apiRequest<Interview>('/interviews', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    get: async (id: number): Promise<ApiResponse<Interview>> => {
        return apiRequest<Interview>(`/interviews/${id}`);
    },

    start: async (id: number): Promise<ApiResponse<Interview>> => {
        return apiRequest<Interview>(`/interviews/${id}/start`, { method: 'POST' });
    },

    end: async (id: number): Promise<ApiResponse<Interview>> => {
        return apiRequest<Interview>(`/interviews/${id}/end`, { method: 'POST' });
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
        return apiRequest<void>(`/interviews/${id}`, { method: 'DELETE' });
    },
};

// Profile API
export const profileApi = {
    get: async (): Promise<ApiResponse<UserProfile>> => {
        return apiRequest<UserProfile>('/profile');
    },

    uploadCV: async (file: File): Promise<ApiResponse<UserProfile>> => {
        const formData = new FormData();
        formData.append('cv_file', file);
        return apiRequest<UserProfile>('/profile/cv', {
            method: 'POST',
            body: formData,
        });
    },

    deleteCV: async (): Promise<ApiResponse<{ message: string }>> => {
        return apiRequest<{ message: string }>('/profile/cv', { method: 'DELETE' });
    },
};

export type { User, UserProfile, Interview, LoginResponse };
