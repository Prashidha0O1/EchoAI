const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
}

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    is_admin: boolean;
    is_active: boolean;
    email_verified: boolean;
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

interface InterviewQuestion {
    question: string;
    category: 'technical' | 'behavioral' | 'situational' | 'experience';
    difficulty: 'easy' | 'medium' | 'hard';
    keywords: string[];
    ideal_answer: string;
}

interface GenerateQuestionsResponse {
    session_id: number;
    questions: InterviewQuestion[];
    role: string;
    experience_level: string;
    total_questions: number;
}

interface Interview {
    id: number;
    user_id: number;
    interview_type: 'technical' | 'behavioral' | 'hr' | 'mixed';
    job_description: string | null;
    role: string | null;
    experience_level: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    generated_questions: InterviewQuestion[] | null;
    scheduled_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
}

// Token management
export const setToken = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', token);
        document.cookie = `echo_auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
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
        document.cookie = 'echo_auth_token=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'echo_is_admin=; path=/; max-age=0; SameSite=Lax';
    }
};

// API request helper
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 15000
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

    const controller = new AbortController();
    // timeoutMs = 0 means no timeout (used for slow AI endpoints)
    const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal,
        });

        if (!response.ok) {
            // Expired/invalid token on an authenticated request — clear and redirect
            if (response.status === 401 && token) {
                removeToken();
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                return { error: 'Session expired. Please log in again.' };
            }

            const errorData = await response.json().catch(() => ({}));
            let errorMsg = `Error: ${response.status}`;

            if (errorData.detail) {
                if (typeof errorData.detail === 'string') {
                    errorMsg = errorData.detail;
                } else {
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
        if (error instanceof DOMException && error.name === 'AbortError') {
            return { error: 'Request timed out. Please try again.' };
        }
        console.error('API Request Error:', error);
        return { error: 'Network error. Please try again.' };
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
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
        }, 30000);
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

    changePassword: async (oldPassword: string, newPassword: string, confirmPassword: string): Promise<ApiResponse<{ message: string; success: boolean }>> => {
        return apiRequest<{ message: string; success: boolean }>('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword,
                confirm_password: confirmPassword,
            }),
        });
    },

    updateMe: async (data: { first_name?: string; last_name?: string }): Promise<ApiResponse<User>> => {
        return apiRequest<User>('/auth/me', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },
};

// Resolve a stored profile picture path to a fully-qualified URL the browser can fetch.
export const resolveMediaUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/uploads')) return `${API_BASE_URL}${path}`;
    // Legacy filesystem path — extract filename and rebuild URL
    const fname = path.replace(/\\/g, '/').split('/').pop();
    if (!fname) return null;
    return `${API_BASE_URL}/uploads/profile_pictures/${fname}`;
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

    update: async (data: { phone?: string; bio?: string }): Promise<ApiResponse<UserProfile>> => {
        return apiRequest<UserProfile>('/profile', {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    },

    uploadPicture: async (file: File): Promise<ApiResponse<UserProfile>> => {
        const formData = new FormData();
        formData.append('picture', file);
        return apiRequest<UserProfile>('/profile/picture', {
            method: 'POST',
            body: formData,
        });
    },
};

// ATS API
interface ATSResult {
    percentage: number;
    resume_filename: string;
    missing_keywords: string[];
    recommendations: string[];
    feedback: string[];
}

export const atsApi = {
    check: async (resume: File, jobDescription: string): Promise<ApiResponse<ATSResult>> => {
        const formData = new FormData();
        formData.append('resume', resume);
        formData.append('job_description', jobDescription);
        return apiRequest<ATSResult>('/ats/check', {
            method: 'POST',
            body: formData,
        }, 0);
    },
};

// Question Generator API
export const questionGeneratorApi = {
    generate: async (
        jobDescription: string,
        role: string,
        experienceLevel: string,
        cvFile?: File,
    ): Promise<ApiResponse<GenerateQuestionsResponse>> => {
        const formData = new FormData();
        formData.append('job_description', jobDescription);
        formData.append('role', role);
        formData.append('experience_level', experienceLevel);
        if (cvFile) formData.append('cv_file', cvFile);

        return apiRequest<GenerateQuestionsResponse>('/generate-questions', {
            method: 'POST',
            body: formData,
        }, 0); // no timeout — AI model generation can take several minutes
    },
};

// Report API
interface PerformanceMetrics {
    communication: number;
    technical_knowledge: number;
    problem_solving: number;
    confidence: number;
    relevance: number;
}

interface ReportTag {
    id: number;
    report_id: number;
    tag_name: string;
    tag_category: 'strength' | 'weakness' | 'neutral';
}

export interface Report {
    id: number;
    interview_id: number;
    report_name: string | null;
    overall_score: number | null;
    performance_metrics: PerformanceMetrics | null;
    strengths: string[] | null;
    improvements: string[] | null;
    summary: string | null;
    generated_at: string;
    tags: ReportTag[];
}

export const reportApi = {
    get: async (interviewId: number): Promise<ApiResponse<Report>> => {
        return apiRequest<Report>(`/interviews/${interviewId}/report`);
    },

    generate: async (interviewId: number): Promise<ApiResponse<Report>> => {
        return apiRequest<Report>(`/interviews/${interviewId}/report`, { method: 'POST' }, 0); // no timeout — AI feedback generation
    },
};

// Admin API
export interface AdminStats {
    total_users: number;
    total_interviews: number;
    total_completed: number;
    platform_avg_score: number | null;
}

export interface AdminUser {
    id: number;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    is_admin: boolean;
    email_verified: boolean;
    created_at: string;
    interview_count: number;
    avg_score: number | null;
    last_score: number | null;
}

export interface AdminChartPoint {
    label: string;
    count: number;
}

export const adminApi = {
    getStats: (): Promise<ApiResponse<AdminStats>> => apiRequest<AdminStats>('/admin/stats'),
    getUsers: (): Promise<ApiResponse<AdminUser[]>> => apiRequest<AdminUser[]>('/admin/users'),
    getInterviewsPerDay: (): Promise<ApiResponse<AdminChartPoint[]>> => apiRequest<AdminChartPoint[]>('/admin/chart/interviews-per-day'),
    getInterviewsByType: (): Promise<ApiResponse<AdminChartPoint[]>> => apiRequest<AdminChartPoint[]>('/admin/chart/interviews-by-type'),
};

// Leaderboard API
export interface LeaderboardEntry {
    rank: number;
    user_id: number;
    username: string;
    first_name: string | null;
    last_name: string | null;
    last_score: number | null;
    avg_score: number | null;
    total_interviews: number;
    last_interview_date: string | null;
}

export const leaderboardApi = {
    get: (): Promise<ApiResponse<LeaderboardEntry[]>> => apiRequest<LeaderboardEntry[]>('/leaderboard'),
};

export type { User, UserProfile, Interview, InterviewQuestion, GenerateQuestionsResponse, LoginResponse, ATSResult, PerformanceMetrics, ReportTag };
