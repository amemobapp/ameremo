import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let storeIds = searchParams.get('storeIds')?.split(',').filter(Boolean);
    const brand = searchParams.get('brand'); // 'all' | 'AMEMOBA' | 'SAKUMOBA'
    const rating = searchParams.get('rating'); // 1-5 filter
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // When storeIds is 'all' but brand is set, resolve store IDs by brand
    if (brand && brand !== 'all' && (!storeIds || storeIds.length === 0 || storeIds.includes('all'))) {
      const brandStores = await prisma.store.findMany({
        where: { brand },
        select: { id: true }
      });
      storeIds = brandStores.map((s) => s.id);
    }

    // Build where clause
    const where: any = {};
    
    if (rating) {
      const ratingNum = parseInt(rating, 10);
      if (ratingNum >= 1 && ratingNum <= 5) {
        where.rating = ratingNum;
      }
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);
      
      where.createdAt = {
        gte: start,
        lte: end
      };
    }

    if (storeIds && storeIds.length > 0 && !storeIds.includes('all')) {
      where.storeId = {
        in: storeIds
      };
    }

    // Build order by clause
    let orderBy: any = { createdAt: 'desc' }; // default: newest
    
    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'rating-high':
        orderBy = { rating: 'desc' };
        break;
      case 'rating-low':
        orderBy = { rating: 'asc' };
        break;
    }

    // Get reviews with pagination
    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: limit
      }),
      prisma.review.count({ where })
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Reviews API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
