'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, ChevronRight, Zap, UserCircle, MessageSquare, BarChart2, Brain, Captions, FileSearch, FilePen, Code2 } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

/* ─── palette ───────────────────────────────────────────────────────── */
const C = {
  bg:          '#060a07',
  surface:     '#0c1510',
  border:      'rgba(16,185,129,0.12)',
  borderDim:   'rgba(255,255,255,0.05)',
  accent:      '#10b981',
  accentBright:'#34d399',
  accentGlow:  'rgba(16,185,129,0.18)',
  accentDeep:  'rgba(16,185,129,0.06)',
  text:        '#f0fdf4',
  muted:       '#6b7280',
  dim:         '#374151',
};

const FEATURES = [
  {
    icon: Brain,
    tag: 'Core',
    title: 'AI Interview',
    desc: 'Practice with an AI interviewer that generates role-specific questions and adapts the conversation based on your responses.',
  },
  {
    icon: Captions,
    tag: 'Core',
    title: 'Live Transcription',
    desc: 'A real-time transcription window inside the interview room captures everything you say so you can review it word-for-word.',
  },
  {
    icon: FileSearch,
    tag: 'Core',
    title: 'Resume Analyzer',
    desc: 'Upload your CV and get a deep analysis — gap detection, keyword alignment, and actionable suggestions to strengthen it.',
  },
];

const MINOR_FEATURES = [
  {
    icon: FilePen,
    title: 'Resume Builder',
    desc: 'Build and edit a polished resume directly in the app.',
  },
  {
    icon: Code2,
    title: 'Code Interview Practice',
    desc: 'Tackle coding questions in a live editor with AI feedback.',
  },
];

const STEPS = [
  {
    num: '01',
    icon: UserCircle,
    title: 'Set up your profile',
    desc: 'Upload your CV and choose your target role. EchoAI tailors every session to your background.',
  },
  {
    num: '02',
    icon: MessageSquare,
    title: 'Start an AI session',
    desc: 'Answer realistic questions from an AI interviewer that adapts based on your responses in real time.',
  },
  {
    num: '03',
    icon: BarChart2,
    title: 'Review your feedback',
    desc: 'Get a detailed breakdown — clarity, confidence, keywords, structure — and a score for every answer.',
  },
];

const STATS = [
  { value: '10k+', label: 'practice sessions' },
  { value: '94%',  label: 'reported confidence boost' },
  { value: '3×',   label: 'faster improvement' },
];

