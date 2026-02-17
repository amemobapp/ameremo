import { GooglePlacesService } from '@/lib/google-places';
import { prisma } from '@/lib/prisma';

// 店舗が0件のときに自動登録する初期店舗（shoplist.md / scripts/seed-stores.ts と同期）
export const DEFAULT_STORES: Array<{ name: string; placeId: string; googleMapsUrl: string; type: string; brand: string }> = [
  { name: 'アメモバ買取 上野店', placeId: 'ChIJG_0V74WNGGARNcOjkwixJuQ', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJG_0V74WNGGARNcOjkwixJuQ', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ買取 秋葉原店', placeId: 'ChIJFQAwsZ-OGGARfGHc4VvmyLA', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJFQAwsZ-OGGARfGHc4VvmyLA', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ買取 柏店', placeId: 'ChIJhyb1RRmdGGARKhISBfOIFhI', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJhyb1RRmdGGARKhISBfOIFhI', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ買取 名古屋大須店', placeId: 'ChIJHYp3Shd3A2ARONqCexsG5ew', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJHYp3Shd3A2ARONqCexsG5ew', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ買取 新宿東南口店', placeId: 'ChIJM_kPEBiNGGAR1jbcaf_pwpo', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJM_kPEBiNGGAR1jbcaf_pwpo', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ買取 大宮マルイ店', placeId: 'ChIJn-qyhX6dGGARAFfE-Mv4UOU', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJn-qyhX6dGGARAFfE-Mv4UOU', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'サクモバ 秋葉原店', placeId: 'ChIJiS1phZ6PGGARWW9Q51UQcRk', googleMapsUrl: 'https://maps.app.goo.gl/5syqmR83eYHR1Sy77', type: 'DIRECT', brand: 'SAKUMOBA' },
  { name: 'サクモバ 新宿西口店', placeId: 'ChIJy97SMKGNGGARHCW4cTVFLtw', googleMapsUrl: 'https://maps.app.goo.gl/T3ua72862GeWfFdJ6', type: 'DIRECT', brand: 'SAKUMOBA' },
  { name: 'サクモバ 名古屋大須店', placeId: 'ChIJdfabEGd3A2ARPStzxMd5OJE', googleMapsUrl: 'https://maps.app.goo.gl/CgynoAtxgwVYP3UR9', type: 'DIRECT', brand: 'SAKUMOBA' },
];

export type FetchReviewsResult = {
  message: string;
  results: Array<{
    storeId: string;
    storeName: string;
    totalReviews?: number;
    newReviews?: number;
    status: string;
    error?: string;
  }>;
};

/**
 * 全店舗の口コミを Google Places API で取得し DB に保存する。
 * 手動 POST /api/fetch-reviews と Cron GET /api/cron/fetch-reviews の両方から利用。
 */
export async function runFetchReviews(): Promise<FetchReviewsResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  const googleService = new GooglePlacesService(apiKey);

  let stores = await prisma.store.findMany({
    orderBy: { name: 'asc' }
  });

  if (stores.length === 0) {
    for (const s of DEFAULT_STORES) {
      await prisma.store.create({
        data: {
          name: s.name,
          type: s.type,
          brand: s.brand,
          googleMapsUrl: s.googleMapsUrl,
          placeId: s.placeId,
        },
      });
    }
    stores = await prisma.store.findMany({ orderBy: { name: 'asc' } });
  }

  const results: FetchReviewsResult['results'] = [];

  for (const store of stores) {
    const fetchLog = await prisma.fetchLog.create({
      data: {
        storeId: store.id,
        status: 'RUNNING',
        message: 'Started fetching reviews'
      }
    });

    try {
      const reviews = await googleService.getReviewsForStore(
        store.name,
        store.placeId || undefined,
        store.googleMapsUrl || undefined
      );

      let newReviewsCount = 0;

      for (const review of reviews) {
        const existingReview = await prisma.review.findFirst({
          where: {
            sourceReviewId: `${store.id}_${review.time}_${review.author_name}`
          }
        });

        if (!existingReview) {
          await prisma.review.create({
            data: {
              storeId: store.id,
              source: 'GOOGLE',
              sourceReviewId: `${store.id}_${review.time}_${review.author_name}`,
              rating: review.rating,
              text: review.text,
              authorName: review.author_name,
              createdAt: new Date(review.time * 1000),
              reviewUrl: review.googleMapsUri ?? store.googleMapsUrl ?? null,
              rawPayload: JSON.stringify(review)
            }
          });
          newReviewsCount++;
        }
      }

      await prisma.fetchLog.update({
        where: { id: fetchLog.id },
        data: {
          status: 'SUCCESS',
          message: `Successfully fetched ${reviews.length} reviews, ${newReviewsCount} new`,
          reviewCount: newReviewsCount,
          completedAt: new Date()
        }
      });

      results.push({
        storeId: store.id,
        storeName: store.name,
        totalReviews: reviews.length,
        newReviews: newReviewsCount,
        status: 'success'
      });
    } catch (error) {
      console.error(`Error fetching reviews for ${store.name}:`, error);
      await prisma.fetchLog.update({
        where: { id: fetchLog.id },
        data: {
          status: 'ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });
      results.push({
        storeId: store.id,
        storeName: store.name,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    message: 'Review fetching completed',
    results
  };
}
