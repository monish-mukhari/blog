import type { Database } from './db';

const revisionData = (post: {
  title: string;
  content: string;
  contentFormat: string;
  excerpt: string | null;
  tags: string[];
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  learningOutcomes: string[];
  prerequisites: string[];
  difficulty: string | null;
  references: string[];
  lastReviewedAt: Date | null;
  seriesId: string | null;
  seriesOrder: number | null;
}) => ({
  title: post.title,
  content: post.content,
  contentFormat: post.contentFormat,
  excerpt: post.excerpt,
  tags: post.tags,
  coverImageUrl: post.coverImageUrl,
  coverImageAlt: post.coverImageAlt,
  learningOutcomes: post.learningOutcomes,
  prerequisites: post.prerequisites,
  difficulty: post.difficulty,
  references: post.references,
  lastReviewedAt: post.lastReviewedAt,
  seriesId: post.seriesId,
  seriesOrder: post.seriesOrder
});

export const saveRevision = async (
  prisma: Database,
  post: Parameters<typeof revisionData>[0] & { id: string }
) =>
  prisma.postRevision.create({
    data: { postId: post.id, ...revisionData(post) }
  });

export const publishDraft = async (prisma: Database, draftId: string, authorId: string) => {
  const draft = await prisma.post.findFirst({
    where: { id: draftId, authorId, published: false },
    include: { sourcePost: true }
  });
  if (!draft) return null;

  const now = new Date();
  if (draft.sourcePost) {
    const questions = await prisma.quizQuestion.findMany({
      where: { postId: draft.id },
      orderBy: { position: 'asc' }
    });
    await saveRevision(prisma, draft.sourcePost);
    const source = await prisma.post.update({
      where: { id: draft.sourcePost.id },
      data: {
        title: draft.title.trim(),
        content: draft.content.trim(),
        contentFormat: draft.contentFormat,
        excerpt: draft.excerpt,
        tags: draft.tags,
        coverImageUrl: draft.coverImageUrl,
        coverImageAlt: draft.coverImageAlt,
        learningOutcomes: draft.learningOutcomes,
        prerequisites: draft.prerequisites,
        difficulty: draft.difficulty,
        references: draft.references,
        lastReviewedAt: draft.lastReviewedAt,
        seriesId: draft.seriesId,
        seriesOrder: draft.seriesOrder,
        published: true,
        publishedAt: draft.sourcePost.publishedAt || now,
        scheduledAt: null
      },
      select: { id: true, slug: true }
    });
    await prisma.quizQuestion.deleteMany({ where: { postId: source.id } });
    if (questions.length)
      await prisma.quizQuestion.createMany({
        data: questions.map((question) => ({
          postId: source.id,
          question: question.question,
          options: question.options,
          correctIndex: question.correctIndex,
          explanation: question.explanation,
          position: question.position
        }))
      });
    await prisma.post.delete({ where: { id: draft.id } });
    return source;
  }

  return prisma.post.update({
    where: { id: draft.id },
    data: { published: true, publishedAt: now, scheduledAt: null },
    select: { id: true, slug: true }
  });
};

export const publishDueStories = async (prisma: Database) => {
  const due = await prisma.post.findMany({
    where: { published: false, scheduledAt: { lte: new Date() } },
    select: { id: true, authorId: true }
  });

  for (const post of due) await publishDraft(prisma, post.id, post.authorId);
  return due.length;
};
