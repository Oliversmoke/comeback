class OpenAIProvider {
  constructor() {
    this.name = 'openai';
  }

  async initialize() {
    const { default: OpenAI } = await import('openai');
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async chat(messages, options = {}) {
    const response = await this.client.chat.completions.create({
      model: options.model || 'gpt-4o-mini',
      messages,
      max_tokens: options.maxTokens || 500,
      temperature: options.temperature ?? 0.7,
    });
    return response.choices[0].message.content;
  }
}

class AnthropicProvider {
  constructor() {
    this.name = 'anthropic';
  }

  async initialize() {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async chat(messages, options = {}) {
    const systemMsg = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const response = await this.client.messages.create({
      model: options.model || 'claude-3-haiku-20240307',
      max_tokens: options.maxTokens || 500,
      system: systemMsg?.content,
      messages: userMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      temperature: options.temperature ?? 0.7,
    });
    return response.content[0].text;
  }
}

class GeminiProvider {
  constructor() {
    this.name = 'gemini';
    this.defaultModel = 'gemini-2.0-flash';
  }

  async initialize() {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.client.getGenerativeModel({ model: this.defaultModel });
  }

  async chat(messages, options = {}) {
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMsg = chatMessages[chatMessages.length - 1];
    if (!lastMsg) return '';

    const config = {
      generationConfig: {
        maxOutputTokens: options.maxTokens || 500,
        temperature: options.temperature ?? 0.7,
      },
    };

    if (systemMsg?.content) {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      config.systemInstruction = {
        role: 'system',
        parts: [{ text: systemMsg.content }],
      };
    }

    const chat = this.model.startChat({
      history,
      ...config,
    });

    const result = await chat.sendMessage(lastMsg.content);
    return result.response.text();
  }
}

class FallbackProvider {
  constructor() {
    this.name = 'fallback';
  }

  async initialize() {}

  _extractUserContext(messages) {
    const allText = messages.map((m) => m.content || '').join(' ');
    const nameMatch = allText.match(/(\w+), Level (\d+), (\d+) XP, (\d+)-day streak, (\d+) tasks completed/);
    const userMsg = messages[messages.length - 1]?.content || '';
    const msgMatch = userMsg.match(/User message:\s*(.+)/s);
    const cleanMessage = msgMatch?.[1]?.trim() || userMsg;
    return {
      username: nameMatch?.[1] || 'there',
      level: parseInt(nameMatch?.[2]) || 1,
      xp: parseInt(nameMatch?.[3]) || 0,
      streak: parseInt(nameMatch?.[4]) || 0,
      completedTasks: parseInt(nameMatch?.[5]) || 0,
      message: cleanMessage,
      goalCount: (allText.match(/"goal"/g) || []).length,
      taskCount: (allText.match(/"task"/g) || []).length,
    };
  }

  _pick(...items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  async chat(messages, options = {}) {
    const lastMsg = messages[messages.length - 1]?.content || '';
    const allText = messages.map((m) => m.content || '').join(' ');
    const ctx = this._extractUserContext(messages);

    // --- Task generation (structured JSON) ---
    if (allText.includes('SMART') && allText.includes('goalId')) {
      const goalMatch = lastMsg.match(/-\s*(.+?)\s*\(id:\s*([a-f0-9]+)/gi);
      const goals = [];
      if (goalMatch) {
        for (const m of goalMatch) {
          const parts = /-\s*(.+?)\s*\(id:\s*([a-f0-9]+)/i.exec(m);
          if (parts) goals.push({ title: parts[1].trim(), id: parts[2] });
        }
      }
      if (goals.length === 0) {
        const lines = lastMsg.split('\n').filter(l => l.startsWith('- ') && !l.includes('Recent Tasks'));
        for (const line of lines.slice(0, 5)) {
          const idMatch = line.match(/id:\s*([a-f0-9]+)/i);
          const titleMatch = line.match(/-\s*(.+?)\s*\(/);
          if (idMatch && titleMatch) goals.push({ title: titleMatch[1].trim(), id: idMatch[1] });
        }
      }
      if (goals.length > 0) {
        return JSON.stringify(goals.flatMap((g) => [
          { title: `Work on "${g.title}" — 25 min focus session`, description: `Dedicated focus session for your goal: ${g.title}`, estimatedMinutes: 25, difficulty: 'medium', category: 'productivity', goalId: g.id },
          { title: `Review progress on "${g.title}"`, description: `Spend 5 minutes reviewing what you accomplished for ${g.title}`, estimatedMinutes: 5, difficulty: 'easy', category: 'planning', goalId: g.id },
        ]));
      }
      return JSON.stringify([
        { title: 'Set a goal to unlock AI-generated tasks', description: 'Create your first goal in the Goals page', estimatedMinutes: 5, difficulty: 'easy', category: 'planning' },
      ]);
    }

    // --- Verification questions (structured JSON) ---
    if (allText.includes('verification coach') || allText.includes('verification questions')) {
      const taskMatch = lastMsg.match(/Task:\s*"(.+?)"/);
      const taskTitle = taskMatch ? taskMatch[1] : 'your task';
      return JSON.stringify([
        { question: `What specific steps did you take to complete "${taskTitle}"?` },
        { question: 'What did you learn or achieve by doing this task?' },
        { question: 'How does this task contribute to your overall goal?' },
      ]);
    }

    // --- Task proof evaluation (structured JSON) ---
    if (allText.includes('approved') && allText.includes('feedback') && (allText.includes('genuinely') || allText.includes('verifyTaskProof') || allText.includes('proof of completing'))) {
      return JSON.stringify({ approved: true, feedback: this._pick(
        'Great work! Your answers show you genuinely completed this task. Keep up the momentum!',
        'Nice one! You clearly put in the effort here. Way to go!',
        'Awesome, you really nailed this. Your answers show real ownership of the task.',
        'Solid work! It\'s clear from your answers that you gave this your full attention.',
      )});
    }

    // --- Insights (structured JSON) ---
    if (allText.includes('productivity data') || allText.includes('insight') && allText.includes('suggestion') && allText.includes('encouragement')) {
      const insightTemplates = [
        { insight: 'You tend to be most productive in the morning hours. Your completion rate jumps when you tackle tasks before noon.', suggestion: 'Try scheduling your most important task for the first hour of your day.', encouragement: `You're on a ${ctx.streak}-day streak! Consistency beats intensity every time.` },
        { insight: 'Your task completion drops on days with more than one high-priority task. You might be overloading yourself.', suggestion: 'Try limiting yourself to one major priority per day and see how that feels.', encouragement: `Level ${ctx.level} already with ${ctx.xp} XP — you're making real progress!` },
        { insight: 'You work best when tasks are connected to a specific goal. Tasks without goal links tend to sit unfinished.', suggestion: 'Link every new task to one of your active goals.', encouragement: `${ctx.completedTasks} tasks completed so far. Each one is a step in the right direction!` },
        { insight: 'Your streak suggests you\'ve built a solid daily habit. That\'s the hardest part.', suggestion: 'Now try increasing the difficulty slightly — add one more task or increase the time per session.', encouragement: `${ctx.streak} days and counting. You're building something real here.` },
        { insight: 'You tend to underestimate task time. That\'s okay — it means you\'re ambitious.', suggestion: 'Try adding 50% more time than you think a task will take. Future you will thank you.', encouragement: `You've completed ${ctx.completedTasks} tasks! That's ${ctx.completedTasks * 10}+ XP earned through pure effort.` },
      ];
      return JSON.stringify(this._pick(...insightTemplates));
    }

    // --- AI Coach chat (natural language) ---
    const msg = ctx.message.toLowerCase();

    // Greetings
    if (/^(hey|hi|hello|sup|yo|what'?s up|good (morning|afternoon|evening)|howdy)/i.test(ctx.message)) {
      return this._pick(
        `Hey ${ctx.username}! Good to see you. How's your day going? Anything you're looking to tackle?`,
        `Hey there! Ready to make today count? What's on your mind?`,
        `Hi ${ctx.username}! I'm here whenever you need me. What are we working on today?`,
        `Hey! Love seeing you here. How are things going?`,
      );
    }

    // How are you
    if (/how (are|'re|r) you/.test(msg) || /how'?s (it going|everything)/.test(msg)) {
      return this._pick(
        `I'm doing great, thanks for asking! More importantly — how are you doing? Ready to crush some goals today?`,
        `I'm great! Always happy to chat with you. What's been on your mind lately?`,
        `Doing well! Though I'm more interested in how YOU are. How's everything going on your end?`,
      );
    }

    // Productivity / motivation
    if (/(productivity|productive|motivat|focus)/.test(msg)) {
      if (ctx.streak > 0) {
        return this._pick(
          `You're already on a ${ctx.streak}-day streak, which tells me you've got the consistency part down. ${ctx.completedTasks > 10 ? `With ${ctx.completedTasks} tasks done, you're building serious momentum. ` : ''}Here's a trick: pick your hardest task and do it first thing. Future you will be grateful.`,
          `Productivity isn't about doing more — it's about doing what matters. You've got ${ctx.goalCount} active goal${ctx.goalCount > 1 ? 's' : ''} right now. Which one feels most important today? Start there.`,
          `${ctx.username}, you're already showing up with a ${ctx.streak}-day streak. That's huge. Now let's make those days count a little more. What does "a productive day" look like to you?`,
        );
      }
      return this._pick(
        `Getting productive starts with a single step. What's one thing you could do right now that would make you feel good about today?`,
        `The secret to productivity? Start small. Like, embarrassingly small. One task, five minutes. That's it. Give it a shot!`,
        `Being productive isn't about grinding all day. It's about doing the right things. What's the most important thing you need to get done?`,
      );
    }

    // Goals
    if (/goal/.test(msg)) {
      if (ctx.goalCount > 0) {
        return this._pick(
          `You've got ${ctx.goalCount} active goal${ctx.goalCount > 1 ? 's' : ''} right now. That's solid! How about breaking one of them into smaller steps? The smaller the step, the easier to start.`,
          `${ctx.goalCount} goal${ctx.goalCount > 1 ? 's' : ''} — nice! Which one feels most exciting to work on today? Sometimes just picking one is the hardest part.`,
          `I like that you've got ${ctx.goalCount} goal${ctx.goalCount > 1 ? 's' : ''} in progress. Just remember: progress > perfection. Even 1% better today counts.`,
        );
      }
      return this._pick(
        `I noticed you don't have any active goals yet. Want to create one? Even a small goal can give you direction.`,
        `Setting a goal gives your tasks a why. Want to brainstorm one together? What's something you'd like to achieve?`,
      );
    }

    // Streak 
    if (/streak|consistency|habit/.test(msg)) {
      if (ctx.streak >= 5) {
        return this._pick(
          `${ctx.streak} days! That's serious consistency. ${ctx.streak >= 10 ? 'Double digits — not everyone gets there. ' : ''}The key now is to keep the chain going without burning out. How are you feeling?`,
          `A ${ctx.streak}-day streak is something to be proud of. What's been working for you to stay consistent?`,
        );
      }
      return this._pick(
        `Streaks start with day one. You've got ${ctx.streak} day${ctx.streak > 1 ? 's' : ''} under your belt! The trick is to make it easy to keep going — even on days when you don't feel like it.`,
        `Every streak starts somewhere. You're at ${ctx.streak} day${ctx.streak > 1 ? 's' : ''}. Tomorrow, you'll be at ${ctx.streak + 1}. Just keep showing up.`,
      );
    }

    // Overwhelmed / stuck
    if (/(overwhelm|stuck|too much|stress|help|don'?t know|not sure|tired|burnout)/.test(msg)) {
      return this._pick(
        `Take a breath. You don't have to do everything today. Pick ONE thing — the smallest thing that feels manageable — and do that. That's a win.`,
        `I hear you. It's easy to get overwhelmed when everything feels urgent. Let's reset: what's the single most important thing you need to do?`,
        `You're not alone in feeling this way. The trick is to lower the bar for now. One small task. Five minutes. Go.`,
        `${ctx.username}, it's okay to take a step back. Rest is productive too. Maybe today is a "review and plan" day instead of a "do all the things" day.`,
      );
    }

    // Progress / growth / reflection
    if (/(progress|growth|improve|reflect|review|analyze|how (am|'m) I doing)/.test(msg)) {
      return this._pick(
        `Let's look at the numbers: Level ${ctx.level}, ${ctx.xp} XP, ${ctx.streak}-day streak, ${ctx.completedTasks} tasks done. That's real progress, ${ctx.username}. Where do you feel you've grown the most?`,
        `${ctx.xp} XP earned, ${ctx.completedTasks} tasks checked off. Every single one of those was you taking action. What's one thing you've learned about yourself lately?`,
        `Level ${ctx.level} with ${ctx.xp} XP — you're moving. The question isn't "am I making progress?" (you clearly are). It's "what's the next level look like for you?"`,
      );
    }

    // Thanks
    if (/thank(s| you)|thx|appreciate/.test(msg)) {
      return this._pick(
        `You're welcome! I'm here whenever you need me. Keep up the great work!`,
        `Anytime! That's what I'm here for. Now go crush your tasks!`,
        `My pleasure! Honestly, seeing you put in the work is all the thanks I need.`,
      );
    }

    // Default responses — natural and varied
    const defaults = [
      `That's a great question. Let me think about it from your perspective. You're at level ${ctx.level} with a ${ctx.streak}-day streak and ${ctx.completedTasks} tasks completed. What I'd say is: trust the process. You've already proven you can show up. Now it's about showing up for the right things. What feels most important to you right now?`,
      `I love where your head's at. Here's something that might help: the best predictor of future success is past consistency. And you've got ${ctx.streak} day${ctx.streak > 1 ? 's' : ''} of that already. Want to dig deeper into that?`,
      `Honestly? I think you're overthinking it — and that's okay, we all do it. Take a step back. What's one small thing you could do in the next 5 minutes that would move the needle?`,
      `Here's the thing about progress — it's rarely a straight line. You've got ${ctx.xp} XP and you're at level ${ctx.level}. That didn't happen by accident. Keep going, but don't forget to enjoy the journey too. What's been the best part so far?`,
      `I think the real question is: what do YOU want to get out of today? Not what you "should" do, but what would make today feel like a win for you? Start there.`,
      `${ctx.username}, you're doing better than you think. ${ctx.streak > 0 ? `A ${ctx.streak}-day streak doesn't lie — you've got the discipline. ` : ''}Now let's channel that into something meaningful. What matters most to you right now?`,
      `Great question! Let me flip it around: what would "a great day" look like for you? Not a perfect day, just a good one. Let's work backward from there.`,
    ];
    return this._pick(...defaults);
  }
}

const PROVIDER_MAP = {
  openai: OpenAIProvider,
  anthropic: AnthropicProvider,
  gemini: GeminiProvider,
  fallback: FallbackProvider,
};

let activeProvider = null;

export const getAIProvider = () => {
  if (activeProvider) return activeProvider;
  return null;
};

export const initializeAI = async () => {
  const preferredProvider = process.env.AI_PROVIDER || 'openai';
  const ProviderClass = PROVIDER_MAP[preferredProvider];

  if (!ProviderClass) {
    console.warn(`Unknown AI provider "${preferredProvider}", falling back to mock responses`);
    activeProvider = new FallbackProvider();
    await activeProvider.initialize();
    return activeProvider;
  }

  const apiKey = process.env[`${preferredProvider.toUpperCase()}_API_KEY`];
  if (!apiKey) {
    console.warn(`No API key found for "${preferredProvider}", using fallback provider`);
    activeProvider = new FallbackProvider();
    await activeProvider.initialize();
    return activeProvider;
  }

  try {
    activeProvider = new ProviderClass();
    await activeProvider.initialize();
    console.log(`AI provider initialized: ${preferredProvider}`);
    return activeProvider;
  } catch (error) {
    console.warn(`Failed to initialize "${preferredProvider}": ${error.message}. Using fallback.`);
    activeProvider = new FallbackProvider();
    await activeProvider.initialize();
    return activeProvider;
  }
};

export const chat = async (messages, options = {}) => {
  const provider = getAIProvider();
  if (!provider) {
    const fallback = new FallbackProvider();
    await fallback.initialize();
    return fallback.chat(messages, options);
  }
  return provider.chat(messages, options);
};
