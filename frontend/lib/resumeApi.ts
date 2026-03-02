import { getToken } from './api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

// Resume Types
export interface ResumeEducation {
    institution: string;
    degree: string;
    field: string;
    start_date: string;
    end_date?: string;
    gpa?: string;
    achievements?: string[];
}

export interface ResumeExperience {
    company: string;
    title: string;
    location?: string;
    start_date: string;
    end_date?: string;
    description?: string;
    achievements?: string[];
}

export interface ResumeSkills {
    technical?: string[];
    soft?: string[];
    languages?: string[];
    tools?: string[];
}

export interface ResumeProject {
    title: string;
    description: string;
    technologies?: string[];
    link?: string;
    start_date?: string;
    end_date?: string;
}

export interface ResumeCertification {
    name: string;
    issuer: string;
    date: string;
    credential_id?: string;
    url?: string;
}

export interface ResumeAchievement {
    title: string;
    description: string;
    date?: string;
}

export interface Resume {
    id: number;
    user_id: number;
    title: string;
    template: 'modern' | 'classic' | 'minimal' | 'creative';
    
    // Personal Info
    full_name?: string;
    email_contact?: string;
    phone_contact?: string;
    location?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    summary?: string;
    
    // Structured data
    education?: ResumeEducation[];
    experience?: ResumeExperience[];
    skills?: ResumeSkills;
    projects?: ResumeProject[];
    certifications?: ResumeCertification[];
    achievements?: ResumeAchievement[];
    
    is_primary: boolean;
    pdf_url?: string;
    
    created_at: string;
    updated_at: string;
}

export interface ResumeCreate {
    title: string;
    template?: 'modern' | 'classic' | 'minimal' | 'creative';
    
    full_name?: string;
    email_contact?: string;
    phone_contact?: string;
    location?: string;
    linkedin_url?: string;
    github_url?: string;
    portfolio_url?: string;
    summary?: string;
    
    education?: ResumeEducation[];
    experience?: ResumeExperience[];
    skills?: ResumeSkills;
    projects?: ResumeProject[];
    certifications?: ResumeCertification[];
    achievements?: ResumeAchievement[];
    
    is_primary?: boolean;
}

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

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
            return { error: errorData.detail || `Error: ${response.status}` };
        }

        const data = await response.json();
        return { data };
    } catch (error) {
        console.error('API Request Error:', error);
        return { error: 'Network error. Please try again.' };
    }
}

export const resumeApi = {
    create: async (resume: ResumeCreate): Promise<ApiResponse<Resume>> => {
        return apiRequest<Resume>('/resumes', {
            method: 'POST',
            body: JSON.stringify(resume),
        });
    },

    list: async (): Promise<ApiResponse<Resume[]>> => {
        return apiRequest<Resume[]>('/resumes');
    },

    get: async (id: number): Promise<ApiResponse<Resume>> => {
        return apiRequest<Resume>(`/resumes/${id}`);
    },

    getPrimary: async (): Promise<ApiResponse<Resume>> => {
        return apiRequest<Resume>('/resumes/primary');
    },

    update: async (id: number, resume: Partial<ResumeCreate>): Promise<ApiResponse<Resume>> => {
        return apiRequest<Resume>(`/resumes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(resume),
        });
    },

    delete: async (id: number): Promise<ApiResponse<{ message: string; success: boolean }>> => {
        return apiRequest(`/resumes/${id}`, {
            method: 'DELETE',
        });
    },

    setPrimary: async (id: number): Promise<ApiResponse<Resume>> => {
        return apiRequest<Resume>(`/resumes/${id}/set-primary`, {
            method: 'POST',
        });
    },

    downloadPDF: async (id: number): Promise<void> => {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/resumes/${id}/export/pdf`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resume_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        }
    },

    getPreviewUrl: (id: number): string => {
        return `${API_BASE_URL}/resumes/${id}/preview`;
    },
};
