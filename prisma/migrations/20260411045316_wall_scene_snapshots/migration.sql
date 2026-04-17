-- CreateTable
CREATE TABLE "WallSceneSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "groupId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WallSceneSnapshot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WallSceneSnapshot_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WallSceneDisplayCapture" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "snapshotId" INTEGER NOT NULL,
    "displayId" INTEGER NOT NULL,
    "overrideSceneId" INTEGER,
    "directMediaUrl" TEXT,
    "directMediaKind" TEXT,
    "directThemeColor" TEXT,
    CONSTRAINT "WallSceneDisplayCapture_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WallSceneSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WallSceneDisplayCapture_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WallSceneSnapshot_groupId_idx" ON "WallSceneSnapshot"("groupId");

-- CreateIndex
CREATE INDEX "WallSceneSnapshot_teamId_idx" ON "WallSceneSnapshot"("teamId");

-- CreateIndex
CREATE INDEX "WallSceneDisplayCapture_displayId_idx" ON "WallSceneDisplayCapture"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "WallSceneDisplayCapture_snapshotId_displayId_key" ON "WallSceneDisplayCapture"("snapshotId", "displayId");
