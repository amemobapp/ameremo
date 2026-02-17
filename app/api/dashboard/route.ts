import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeIds = searchParams.get('storeIds')?.split(',').filter(Boolean);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const granularity = searchParams.get('granularity') || 'DAY';

    console.log('Dashboard API called with:', { storeIds, startDate, endDate, granularity });

    // Build where clause
    const where: any = {};
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);
      
      where.createdAt = {
        gte: start,
        lte: end
      };
      console.log('Date filter applied:', { 
        startDate: start.toISOString(), 
        endDate: end.toISOString(),
        filter: where.createdAt 
      });
    }

    if (storeIds && storeIds.length > 0 && !storeIds.includes('all')) {
      where.storeId = {
        in: storeIds
      };
    }

    // Get all stores for filtering options
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get review counts and average ratings
    const reviews = await prisma.review.findMany({
      where,
      select: {
        rating: true,
        createdAt: true,
        store: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Calculate aggregates
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
      : 0;

    // Group by time period for time series data
    const timeSeriesData: any[] = [];
    const groupedByDate = new Map<string, { count: number; totalRating: number; ratings: number[] }>();

    reviews.forEach(review => {
      const date = new Date(review.createdAt);
      let key: string;
      
      switch (granularity) {
        case 'WEEK':
          // Get Monday of the week (ISO week)
          const monday = new Date(date);
          monday.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
          key = monday.toISOString().split('T')[0];
          break;
        case 'MONTH':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        default: // DAY
          key = date.toISOString().split('T')[0];
      }

      if (!groupedByDate.has(key)) {
        groupedByDate.set(key, { count: 0, totalRating: 0, ratings: [] });
      }
      
      const group = groupedByDate.get(key)!;
      group.count++;
      group.totalRating += review.rating;
      group.ratings.push(review.rating);
    });

    // Convert to array and sort by date
    groupedByDate.forEach((data, date) => {
      timeSeriesData.push({
        date,
        reviewCount: data.count,
        averageRating: data.totalRating / data.count
      });
    });

    timeSeriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get store comparison data with rating counts
    const storeComparison = await prisma.review.groupBy({
      by: ['storeId', 'rating'],
      where,
      _count: {
        id: true
      }
    });

    // Get all unique store IDs
    const uniqueStoreIds = Array.from(new Set(storeComparison.map(item => item.storeId)));
    
    // Fetch all stores at once to avoid N+1 problem
    const storeMap = new Map<string, string>();
    if (uniqueStoreIds.length > 0) {
      const storeRecords = await prisma.store.findMany({
        where: { id: { in: uniqueStoreIds } },
        select: { id: true, name: true }
      });
      storeRecords.forEach(store => {
        storeMap.set(store.id, store.name);
      });
    }

    // Group by store and count by rating
    const storeRatingCounts = new Map<string, { storeName: string; ratingCounts: { [key: number]: number } }>();
    
    for (const item of storeComparison) {
      if (!storeRatingCounts.has(item.storeId)) {
        storeRatingCounts.set(item.storeId, {
          storeName: storeMap.get(item.storeId) || 'Unknown',
          ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
      }
      const storeData = storeRatingCounts.get(item.storeId)!;
      storeData.ratingCounts[item.rating as keyof typeof storeData.ratingCounts] = item._count.id;
    }

    // Include stores with no reviews (all zeros)
    stores.forEach(store => {
      if (!storeRatingCounts.has(store.id)) {
        storeRatingCounts.set(store.id, {
          storeName: store.name,
          ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        });
      }
    });

    const storeComparisonData = Array.from(storeRatingCounts.entries()).map(([storeId, data]) => ({
      storeId,
      storeName: data.storeName,
      ratingCounts: data.ratingCounts
    }));

    return NextResponse.json({
      summary: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10
      },
      timeSeriesData,
      storeComparison: storeComparisonData.sort((a, b) => {
        const aTotal = Object.values(a.ratingCounts).reduce((sum, count) => sum + count, 0);
        const bTotal = Object.values(b.ratingCounts).reduce((sum, count) => sum + count, 0);
        return bTotal - aTotal;
      }),
      stores
    });

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
