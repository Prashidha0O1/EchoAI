'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import Button from '@/components/Button';
import ResumePreviewModal from '@/components/ResumePreviewModal';
import VerificationGate from '@/components/VerificationGate';
import { resumeApi, ResumeEducation, ResumeExperience, ResumeProject, ResumeCertification } from '@/lib/resumeApi';
import { Plus, Trash2, Save, Eye, Columns2, X } from 'lucide-react';

export default function CreateResumePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPreview, setShowPreview] = useState(false);
  const [splitView, setSplitView] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Form state
  const [title, setTitle] = useState('My Resume');
  const [template, setTemplate] = useState<'modern' | 'classic' | 'minimal' | 'creative'>('modern');
  
  // Personal info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [summary, setSummary] = useState('');

  // Education
  const [education, setEducation] = useState<ResumeEducation[]>([{
    institution: '',
    degree: '',
    field: '',
    start_date: '',
    end_date: '',
    gpa: '',
    achievements: []
  }]);

  // Experience
  const [experience, setExperience] = useState<ResumeExperience[]>([{
    company: '',
    title: '',
    location: '',
    start_date: '',
    end_date: '',
    description: '',
    achievements: []
  }]);

  // Skills
  const [technicalSkills, setTechnicalSkills] = useState('');
  const [softSkills, setSoftSkills] = useState('');
  const [languages, setLanguages] = useState('');
  const [tools, setTools] = useState('');

  // Projects
  const [projects, setProjects] = useState<ResumeProject[]>([{
    title: '',
    description: '',
    technologies: [],
    link: ''
  }]);

  // Certifications
  const [certifications, setCertifications] = useState<ResumeCertification[]>([{
    name: '',
    issuer: '',
    date: '',
    credential_id: ''
  }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const resumeData = {
      title,
      template,
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
        technical: technicalSkills ? technicalSkills.split(',').map(s => s.trim()) : undefined,
        soft: softSkills ? softSkills.split(',').map(s => s.trim()) : undefined,
        languages: languages ? languages.split(',').map(s => s.trim()) : undefined,
        tools: tools ? tools.split(',').map(s => s.trim()) : undefined,
      },
      projects: projects.filter(p => p.title && p.description),
      certifications: certifications.filter(c => c.name && c.issuer),
      is_primary: false
    };

    const response = await resumeApi.create(resumeData);
    
    if (response.data) {
      router.push('/resumes');
    } else {
      alert(response.error || 'Failed to create resume');
    }
    
    setLoading(false);
  };

  const addEducation = () => {
    setEducation([...education, {
      institution: '',
      degree: '',
      field: '',
      start_date: '',
      end_date: '',
      gpa: '',
      achievements: []
    }]);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: keyof ResumeEducation, value: any) => {
    const updated = [...education];
    (updated[index] as any)[field] = value;
    setEducation(updated);
  };

  const addExperience = () => {
    setExperience([...experience, {
      company: '',
      title: '',
      location: '',
      start_date: '',
      end_date: '',
      description: '',
      achievements: []
    }]);
  };

  const removeExperience = (index: number) => {
    setExperience(experience.filter((_, i) => i !== index));
  };

  const updateExperience = (index: number, field: keyof ResumeExperience, value: any) => {
    const updated = [...experience];
    (updated[index] as any)[field] = value;
    setExperience(updated);
  };

  const addProject = () => {
    setProjects([...projects, {
      title: '',
      description: '',
      technologies: [],
      link: ''
    }]);
  };

  const removeProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  const updateProject = (index: number, field: keyof ResumeProject, value: any) => {
    const updated = [...projects];
    (updated[index] as any)[field] = value;
    setProjects(updated);
  };

  const addCertification = () => {
    setCertifications([...certifications, {
      name: '',
      issuer: '',
      date: '',
      credential_id: ''
    }]);
  };

  const removeCertification = (index: number) => {
    setCertifications(certifications.filter((_, i) => i !== index));
  };

  const updateCertification = (index: number, field: keyof ResumeCertification, value: any) => {
    const updated = [...certifications];
    (updated[index] as any)[field] = value;
    setCertifications(updated);
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
  h1 { font-size: 28px; font-weight: 700; color: #1a1a2e; }
  .subtitle { color: #6b7280; font-size: 13px; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 12px; }
  .subtitle span { display: flex; align-items: center; gap: 4px; }
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
  ${filledExp.length > 0 ? `<hr class="divider"><div class="section"><p class="section-title">Experience</p>${filledExp.map(e => `
    <div class="entry">
      <div class="entry-header">
        <div><span class="entry-title">${e.title}</span> — <span class="entry-sub">${e.company}${e.location ? `, ${e.location}` : ''}</span></div>
        <span class="entry-date">${e.start_date || ''}${e.end_date ? ` – ${e.end_date}` : e.start_date ? ' – Present' : ''}</span>
      </div>
      ${e.description ? `<p class="entry-desc">${e.description}</p>` : ''}
    </div>`).join('')}</div>` : ''}
  ${filledEdu.length > 0 ? `<hr class="divider"><div class="section"><p class="section-title">Education</p>${filledEdu.map(e => `
    <div class="entry">
      <div class="entry-header">
        <div><span class="entry-title">${e.degree}${e.field ? ` in ${e.field}` : ''}</span><br><span class="entry-sub">${e.institution}</span></div>
        <span class="entry-date">${e.start_date || ''}${e.end_date ? ` – ${e.end_date}` : ''}</span>
      </div>
      ${e.gpa ? `<p class="entry-desc">GPA: ${e.gpa}</p>` : ''}
    </div>`).join('')}</div>` : ''}
  ${skills.length > 0 ? `<hr class="divider"><div class="section"><p class="section-title">Skills</p><div class="tag-list">${skills.map(s => `<span class="tag">${s}</span>`).join('')}</div></div>` : ''}
  ${filledProj.length > 0 ? `<hr class="divider"><div class="section"><p class="section-title">Projects</p>${filledProj.map(p => `
    <div class="entry">
      <span class="entry-title">${p.title}</span>
      <p class="entry-desc">${p.description}</p>
      ${p.technologies && p.technologies.length > 0 ? `<div class="tag-list">${p.technologies.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
    </div>`).join('')}</div>` : ''}
  ${filledCert.length > 0 ? `<hr class="divider"><div class="section"><p class="section-title">Certifications</p>${filledCert.map(c => `
    <div class="entry">
      <div class="entry-header">
        <div><span class="entry-title">${c.name}</span><br><span class="entry-sub">${c.issuer}</span></div>
        <span class="entry-date">${c.date || ''}</span>
      </div>
    </div>`).join('')}</div>` : ''}
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

  const tabs = [
    { id: 'personal', label: 'Personal Info' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'projects', label: 'Projects' },
    { id: 'certifications', label: 'Certifications' },
  ];

  return (
    <DashboardLayout>
      <VerificationGate feature="create or edit resumes">
      <div className={splitView ? 'flex gap-6 items-start' : ''}>
      <div className={splitView ? 'flex-1 min-w-0 space-y-6' : 'max-w-4xl mx-auto space-y-6'}>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Create Resume
              </h1>
              <p className="text-zinc-500 text-sm mt-1">Build your professional resume</p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Title and Template */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Resume Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="e.g., Software Engineer Resume"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Template</label>
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value as any)}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                  >
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="minimal">Minimal</option>
                    <option value="creative">Creative</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="flex border-b border-zinc-800 overflow-x-auto">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'text-indigo-400 border-b-2 border-indigo-500 bg-zinc-800/50'
                        : 'text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Personal Info Tab */}
                {activeTab === 'personal' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Full Name *</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                          placeholder="John Doe"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Email *</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                          placeholder="john@example.com"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Phone</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Location</label>
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                          placeholder="San Francisco, CA"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
                        <input
                          type="url"
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                          placeholder="https://linkedin.com/in/johndoe"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">GitHub URL</label>
                        <input
                          type="url"
                          value={github}
                          onChange={(e) => setGithub(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                          placeholder="https://github.com/johndoe"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">Portfolio URL</label>
                        <input
                          type="url"
                          value={portfolio}
                          onChange={(e) => setPortfolio(e.target.value)}
                          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                          placeholder="https://johndoe.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Professional Summary</label>
                      <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none resize-none"
                        placeholder="A brief summary of your professional background and career objectives..."
                      />
                    </div>
                  </div>
                )}

                {/* Experience Tab */}
                {activeTab === 'experience' && (
                  <div className="space-y-6">
                    {experience.map((exp, index) => (
                      <div key={index} className="border border-zinc-800 rounded-lg p-6 relative">
                        {experience.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExperience(index)}
                            className="absolute top-4 right-4 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}

                        <h4 className="text-lg font-semibold mb-4">Experience {index + 1}</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Company *</label>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => updateExperience(index, 'company', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="Tech Corp"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Job Title *</label>
                            <input
                              type="text"
                              value={exp.title}
                              onChange={(e) => updateExperience(index, 'title', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="Software Engineer"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Location</label>
                            <input
                              type="text"
                              value={exp.location}
                              onChange={(e) => updateExperience(index, 'location', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="San Francisco, CA"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Start Date</label>
                              <input
                                type="month"
                                value={exp.start_date}
                                onChange={(e) => updateExperience(index, 'start_date', e.target.value)}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-2">End Date</label>
                              <input
                                type="month"
                                value={exp.end_date}
                                onChange={(e) => updateExperience(index, 'end_date', e.target.value)}
                                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                                placeholder="Present"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                              value={exp.description}
                              onChange={(e) => updateExperience(index, 'description', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none resize-none"
                              placeholder="Describe your role and responsibilities..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button type="button" onClick={addExperience} variant="outline" className="w-full">
                      <Plus className="w-5 h-5 mr-2" />
                      Add Experience
                    </Button>
                  </div>
                )}

                {/* Education Tab */}
                {activeTab === 'education' && (
                  <div className="space-y-6">
                    {education.map((edu, index) => (
                      <div key={index} className="border border-zinc-800 rounded-lg p-6 relative">
                        {education.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEducation(index)}
                            className="absolute top-4 right-4 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}

                        <h4 className="text-lg font-semibold mb-4">Education {index + 1}</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-2">Institution *</label>
                            <input
                              type="text"
                              value={edu.institution}
                              onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="University of Example"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Degree *</label>
                            <input
                              type="text"
                              value={edu.degree}
                              onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="Bachelor of Science"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Field of Study *</label>
                            <input
                              type="text"
                              value={edu.field}
                              onChange={(e) => updateEducation(index, 'field', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="Computer Science"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Start Date</label>
                            <input
                              type="month"
                              value={edu.start_date}
                              onChange={(e) => updateEducation(index, 'start_date', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">End Date</label>
                            <input
                              type="month"
                              value={edu.end_date}
                              onChange={(e) => updateEducation(index, 'end_date', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="Present"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">GPA</label>
                            <input
                              type="text"
                              value={edu.gpa}
                              onChange={(e) => updateEducation(index, 'gpa', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="3.8/4.0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button type="button" onClick={addEducation} variant="outline" className="w-full">
                      <Plus className="w-5 h-5 mr-2" />
                      Add Education
                    </Button>
                  </div>
                )}

                {/* Skills Tab */}
                {activeTab === 'skills' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Technical Skills</label>
                      <input
                        type="text"
                        value={technicalSkills}
                        onChange={(e) => setTechnicalSkills(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="Python, JavaScript, React, Node.js (comma separated)"
                      />
                      <p className="text-xs text-zinc-500 mt-1">Separate skills with commas</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Soft Skills</label>
                      <input
                        type="text"
                        value={softSkills}
                        onChange={(e) => setSoftSkills(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="Leadership, Communication, Problem Solving"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Languages</label>
                      <input
                        type="text"
                        value={languages}
                        onChange={(e) => setLanguages(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="English (Native), Spanish (Fluent)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Tools & Frameworks</label>
                      <input
                        type="text"
                        value={tools}
                        onChange={(e) => setTools(e.target.value)}
                        className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                        placeholder="Git, Docker, AWS, PostgreSQL"
                      />
                    </div>
                  </div>
                )}

                {/* Projects Tab */}
                {activeTab === 'projects' && (
                  <div className="space-y-6">
                    {projects.map((proj, index) => (
                      <div key={index} className="border border-zinc-800 rounded-lg p-6 relative">
                        {projects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeProject(index)}
                            className="absolute top-4 right-4 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}

                        <h4 className="text-lg font-semibold mb-4">Project {index + 1}</h4>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Project Title *</label>
                            <input
                              type="text"
                              value={proj.title}
                              onChange={(e) => updateProject(index, 'title', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="E-commerce Platform"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Description *</label>
                            <textarea
                              value={proj.description}
                              onChange={(e) => updateProject(index, 'description', e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none resize-none"
                              placeholder="Describe the project and your role..."
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Technologies</label>
                            <input
                              type="text"
                              value={proj.technologies?.join(', ') || ''}
                              onChange={(e) => updateProject(index, 'technologies', e.target.value.split(',').map(t => t.trim()))}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="React, Node.js, MongoDB (comma separated)"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Project Link</label>
                            <input
                              type="url"
                              value={proj.link}
                              onChange={(e) => updateProject(index, 'link', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="https://github.com/username/project"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button type="button" onClick={addProject} variant="outline" className="w-full">
                      <Plus className="w-5 h-5 mr-2" />
                      Add Project
                    </Button>
                  </div>
                )}

                {/* Certifications Tab */}
                {activeTab === 'certifications' && (
                  <div className="space-y-6">
                    {certifications.map((cert, index) => (
                      <div key={index} className="border border-zinc-800 rounded-lg p-6 relative">
                        {certifications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCertification(index)}
                            className="absolute top-4 right-4 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}

                        <h4 className="text-lg font-semibold mb-4">Certification {index + 1}</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Certification Name *</label>
                            <input
                              type="text"
                              value={cert.name}
                              onChange={(e) => updateCertification(index, 'name', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="AWS Certified Solutions Architect"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Issuing Organization *</label>
                            <input
                              type="text"
                              value={cert.issuer}
                              onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="Amazon Web Services"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Date Obtained *</label>
                            <input
                              type="month"
                              value={cert.date}
                              onChange={(e) => updateCertification(index, 'date', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Credential ID</label>
                            <input
                              type="text"
                              value={cert.credential_id}
                              onChange={(e) => updateCertification(index, 'credential_id', e.target.value)}
                              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-indigo-500 outline-none"
                              placeholder="ABC123XYZ"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button type="button" onClick={addCertification} variant="outline" className="w-full">
                      <Plus className="w-5 h-5 mr-2" />
                      Add Certification
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Save Resume
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/resumes')}
              >
                Cancel
              </Button>
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
          onClose={() => setShowPreview(false)}
        />
      )}
      </VerificationGate>
    </DashboardLayout>
  );
}
