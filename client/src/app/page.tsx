'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Target, Bot, Users, Trophy, Sparkles, ArrowRight, Crown, Flame, Zap } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem, ViewportFade } from '@/components/animations/MotionComponents';
import { ProgressRing, NeonBar, GlowChip, AICoachOrb } from '@/components/nexus/NexusPrimitives';

const features = [
  { icon: Target, label: 'Goals & Tasks', desc: 'Set ambitious goals, track daily tasks, earn XP', glow: 'text-primary-300' },
  { icon: Bot, label: 'AI Coach', desc: 'Personalized coaching, insights, and task generation', glow: 'text-cyan-300' },
  { icon: Users, label: 'Accountability Groups', desc: 'Compete and grow with your peers', glow: 'text-primary-300' },
  { icon: Trophy, label: 'Leaderboards', desc: 'Climb the ranks with streaks and XP', glow: 'text-accent-300' },
];

export default function HomePage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      {/* Ambient field (global particles/energy lines render behind via JinxEffects) */}
      <div className="pointer-events-none absolute inset-0 nexus-grid opacity-60" />
      <div className="pointer-events-none absolute inset-0">
        <div className="nexus-aurora nexus-aurora-1" />
        <div className="nexus-aurora nexus-aurora-2" />
        <div className="nexus-streak nexus-streak-1" />
        <div className="nexus-streak nexus-streak-2" />
      </div>

      <div className="relative z-10">
        <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold gradient-text">comeback.AI</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/pricing" className="hidden sm:block text-dark-300 hover:text-dark-100 transition-colors text-sm font-medium">
              Pricing
            </Link>
            <Link
              href="/auth/login"
              className="px-4 py-2 text-sm font-medium text-dark-100 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/25"
            >
              Get Started
            </Link>
          </nav>
        </header>

        <main className="max-w-6xl mx-auto px-6 pt-12 lg:pt-20 pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Copy column */}
            <FadeIn>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/25 text-primary-300 text-xs font-medium mb-6"
              >
                <Sparkles className="w-3 h-3" />
                AI-Powered Social Productivity
              </motion.div>

              <h1 className="text-4xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-5">
                Your <span className="gradient-text">comeback</span> starts now
              </h1>
              <p className="text-dark-400 text-lg max-w-md mb-8">
                Set goals, crush tasks, and level up with AI coaching and social accountability built for momentum.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/auth/register" className="btn-primary inline-flex items-center gap-2">
                  Start Free <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/pricing" className="btn-secondary inline-flex items-center gap-2">
                  <Crown className="w-4 h-4" /> View Plans
                </Link>
              </div>

              <div className="mt-10 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-accent-400" />
                  <div>
                    <p className="text-sm font-semibold leading-none">12.4k</p>
                    <p className="text-[11px] text-dark-400 mt-1">Active streaks</p>
                  </div>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary-300" />
                  <div>
                    <p className="text-sm font-semibold leading-none">3.1M</p>
                    <p className="text-[11px] text-dark-400 mt-1">Tasks completed</p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Live HUD preview column (real nexus components, not a fake screenshot) */}
            <FadeIn delay={0.15}>
              <div className="nexus-panel relative p-6 lg:p-7">
                <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary-400/60 to-transparent" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AICoachOrb size={42} active>
                      <Bot className="w-4 h-4 text-white" />
                    </AICoachOrb>
                    <div>
                      <p className="text-sm font-semibold">Coach online</p>
                      <p className="text-[11px] text-dark-400">Adaptive plan ready</p>
                    </div>
                  </div>
                  <GlowChip glow="green">Live</GlowChip>
                </div>

                <div className="mt-6 flex items-center gap-5">
                  <ProgressRing value={68} size={92} stroke={8} glow="blue">
                    <div className="text-center">
                      <p className="text-xl font-bold leading-none">Lv.24</p>
                      <p className="text-[10px] text-dark-400 mt-1">Rank A</p>
                    </div>
                  </ProgressRing>
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-dark-300">Weekly XP</span>
                        <span className="text-primary-300 font-medium">1,840 / 2,500</span>
                      </div>
                      <NeonBar value={74} glow="blue" />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-dark-300">Goal progress</span>
                        <span className="text-accent-300 font-medium">92%</span>
                      </div>
                      <NeonBar value={92} glow="red" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  {[
                    { t: 'Ship redesign review', d: 'Due 2h', g: 'blue' as const },
                    { t: 'Morning run . 5km', d: 'Done', g: 'green' as const },
                    { t: 'Read 20 pages', d: 'Due 8pm', g: 'red' as const },
                  ].map((task) => (
                    <div key={task.t} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${task.g === 'green' ? 'bg-green-400' : task.g === 'red' ? 'bg-accent-400' : 'bg-primary-400'}`} style={{ boxShadow: `0 0 8px ${task.g === 'green' ? '#66FCF1' : task.g === 'red' ? '#FF2055' : '#00A8FF'}` }} />
                      <span className="flex-1 text-sm text-dark-100">{task.t}</span>
                      <span className="text-[11px] text-dark-400">{task.d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>
          </div>

          <StaggerContainer className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <StaggerItem key={f.label}>
                  <div className="nexus-panel group h-full p-6 text-center transition-transform duration-300 hover:-translate-y-1">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                      <Icon className={`h-6 w-6 ${f.glow}`} />
                    </div>
                    <h3 className="font-semibold mb-1">{f.label}</h3>
                    <p className="text-sm text-dark-400">{f.desc}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>

          <ViewportFade className="mt-16">
            <div className="nexus-panel flex flex-col items-center gap-4 px-8 py-10 text-center">
              <h2 className="text-2xl font-bold">Ready to make your comeback?</h2>
              <p className="max-w-md text-sm text-dark-400">
                Join thousands turning intent into streaks. Free to start, no card required.
              </p>
              <Link href="/auth/register" className="btn-primary inline-flex items-center gap-2">
                Create your account <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ViewportFade>
        </main>
      </div>
    </div>
  );
}
