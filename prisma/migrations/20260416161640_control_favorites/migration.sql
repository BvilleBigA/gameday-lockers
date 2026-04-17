-- CreateTable
CREATE TABLE "UserFavoriteScene" (
    "userId" TEXT NOT NULL,
    "sceneId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "sceneId"),
    CONSTRAINT "UserFavoriteScene_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFavoriteScene_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserFavoriteWallSnapshot" (
    "userId" TEXT NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("userId", "snapshotId"),
    CONSTRAINT "UserFavoriteWallSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFavoriteWallSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WallSceneSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UserFavoriteScene_userId_idx" ON "UserFavoriteScene"("userId");

-- CreateIndex
CREATE INDEX "UserFavoriteWallSnapshot_userId_idx" ON "UserFavoriteWallSnapshot"("userId");
