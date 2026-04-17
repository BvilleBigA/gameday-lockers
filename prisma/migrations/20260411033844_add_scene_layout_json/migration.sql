-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scene" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "teamId" INTEGER,
    "backgroundUrl" TEXT NOT NULL,
    "mediaKind" TEXT NOT NULL DEFAULT 'URL',
    "themeColor" TEXT NOT NULL,
    "layoutJson" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "Scene_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Scene" ("backgroundUrl", "id", "mediaKind", "name", "teamId", "themeColor") SELECT "backgroundUrl", "id", "mediaKind", "name", "teamId", "themeColor" FROM "Scene";
DROP TABLE "Scene";
ALTER TABLE "new_Scene" RENAME TO "Scene";
CREATE INDEX "Scene_teamId_idx" ON "Scene"("teamId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
