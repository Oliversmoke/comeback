const PRINCIPLES = {
  habitFormation: {
    name: 'Habit Formation',
    description: 'Small consistent actions build neural pathways over ~21-66 days',
    techniques: ['habit_stacking', 'implementation_intention', 'minimum_viable_action', 'environment_design'],
  },
  goalSetting: {
    name: 'Goal Setting Theory',
    description: 'Specific, challenging goals with feedback produce higher performance',
    techniques: ['smart_criteria', 'subgoal_breakdown', 'public_commitment', 'progress_tracking'],
  },
  positiveReinforcement: {
    name: 'Positive Reinforcement',
    description: 'Rewarding desired behaviors increases their frequency',
    techniques: ['immediate_reward', 'streak_celebration', 'milestone_recognition', 'social_praise'],
  },
  growthMindset: {
    name: 'Growth Mindset',
    description: 'Believing abilities can develop through effort and learning',
    techniques: ['effort_praise', 'reframe_failure', 'yet_reframing', 'learning_orientation'],
  },
  selfEfficacy: {
    name: 'Self-Efficacy',
    description: 'Belief in one\'s ability to succeed in specific situations',
    techniques: ['mastery_experiences', 'vicarious_learning', 'verbal_persuasion', 'emotional_arousal'],
  },
  cognitiveReframing: {
    name: 'Cognitive Reframing',
    description: 'Identifying and challenging unhelpful thought patterns',
    techniques: ['thought_records', 'perspective_shifting', 'evidence_checking', 'alternative_narratives'],
  },
  implementationIntentions: {
    name: 'Implementation Intentions',
    description: 'If-then plans that automate decision-making in specific situations',
    techniques: ['if_then_planning', 'cue_identification', 'action_triggers', 'context_binding'],
  },
  intrinsicMotivation: {
    name: 'Intrinsic Motivation',
    description: 'Motivation driven by internal rewards like enjoyment and meaning',
    techniques: ['autonomy_support', 'competence_building', 'relatedness', 'purpose_connection'],
  },
  reflectionAndJournaling: {
    name: 'Reflection & Journaling',
    description: 'Structured self-reflection to process experiences and extract learnings',
    techniques: ['daily_reflection', 'weekly_review', 'gratitude_practice', 'lesson_extraction'],
  },
  adaptiveEncouragement: {
    name: 'Adaptive Encouragement',
    description: 'Matching support style to user\'s current state and history',
    techniques: ['tone_matching', 'struggle_recognition', 'effort_acknowledgment', 'hope_instillation'],
  },
  burnoutPrevention: {
    name: 'Burnout Prevention',
    description: 'Recognizing and preventing chronic physical and emotional exhaustion',
    techniques: ['energy_audit', 'rest_scheduling', 'boundary_setting', 'load_reduction'],
  },
  consistencyOverPerfection: {
    name: 'Consistency Over Perfection',
    description: 'Regular imperfect action beats occasional perfect action',
    techniques: ['streak_focus', 'forgiveness_framework', 'reset_normalization', 'partial_credit'],
  },
};

const ENCOURAGEMENT_TEMPLATES = {
  streakMilestone: [
    '{days}-day streak! That\'s {description}. Every day builds momentum.',
    'You\'ve been consistent for {days} days. This is how habits become automatic.',
    'A {days}-day streak means you\'ve shown up for yourself repeatedly. That matters.',
  ],
  taskCompletion: [
    'Task completed! Each finished task is proof that you\'re moving forward.',
    'Done is better than perfect. Another task checked off the list.',
    'You completed "{task}". Small wins compound into extraordinary results.',
  ],
  goalProgress: [
    'You\'re {progress}% toward your goal. Keep going, the results are building.',
    'Progress is progress, no matter how small. You\'re {progress}% there.',
    'Look how far you\'ve come — {progress}% of the way to "{goal}".',
  ],
  recoveryAfterMiss: [
    'A missed day doesn\'t erase progress. What matters is that you\'re back today.',
    'Reset is part of the process. One day off doesn\'t break a habit.',
    'You\'re here now, and that\'s what counts. Every restart builds resilience.',
  ],
  burnoutWarning: [
    'I notice you\'ve been pushing hard. Remember that rest is productive too.',
    'Your consistency is impressive, but even elite athletes schedule rest days.',
    'Taking care of yourself isn\'t a distraction from your goals — it\'s how you reach them.',
  ],
};

