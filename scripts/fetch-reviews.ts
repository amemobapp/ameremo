import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

import { GooglePlacesService } from '../lib/google-places';
import { prisma } from '../lib/prisma';

// shoplist.md から店舗データ（アメモバ + サクモバ）
const stores: Array<{ name: string; googleMapsUrl: string; placeId: string; type: string; brand: string }> = [
  // アメモバ
  { name: 'アメモバ買取 東京上野本店', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJG_0V74WNGGARNcOjkwixJuQ', placeId: 'ChIJG_0V74WNGGARNcOjkwixJuQ', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ買取 秋葉原店', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJFQAwsZ-OGGARfGHc4VvmyLA', placeId: 'ChIJFQAwsZ-OGGARfGHc4VvmyLA', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ買取 柏店', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJhyb1RRmdGGARKhISBfOIFhI', placeId: 'ChIJhyb1RRmdGGARKhISBfOIFhI', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ買取 名古屋大須店', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJHYp3Shd3A2ARONqCexsG5ew', placeId: 'ChIJHYp3Shd3A2ARONqCexsG5ew', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ買取 新宿東南口店', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJM_kPEBiNGGAR1jbcaf_pwpo', placeId: 'ChIJM_kPEBiNGGAR1jbcaf_pwpo', type: 'DIRECT', brand: 'AMEMOBA' },
  { name: 'アメモバ買取 大宮マルイ店', googleMapsUrl: 'https://www.google.com/maps/place/?q=place_id:ChIJn-qyhX6dGGARAFfE-Mv4UOU', placeId: 'ChIJn-qyhX6dGGARAFfE-Mv4UOU', type: 'DIRECT', brand: 'AMEMOBA' },
  // サクモバ
  { name: 'サクモバ 東京秋葉原店', googleMapsUrl: 'https://maps.app.goo.gl/5syqmR83eYHR1Sy77', placeId: 'ChIJiS1phZ6PGGARWW9Q51UQcRk', type: 'DIRECT', brand: 'SAKUMOBA' },
  { name: 'サクモバ 新宿西口店', googleMapsUrl: 'https://maps.app.goo.gl/T3ua72862GeWfFdJ6', placeId: 'ChIJy97SMKGNGGARHCW4cTVFLtw', type: 'DIRECT', brand: 'SAKUMOBA' },
  { name: 'サクモバ 名古屋大須店', googleMapsUrl: 'https://maps.app.goo.gl/CgynoAtxgwVYP3UR9', placeId: 'ChIJdfabEGd3A2ARPStzxMd5OJE', type: 'DIRECT', brand: 'SAKUMOBA' },
];

async function main() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_PLACES_API_KEY is not set');
    process.exit(1);
  }

  const googleService = new GooglePlacesService(apiKey);

  for (const storeData of stores) {
    console.log(`Fetching reviews for: ${storeData.name}`);
    
    const fetchLog = await prisma.fetchLog.create({
      data: {
        storeId: storeData.name,
        status: 'RUNNING',
        message: 'Started fetching reviews'
      }
    });

    try {
      // Find or create store
      let store = await prisma.store.findFirst({
        where: { name: storeData.name }
      });

      if (!store) {
        store = await prisma.store.create({
          data: {
            name: storeData.name,
            type: storeData.type,
            brand: storeData.brand,
            googleMapsUrl: storeData.googleMapsUrl,
            placeId: storeData.placeId
          }
        });
      }

      // Get reviews from Google Places API
      const reviews = await googleService.getReviewsForStore(
        storeData.name,
        storeData.placeId,
        storeData.googleMapsUrl
      );

      let newReviewsCount = 0;

      for (const review of reviews) {
        // Check if review already exists
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

      console.log(`✓ ${storeData.name}: ${reviews.length} reviews found, ${newReviewsCount} new`);

    } catch (error) {
      console.error(`✗ Error fetching reviews for ${storeData.name}:`, error);
      
      await prisma.fetchLog.update({
        where: { id: fetchLog.id },
        data: {
          status: 'ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });
    }
  }

  console.log('Review fetching completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