/* ─── component ─────────────────────────────────────────────────────── */
export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const orbY      = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroFade  = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ══════════════════════════════ HERO ══════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative flex items-center px-6 pt-28 pb-20 overflow-hidden"
        style={{ minHeight: '100vh' }}
      >

        {/* Dot-grid background */}
        <div className="pointer-events-none absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle, rgba(16,185,129,0.18) 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 0%, black 40%, transparent 100%)',
        }} />

        {/* Main glow — parallaxes on scroll */}
        <motion.div style={{ y: orbY }} className="pointer-events-none absolute -top-40 -left-40">
          <div style={{
            width: 680, height: 680, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.05) 50%, transparent 70%)`,
            filter: 'blur(18px)',
          }} />
        </motion.div>

        {/* Bottom-right counter-glow */}
        <motion.div
          className="pointer-events-none absolute bottom-0 right-0"
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div style={{
            width: 500, height: 500, borderRadius: '50%',
            background: `radial-gradient(circle, rgba(52,211,153,0.1) 0%, transparent 65%)`,
            transform: 'translate(35%, 30%)',
            filter: 'blur(24px)',
          }} />
        </motion.div>

        <motion.div style={{ opacity: heroFade }} className="relative max-w-6xl mx-auto w-full z-10">

          {/* Eyebrow chip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 mb-10 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{ background: C.accentDeep, border: `1px solid ${C.border}`, color: C.accentBright }}
          >
            <Sparkles className="w-3 h-3" />
            AI Interview Coach
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mb-8 tracking-tight"
            style={{ fontWeight: 700, fontSize: 'clamp(3.2rem, 8.5vw, 7rem)', lineHeight: 0.9 }}
          >
            Land your
            <br />
            <span style={{
              background: `linear-gradient(120deg, ${C.accentBright} 0%, ${C.accent} 50%, #059669 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              dream job
            </span>
            <br />
            <span style={{ color: 'rgba(240,253,244,0.28)', fontWeight: 300 }}>
              with AI practice.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 max-w-lg text-lg leading-relaxed"
            style={{ color: C.muted }}
          >
            Practice realistic AI-driven interviews, get instant feedback on every answer,
            and walk into your next interview fully prepared.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap gap-4 mb-20"
          >
            <Link
              href="/register"
              className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{ background: C.accent, color: '#022c22' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = C.accentBright;
                el.style.boxShadow = `0 0 32px ${C.accentGlow}, 0 0 64px rgba(16,185,129,0.1)`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = C.accent;
                el.style.boxShadow = 'none';
              }}
            >
              <Zap className="w-4 h-4" />
              Start practicing free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <a
              href="#"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{ border: `1px solid ${C.borderDim}`, color: 'rgba(240,253,244,0.6)' }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = C.border;
                el.style.color = C.text;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = C.borderDim;
                el.style.color = 'rgba(240,253,244,0.6)';
              }}
            >
              Watch demo
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-wrap gap-10"
          >
            {STATS.map(({ value, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <p className="text-3xl font-bold" style={{ color: C.accentBright }}>{value}</p>
                <p className="text-xs mt-1 tracking-wide uppercase" style={{ color: C.dim }}>{label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ═════════════════════════════ */}
      <section className="px-6 py-28" style={{ borderTop: `1px solid ${C.borderDim}` }}>
        <div className="max-w-6xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="mb-16"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase mb-5"
              style={{ background: C.accentDeep, border: `1px solid ${C.border}`, color: C.accent }}
            >
              How it works
            </div>
            <h2 className="text-4xl md:text-5xl font-bold" style={{ lineHeight: 1 }}>
              Three steps to
              <br />
              <span style={{ color: 'rgba(240,253,244,0.25)', fontWeight: 300 }}>interview-ready.</span>
            </h2>
          </motion.div>

          {/* Steps grid */}
          <div className="grid md:grid-cols-3 gap-0 relative">

            {/* Connecting line (desktop only) */}
            <div
              className="hidden md:block absolute top-10 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px"
              style={{ background: `linear-gradient(90deg, ${C.border}, ${C.border} 50%, ${C.border})` }}
            />

            {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
              <motion.div
                key={num}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative flex flex-col px-0 md:px-8 pb-10 md:pb-0"
                style={i > 0 ? { borderLeft: `1px solid ${C.borderDim}` } : {}}
              >
                {/* Step number badge + icon */}
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="relative flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold shrink-0"
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      color: C.accent,
                      zIndex: 1,
                    }}
                  >
                    {/* Pulse ring on step 1 */}
                    {i === 0 && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                        style={{ border: `1px solid ${C.accent}` }}
                      />
                    )}
                    {num}
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: C.accentDeep, border: `1px solid ${C.border}` }}
                  >
                    <Icon className="w-4.5 h-4.5" style={{ color: C.accent }} />
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{desc}</p>

                {/* Mobile step connector */}
                {i < STEPS.length - 1 && (
                  <div
                    className="md:hidden absolute bottom-0 left-5 w-px"
                    style={{ height: 40, background: `linear-gradient(to bottom, ${C.border}, transparent)` }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═════════════════════════ FEATURES ══════════════════════════════ */}
      <section className="px-6 py-36">
        <div className="max-w-6xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-24"
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase mb-5"
              style={{ background: C.accentDeep, border: `1px solid ${C.border}`, color: C.accent }}
            >
              Features
            </div>
            <h2 className="text-5xl md:text-6xl font-bold" style={{ lineHeight: 0.95 }}>
              Everything you need
              <br />
              <span style={{ color: 'rgba(240,253,244,0.25)', fontWeight: 300 }}>to get the offer.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5 mb-4">
            {FEATURES.map(({ icon: Icon, tag, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative rounded-2xl p-8 transition-all duration-300 cursor-default"
                style={{ background: C.surface, border: `1px solid ${C.borderDim}` }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = C.border;
                  el.style.boxShadow = `0 0 0 1px ${C.border}, 0 8px 48px rgba(16,185,129,0.08)`;
                  el.style.background = 'rgba(16,185,129,0.04)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = C.borderDim;
                  el.style.boxShadow = 'none';
                  el.style.background = C.surface;
                }}
              >
                {/* Top row: tag + icon */}
                <div className="flex items-start justify-between mb-8">
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                    style={{ background: C.accentDeep, color: C.accent, border: `1px solid ${C.border}` }}
                  >
                    {tag}
                  </span>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: C.accentDeep, border: `1px solid ${C.border}` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: C.accent }} />
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-3">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{desc}</p>

                {/* Hover reveal */}
                <div
                  className="mt-8 flex items-center gap-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ color: C.accent }}
                >
                  Learn more <ChevronRight className="w-3.5 h-3.5" />
                </div>

                {/* Bottom accent line */}
                <div
                  className="absolute bottom-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }}
                />
              </motion.div>
            ))}
          </div>

          {/* Minor features row */}
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            {MINOR_FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="flex items-start gap-5 rounded-2xl px-7 py-6 transition-all duration-300 cursor-default"
                style={{ background: C.surface, border: `1px solid ${C.borderDim}` }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = C.border;
                  el.style.background = 'rgba(16,185,129,0.04)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.borderColor = C.borderDim;
                  el.style.background = C.surface;
                }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: C.accentDeep, border: `1px solid ${C.border}` }}
                >
                  <Icon className="w-4 h-4" style={{ color: C.accent }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <span
                      className="text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                      style={{ background: C.accentDeep, color: C.muted, border: `1px solid ${C.borderDim}` }}
                    >
                      Beta
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: C.muted }}>{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════ CTA ═══════════════════════════════════ */}
      <section className="px-6 pb-36">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-3xl overflow-hidden text-center"
            style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '80px 48px' }}
          >
            {/* Top-center glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0" style={{
              height: 240,
              background: `radial-gradient(ellipse 60% 100% at 50% 0%, rgba(16,185,129,0.22) 0%, transparent 100%)`,
            }} />

            {/* Bottom decorative line */}
            <div className="pointer-events-none absolute bottom-0 inset-x-0 h-px"
              style={{ background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)` }}
            />

            <div className="relative z-10">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase mb-8"
                style={{ background: C.accentDeep, border: `1px solid ${C.border}`, color: C.accentBright }}
              >
                <Zap className="w-3 h-3" />
                No credit card required
              </div>

              <h2 className="text-5xl md:text-[3.75rem] font-bold mb-5" style={{ lineHeight: 1 }}>
                Ready to ace your
                <br />
                <span style={{
                  background: `linear-gradient(120deg, ${C.text} 30%, ${C.accentBright} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  next interview?
                </span>
              </h2>

              <p className="text-base mb-10 max-w-md mx-auto" style={{ color: C.muted }}>
                Join thousands of professionals who practice with EchoAI and walk in confident.
              </p>

              <Link
                href="/register"
                className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-sm transition-all duration-200"
                style={{ background: C.accent, color: '#022c22' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = C.accentBright;
                  el.style.boxShadow = `0 0 40px ${C.accentGlow}`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = C.accent;
                  el.style.boxShadow = 'none';
                }}
              >
                <Zap className="w-4 h-4" />
                Get started for free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ══════════════════════════════════ */}
      <footer className="px-6 py-10" style={{ borderTop: `1px solid ${C.borderDim}` }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: C.accent }} />
            <p className="text-sm font-semibold" style={{ color: C.dim, fontFamily: 'var(--font-space-grotesk)' }}>
              EchoAI
            </p>
            <p className="text-sm" style={{ color: C.dim }}>© 2026</p>
          </div>
          <div className="flex gap-8 text-sm">
            {['Privacy', 'Terms', 'Contact'].map(item => (
              <a
                key={item}
                href="#"
                className="transition-colors duration-150"
                style={{ color: C.dim }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = C.text)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = C.dim)}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