const REFLECTION_PROMPTS = {
  daily: [
    'What went well today?',
    'What challenged you today?',
    'What did you learn about yourself?',
    'What would make tomorrow a success?',
    'What\'s one thing you\'re grateful for today?',
    'Did you work on something that matters to you?',
    'What energy level did you have today, and how did it affect your tasks?',
  ],
  weekly: [
    'What were your biggest wins this week?',
    'What obstacles came up and how did you handle them?',
    'Are you moving toward your most important goals?',
    'What would you do differently next week?',
    'What are you most proud of this week?',
    'Did you maintain balance between productivity and rest?',
    'What\'s one thing you learned this week?',
  ],
  goalReview: [
    'Why is this goal important to you?',
    'What progress have you made since setting this goal?',
    'What\'s the next small step you can take?',
    'What\'s been the hardest part of working toward this goal?',
    'How will you feel when you achieve this goal?',
  ],
};

const CHALLENGE_TEMPLATES = [
  {
    name: 'Consistency Challenge',
    description: 'Complete at least one task every day for 7 days',
    duration: 7,
    xpReward: 200,
    type: 'streak',
  },
  {
    name: 'Productivity Sprint',
    description: 'Complete 10 tasks in 3 days',
    duration: 3,
    xpReward: 150,
    type: 'volume',
  },
  {
    name: 'Category Focus',
    description: 'Complete 5 tasks in your chosen category this week',
    duration: 7,
    xpReward: 175,
    type: 'category',
  },
  {
    name: 'Early Bird Challenge',
    description: 'Complete a task before 9 AM for 5 consecutive days',
    duration: 5,
    xpReward: 250,
    type: 'time_based',
  },
  {
    name: 'Weekend Warrior',
    description: 'Complete 8 tasks over the weekend',
    duration: 2,
    xpReward: 300,
    type: 'volume',
  },
  {
    name: 'Recovery Challenge',
    description: 'Return and complete 3 tasks after a missed day',
    duration: 2,
    xpReward: 100,
    type: 'recovery',
  },
  {
    name: 'Group Synergy',
    description: 'Participate in group discussions and complete 2 shared tasks',
    duration: 5,
    xpReward: 200,
    type: 'social',
  },
];

const RECOVERY_STRATEGIES = [
  {
    name: 'Minimum Viable Day',
    description: 'Commit to just ONE small task today. That\'s the only requirement.',
    details: 'Pick the easiest, most important task. Do only that. Anything extra is a bonus.',
  },
  {
    name: 'Fresh Start Reset',
    description: 'Acknowledge the gap, forgive yourself, and start fresh.',
    details: 'Write down what interrupted your routine. Release judgment. Choose one action to restart.',
  },
  {
    name: 'Anchor Habit Recovery',
    description: 'Re-establish one core habit that supports everything else.',
    details: 'Identify the keystone habit that makes other habits easier. Focus on just that one.',
  },
  {
    name: 'Social Reconnect',
    description: 'Share your restart with a group or accountability partner.',
    details: 'Announcing your comeback creates commitment and support. Others are cheering for you.',
  },
  {
    name: 'Environment Reset',
    description: 'Change your workspace or tools to make starting easier.',
    details: 'Sometimes a small environmental change reduces the friction of restarting.',
  },
  {
    name: 'Why Refresh',
    description: 'Reconnect with why you started this goal in the first place.',
    details: 'Read your original goal description. Remember the feeling behind it. Let that pull you forward.',
  },
];

export function getPsychologyPrinciple(name) {
  return PRINCIPLES[name] || null;
}

export function getAllPrinciples() {
  return PRINCIPLES;
}

export function getEncouragement(type, replacements = {}) {
  const templates = ENCOURAGEMENT_TEMPLATES[type];
  if (!templates || !templates.length) return 'You\'re doing great. Keep going!';
  const template = templates[Math.floor(Math.random() * templates.length)];
  let message = template;
  for (const [key, value] of Object.entries(replacements)) {
    message = message.replace(`{${key}}`, value);
  }
  return message;
}

export function getReflectionPrompt(type, index = -1) {
  const prompts = REFLECTION_PROMPTS[type];
  if (!prompts || !prompts.length) return 'How are you feeling about your progress?';
  if (index >= 0 && index < prompts.length) return prompts[index];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

export function getRecoveryStrategy() {
  return RECOVERY_STRATEGIES[Math.floor(Math.random() * RECOVERY_STRATEGIES.length)];
}

export function generateChallenge(userPreference) {
  let pool = CHALLENGE_TEMPLATES;

  if (userPreference === 'streak') {
    pool = CHALLENGE_TEMPLATES.filter(c => c.type === 'streak');
  } else if (userPreference === 'volume') {
    pool = CHALLENGE_TEMPLATES.filter(c => c.type === 'volume');
  }

  if (!pool.length) pool = CHALLENGE_TEMPLATES;

  const challenge = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...challenge,
    xpReward: challenge.xpReward + Math.floor(Math.random() * 50),
  };
}

