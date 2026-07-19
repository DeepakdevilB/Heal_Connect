-- ChatMessage table for real-time chat persistence
CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id"          TEXT NOT NULL,
  "sessionId"   TEXT NOT NULL,
  "senderId"    TEXT NOT NULL,
  "senderType"  TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "isRead"      BOOLEAN NOT NULL DEFAULT false,
  "readAt"      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ChatMessage_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");
CREATE INDEX IF NOT EXISTS "ChatMessage_senderId_idx"  ON "ChatMessage"("senderId");

-- CallFeedback table for post-call quality feedback
CREATE TABLE IF NOT EXISTS "CallFeedback" (
  "id"            TEXT NOT NULL,
  "sessionId"     TEXT NOT NULL,
  "userId"        TEXT NOT NULL,
  "audioQuality"  INTEGER NOT NULL,
  "overallRating" INTEGER NOT NULL,
  "issues"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "comment"       TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CallFeedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CallFeedback_sessionId_key" UNIQUE ("sessionId"),
  CONSTRAINT "CallFeedback_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CallFeedback_userId_idx" ON "CallFeedback"("userId");
