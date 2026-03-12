'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/Button';
import ResumePreviewModal from '@/components/ResumePreviewModal';
import VerificationGate from '@/components/VerificationGate';
import { resumeApi, Resume, ResumeEducation, ResumeExperience, ResumeProject, ResumeCertification } from '@/lib/resumeApi';
import { Plus, Trash2, Save, Loader2, Eye, ArrowLeft, CheckCircle2, AlertCircle, Columns2, X } from 'lucide-react';

type Toast = { type: 'success' | 'error'; message: string } | null;

export default function EditResumePage() {
  const router = useRouter();
  const params = useParams();
  const resumeId = parseInt(params?.id as string);

  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPreview, setShowPreview] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [template, setTemplate] = useState<'modern' | 'classic' | 'minimal' | 'creative'>('modern');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [summary, setSummary] = useState('');
  const [education, setEducation] = useState<ResumeEducation[]>([]);
  const [experience, setExperience] = useState<ResumeExperience[]>([]);
  const [technicalSkills, setTechnicalSkills] = useState('');
  const [softSkills, setSoftSkills] = useState('');
  const [languages, setLanguages] = useState('');
  const [tools, setTools] = useState('');
  const [projects, setProjects] = useState<ResumeProject[]>([]);
  const [certifications, setCertifications] = useState<ResumeCertification[]>([]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchResume = useCallback(async () => {
    if (isNaN(resumeId)) {
      setLoadState('error');
      return;
    }
    setLoadState('loading');
    const response = await resumeApi.get(resumeId);
    if (response.data) {
      const r = response.data;
      setResume(r);
      setTitle(r.title);
      setTemplate(r.template as 'modern' | 'classic' | 'minimal' | 'creative');
      setFullName(r.full_name || '');
      setEmail(r.email_contact || '');
      setPhone(r.phone_contact || '');
      setLocation(r.location || '');
      setLinkedin(r.linkedin_url || '');
      setGithub(r.github_url || '');
      setPortfolio(r.portfolio_url || '');
      setSummary(r.summary || '');
      setEducation(r.education || []);
      setExperience(r.experience || []);
      setProjects(r.projects || []);
      setCertifications(r.certifications || []);
      if (r.skills) {
        setTechnicalSkills(r.skills.technical?.join(', ') || '');
        setSoftSkills(r.skills.soft?.join(', ') || '');
        setLanguages(r.skills.languages?.join(', ') || '');
        setTools(r.skills.tools?.join(', ') || '');
      }
      setLoadState('loaded');
    } else {
      setLoadState('error');
    }
  }, [resumeId]);

  useEffect(() => { fetchResume(); }, [fetchResume]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const resumeData = {
      title, template,
      full_name: fullName || undefined,
      email_contact: email || undefined,
      phone_contact: phone || undefined,
      location: location || undefined,
      linkedin_url: linkedin || undefined,
      github_url: github || undefined,
      portfolio_url: portfolio || undefined,
      summary: summary || undefined,
      education: education.filter(e => e.institution && e.degree),
      experience: experience.filter(e => e.company && e.title),
      skills: {
        technical: technicalSkills ? technicalSkills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        soft: softSkills ? softSkills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        languages: languages ? languages.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        tools: tools ? tools.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      },
      projects: projects.filter(p => p.title && p.description),
      certifications: certifications.filter(c => c.name && c.issuer),
    };
    const response = await resumeApi.update(resumeId, resumeData);
    if (response.data) {
      setResume(response.data);
      showToast('success', 'Resume saved successfully!');
    } else {
      showToast('error', response.error || 'Failed to update resume. Please try again.');
    }
    setSaving(false);
  };

  const buildPreviewHtml = useCallback((): string => {
    const skills = [
      ...(technicalSkills ? technicalSkills.split(',').map(s => s.trim()).filter(Boolean) : []),
      ...(softSkills ? softSkills.split(',').map(s => s.trim()).filter(Boolean) : []),
      ...(languages ? languages.split(',').map(s => s.trim()).filter(Boolean) : []),
      ...(tools ? tools.split(',').map(s => s.trim()).filter(Boolean) : []),
    ];
    const filledExp = experience.filter(e => e.company && e.title);
    const filledEdu = education.filter(e => e.institution && e.degree);
    const filledProj = projects.filter(p => p.title && p.description);
    const filledCert = certifications.filter(c => c.name && c.issuer);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; font-size: 14px; line-height: 1.5; }
  h1 { font-size: 28px; font-weight: 700; }
  .subtitle { color: #6b7280; font-size: 13px; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 12px; }
  .divider { border: none; border-top: 2px solid #e5e7eb; margin: 20px 0; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; margin-bottom: 12px; }
  .section { margin-bottom: 24px; }
  .entry { margin-bottom: 14px; }
  .entry-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .entry-title { font-weight: 600; font-size: 14px; }
  .entry-sub { color: #6b7280; font-size: 13px; }
  .entry-date { color: #9ca3af; font-size: 12px; white-space: nowrap; }
  .entry-desc { color: #4b5563; font-size: 13px; margin-top: 4px; }
  .tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .tag { background: #ede9fe; color: #4f46e5; border-radius: 4px; padding: 2px 8px; font-size: 12px; font-weight: 500; }
  .summary { color: #4b5563; font-size: 13px; }
</style></head><body>
  <h1>${fullName || 'Your Name'}</h1>
  <div class="subtitle">
    ${email ? `<span>✉ ${email}</span>` : ''}
    ${phone ? `<span>📞 ${phone}</span>` : ''}
    ${location ? `<span>📍 ${location}</span>` : ''}
    ${linkedin ? `<span>🔗 LinkedIn</span>` : ''}
    ${github ? `<span>💻 GitHub</span>` : ''}
  </div>
  ${summary ? `<hr class="divider"><div class="section"><p class="section-title">Summary</p><p class="summary">${summary}</p></div>` : ''}
  ${filledExp.length > 0 ? `<hr class="divider"><div class="section"><p class="section-title">Experience</p>${filledExp.map(e => `<div class="entry"><div class="entry-header"><div><span class="entry-title">${e.title}</span> — <span class="entry-sub">${e.company}${e.location ? `, ${e.location}` : ''}</span></div><span class="entry-date">${e.start_date || ''}${e.end_date ? ` – ${e.end_date}` : e.start_date ? ' – Present' : ''}</span></div>${e.description ? `<p class="entry-desc">${e.description}</p>` : ''}</div>`).join('')}</div>` : ''}
  ${filledEdu.length > 0 ? `<hr class="divider"><div class="section"><p class="section-title">Education</p>${filledEdu.map(e => `<div class="entry"><div class="entry-header"><div><span class="entry-title">${e.degree}${e.field ? ` in ${e.field}` : ''}</span><br><span class="entry-sub">${e.institution}</span></div><span class="entry-date">${e.start_date || ''}${e.end_date ? ` – ${e.end_date}` : ''}</span></div>${e.gpa ? `<p class="entry-desc">GPA: ${e.gpa}</p>` : ''}</div>`).join('')}</div>` : ''}
  ${skills.length > 0 ? `<hr class="divider"><div class="section"><p class="section-title">Skills</p><div class="tag-list">${skills.map(s => `<span class="tag">${s}</span>`).join('')}</div></div>` : ''}
  ${filledProj.length > 0 ? `<hr class="divider"><div class="section"><p class="section-title">Projects</p>${filledProj.map(p => `<div class="entry"><span class="entry-title">${p.title}</span><p class="entry-desc">${p.description}</p>${p.technologies && p.technologies.length > 0 ? `<div class="tag-list">${p.technologies.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>` : ''}
  ${filledCert.length > 0 ? `<hr class="divider"><div class="section"><p class="section-title">Certifications</p>${filledCert.map(c => `<div class="entry"><div class="entry-header"><div><span class="entry-title">${c.name}</span><br><span class="entry-sub">${c.issuer}</span></div><span class="entry-date">${c.date || ''}</span></div></div>`).join('')}</div>` : ''}
</body></html>`;
  }, [fullName, email, phone, location, linkedin, github, summary, technicalSkills, softSkills, languages, tools, experience, education, projects, certifications]);

  useEffect(() => {
    if (!splitView || !previewRef.current) return;
    const doc = previewRef.current.contentDocument ?? previewRef.current.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(buildPreviewHtml());
    doc.close();
  }, [splitView, buildPreviewHtml]);

  // Array helpers
  const addEducation = () => setEducation([...education, { institution: '', degree: '', field: '', start_date: '', end_date: '', gpa: '', achievements: [] }]);
  const removeEducation = (i: number) => setEducation(education.filter((_, idx) => idx !== i));
  const updateEducation = (i: number, field: keyof ResumeEducation, val: string) => { const u = [...education]; (u[i] as Record<string, unknown>)[field] = val; setEducation(u); };

  const addExperience = () => setExperience([...experience, { company: '', title: '', location: '', start_date: '', end_date: '', description: '', achievements: [] }]);
  const removeExperience = (i: number) => setExperience(experience.filter((_, idx) => idx !== i));
  const updateExperience = (i: number, field: keyof ResumeExperience, val: string) => { const u = [...experience]; (u[i] as Record<string, unknown>)[field] = val; setExperience(u); };

  const addProject = () => setProjects([...projects, { title: '', description: '', technologies: [], link: '' }]);
  const removeProject = (i: number) => setProjects(projects.filter((_, idx) => idx !== i));
  const updateProject = (i: number, field: keyof ResumeProject, val: string | string[]) => { const u = [...projects]; (u[i] as Record<string, unknown>)[field] = val; setProjects(u); };

  const addCertification = () => setCertifications([...certifications, { name: '', issuer: '', date: '', credential_id: '' }]);
  const removeCertification = (i: number) => setCertifications(certifications.filter((_, idx) => idx !== i));
  const updateCertification = (i: number, field: keyof ResumeCertification, val: string) => { const u = [...certifications]; (u[i] as Record<string, unknown>)[field] = val; setCertifications(u); };

  const inputCls = 'w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none text-zinc-100 text-sm placeholder-zinc-600';
  const tabs = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'certifications', label: 'Certifications' },
  ];

  // Loading state
  if (loadState === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">Loading resume…</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state — resume not found or API failed
  if (loadState === 'error') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-2">Resume Not Found</h2>
            <p className="text-zinc-500 text-sm mb-6">
              This resume doesn't exist or you don't have permission to edit it.
            </p>
            <Button onClick={() => router.push('/resumes')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Resumes
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <VerificationGate feature="edit resumes">

        {/* Toast notification */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-sm font-medium transition-all
            ${toast.type === 'success'
              ? 'bg-emerald-900/90 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-900/90 border border-red-500/30 text-red-300'
            }`}>
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            {toast.message}
          </div>
        )}

        <div className={splitView ? 'flex gap-6 items-start' : ''}>
        <div className={splitView ? 'flex-1 min-w-0 space-y-6' : 'max-w-4xl mx-auto space-y-6'}>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/resumes')}
                className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
                title="Back to resumes"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                  Edit Resume
                </h1>
                <p className="text-zinc-500 text-sm mt-0.5">Update your professional resume</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSplitView(v => !v)}
                className={`hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors w-fit ${
                  splitView
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                }`}
              >
                <Columns2 className="w-4 h-4" />
                Split View
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors w-fit"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Title & Template */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Resume Title</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="Software Engineer Resume" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Template</label>
                  <select value={template} onChange={e => setTemplate(e.target.value as 'modern' | 'classic' | 'minimal' | 'creative')} className={inputCls}>
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="minimal">Minimal</option>
                    <option value="creative">Creative</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex border-b border-zinc-800 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-5">

                {/* Personal Info */}
                {activeTab === 'personal' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-zinc-400 mb-2">Full Name *</label><input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} placeholder="John Doe" required /></div>
                      <div><label className="block text-sm font-medium text-zinc-400 mb-2">Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="john@example.com" required /></div>
                      <div><label className="block text-sm font-medium text-zinc-400 mb-2">Phone</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} placeholder="+1 (555) 123-4567" /></div>
                      <div><label className="block text-sm font-medium text-zinc-400 mb-2">Location</label><input type="text" value={location} onChange={e => setLocation(e.target.value)} className={inputCls} placeholder="San Francisco, CA" /></div>
                      <div><label className="block text-sm font-medium text-zinc-400 mb-2">LinkedIn URL</label><input type="url" value={linkedin} onChange={e => setLinkedin(e.target.value)} className={inputCls} placeholder="https://linkedin.com/in/johndoe" /></div>
                      <div><label className="block text-sm font-medium text-zinc-400 mb-2">GitHub URL</label><input type="url" value={github} onChange={e => setGithub(e.target.value)} className={inputCls} placeholder="https://github.com/johndoe" /></div>
                      <div className="md:col-span-2"><label className="block text-sm font-medium text-zinc-400 mb-2">Portfolio URL</label><input type="url" value={portfolio} onChange={e => setPortfolio(e.target.value)} className={inputCls} placeholder="https://johndoe.com" /></div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Professional Summary</label>
                      <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4} className={`${inputCls} resize-none`} placeholder="A brief summary of your professional background..." />
                    </div>
                  </div>
                )}

                {/* Experience */}
                {activeTab === 'experience' && (
                  <div className="space-y-5">
                    {experience.length === 0 && (
                      <div className="text-center py-8 text-zinc-600 text-sm">No experience added yet. Click below to add your first entry.</div>
                    )}
                    {experience.map((exp, idx) => (
                      <div key={idx} className="border border-zinc-800 rounded-xl p-5 relative">
                        <button type="button" onClick={() => removeExperience(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-4">Experience {idx + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Company *</label><input type="text" value={exp.company} onChange={e => updateExperience(idx, 'company', e.target.value)} className={inputCls} placeholder="Tech Corp" /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Job Title *</label><input type="text" value={exp.title} onChange={e => updateExperience(idx, 'title', e.target.value)} className={inputCls} placeholder="Software Engineer" /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Location</label><input type="text" value={exp.location || ''} onChange={e => updateExperience(idx, 'location', e.target.value)} className={inputCls} placeholder="San Francisco, CA" /></div>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-sm font-medium text-zinc-400 mb-2">Start</label><input type="month" value={exp.start_date} onChange={e => updateExperience(idx, 'start_date', e.target.value)} className={inputCls} /></div>
                            <div><label className="block text-sm font-medium text-zinc-400 mb-2">End</label><input type="month" value={exp.end_date || ''} onChange={e => updateExperience(idx, 'end_date', e.target.value)} className={inputCls} /></div>
                          </div>
                          <div className="md:col-span-2"><label className="block text-sm font-medium text-zinc-400 mb-2">Description</label><textarea value={exp.description || ''} onChange={e => updateExperience(idx, 'description', e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Describe your role and key achievements..." /></div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" onClick={addExperience} variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" />Add Experience</Button>
                  </div>
                )}

                {/* Education */}
                {activeTab === 'education' && (
                  <div className="space-y-5">
                    {education.length === 0 && (
                      <div className="text-center py-8 text-zinc-600 text-sm">No education added yet. Click below to add your first entry.</div>
                    )}
                    {education.map((edu, idx) => (
                      <div key={idx} className="border border-zinc-800 rounded-xl p-5 relative">
                        <button type="button" onClick={() => removeEducation(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-4">Education {idx + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2"><label className="block text-sm font-medium text-zinc-400 mb-2">Institution *</label><input type="text" value={edu.institution} onChange={e => updateEducation(idx, 'institution', e.target.value)} className={inputCls} placeholder="University of Example" /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Degree *</label><input type="text" value={edu.degree} onChange={e => updateEducation(idx, 'degree', e.target.value)} className={inputCls} placeholder="Bachelor of Science" /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Field of Study</label><input type="text" value={edu.field || ''} onChange={e => updateEducation(idx, 'field', e.target.value)} className={inputCls} placeholder="Computer Science" /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Start Date</label><input type="month" value={edu.start_date} onChange={e => updateEducation(idx, 'start_date', e.target.value)} className={inputCls} /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">End Date</label><input type="month" value={edu.end_date || ''} onChange={e => updateEducation(idx, 'end_date', e.target.value)} className={inputCls} /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">GPA</label><input type="text" value={edu.gpa || ''} onChange={e => updateEducation(idx, 'gpa', e.target.value)} className={inputCls} placeholder="3.8/4.0" /></div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" onClick={addEducation} variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" />Add Education</Button>
                  </div>
                )}

                {/* Skills */}
                {activeTab === 'skills' && (
                  <div className="space-y-5">
                    <div><label className="block text-sm font-medium text-zinc-400 mb-2">Technical Skills</label><input type="text" value={technicalSkills} onChange={e => setTechnicalSkills(e.target.value)} className={inputCls} placeholder="Python, JavaScript, React (comma separated)" /><p className="text-xs text-zinc-600 mt-1">Separate with commas</p></div>
                    <div><label className="block text-sm font-medium text-zinc-400 mb-2">Soft Skills</label><input type="text" value={softSkills} onChange={e => setSoftSkills(e.target.value)} className={inputCls} placeholder="Leadership, Communication" /></div>
                    <div><label className="block text-sm font-medium text-zinc-400 mb-2">Languages</label><input type="text" value={languages} onChange={e => setLanguages(e.target.value)} className={inputCls} placeholder="English (Native), Spanish (Fluent)" /></div>
                    <div><label className="block text-sm font-medium text-zinc-400 mb-2">Tools & Frameworks</label><input type="text" value={tools} onChange={e => setTools(e.target.value)} className={inputCls} placeholder="Git, Docker, AWS" /></div>
                  </div>
                )}

                {/* Projects */}
                {activeTab === 'projects' && (
                  <div className="space-y-5">
                    {projects.length === 0 && (
                      <div className="text-center py-8 text-zinc-600 text-sm">No projects added yet. Click below to add your first project.</div>
                    )}
                    {projects.map((proj, idx) => (
                      <div key={idx} className="border border-zinc-800 rounded-xl p-5 relative">
                        <button type="button" onClick={() => removeProject(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-4">Project {idx + 1}</h4>
                        <div className="space-y-4">
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Title *</label><input type="text" value={proj.title} onChange={e => updateProject(idx, 'title', e.target.value)} className={inputCls} placeholder="E-commerce Platform" /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Description *</label><textarea value={proj.description} onChange={e => updateProject(idx, 'description', e.target.value)} rows={3} className={`${inputCls} resize-none`} placeholder="Describe the project..." /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Technologies</label><input type="text" value={proj.technologies?.join(', ') || ''} onChange={e => updateProject(idx, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))} className={inputCls} placeholder="React, Node.js (comma separated)" /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Project Link</label><input type="url" value={proj.link || ''} onChange={e => updateProject(idx, 'link', e.target.value)} className={inputCls} placeholder="https://github.com/..." /></div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" onClick={addProject} variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" />Add Project</Button>
                  </div>
                )}

                {/* Certifications */}
                {activeTab === 'certifications' && (
                  <div className="space-y-5">
                    {certifications.length === 0 && (
                      <div className="text-center py-8 text-zinc-600 text-sm">No certifications added yet. Click below to add your first certification.</div>
                    )}
                    {certifications.map((cert, idx) => (
                      <div key={idx} className="border border-zinc-800 rounded-xl p-5 relative">
                        <button type="button" onClick={() => removeCertification(idx)} className="absolute top-4 right-4 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-4">Certification {idx + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Name *</label><input type="text" value={cert.name} onChange={e => updateCertification(idx, 'name', e.target.value)} className={inputCls} placeholder="AWS Certified Solutions Architect" /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Issuer *</label><input type="text" value={cert.issuer} onChange={e => updateCertification(idx, 'issuer', e.target.value)} className={inputCls} placeholder="Amazon Web Services" /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Date</label><input type="month" value={cert.date} onChange={e => updateCertification(idx, 'date', e.target.value)} className={inputCls} /></div>
                          <div><label className="block text-sm font-medium text-zinc-400 mb-2">Credential ID</label><input type="text" value={cert.credential_id || ''} onChange={e => updateCertification(idx, 'credential_id', e.target.value)} className={inputCls} placeholder="ABC123XYZ" /></div>
                        </div>
                      </div>
                    ))}
                    <Button type="button" onClick={addCertification} variant="outline" className="w-full"><Plus className="w-4 h-4 mr-2" />Add Certification</Button>
                  </div>
                )}

              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pb-8">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                  : <><Save className="w-4 h-4 mr-2" />Save Changes</>
                }
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push('/resumes')}>Cancel</Button>
            </div>

          </form>
        </div>

        {/* Live split-screen preview pane */}
        {splitView && (
          <aside className="w-[460px] shrink-0 sticky top-6 hidden lg:flex flex-col rounded-2xl border border-zinc-700 overflow-hidden shadow-2xl">
            <div className="bg-zinc-900/95 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between shrink-0">
              <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Live Preview
              </span>
              <button
                type="button"
                onClick={() => setSplitView(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Close split view"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <iframe
              ref={previewRef}
              className="w-full border-0 bg-white"
              style={{ height: 'calc(100vh - 130px)' }}
              title="Live resume preview"
            />
          </aside>
        )}
        </div>

        {showPreview && (
          <ResumePreviewModal
            title={title || 'Resume Preview'}
            htmlContent={buildPreviewHtml()}
            previewUrl={resume ? resumeApi.getPreviewUrl(resumeId) : undefined}
            onClose={() => setShowPreview(false)}
            onDownload={() => resumeApi.downloadPDF(resumeId)}
          />
        )}
      </VerificationGate>
    </DashboardLayout>
  );
}
