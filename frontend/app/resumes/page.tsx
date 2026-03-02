'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/Button';
import ResumePreviewModal from '@/components/ResumePreviewModal';
import { resumeApi, Resume } from '@/lib/resumeApi';
import { FileText, Plus, Download, Edit, Trash2, Star, Eye } from 'lucide-react';

export default function ResumesPage() {
    const router = useRouter();
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loading, setLoading] = useState(true);
    const [previewResume, setPreviewResume] = useState<Resume | null>(null);

    useEffect(() => {
        fetchResumes();
    }, []);

    const fetchResumes = async () => {
        setLoading(true);
        const response = await resumeApi.list();
        if (response.data) setResumes(response.data);
        setLoading(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this resume?')) return;
        const response = await resumeApi.delete(id);
        if (response.data) setResumes(resumes.filter(r => r.id !== id));
    };

    const handleSetPrimary = async (id: number) => {
        const response = await resumeApi.setPrimary(id);
        if (response.data) fetchResumes();
    };

    const handleDownload = async (id: number) => {
        await resumeApi.downloadPDF(id);
    };

    return (
        <DashboardLayout>
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            My Resumes
                        </h1>
                        <p className="text-zinc-500 text-sm mt-1">Create and manage your professional resumes</p>
                    </div>
                    <Button
                        onClick={() => router.push('/resumes/create')}
                        className="inline-flex items-center gap-2 w-fit"
                    >
                        <Plus className="w-4 h-4" />
                        Create Resume
                    </Button>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 animate-pulse space-y-3">
                                <div className="h-5 bg-zinc-800 rounded w-3/4" />
                                <div className="h-4 bg-zinc-800 rounded w-1/2" />
                                <div className="h-4 bg-zinc-800 rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty */}
                {!loading && resumes.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-14 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-zinc-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-300 mb-2">No resumes yet</h3>
                        <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">
                            Create your first professional resume and export it as a PDF.
                        </p>
                        <Button onClick={() => router.push('/resumes/create')} className="inline-flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Create Resume
                        </Button>
                    </div>
                )}

                {/* Grid */}
                {!loading && resumes.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {resumes.map(resume => (
                            <div
                                key={resume.id}
                                className="relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all group"
                            >
                                {resume.is_primary && (
                                    <div className="absolute top-4 right-4">
                                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="mb-4 pr-6">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center mb-3">
                                        <FileText className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <h3 className="text-base font-semibold text-zinc-100 truncate">{resume.title}</h3>
                                    <p className="text-xs text-zinc-500 capitalize mt-0.5">{resume.template} template</p>
                                    {resume.full_name && (
                                        <p className="text-xs text-zinc-500 mt-1 truncate">{resume.full_name}</p>
                                    )}
                                    <p className="text-xs text-zinc-600 mt-1">
                                        Updated {new Date(resume.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => router.push(`/resumes/${resume.id}/edit`)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        Edit
                                    </button>

                                    <button
                                        onClick={() => setPreviewResume(resume)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                                        title="Preview"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Preview
                                    </button>

                                    <button
                                        onClick={() => handleDownload(resume.id)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors"
                                        title="Download PDF"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        PDF
                                    </button>

                                    {!resume.is_primary && (
                                        <button
                                            onClick={() => handleSetPrimary(resume.id)}
                                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-zinc-800 hover:bg-amber-500/10 text-zinc-400 hover:text-amber-400 border border-zinc-700 hover:border-amber-500/30 transition-colors"
                                            title="Set as Primary"
                                        >
                                            <Star className="w-3.5 h-3.5" />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => handleDelete(resume.id)}
                                        className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewResume && (
                <ResumePreviewModal
                    title={previewResume.title}
                    previewUrl={resumeApi.getPreviewUrl(previewResume.id)}
                    onClose={() => setPreviewResume(null)}
                    onDownload={() => handleDownload(previewResume.id)}
                />
            )}
        </DashboardLayout>
    );
}