export function generateRecoveryPlan(user, daysMissed) {
  const severity = daysMissed <= 3 ? 'mild' : daysMissed <= 7 ? 'moderate' : 'significant';

  const plan = {
    severity,
    daysMissed,
    message: '',
    recommendations: [],
    firstStep: '',
    encouragement: '',
  };

  if (severity === 'mild') {
    plan.message = 'A few days off is completely normal. You\'re still in the habit zone.';
    plan.recommendations = [
      'Complete one task today to re-establish momentum',
      'Review what caused the gap and note it for next time',
      'Resume your normal schedule tomorrow',
    ];
    plan.firstStep = 'Pick the task you\'re most excited about and do it now.';
    plan.encouragement = getEncouragement('recoveryAfterMiss');
  } else if (severity === 'moderate') {
    plan.message = 'A week off happens to everyone. The key is how you return.';
    plan.recommendations = [
      'Start with 50% of your usual daily task load',
      'Use the "Minimum Viable Day" approach',
      'Re-read your goal descriptions to reconnect with purpose',
      'Set a 3-day consistency mini-challenge',
    ];
    plan.firstStep = 'Do one small task right now. Even 5 minutes counts.';
    plan.encouragement = getEncouragement('recoveryAfterMiss');
  } else {
    plan.message = 'It\'s been a while, and that\'s okay. You can always restart.';
    plan.recommendations = [
      'Don\'t try to catch up — start fresh from today',
      'Re-commit to one goal instead of all of them',
      'Consider if your goals still align with what you want',
      'Use the "Why Refresh" strategy',
      'Set a 7-day consistency challenge at a comfortable pace',
    ];
    plan.firstStep = 'Write down one reason you originally started. Let that be your first task.';
    plan.encouragement = 'Starting again after a long break takes courage. That courage is already progress.';
  }

  return plan;
}

export function generateReframingSuggestion(obstacle) {
  const reframes = {
    procrastination: {
      old: 'I\'m lazy for putting this off',
      new: 'I\'m waiting for the right conditions. Let me create them.',
      technique: 'Breaking the task into a 2-minute start.',
    },
    perfectionism: {
      old: 'If it\'s not perfect, it\'s not worth doing',
      new: 'Done is better than perfect. I can improve later.',
      technique: 'Setting a timer and accepting "good enough" for now.',
    },
    overwhelm: {
      old: 'There\'s too much to do, I don\'t know where to start',
      new: 'I only need to focus on the next single step.',
      technique: 'Pick ONE task. Ignore everything else until it\'s done.',
    },
    comparison: {
      old: 'Others are so far ahead of me',
      new: 'I\'m on my own journey. My only competition is yesterday\'s me.',
      technique: 'Track your own progress, not others\'. You\'re further than you were.',
    },
    allOrNothing: {
      old: 'If I can\'t do it perfectly, why bother at all',
      new: 'Partial progress is still progress. Something beats nothing.',
      technique: 'The 50% rule: half effort is infinitely better than zero effort.',
    },
    lostMotivation: {
      old: 'I\'ve lost motivation, I must not really want this',
      new: 'Motivation follows action, not the other way around.',
      technique: 'Take one tiny step. Motivation will catch up.',
    },
  };

  return reframes[obstacle] || null;
}

export function generateImplementationIntention(goalTitle, obstacle) {
  const patterns = {
    energy: { cue: 'When I feel low energy', action: 'I will do a 5-minute version of my task' },
    distraction: { cue: 'When I get distracted by my phone', action: 'I will put it in another room and work for 10 minutes' },
    procrastination: { cue: 'When I feel like putting this off', action: 'I will start with just 2 minutes' },
    overwhelm: { cue: 'When I feel overwhelmed by the size of this task', action: 'I will identify and do just the next single step' },
    morning: { cue: 'When I finish my morning coffee', action: 'I will open my task list and start my most important task' },
    evening: { cue: 'When I finish dinner', action: 'I will spend 15 minutes reviewing tomorrow\'s priorities' },
  };

  const matched = Object.values(patterns)[Math.floor(Math.random() * Object.keys(patterns).length)];
  return {
    type: 'implementation_intention',
    cue: matched.cue,
    action: matched.action,
    fullStatement: `${matched.cue}, ${matched.action} to make progress on "${goalTitle}".`,
    principle: 'Implementation Intentions — automating decisions to reduce friction.',
  };
}

