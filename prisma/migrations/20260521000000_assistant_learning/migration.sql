-- Aprendizaje continuo del asistente IA
CREATE TABLE "AssistantLearnedTopic" (
  "id" TEXT NOT NULL,
  "keywords" TEXT NOT NULL,
  "sampleQuestion" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "followUps" TEXT NOT NULL DEFAULT '',
  "source" TEXT NOT NULL DEFAULT 'auto',
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "approvedAt" TIMESTAMP(3),
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "helpfulCount" INTEGER NOT NULL DEFAULT 0,
  "unhelpfulCount" INTEGER NOT NULL DEFAULT 0,
  "occurrences" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssistantLearnedTopic_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantLearnedTopic_approved_helpfulCount_idx"
  ON "AssistantLearnedTopic"("approved", "helpfulCount");
CREATE INDEX "AssistantLearnedTopic_createdAt_idx"
  ON "AssistantLearnedTopic"("createdAt");

CREATE TABLE "AssistantInteraction" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "matchedKind" TEXT NOT NULL DEFAULT 'none',
  "matchedKey" TEXT,
  "matchedScore" INTEGER NOT NULL DEFAULT 0,
  "helpful" BOOLEAN,
  "clusterId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssistantInteraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AssistantInteraction_createdAt_idx"
  ON "AssistantInteraction"("createdAt");
CREATE INDEX "AssistantInteraction_matchedKind_helpful_idx"
  ON "AssistantInteraction"("matchedKind", "helpful");
CREATE INDEX "AssistantInteraction_clusterId_idx"
  ON "AssistantInteraction"("clusterId");

ALTER TABLE "AssistantInteraction"
  ADD CONSTRAINT "AssistantInteraction_clusterId_fkey"
  FOREIGN KEY ("clusterId") REFERENCES "AssistantLearnedTopic"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
