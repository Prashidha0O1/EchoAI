'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi, profileApi } from '@/lib/api';
import DashboardLayout from '@/components/DashboardLayout';
import Input from '@/components/Input';
import {
    User,
    Lock,
    Save,
    CheckCircle2,
    AlertTriangle,
    Phone,
    FileText,
} from 'lucide-react';

export default function SettingsPage() {
    const { user, refreshUser } = useAuth();

    // ─── Profile State ───
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNum, setPhoneNum] = useState('');
    const [bio, setBio] = useState('');
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // ─── Password State ───
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

    // ─── Load Profile Data ───
    useEffect(() => {
        const load = async () => {
            if (user) {
                setFirstName(user.first_name || '');
                setLastName(user.last_name || '');
            }
            try {
                const res = await profileApi.get();
                if (res.data) {
                    setPhoneNum(res.data.phone || '');
                    setBio(res.data.bio || '');
                }
            } catch { }
            setProfileLoading(false);
        };
        if (user) load();
    }, [user]);

    // ─── Save Profile ───
    const handleSaveProfile = async () => {
        setProfileSaving(true);
        setProfileMsg(null);
        try {
            const res = await profileApi.update({
                phone: phoneNum || undefined,
                bio: bio || undefined,
            });
            if (res.error) {
                setProfileMsg({ type: 'error', text: res.error });
            } else {
                setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
                await refreshUser();
            }
        } catch {
            setProfileMsg({ type: 'error', text: 'Failed to update profile.' });
        }
        setProfileSaving(false);
    };

    // ─── Password Validation ───
    const validatePassword = (): boolean => {
        const errors: Record<string, string> = {};

        if (!oldPassword) errors.old = 'Current password is required.';
        if (!newPassword) errors.new = 'New password is required.';
        else if (newPassword.length < 8) errors.new = 'Password must be at least 8 characters.';
        else if (newPassword === oldPassword) errors.new = 'New password must be different from current password.';
        if (!confirmPassword) errors.confirm = 'Please confirm your new password.';
        else if (newPassword !== confirmPassword) errors.confirm = 'Passwords do not match.';

        setPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // ─── Change Password ───
    const handleChangePassword = async () => {
        if (!validatePassword()) return;

        setPasswordSaving(true);
        setPasswordMsg(null);

        const res = await authApi.changePassword(oldPassword, newPassword, confirmPassword);
        if (res.error) {
            setPasswordMsg({ type: 'error', text: res.error });
        } else {
            setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordErrors({});
        }
        setPasswordSaving(false);
    };

    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto space-y-6">

                {/* ═══════════════ UPDATE PROFILE SECTION ═══════════════ */}
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    {/* Section Header */}
                    <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2.5">
                            <User className="w-4 h-4" style={{ color: '#10b981' }} />
                            <h2 className="font-semibold text-white text-sm">Update Profile</h2>
                        </div>
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                            Update your personal information
                        </p>
                    </div>

                    <div className="p-6 space-y-4">
                        {profileLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.12)', borderTopColor: '#10b981' }} />
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Input
                                        label="First Name"
                                        value={firstName}
                                        onChange={e => setFirstName(e.target.value)}
                                        placeholder="John"
                                        disabled
                                    />
                                    <Input
                                        label="Last Name"
                                        value={lastName}
                                        onChange={e => setLastName(e.target.value)}
                                        placeholder="Doe"
                                        disabled
                                    />
                                </div>

                                <Input
                                    label="Phone Number"
                                    value={phoneNum}
                                    onChange={e => setPhoneNum(e.target.value)}
                                    placeholder="+977 98XXXXXXXX"
                                    type="tel"
                                />

                                <div className="mb-4">
                                    <label className="block text-sm font-medium mb-1.5 ml-1" style={{ color: '#9ca3af' }}>
                                        Bio
                                    </label>
                                    <textarea
                                        value={bio}
                                        onChange={e => setBio(e.target.value)}
                                        placeholder="Tell us about yourself..."
                                        rows={3}
                                        className="input-field w-full resize-none"
                                    />
                                </div>

                                <button
                                    onClick={handleSaveProfile}
                                    disabled={profileSaving}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                                    style={{
                                        background: profileSaving ? '#1a1a1a' : '#10b981',
                                        color: profileSaving ? '#6b7280' : '#fff',
                                    }}
                                    onMouseEnter={e => { if (!profileSaving) (e.currentTarget as HTMLElement).style.background = '#059669'; }}
                                    onMouseLeave={e => { if (!profileSaving) (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
                                >
                                    <Save className="w-4 h-4" />
                                    {profileSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        )}

                        {profileMsg && (
                            <StatusMessage type={profileMsg.type} text={profileMsg.text} />
                        )}
                    </div>
                </div>

                {/* ═══════════════ CHANGE PASSWORD SECTION ═══════════════ */}
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                    {/* Section Header */}
                    <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2.5">
                            <Lock className="w-4 h-4" style={{ color: '#f59e0b' }} />
                            <h2 className="font-semibold text-white text-sm">Change Password</h2>
                        </div>
                        <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
                            Update your password to keep your account secure
                        </p>
                    </div>

                    <div className="p-6 space-y-4">
                        <Input
                            label="Current Password"
                            type="password"
                            value={oldPassword}
                            onChange={e => { setOldPassword(e.target.value); setPasswordErrors(p => ({ ...p, old: '' })); }}
                            placeholder="Enter your current password"
                            error={passwordErrors.old}
                        />

                        <Input
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={e => { setNewPassword(e.target.value); setPasswordErrors(p => ({ ...p, new: '' })); }}
                            placeholder="Enter new password (min 8 characters)"
                            error={passwordErrors.new}
                        />

                        <Input
                            label="Confirm New Password"
                            type="password"
                            value={confirmPassword}
                            onChange={e => { setConfirmPassword(e.target.value); setPasswordErrors(p => ({ ...p, confirm: '' })); }}
                            placeholder="Confirm your new password"
                            error={passwordErrors.confirm}
                        />

                        <button
                            onClick={handleChangePassword}
                            disabled={passwordSaving}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                            style={{
                                background: passwordSaving ? '#1a1a1a' : '#f59e0b',
                                color: passwordSaving ? '#6b7280' : '#000',
                            }}
                            onMouseEnter={e => { if (!passwordSaving) (e.currentTarget as HTMLElement).style.background = '#d97706'; }}
                            onMouseLeave={e => { if (!passwordSaving) (e.currentTarget as HTMLElement).style.background = '#f59e0b'; }}
                        >
                            <Lock className="w-4 h-4" />
                            {passwordSaving ? 'Changing...' : 'Change Password'}
                        </button>

                        {passwordMsg && (
                            <StatusMessage type={passwordMsg.type} text={passwordMsg.text} />
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

function StatusMessage({ type, text }: { type: 'success' | 'error'; text: string }) {
    return (
        <div
            className={`flex items-center gap-2 p-3 rounded-xl text-sm ${type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
        >
            {type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                : <AlertTriangle className="w-4 h-4 shrink-0" />
            }
            {text}
        </div>
    );
}
