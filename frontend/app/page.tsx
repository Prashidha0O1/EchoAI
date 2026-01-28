'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Mic, Brain, Target } from 'lucide-react';
import { ScrollVelocity } from '@/components/ScrollVelocity';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center px-6 pt-24 pb-16">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-6xl md:text-8xl font-bold text-white mb-8 tracking-tight leading-[0.95]" style={{ fontFamily: 'var(--font-heading)' }}>
              Master your<br />
              interviews with AI
            </h1>
            
            <p className="text-xl text-[#91A3B0] mb-12 max-w-2xl" style={{ fontFamily: 'var(--font-body)' }}>
              Practice with AI-powered interview simulations. Get real-time feedback 
              and improve your performance before the real thing.
            </p>

            <div className="flex gap-4">
              <button className="group px-8 py-4 bg-white text-black rounded-lg font-semibold flex items-center gap-2 hover:bg-white/90 transition-all">
                Start practicing
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 border border-[#27272a] text-white rounded-lg font-semibold hover:border-[#3f3f46] transition-colors">
                View demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Animated Text Strip */}
      <div className="border-y border-[#27272a]/50 py-8 overflow-hidden">
        <ScrollVelocity baseVelocity={-1} className="text-5xl font-bold text-[#18181b]">
          PRACTICE • FEEDBACK • IMPROVE • 
        </ScrollVelocity>
      </div>

      {/* Features Section */}
      <section className="px-6 py-32">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-20" style={{ fontFamily: 'var(--font-heading)' }}>
            Everything you need
          </h2>

          <div className="grid md:grid-cols-3 gap-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="w-12 h-12 rounded-full bg-[#1560BD]/10 flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-[#1560BD]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                AI-powered interviews
              </h3>
              <p className="text-[#91A3B0] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Practice with realistic AI interviewers that adapt to your responses 
                and provide personalized questions.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="w-12 h-12 rounded-full bg-[#1560BD]/10 flex items-center justify-center mb-6">
                <Mic className="w-6 h-6 text-[#1560BD]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Real-time feedback
              </h3>
              <p className="text-[#91A3B0] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Get instant analysis on your answers, tone, pace, and body language 
                to improve faster.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-12 h-12 rounded-full bg-[#1560BD]/10 flex items-center justify-center mb-6">
                <Target className="w-6 h-6 text-[#1560BD]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                Track progress
              </h3>
              <p className="text-[#91A3B0] leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Monitor your improvement over time with detailed analytics and 
                performance insights.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-32">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Ready to ace your<br />next interview?
            </h2>
            <p className="text-xl text-[#91A3B0] mb-12" style={{ fontFamily: 'var(--font-body)' }}>
              Join thousands of professionals improving their interview skills with EchoAI
            </p>
            <button className="group px-10 py-5 bg-white text-black rounded-lg font-semibold text-lg flex items-center gap-2 mx-auto hover:bg-white/90 transition-all">
              Get started for free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#27272a] px-6 py-12">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <p className="text-[#71717a] text-sm">© 2026 EchoAI. All rights reserved.</p>
          <div className="flex gap-8 text-sm text-[#71717a]">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}