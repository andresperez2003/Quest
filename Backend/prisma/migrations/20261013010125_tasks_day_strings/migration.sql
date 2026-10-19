/*
  Warnings:

  - You are about to drop the column `dueAt` on the `Task` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "energy" TEXT,
    "dueDay" TEXT,
    "dueTime" TEXT,
    "estimatedMin" INTEGER,
    "completedDay" TEXT,
    "completedAt" DATETIME,
    "recurrence" TEXT,
    "spawnedFromId" TEXT,
    "googleEventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "parentId" TEXT,
    "categoryId" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("categoryId", "completedAt", "createdAt", "energy", "estimatedMin", "googleEventId", "id", "notes", "parentId", "priority", "recurrence", "status", "title", "updatedAt", "userId") SELECT "categoryId", "completedAt", "createdAt", "energy", "estimatedMin", "googleEventId", "id", "notes", "parentId", "priority", "recurrence", "status", "title", "updatedAt", "userId" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");
CREATE INDEX "Task_userId_dueDay_idx" ON "Task"("userId", "dueDay");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
