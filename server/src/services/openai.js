import { chat } from './ai/providers.js';

const SYSTEM_PROMPTS = {
  coach: `You are a warm, human-like productivity coach inside a social productivity app. 
    You have a natural, conversational tone — like a supportive friend who also happens to be an expert.
    Analyze the user's goals, tasks, and progress to give personalized advice.
    Be encouraging, empathetic, and honest. Use casual, natural language (contractions, varied sentence length).
    Ask follow-up questions to keep the conversation flowing.
    Adapt your style to the user's context — celebrate wins, be gentle with setbacks, and challenge them to grow.
    Reference their specific goals, tasks, streak, and level when relevant.

    You use evidence-based psychology principles:
    1. Habit Formation: Small consistent actions build lasting habits.
    2. Growth Mindset: Praise effort, not outcome. Frame failures as learning.
    3. Implementation Intentions: Help users create if-then plans ("If X happens, then I will do Y").
    4. Self-Efficacy: Build confidence through mastery experiences and encouragement.
    5. Positive Reinforcement: Celebrate small wins and progress.
    6. Cognitive Reframing: Help users shift unhelpful perspectives.
    7. Burnout Prevention: Watch for overwork and recommend rest.
    8. Consistency Over Perfection: Regular imperfect action beats occasional perfect action.

    NEVER shame or manipulate. Always encourage autonomy and intrinsic motivation.`,

  taskGenerator: `Generate 1-2 specific daily tasks for EACH of the user's active goals.
    Tasks must be SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
    Adapt difficulty based on the user's completion rate and streak.
    If the user has a high completion rate, suggest slightly more challenging tasks.
    If the user is returning after a gap, suggest easier, confidence-building tasks.
    Return as JSON array with fields: title, description, estimatedMinutes, difficulty, category, goalId.
    Use the exact goalId provided for each task so it links to the correct goal.
    difficulty must be one of: "easy", "medium", "hard"`,

  insightGenerator: `Analyze the user's productivity data and generate:
    1. One key insight about their patterns
    2. One specific, actionable suggestion for improvement
    3. One encouragement based on their progress
    Return as JSON with fields: insight, suggestion, encouragement.
    Reference their specific data points (streak, level, completion rate, goal progress) when relevant.`,
};

export const generateDailyTasks = async (user, goals, recentTasks, memorySummary = null) => {
  const goalsSummary = goals.map((g) => `- ${g.title} (id: ${g._id}, ${g.status}, ${g.progress}% complete)`).join('\n');
  const tasksSummary = recentTasks.slice(-5).map((t) => `- ${t.title} (${t.status})`).join('\n');

  const adaptationNote = memorySummary ? `
Adaptation Notes:
- User's completion rate: ${memorySummary.patterns?.completionRate || 50}%
- Challenge preference: ${memorySummary.personality?.challengePreference || 'moderate'}
- Productivity pattern: ${memorySummary.personality?.productivityPattern || 'morning'}
- Burnout risk: ${memorySummary.personality?.burnoutRisk || 0}%
${memorySummary.topObstacles?.length ? `- Known obstacles to avoid: ${memorySummary.topObstacles.map(o => o.pattern).join(', ')}` : ''}
- Adjust difficulty based on completion rate (low rate = easier tasks, high rate = slightly harder tasks).
- If burnout risk is high, suggest fewer tasks with lower time estimates.
` : '';

  const messages = [
    { role: 'system', content: `Generate 1-2 specific daily tasks for EACH of the user's active goals.
Tasks must be SMART. Return as JSON array with fields: title, description, estimatedMinutes, difficulty, category, goalId.
Use the exact goalId provided for each task so it links to the correct goal.
difficulty must be one of: "easy", "medium", "hard"
Adapt task difficulty based on the user's recent performance and preferences.` },
    { role: 'user', content: `User: ${user.username}\nStreak: ${user.streak} days\nXP: ${user.xp}\nLevel: ${user.level}${adaptationNote}\nActive Goals:\n${goalsSummary || 'No active goals yet — suggest 3 starter tasks'}\n\nRecent Tasks:\n${tasksSummary || 'No recent tasks'}\n\nGenerate tasks.` },
  ];

  let response;
  try {
    response = await chat(messages, { maxTokens: 1000, temperature: 0.8 });
  } catch {
    console.warn('AI chat failed, using fallback task generation');
  }

  if (response) {
    try {
      const tasks = JSON.parse(response);
      if (Array.isArray(tasks)) return tasks;
    } catch {
      console.warn('Failed to parse AI response, using fallback tasks');
    }
  }

  return goals.length > 0 ? goals.map((g) => ({
    title: `Make progress on "${g.title}"`,
    description: `Spend 20 minutes advancing your goal: ${g.title}`,
    estimatedMinutes: 20,
    difficulty: 'medium',
    category: g.category || 'productivity',
    goalId: g._id.toString(),
  })) : [{
    title: 'Set your first goal to get started',
    description: 'Create a goal in the Goals page to start getting AI-generated tasks',
    estimatedMinutes: 5,
    difficulty: 'easy',
    category: 'planning',
  }];
};

