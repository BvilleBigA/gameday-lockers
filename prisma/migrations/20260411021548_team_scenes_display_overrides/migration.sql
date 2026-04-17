-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Display" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pairingCode" TEXT NOT NULL,
    "isPaired" BOOLEAN NOT NULL DEFAULT false,
    "teamId" INTEGER,
    "overrideSceneId" INTEGER,
    "playerId" INTEGER,
    CONSTRAINT "Display_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Display_overrideSceneId_fkey" FOREIGN KEY ("overrideSceneId") REFERENCES "Scene" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Display_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Display" ("id", "isPaired", "pairingCode", "playerId") SELECT "id", "isPaired", "pairingCode", "playerId" FROM "Display";
DROP TABLE "Display";
ALTER TABLE "new_Display" RENAME TO "Display";
CREATE UNIQUE INDEX "Display_pairingCode_key" ON "Display"("pairingCode");
CREATE INDEX "Display_teamId_idx" ON "Display"("teamId");
CREATE INDEX "Display_overrideSceneId_idx" ON "Display"("overrideSceneId");
CREATE TABLE "new_Scene" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "teamId" INTEGER,
    "backgroundUrl" TEXT NOT NULL,
    "mediaKind" TEXT NOT NULL DEFAULT 'URL',
    "themeColor" TEXT NOT NULL,
    CONSTRAINT "Scene_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Scene" ("backgroundUrl", "id", "name", "themeColor") SELECT "backgroundUrl", "id", "name", "themeColor" FROM "Scene";
DROP TABLE "Scene";
ALTER TABLE "new_Scene" RENAME TO "Scene";
CREATE INDEX "Scene_teamId_idx" ON "Scene"("teamId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
