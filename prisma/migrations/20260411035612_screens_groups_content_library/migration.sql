-- CreateTable
CREATE TABLE "ContentFolder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "parentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ContentFolder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentAsset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mediaKind" TEXT NOT NULL DEFAULT 'IMAGE',
    "folderId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ContentFolder" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Display" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pairingCode" TEXT NOT NULL,
    "label" TEXT,
    "isPaired" BOOLEAN NOT NULL DEFAULT false,
    "teamId" INTEGER,
    "groupId" INTEGER,
    "overrideSceneId" INTEGER,
    "playerId" INTEGER,
    CONSTRAINT "Display_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Display_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Display_overrideSceneId_fkey" FOREIGN KEY ("overrideSceneId") REFERENCES "Scene" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Display_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Display" ("id", "isPaired", "label", "overrideSceneId", "pairingCode", "playerId", "teamId") SELECT "id", "isPaired", "label", "overrideSceneId", "pairingCode", "playerId", "teamId" FROM "Display";
DROP TABLE "Display";
ALTER TABLE "new_Display" RENAME TO "Display";
CREATE UNIQUE INDEX "Display_pairingCode_key" ON "Display"("pairingCode");
CREATE INDEX "Display_teamId_idx" ON "Display"("teamId");
CREATE INDEX "Display_groupId_idx" ON "Display"("groupId");
CREATE INDEX "Display_overrideSceneId_idx" ON "Display"("overrideSceneId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ContentFolder_parentId_idx" ON "ContentFolder"("parentId");

-- CreateIndex
CREATE INDEX "ContentAsset_folderId_idx" ON "ContentAsset"("folderId");
