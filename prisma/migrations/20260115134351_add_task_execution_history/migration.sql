-- CreateTable
CREATE TABLE "task_execution_history" (
    "id" UUID NOT NULL,
    "taskName" VARCHAR(100) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "result" VARCHAR(20) NOT NULL,
    "errorMessage" TEXT,
    "duration" INTEGER NOT NULL,
    "capturedLogs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_execution_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_execution_history_taskName_startedAt_idx" ON "task_execution_history"("taskName", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "task_execution_history_startedAt_idx" ON "task_execution_history"("startedAt");
