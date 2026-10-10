ALTER TABLE "Post" ADD COLUMN "slug" TEXT;
ALTER TABLE "Post" ADD COLUMN "publishedAt" TIMESTAMP(3);

UPDATE "Post"
SET
  "slug" = "id",
  "publishedAt" = CASE WHEN "published" = true THEN "createdAt" ELSE NULL END;

ALTER TABLE "Post" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");
CREATE INDEX "Post_published_createdAt_idx" ON "Post"("published", "createdAt");
CREATE INDEX "Post_authorId_updatedAt_idx" ON "Post"("authorId", "updatedAt");
