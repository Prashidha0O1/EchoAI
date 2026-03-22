'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileApi } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import {
    User,
    Mail,
    Phone,
    FileText,
    ShieldCheck,
    Lock,
    Upload,
    Trash2,
    AlertTriangle,
    CheckCircle2,
    Camera,
    Edit3,
    Save,
    X,
} from 'lucide-react';

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [profile, setProfile] = useState<{
        phone: string | null;
        cv_file_path: string | null;
        cv_parsed_text: string | null;
        profile_picture: string | null;
        bio: string | null;
    } | null>(null);
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [sendingCode, setSendingCode] = useState(false);
    const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

    const isVerified = user?.email_verified === true;

    useEffect(() => {
        const load = async () => {
            const res = await profileApi.get();
            if (res.data) setProfile(res.data);
            setLoadingProfile(false);
        };
        if (user) load();
    }, [user]);

    const handleCvUpload = async () => {
        if (!cvFile) return;
        setUploading(true);
        setUploadMsg(null);
        const res = await profileApi.uploadCV(cvFile);
        if (res.data) {
            setProfile(res.data);
            setUploadMsg({ type: 'success', text: 'CV uploaded successfully!' });
            setCvFile(null);
            await refreshUser();
        } else {
            setUploadMsg({ type: 'error', text: res.error || 'Upload failed' });
        }
        setUploading(false);
    };

    const handleDeleteCv = async () => {
        if (!window.confirm('Delete your uploaded CV?')) return;
        const res = await profileApi.deleteCV();
        if (!res.error) {
            setProfile(prev => prev ? { ...prev, cv_file_path: null, cv_parsed_text: null } : null);
            setUploadMsg({ type: 'success', text: 'CV removed.' });
        }
    };

    const handleSendVerification = async () => {
        setSendingCode(true);
        setVerifyMsg(null);
        // Call the backend verification endpoint
        const res = await fetch('/api/proxy/verification/send', { method: 'POST' });
        if (res.ok) {
            setVerifyMsg('Verification email sent! Check your inbox.');
        } else {
            setVerifyMsg('Failed to send verification email. Please try again.');
        }
        setSendingCode(false);
    };

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Page Header */}
                <div>
                    <h1
                        className="text-xl font-semibold"
                        style={{ color: '#f9fafb', fontFamily: 'var(--font-space-grotesk)' }}
                    >
                        My Profile
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>Manage your account information and CV</p>
                </div>

                {/* Email Verification Gate Banner */}
                {!isVerified && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-amber-300">Email not verified</p>
                            <p className="text-sm text-amber-400/80 mt-0.5">
                                You must verify your email before updating your profile or uploading a CV.
                            </p>
                            {verifyMsg && (
                                <p className="text-xs text-amber-300 mt-2 font-medium">{verifyMsg}</p>
                            )}
                        </div>
                        <button
                            onClick={handleSendVerification}
                            disabled={sendingCode}
                            className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-900 text-sm font-semibold transition-colors disabled:opacity-60"
                        >
                            {sendingCode ? 'Sending...' : 'Verify Email'}
                        </button>
                    </div>
                )}

                {/* Identity Card */}
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    {/* Cover — subtle neutral gradient */}
                    <div className="h-20" style={{ background: 'linear-gradient(135deg, #141414 0%, #1a1a1a 100%)' }} />
                    <div className="px-6 pb-6">
                        {/* Avatar */}
                        <div className="relative -mt-9 mb-4 w-fit">
                            <div
                                className="w-18 h-18 rounded-xl flex items-center justify-center text-lg font-bold"
                                style={{
                                    width: '72px', height: '72px',
                                    background: '#1f2937',
                                    color: '#9ca3af',
                                    border: '3px solid #111',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                }}
                            >
                                {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                            </div>
                            {isVerified && (
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-zinc-900 flex items-center justify-center">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InfoRow icon={User} label="Full Name" value={
                                user?.first_name
                                    ? `${user.first_name} ${user.last_name || ''}`.trim()
                                    : user?.username || '—'
                            } />
                            <InfoRow icon={Mail} label="Email" value={user?.email || '—'} />
                            <InfoRow icon={User} label="Username" value={user?.username || '—'} />
                            <InfoRow icon={ShieldCheck} label="Account Status" value={
                                <span className={`flex items-center gap-1.5 ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    <div className={`w-2 h-2 rounded-full ${isVerified ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                    {isVerified ? 'Verified' : 'Unverified'}
                                </span>
                            } />
                            {profile?.phone && (
                                <InfoRow icon={Phone} label="Phone" value={profile.phone} />
                            )}
                            <InfoRow
                                icon={User}
                                label="Member Since"
                                value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                            />
                        </div>
                    </div>
                </div>

                {/* CV / Resume Section */}
                <div
                    className={`rounded-xl p-6 transition-all ${!isVerified ? 'opacity-60 pointer-events-none select-none' : ''}`}
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    <div className="flex items-center gap-2 mb-5">
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                            <FileText className="w-4 h-4" style={{ color: '#9ca3af' }} />
                        </div>
                        <h2 className="font-semibold text-white">CV / Resume</h2>
                        {!isVerified && <Lock className="w-4 h-4 text-zinc-500 ml-1" />}
                    </div>

                    {!isVerified ? (
                        <div className="text-center py-6">
                            <Lock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                            <p className="text-zinc-500 text-sm">Verify your email to manage your CV</p>
                        </div>
                    ) : loadingProfile ? (
                        <div className="flex items-center justify-center py-6">
                            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.12)', borderTopColor: '#10b981' }} />
                        </div>
                    ) : profile?.cv_file_path ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-emerald-300">CV Uploaded</p>
                                    <p className="text-xs text-zinc-500 truncate mt-0.5">{profile.cv_file_path.split('/').pop()}</p>
                                </div>
                                <button
                                    onClick={handleDeleteCv}
                                    className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Delete CV"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            {profile.cv_parsed_text && (
                                <div className="rounded-xl bg-zinc-800/50 border border-zinc-700 p-4 max-h-40 overflow-y-auto">
                                    <p className="text-xs text-zinc-500 mb-2 font-medium">Parsed Content Preview</p>
                                    <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                                        {profile.cv_parsed_text.slice(0, 600)}{profile.cv_parsed_text.length > 600 ? '...' : ''}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block w-full">
                                <div
                                    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                                    style={{
                                        borderColor: cvFile ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)',
                                        background: cvFile ? 'rgba(16,185,129,0.04)' : 'transparent',
                                    }}
                                >
                                    <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-zinc-300">
                                        {cvFile ? cvFile.name : 'Click to upload your CV'}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">PDF or DOCX, up to 10MB</p>
                                </div>
                                <input
                                    type="file"
                                    accept=".pdf,.docx"
                                    className="sr-only"
                                    onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                                />
                            </label>
                            {cvFile && (
                                <button
                                    onClick={handleCvUpload}
                                    disabled={uploading}
                                    className="mt-3 w-full py-2.5 rounded-lg text-sm font-medium transition-colors"
                                    style={{ background: uploading ? '#1a1a1a' : '#10b981', color: uploading ? '#6b7280' : '#fff' }}
                                    onMouseEnter={e => { if (!uploading) (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                                    onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
                                >
                                    {uploading ? 'Uploading...' : 'Upload CV'}
                                </button>
                            )}
                        </div>
                    )}

                    {uploadMsg && (
                        <div className={`mt-3 flex items-center gap-2 p-3 rounded-xl text-sm ${uploadMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {uploadMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                            {uploadMsg.text}
                        </div>
                    )}
                </div>

                {/* Account Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'Email Verified', value: isVerified ? 'Yes' : 'No', color: isVerified ? '#10b981' : '#f59e0b' },
                        { label: 'Admin', value: user?.is_admin ? 'Yes' : 'No', color: '#9ca3af' },
                        { label: 'Account Active', value: user?.is_active ? 'Yes' : 'No', color: user?.is_active ? '#10b981' : '#f87171' },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-xl p-4"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                        >
                            <p className="text-xs font-medium" style={{ color: '#6b7280' }}>{item.label}</p>
                            <p className="text-base font-semibold mt-1" style={{ color: item.color }}>{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}

function InfoRow({ icon: Icon, label, value }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
                <p className="text-xs text-zinc-500 font-medium">{label}</p>
                <div className="text-sm text-zinc-200 font-medium mt-0.5">{value}</div>
            </div>
        </div>
    );
}
