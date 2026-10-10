import z from 'zod';

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
  excerpt: z.string().trim().max(280).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(3).optional()
});

export const updateBlogInput = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(20).max(50000),
  excerpt: z.string().trim().max(280).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(3).optional(),
  id: z.string()
});

export const draftBlogInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(160),
  content: z.string().max(50000),
  excerpt: z.string().max(280).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(3).optional()
});

export type UpdateBlogInput = z.infer<typeof updateBlogInput>;
export type CreateBlogInput = z.infer<typeof createBlogInput>;
export type SigninInput = z.infer<typeof signinInput>;
export type SignupInput = z.infer<typeof signupInput>;
export type DraftBlogInput = z.infer<typeof draftBlogInput>;
