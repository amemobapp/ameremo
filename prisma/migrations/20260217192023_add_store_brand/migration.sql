-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT 'AMEMOBA',
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "googleMapsUrl" TEXT,
    "placeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'GOOGLE',
    "sourceReviewId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "authorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewUrl" TEXT,
    "rawPayload" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_aggregates" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "granularity" TEXT NOT NULL,
    "bucketStartDate" TIMESTAMP(3) NOT NULL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fetch_logs" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "fetch_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reviews_sourceReviewId_key" ON "reviews"("sourceReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "review_aggregates_storeId_granularity_bucketStartDate_key" ON "review_aggregates"("storeId", "granularity", "bucketStartDate");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_aggregates" ADD CONSTRAINT "review_aggregates_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