export const generateInsights = async (user, goals, tasks, groupData, memorySummary = null) => {
  const adaptationNote = memorySummary ? `
User Memory Profile:
- Consistency score: ${memorySummary.patterns?.completionRate || 50}%
- Peak hours: ${(memorySummary.patterns?.peakHours || []).join(', ') || 'not identified'}
- Known obstacles: ${(memorySummary.topObstacles || []).map(o => o.pattern).join(', ') || 'none recorded'}
- Recent wins: ${(memorySummary.recentWins || []).map(w => w.description).join('; ') || 'none recorded'}
- Burnout risk: ${memorySummary.personality?.burnoutRisk || 0}%
` : '';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.insightGenerator },
    { role: 'user', content: `User: ${user.username}\nLevel: ${user.level}\nXP: ${user.xp}\nStreak: ${user.streak} days\nCompleted tasks: ${user.completedTasks}\n\nActive Goals: ${goals.length}\nPending Tasks: ${tasks.filter((t) => t.status === 'pending').length}\nCompleted Today: ${tasks.filter((t) => t.status === 'completed' && new Date(t.updatedAt).toDateString() === new Date().toDateString()).length}\n\nMember of ${groupData?.groupCount || 0} groups.${adaptationNote}` },
  ];

  let response;
  try {
    response = await chat(messages, { maxTokens: 300, temperature: 0.7 });
  } catch {
    console.warn('AI insight chat failed, using fallback');
  }

  if (response) {
    try {
      return JSON.parse(response);
    } catch {
      console.warn('Failed to parse insight response, using fallback');
    }
  }

  return {
    insight: 'Consistency is your superpower. Keep showing up every day.',
    suggestion: 'Try breaking larger goals into smaller daily actions.',
    encouragement: `You're doing great! Every task completed is a step toward your goals.`,
  };
};

export const adaptTasksForGroup = async (group, members, goals) => {
  const messages = [
    { role: 'system', content: `You are a group productivity coach. Analyze the group's collective progress and suggest adaptive tasks. Focus on collaboration and mutual growth.` },
    { role: 'user', content: `Group: ${group.name}\nMembers: ${members.length}\nTotal XP: ${group.totalXp}\nStreak: ${group.streak}\n\nMember Goals: ${goals.slice(0, 10).map((g) => g.title).join(', ')}\n\nSuggest 2 collaborative tasks.` },
  ];

  try {
    const response = await chat(messages, { maxTokens: 300, temperature: 0.8 });
    if (response) return response;
  } catch {
    console.warn('AI group task adaptation failed, using fallback');
  }
  return 'Consider setting a group challenge to boost collective progress!';
};

