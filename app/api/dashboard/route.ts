import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeIds = searchParams.get('storeIds')?.split(',').filter(Boolean);
    const brand = searchParams.get('brand'); // 'all' | 'AMEMOBA' | 'SAKUMOBA'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const granularity = searchParams.get('granularity') || 'DAY';

    console.log('Dashboard API called with:', { storeIds, brand, startDate, endDate, granularity });

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

    // Get all stores for filtering options (optionally by brand)
    const storeWhere = brand && brand !== 'all' ? { brand } : {};
    const stores = await prisma.store.findMany({
      where: storeWhere,
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Limit reviews to selected store IDs, or to brand's stores when brand is set
    if (storeIds && storeIds.length > 0 && !storeIds.includes('all')) {
      where.storeId = { in: storeIds };
    } else if (brand && brand !== 'all' && stores.length > 0) {
      // Brand selected and "all stores" → limit to that brand's store IDs
      where.storeId = { in: stores.map((s) => s.id) };
    }

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

    // Build list of all period keys in range (for 店舗別期間別 table)
    const periodKeys: string[] = [];
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (granularity === 'DAY') {
        for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          periodKeys.push(d.toISOString().split('T')[0]);
        }
      } else if (granularity === 'WEEK') {
        const cur = new Date(start);
        cur.setDate(cur.getDate() - cur.getDay() + (cur.getDay() === 0 ? -6 : 1));
        while (cur <= end) {
          periodKeys.push(cur.toISOString().split('T')[0]);
          cur.setDate(cur.getDate() + 7);
        }
      } else {
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cur <= end) {
          periodKeys.push(cur.toISOString().split('T')[0]);
          cur.setMonth(cur.getMonth() + 1);
        }
      }
    }
    // Count by store and period (same key logic as timeSeriesData)
    const storePeriodCounts = new Map<string, Map<string, number>>();
    stores.forEach((s) => storePeriodCounts.set(s.id, new Map()));
    reviews.forEach((review) => {
      const date = new Date(review.createdAt);
      let key: string;
      switch (granularity) {
        case 'WEEK': {
          const monday = new Date(date);
          monday.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
          key = monday.toISOString().split('T')[0];
          break;
        }
        case 'MONTH':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      const storeId = review.store.id;
      const perStore = storePeriodCounts.get(storeId);
      if (perStore) {
        perStore.set(key, (perStore.get(key) ?? 0) + 1);
      }
    });
    const storeByPeriod = stores.map((s) => ({
      storeId: s.id,
      storeName: s.name,
      counts: Object.fromEntries(periodKeys.map((p) => [p, storePeriodCounts.get(s.id)?.get(p) ?? 0]))
    }));

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
      storeComparison: storeComparisonData,
      storeByPeriod: { periodKeys, rows: storeByPeriod },
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
