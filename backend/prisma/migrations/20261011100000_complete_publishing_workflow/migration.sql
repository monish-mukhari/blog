ALTER TABLE "Post"
ADD COLUMN "contentFormat" TEXT NOT NULL DEFAULT 'markdown',
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "coverImageAlt" TEXT,
ADD COLUMN "scheduledAt" TIMESTAMP(3),
ADD COLUMN "sourcePostId" TEXT;

CREATE UNIQUE INDEX "Post_sourcePostId_key" ON "Post"("sourcePostId");
CREATE INDEX "Post_published_scheduledAt_idx" ON "Post"("published", "scheduledAt");

ALTER TABLE "Post"
ADD CONSTRAINT "Post_sourcePostId_fkey"
FOREIGN KEY ("sourcePostId") REFERENCES "Post"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PostRevision" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentFormat" TEXT NOT NULL,
  "excerpt" TEXT,
  "tags" TEXT[],
  "coverImageUrl" TEXT,
  "coverImageAlt" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostRevision_postId_createdAt_idx" ON "PostRevision"("postId", "createdAt");

ALTER TABLE "PostRevision"
ADD CONSTRAINT "PostRevision_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "alt" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaAsset_ownerId_createdAt_idx" ON "MediaAsset"("ownerId", "createdAt");

ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
