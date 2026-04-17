-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContentFolder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "groupId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContentFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContentFolder_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ContentFolder" ("createdAt", "id", "name", "parentId") SELECT "createdAt", "id", "name", "parentId" FROM "ContentFolder";
DROP TABLE "ContentFolder";
ALTER TABLE "new_ContentFolder" RENAME TO "ContentFolder";
CREATE UNIQUE INDEX "ContentFolder_groupId_key" ON "ContentFolder"("groupId");
CREATE INDEX "ContentFolder_parentId_idx" ON "ContentFolder"("parentId");
CREATE INDEX "ContentFolder_groupId_idx" ON "ContentFolder"("groupId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
