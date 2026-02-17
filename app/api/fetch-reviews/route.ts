import { NextRequest, NextResponse } from 'next/server';
import { GooglePlacesService } from '@/lib/google-places';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Places API key not configured' },
        { status: 500 }
      );
    }

    const googleService = new GooglePlacesService(apiKey);

    // Get all stores
    const stores = await prisma.store.findMany({
      orderBy: { name: 'asc' }
    });

    const results = [];

    for (const store of stores) {
      const fetchLog = await prisma.fetchLog.create({
        data: {
          storeId: store.id,
          status: 'RUNNING',
          message: 'Started fetching reviews'
        }
      });

      try {
        // Get reviews from Google Places API
        const reviews = await googleService.getReviewsForStore(
          store.name,
          store.placeId || undefined,
          store.googleMapsUrl || undefined
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

    return NextResponse.json({
      message: 'Review fetching completed',
      results
    });

  } catch (error) {
    console.error('Fetch reviews API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