export const generateReviewQuestions = async (task, goal) => {
  const messages = [
    { role: 'system', content: `You are a task verification coach. The user says they completed a task.
Ask 2-3 specific questions to verify they actually did it. Questions must be specific to the task and goal.
Return as JSON array: [{ "question": "..." }]` },
    { role: 'user', content: `Task: "${task.title}"\nDescription: ${task.description || 'N/A'}\nGoal: ${goal ? goal.title : 'No goal'}\n\nGenerate verification questions.` },
  ];
  let response;
  try {
    response = await chat(messages, { maxTokens: 300, temperature: 0.7 });
  } catch {
    console.warn('AI review question generation failed, using fallback');
  }
  if (response) {
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      console.warn('Failed to parse review questions, using fallback');
    }
  }
  return [
    { question: `What did you accomplish for "${task.title}"? Describe the key steps you took.` },
    { question: 'What was the most challenging part and how did you overcome it?' },
    { question: 'What will you do differently next time to improve?' },
  ];
};

export const verifyTaskProof = async (task, goal, answers) => {
  const answersText = answers.map((a, i) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
  const messages = [
    { role: 'system', content: `You are a task verification coach. Evaluate the user's proof of completing a task.
Decide if they genuinely completed it based on their answers. Reply with JSON: { "approved": boolean, "feedback": "string" }` },
    { role: 'user', content: `Task: "${task.title}"\nGoal: ${goal ? goal.title : 'N/A'}\n\nUser's answers:\n${answersText}\n\nEvaluate and respond with JSON.` },
  ];
  let response;
  try {
    response = await chat(messages, { maxTokens: 200, temperature: 0.5 });
  } catch {
    console.warn('AI task verification failed, using fallback');
  }
  if (response) {
    try {
      return JSON.parse(response);
    } catch {
      console.warn('Failed to parse verification response, using fallback');
    }
  }
  return { approved: true, feedback: 'Thanks for sharing! Your task has been completed.' };
};

export const chatWithCoach = async (user, message, context = {}) => {
  const cleanContext = {
    goals: (context.goals || []).map((g) => ({ title: g.title, category: g.category, progress: g.progress, status: g.status })),
    tasks: (context.tasks || []).map((t) => ({ title: t.title, status: t.status, priority: t.priority })),
    groupProgress: context.groupProgress || null,
  };

  const memorySection = context.memorySummary ? `
Memory Profile:
- Preferred coaching style: ${context.memorySummary.coachingStyle?.preferredTone || 'encouraging'}
- Challenge preference: ${context.memorySummary.personality?.challengePreference || 'moderate'}
- Productivity pattern: ${context.memorySummary.personality?.productivityPattern || 'morning'} person
- Consistency score: ${context.memorySummary.patterns?.completionRate || 50}%
- Peak productivity hours: ${(context.memorySummary.patterns?.peakHours || []).join(', ') || 'not yet identified'}
- Common topics discussed: ${(context.memorySummary.patterns?.commonTopics || []).map(t => t.topic).join(', ') || 'various'}
${context.memorySummary.topObstacles?.length ? `- Known obstacles: ${context.memorySummary.topObstacles.map(o => o.pattern).join(', ')}` : ''}
${context.memorySummary.recentWins?.length ? `- Recent wins: ${context.memorySummary.recentWins.map(w => w.description).join('; ')}` : ''}
` : '';

  const profileSection = `User profile: ${user.username}, Level ${user.level}, ${user.xp} XP, ${user.streak}-day streak, ${user.completedTasks} tasks completed.`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.coach },
    { role: 'user', content: `${profileSection}${memorySection}\nContext: ${JSON.stringify(cleanContext)}\n\nUser message: ${message}` },
  ];

  try {
    const response = await chat(messages, { maxTokens: 500, temperature: 0.8 });
    if (response) return response;
  } catch {
    console.warn('AI coach chat failed, using fallback');
  }
  return `Hey ${user.username}! I'm here to help, but I'm having trouble connecting right now. Could you try again in a moment?`;
};
