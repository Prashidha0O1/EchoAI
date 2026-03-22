'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { reportApi, interviewApi, type Report } from '@/lib/api';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  AlertTriangle,
  Clock,
} from 'lucide-react';

// ─── Score Ring ─────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 70;
  const stroke = 10;
  const size = (radius + stroke) * 2;
  const circumference = 2 * Math.PI * radius;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const offset = animated
    ? circumference - (score / 100) * circumference
    : circumference;

  const label =
    score >= 85
      ? { text: 'Excellent', color: '#10b981' }
      : score >= 70
      ? { text: 'Good', color: '#34d399' }
      : score >= 55
      ? { text: 'Fair', color: '#f59e0b' }
      : { text: 'Needs Work', color: '#f87171' };

  const scoreColor =
    score >= 85 ? '#10b981' : score >= 70 ? '#34d399' : score >= 55 ? '#f59e0b' : '#f87171';

  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        {/* Score text overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              color: scoreColor,
              fontFamily: 'var(--font-space-grotesk)',
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p style={{ color: '#9ca3af', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Overall Score
        </p>
        <span
          style={{
            display: 'inline-block',
            marginTop: 4,
            padding: '2px 10px',
            borderRadius: 99,
            fontSize: '0.75rem',
            fontWeight: 600,
            background: `${label.color}18`,
            color: label.color,
            border: `1px solid ${label.color}40`,
          }}
        >
          {label.text}
        </span>
      </div>
    </div>
  );
}

// ─── Metric Bar ──────────────────────────────────────────────────────────────

function MetricCard({ label, score }: { label: string; score: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 200);
    return () => clearTimeout(t);
  }, [score]);

  const color =
    score >= 80 ? '#10b981' : score >= 60 ? '#34d399' : score >= 40 ? '#f59e0b' : '#f87171';

  return (
    <div
      style={{
        background: '#111',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        padding: '14px 16px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 500, letterSpacing: '0.04em' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color }}>
          {score}
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${width}%`,
            borderRadius: 99,
            background: color,
            transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 16, r = 8 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: 'rgba(255,255,255,0.05)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params = useParams();
  const id = Number(params.id);

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasReport, setHasReport] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [messages, setMessages] = useState<{ sender: string; content: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      // Fetch report
      const res = await reportApi.get(id);
      if (res.data) {
        setReport(res.data);
        setHasReport(true);
      } else if (res.error && res.error.includes('404')) {
        setHasReport(false);
      } else if (res.error) {
        setError(res.error);
      }

      setLoading(false);
    };
    if (id) load();
  }, [id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    const res = await reportApi.generate(id);
    if (res.data) {
      setReport(res.data);
      setHasReport(true);
    } else {
      setError(res.error || 'Failed to generate report');
    }
    setGenerating(false);
  };

  const metrics = report?.performance_metrics
    ? [
        { label: 'Communication', key: 'communication' },
        { label: 'Technical Knowledge', key: 'technical_knowledge' },
        { label: 'Problem Solving', key: 'problem_solving' },
        { label: 'Confidence', key: 'confidence' },
        { label: 'Relevance', key: 'relevance' },
      ]
    : [];

  return (
    <DashboardLayout>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Link
              href="/interviews"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#6b7280',
                fontSize: '0.8rem',
                textDecoration: 'none',
                marginBottom: 6,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e5e7eb')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Back to Interviews
            </Link>
            <h1
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#f9fafb',
                fontFamily: 'var(--font-space-grotesk)',
                margin: 0,
              }}
            >
              Interview Report
            </h1>
            {report?.generated_at && (
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock style={{ width: 12, height: 12 }} />
                Generated {new Date(report.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 500,
              background: generating ? '#0d2e22' : '#10b981',
              color: generating ? '#6b7280' : '#fff',
              border: 'none',
              cursor: generating ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!generating) (e.currentTarget as HTMLElement).style.background = '#059669'; }}
            onMouseLeave={e => { if (!generating) (e.currentTarget as HTMLElement).style.background = '#10b981'; }}
          >
            {generating ? (
              <>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.15)',
                    borderTopColor: '#10b981',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                Generating…
              </>
            ) : (
              <>
                <Sparkles style={{ width: 14, height: 14 }} />
                {hasReport ? 'Regenerate' : 'Generate Report'}
              </>
            )}
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: 20,
            }}
          >
            <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* ── Loading Skeletons ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <Skeleton w={160} h={160} r={80} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ flex: 1, background: '#111', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Skeleton w="60%" h={10} r={4} />
                  <div style={{ height: 8 }} />
                  <Skeleton w="100%" h={4} r={99} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#111', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
                <Skeleton w="40%" h={12} r={4} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} w="90%" h={10} r={4} />)}
                </div>
              </div>
              <div style={{ background: '#111', borderRadius: 12, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
                <Skeleton w="40%" h={12} r={4} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                  {[1, 2, 3].map(i => <Skeleton key={i} w="90%" h={10} r={4} />)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── No Report ── */}
        {!loading && !report && !error && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '72px 24px',
              background: '#111',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.07)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <FileText style={{ width: 24, height: 24, color: '#6b7280' }} />
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#e5e7eb', marginBottom: 6 }}>
              No report generated yet
            </p>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: 24, maxWidth: 360 }}>
              Click "Generate Report" to analyse this interview with AI and get detailed feedback.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '10px 20px',
                borderRadius: 10,
                fontSize: '0.85rem',
                fontWeight: 500,
                background: '#10b981',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {generating ? 'Generating…' : (
                <><Sparkles style={{ width: 14, height: 14 }} /> Generate Report</>
              )}
            </button>
          </div>
        )}

        {/* ── Report Content ── */}
        {!loading && report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Overall Score */}
            <div
              style={{
                background: '#111',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: '32px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <ScoreRing score={report.overall_score ?? 0} />
              {report.report_name && (
                <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 4 }}>{report.report_name}</p>
              )}
            </div>

            {/* Performance Metrics */}
            {report.performance_metrics && (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Performance Breakdown
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {metrics.map(m => (
                    <MetricCard
                      key={m.key}
                      label={m.label}
                      score={(report.performance_metrics as Record<string, number>)[m.key] ?? 0}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Strengths + Improvements */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Strengths */}
              <div
                style={{
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 style={{ width: 14, height: 14, color: '#10b981' }} />
                  </div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>Strengths</h3>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(report.strengths ?? []).map((s, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: 'rgba(16,185,129,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <CheckCircle2 style={{ width: 10, height: 10, color: '#10b981' }} />
                      </div>
                      <span style={{ fontSize: '0.82rem', color: '#d1d5db', lineHeight: 1.5 }}>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div
                style={{
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ArrowUpRight style={{ width: 14, height: 14, color: '#f59e0b' }} />
                  </div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>Areas to Improve</h3>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(report.improvements ?? []).map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          background: 'rgba(245,158,11,0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <ArrowUpRight style={{ width: 10, height: 10, color: '#f59e0b' }} />
                      </div>
                      <span style={{ fontSize: '0.82rem', color: '#d1d5db', lineHeight: 1.5 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Tags */}
            {report.tags && report.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {report.tags.map((tag, i) => {
                  const tagColor =
                    tag.tag_category === 'strength' ? { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', text: '#34d399' }
                    : tag.tag_category === 'weakness' ? { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: '#fbbf24' }
                    : { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: '#9ca3af' };
                  return (
                    <span
                      key={i}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 99,
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        background: tagColor.bg,
                        border: `1px solid ${tagColor.border}`,
                        color: tagColor.text,
                      }}
                    >
                      {tag.tag_name}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            {report.summary && (
              <div
                style={{
                  background: '#111',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14,
                  padding: '20px',
                }}
              >
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Summary
                </p>
                <p style={{ fontSize: '0.875rem', color: '#d1d5db', lineHeight: 1.7, margin: 0 }}>
                  {report.summary}
                </p>
              </div>
            )}

            {/* Transcript toggle */}
            <div
              style={{
                background: '#111',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setTranscriptOpen(v => !v)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText style={{ width: 14, height: 14 }} />
                  View Transcript
                </span>
                {transcriptOpen ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
              </button>

              {transcriptOpen && (
                <TranscriptView interviewId={id} />
              )}
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Transcript View ─────────────────────────────────────────────────────────

function TranscriptView({ interviewId }: { interviewId: number }) {
  const [msgs, setMsgs] = useState<{ sender: string; content: string; id: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/interviews/${interviewId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setMsgs(data);
      }
      setLoading(false);
    };
    load();
  }, [interviewId]);

  if (loading) {
    return (
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Skeleton w="100%" h={12} r={4} />
      </div>
    );
  }

  if (!msgs.length) {
    return (
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', color: '#6b7280', fontSize: '0.8rem' }}>
        No transcript available.
      </div>
    );
  }

  return (
    <div
      style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxHeight: 360,
        overflowY: 'auto',
      }}
    >
      {msgs.map(msg => {
        const isAi = msg.sender === 'ai';
        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: isAi ? 'flex-start' : 'flex-end',
            }}
          >
            <div
              style={{
                maxWidth: '78%',
                padding: '8px 12px',
                borderRadius: isAi ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
                fontSize: '0.8rem',
                lineHeight: 1.55,
                background: isAi ? 'rgba(255,255,255,0.04)' : 'rgba(16,185,129,0.08)',
                color: isAi ? '#9ca3af' : '#d1fae5',
                border: isAi ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(16,185,129,0.15)',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: isAi ? '#6b7280' : '#10b981',
                  marginBottom: 3,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {isAi ? 'Interviewer' : 'You'}
              </span>
              {msg.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
