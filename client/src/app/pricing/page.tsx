'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Check, Sparkles, Zap, Infinity as InfinityIcon } from 'lucide-react';
import { AnimatedPage, FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/MotionComponents';
import toast from 'react-hot-toast';

type Billing = 'monthly' | 'yearly';

interface Plan {
  id: string;
  name: string;
  tagline: string;
  icon: typeof Crown;
  monthly: number;
  yearly: number;
  highlight?: boolean;
  features: string[];
  cta: string;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Starter',
    tagline: 'Everything you need to begin the comeback.',
    icon: Zap,
    monthly: 0,
    yearly: 0,
    features: [
      'Up to 3 active goals',
      'Daily task tracking',
      'Basic streaks & XP',
      'Community leaderboard',
    ],
    cta: 'Current plan',
  },
  {
    id: 'pro',
    name: 'Momentum',
    tagline: 'For people serious about consistency.',
    icon: Sparkles,
    monthly: 9,
    yearly: 90,
    highlight: true,
    features: [
      'Unlimited goals & tasks',
      'AI coach & personalized insights',
      'Advanced analytics & trends',
      'Custom branding',
      'Priority support',
    ],
    cta: 'Upgrade to Momentum',
  },
  {
    id: 'eternal',
    name: 'Eternal',
    tagline: 'Lifetime access. Never look back.',
    icon: InfinityIcon,
    monthly: 29,
    yearly: 290,
    features: [
      'Everything in Momentum',
      'Lifetime AI memory',
      'Early access to new features',
      'Exclusive Eternal badge',
      'Group coaching & adaptations',
    ],
    cta: 'Go Eternal',
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly');

  const handleSelect = (plan: Plan) => {
    if (plan.id === 'free') {
      toast('You are on the Starter plan.');
      return;
    }
    toast.success(`Checkout for ${plan.name} is coming soon.`);
  };

  return (
    <AnimatedPage>
      <FadeIn>
        <div className="mb-8 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/15 text-primary-300 text-xs font-medium mb-4">
            <Crown className="w-3.5 h-3.5" />
            Eternal Membership
          </div>
          <h1 className="page-header">Invest in your comeback</h1>
          <p className="page-subtitle mt-2">
            Choose the plan that keeps you consistent. Cancel anytime.
          </p>

          <div className="inline-flex items-center gap-1 mt-6 p-1 rounded-xl bg-dark-800/60 border border-dark-700">
            {(['monthly', 'yearly'] as Billing[]).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`relative px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  billing === b ? 'text-white' : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                {billing === b && (
                  <motion.span
                    layoutId="billing-pill"
                    className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 capitalize">
                  {b}
                  {b === 'yearly' && <span className="ml-1 text-xs opacity-80">(save ~17%)</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      </FadeIn>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const price = billing === 'monthly' ? plan.monthly : plan.yearly;
          const Icon = plan.icon;
          return (
            <StaggerItem key={plan.id}>
              <div
                className={`glass-card p-6 h-full flex flex-col relative ${
                  plan.highlight ? 'ring-2 ring-primary-500/60 shadow-lg shadow-primary-500/10' : ''
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-primary-500 to-accent-500 text-white text-xs font-semibold">
                    Most popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary-400" />
                  </div>
                  <h2 className="text-lg font-semibold">{plan.name}</h2>
                </div>
                <p className="text-sm text-dark-400 mb-5 min-h-[40px]">{plan.tagline}</p>

                <div className="mb-6">
                  <span className="text-4xl font-bold">${price}</span>
                  <span className="text-dark-400 text-sm">
                    {price === 0 ? ' forever' : billing === 'monthly' ? ' /mo' : ' /yr'}
                  </span>
                </div>

                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-dark-200">
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(plan)}
                  disabled={plan.id === 'free'}
                  className={`${plan.highlight ? 'btn-primary' : 'btn-secondary'} w-full justify-center ${
                    plan.id === 'free' ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      <FadeIn delay={0.2}>
        <p className="text-center text-xs text-dark-500 mt-10">
          Prices in USD. Payments are not yet enabled in this preview.
        </p>
      </FadeIn>
    </AnimatedPage>
  );
}