export function generateBurnoutPrevention(user, memory) {
  const burnoutRisk = memory?.personalityProfile?.burnoutRisk || 0;
  const completionRate = memory?.progressTracking?.averageCompletionRate || 50;
  const recentActivity = memory?.interactionCount || 0;

  const suggestions = [];
  const warnings = [];

  if (burnoutRisk > 60) {
    warnings.push({
      level: burnoutRisk > 80 ? 'high' : 'moderate',
      message: burnoutRisk > 80
        ? 'Your activity patterns suggest significant burnout risk. Consider a structured recovery period.'
        : 'Early signs of burnout detected. Preventative measures are recommended.',
    });
    suggestions.push(
      'Schedule at least one complete rest day this week',
      'Reduce daily task count by 50% for 3 days',
      'Add a 10-minute mindfulness or breathing break to your routine',
      'Review your goals — are there any you can pause or delegate?'
    );
  }

  if (completionRate < 40 && recentActivity > 10) {
    suggestions.push(
      'Scale back to 1-2 essential tasks per day',
      'Try the "Minimum Viable Day" approach — do just one thing',
      'Separate "must do" from "nice to do" tasks',
      'Celebrate small completions instead of focusing on what\'s left'
    );
  }

  return {
    burnoutRisk: { level: burnoutRisk, category: burnoutRisk > 80 ? 'critical' : burnoutRisk > 60 ? 'elevated' : 'normal' },
    warnings,
    suggestions: suggestions.slice(0, 4),
    principle: 'Burnout Prevention — recognizing limits prevents chronic exhaustion.',
  };
}

export function generateGrowthMindsetPrompt(obstaclePattern) {
  const prompts = [
    {
      trigger: 'failure',
      reframe: 'This didn\'t work, and that\'s data. What can I learn from this attempt?',
      principle: 'Failure is not the opposite of success — it\'s part of success.',
    },
    {
      trigger: 'difficulty',
      reframe: 'This is hard because I\'m growing. If it were easy, I wouldn\'t be improving.',
      principle: 'The struggle is where the growth happens.',
    },
    {
      trigger: 'comparison',
      reframe: 'I\'m comparing my chapter 1 to someone else\'s chapter 20. My only competition is who I was yesterday.',
      principle: 'Your journey is unique — focus on your own progress.',
    },
    {
      trigger: 'setback',
      reframe: 'A setback is a setup for a comeback. What one thing can I do right now to move forward?',
      principle: 'Setbacks are temporary; quitting is permanent.',
    },
    {
      trigger: 'stuck',
      reframe: 'Being stuck means I\'ve hit my current limit — which means I\'m about to break through to a new level.',
      principle: 'Plateaus precede breakthroughs.',
    },
  ];

  if (obstaclePattern) {
    const match = prompts.find(p => obstaclePattern.toLowerCase().includes(p.trigger));
    if (match) return match;
  }

  return prompts[Math.floor(Math.random() * prompts.length)];
}

export function generateConsistencyPlan(user, memory) {
  const streak = user?.streak || 0;
  const completionRate = memory?.progressTracking?.averageCompletionRate || 50;

  let plan;
  if (streak === 0) {
    plan = {
      title: 'Getting Started',
      focus: 'Build the anchor habit',
      steps: [
        'Choose ONE habit you want to build',
        'Commit to doing it for just 2 minutes a day',
        'Attach it to an existing routine (habit stacking)',
        'Track it daily — even if you only do the minimum',
      ],
      principle: 'Habit Formation — small consistent actions build neural pathways over ~21-66 days.',
      mantra: 'Start so small it feels ridiculous. Consistency first, intensity later.',
    };
  } else if (streak < 7) {
    plan = {
      title: 'Early Momentum',
      focus: 'Protect the streak',
      steps: [
        'Your streak is your most valuable asset — protect it above all else',
        'If you\'re short on time, do the minimum viable version of your habit',
        'Never miss twice — one missed day is a reset, two is a pattern',
        'Celebrate each day you add to the streak',
      ],
      principle: 'Consistency Over Perfection — regular imperfect action beats occasional perfect action.',
      mantra: 'Never miss twice. One day off is recovery; two days off is a new beginning.',
    };
  } else if (streak < 30) {
    plan = {
      title: 'Building Momentum',
      focus: 'Increase capacity gradually',
      steps: [
        `Your ${streak}-day streak shows you can be consistent. Now let's build on it.`,
        'Gradually increase difficulty — add 5 more minutes or one more task',
        'Identify your peak productivity hours and schedule important work then',
        `Set a 30-day streak goal — you're ${Math.round((streak / 30) * 100)}% there`,
      ],
      principle: 'Self-Efficacy — building confidence through mastery experiences.',
      mantra: 'You\'ve proven you can show up. Now let\'s prove you can grow.',
    };
  } else {
    plan = {
      title: 'Sustainable Excellence',
      focus: 'Avoid burnout while maintaining consistency',
      steps: [
        `A ${streak}-day streak is exceptional. Your identity has shifted — you're someone who shows up.`,
        'Watch for burnout signs — sustainable pace beats maximum effort',
        'Refine your process rather than pushing harder',
        'Share your strategies with others — teaching reinforces learning',
      ],
      principle: 'Intrinsic Motivation — motivation driven by internal rewards like enjoyment and meaning.',
      mantra: 'You\'ve become the person who doesn\'t stop. Now enjoy the journey.',
    };
  }

  return plan;
}
