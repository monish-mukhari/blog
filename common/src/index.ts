import z from 'zod';

const difficulty = z.enum(['beginner', 'intermediate', 'advanced']);
const quizQuestion = z
  .object({
    question: z.string().trim().min(5).max(300),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
    correctIndex: z.number().int().min(0).max(5),
    explanation: z.string().trim().max(500).optional()
  })
  .refine((question) => question.correctIndex < question.options.length, {
    message: 'The correct answer must reference an available option.',
    path: ['correctIndex']
  });

const learningFields = {
  learningOutcomes: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  prerequisites: z.array(z.string().trim().min(1).max(200)).max(10).optional(),
  difficulty: difficulty.optional().nullable(),
  references: z.array(z.string().trim().url().max(2000)).max(20).optional(),
  lastReviewedAt: z.string().datetime().optional().nullable(),
  seriesId: z.string().uuid().optional().nullable(),
  seriesOrder: z.number().int().positive().max(1000).optional().nullable(),
  quizQuestions: z.array(quizQuestion).max(20).optional()
};

export const signupInput = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

export const signinInput = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const createBlogInput = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(20).max(50000),
  contentFormat: z.enum(['markdown']).default('markdown'),
  excerpt: z.string().trim().max(280).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(3).optional(),
  coverImageUrl: z.string().url().max(2000).optional().or(z.literal('')),
  coverImageAlt: z.string().trim().max(200).optional(),
  ...learningFields
});

export const updateBlogInput = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(20).max(50000),
  contentFormat: z.enum(['markdown']).default('markdown'),
  excerpt: z.string().trim().max(280).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(3).optional(),
  coverImageUrl: z.string().url().max(2000).optional().or(z.literal('')),
  coverImageAlt: z.string().trim().max(200).optional(),
  id: z.string(),
  ...learningFields
});

export const draftBlogInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(160),
  content: z.string().max(50000),
  contentFormat: z.enum(['markdown']).default('markdown'),
  excerpt: z.string().max(280).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(3).optional(),
  coverImageUrl: z.string().url().max(2000).optional().or(z.literal('')),
  coverImageAlt: z.string().trim().max(200).optional(),
  ...learningFields
});

export const scheduleBlogInput = z.object({
  scheduledAt: z.string().datetime()
});

export const mediaUploadInput = z.object({
  dataUrl: z.string().max(5_000_000),
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
  alt: z.string().trim().min(1).max(200)
});

export const profileInput = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,30}$/),
  name: z.string().trim().min(1).max(80),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().max(2000).optional().or(z.literal('')),
  website: z.string().url().max(2000).optional().or(z.literal('')),
  location: z.string().trim().max(100).optional(),
  digestFrequency: z.enum(['off', 'daily', 'weekly'])
});

export const seriesInput = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional()
});

export const progressInput = z.object({ progress: z.number().min(0).max(1) });
export const readerNoteInput = z.object({
  quote: z.string().trim().max(1000).optional(),
  note: z.string().trim().min(1).max(2000),
  color: z.enum(['yellow', 'blue', 'green', 'pink']).default('yellow')
});
export const quizAttemptInput = z.object({ answer: z.number().int().min(0).max(5) });
export const commentInput = z.object({
  body: z.string().trim().min(1).max(3000),
  parentId: z.string().uuid().optional()
});
export const reportInput = z.object({
  postId: z.string().uuid().optional(),
  commentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  reason: z.enum(['spam', 'harassment', 'misinformation', 'copyright', 'other']),
  details: z.string().trim().max(1000).optional()
});

export type UpdateBlogInput = z.infer<typeof updateBlogInput>;
export type CreateBlogInput = z.infer<typeof createBlogInput>;
export type SigninInput = z.infer<typeof signinInput>;
export type SignupInput = z.infer<typeof signupInput>;
export type DraftBlogInput = z.infer<typeof draftBlogInput>;
export type ScheduleBlogInput = z.infer<typeof scheduleBlogInput>;
export type MediaUploadInput = z.infer<typeof mediaUploadInput>;
export type ProfileInput = z.infer<typeof profileInput>;
