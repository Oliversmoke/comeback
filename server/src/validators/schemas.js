import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must contain uppercase, lowercase, and number'),
  displayName: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const goalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  category: z.enum(['fitness', 'learning', 'career', 'finance', 'health', 'social', 'creative', 'productivity', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  targetDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  milestones: z.array(z.object({
    title: z.string().min(1),
    isCompleted: z.boolean().optional(),
  })).optional(),
});

export const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['fitness', 'learning', 'career', 'finance', 'health', 'social', 'creative', 'productivity', 'other']).optional(),
  isPrivate: z.boolean().optional(),
  maxMembers: z.number().int().min(2).max(200).optional(),
  rules: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(300),
  description: z.string().optional(),
  goalId: z.string().optional(),
  groupId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
  scheduledDate: z.string().datetime().optional(),
  xpReward: z.number().int().min(0).optional(),
});

export const messageSchema = z.object({
  content: z.string().min(1).max(2000),
  messageType: z.enum(['text', 'image', 'system', 'task_completed', 'milestone_reached', 'ai_insight']).optional(),
});

export const aiPromptSchema = z.object({
  prompt: z.string().min(1).max(2000),
  context: z.object({
    goals: z.array(z.any()).optional(),
    tasks: z.array(z.any()).optional(),
    groupProgress: z.any().optional(),
  }).optional(),
});

export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.validatedBody = parsed;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    next(error);
  }
};
