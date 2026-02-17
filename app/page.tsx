'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatDate, getRelativeTime, getStarRating, sortStoresByRegion } from '@/lib/utils';
import {
  STORE_SLUG_TO_NAME,
  STORE_NAME_TO_SLUG,
  BRAND_SLUG_TO_BRAND,
  BRAND_TO_SLUG,
  VALID_STORE_SLUGS,
  VALID_BRAND_SLUGS
} from '@/lib/store-slug';
import CommonNavigation from '@/components/common-navigation';
import {
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar
} from 'recharts';

interface Store {
  id: string;
  name: string;
}

interface DashboardData {
  summary: {
    totalReviews: number;
    averageRating: number;
  };
  timeSeriesData: Array<{
    date: string;
    reviewCount: number;
    averageRating: number;
  }>;
  storeComparison: Array<{
    storeId: string;
    storeName: string;
    ratingCounts: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  }>;
  storeByPeriod?: {
    periodKeys: string[];
    rows: Array<{ storeId: string; storeName: string; counts: Record<string, number> }>;
  };
  stores: Store[];
}

interface Review {
  id: string;
  storeId: string;
  store: Store;
  rating: number;
  text: string;
  authorName: string;
  createdAt: string;
  reviewUrl?: string;
}

interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

type TabType = 'dashboard' | 'reviews';

export default function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Dashboard state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  
  // Reviews state
  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  
  // Common state
  const [selectedBrand, setSelectedBrand] = useState<'all' | 'AMEMOBA' | 'SAKUMOBA'>('all');
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>(['all']);
  const [initialStoreSlug, setInitialStoreSlug] = useState<string | null>(null);
  const hasReadUrlRef = useRef(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [granularity, setGranularity] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating-high' | 'rating-low'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [headerHeight, setHeaderHeight] = useState(240); // Default padding
  const [reviewPopup, setReviewPopup] = useState<{
    storeId: string;
    storeName: string;
    rating: number;
  } | null>(null);
  const [popupReviews, setPopupReviews] = useState<Review[]>([]);
  const [popupLoading, setPopupLoading] = useState(false);
  const [fetchFromGoogleLoading, setFetchFromGoogleLoading] = useState(false);
  const [fetchFromGoogleMessage, setFetchFromGoogleMessage] = useState<string | null>(null);

  // Read URL params once on mount and set brand / pending store slug
  useEffect(() => {
    if (hasReadUrlRef.current) return;
    hasReadUrlRef.current = true;
    const storeSlug = searchParams.get('store');
    const brandSlug = searchParams.get('brand');
    if (brandSlug && VALID_BRAND_SLUGS.includes(brandSlug)) {
      setSelectedBrand(BRAND_SLUG_TO_BRAND[brandSlug]);
    } else if (storeSlug && VALID_STORE_SLUGS.includes(storeSlug)) {
      setSelectedBrand(storeSlug.startsWith('ame-') ? 'AMEMOBA' : 'SAKUMOBA');
    }
    if (storeSlug && VALID_STORE_SLUGS.includes(storeSlug)) {
      setInitialStoreSlug(storeSlug);
    }
  }, [searchParams]);

  // Resolve initial store slug to store id once stores are loaded
  useEffect(() => {
    if (!initialStoreSlug || stores.length === 0) return;
    const name = STORE_SLUG_TO_NAME[initialStoreSlug];
    const store = stores.find((s) => s.name === name);
    if (store) {
      setSelectedStores([store.id]);
    }
    setInitialStoreSlug(null);
  }, [initialStoreSlug, stores]);

  // Sync selected brand/store to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedBrand !== 'all') params.set('brand', BRAND_TO_SLUG[selectedBrand]);
    if (initialStoreSlug) {
      params.set('store', initialStoreSlug);
    } else if (selectedStores.length === 1 && !selectedStores.includes('all')) {
      const store = stores.find((s) => s.id === selectedStores[0]);
      const slug = store && STORE_NAME_TO_SLUG[store.name];
      if (slug) params.set('store', slug);
    }
    const qs = params.toString();
    const url = qs ? `?${qs}` : window.location.pathname;
    if (window.location.search !== (qs ? `?${qs}` : '')) {
      router.replace(url, { scroll: false });
    }
  }, [selectedStores, selectedBrand, initialStoreSlug, stores, router]);

  // Set default date range (last 30 days) and fetch stores
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
    
    // Fetch stores on mount
    fetchStores();
  }, []);

  // Calculate header height dynamically
  useEffect(() => {
    const updateHeaderHeight = () => {
      const headerElement = document.querySelector('header');
      const controlsElement = document.getElementById('navigation-controls');
      if (headerElement && controlsElement) {
        const headerHeight = headerElement.offsetHeight;
        const controlsHeight = controlsElement.offsetHeight;
        setHeaderHeight(headerHeight + controlsHeight + 16); // Add 16px for extra spacing
      }
    };

    // Wait for DOM to be ready
    const timer = setTimeout(updateHeaderHeight, 100);
    window.addEventListener('resize', updateHeaderHeight);
    
    // Use MutationObserver to watch for changes in controls height
    const observer = new MutationObserver(updateHeaderHeight);
    const controlsElement = document.getElementById('navigation-controls');
    if (controlsElement) {
      observer.observe(controlsElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateHeaderHeight);
      observer.disconnect();
    };
  }, [stores, selectedStores]);

  // Refetch stores when brand changes
  useEffect(() => {
    fetchStores();
  }, [selectedBrand]);

  // Fetch stores for navigation (filtered by brand)
  const fetchStores = async () => {
    try {
      const params = new URLSearchParams();
      params.set('storeIds', 'all');
      if (selectedBrand !== 'all') params.set('brand', selectedBrand);
      const response = await fetch(`/api/dashboard?${params}`);
      const result = await response.json();
      if (result.stores) {
        setStores(result.stores);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (selectedStores.length > 0 && !selectedStores.includes('all')) {
        params.append('storeIds', selectedStores.join(','));
      }
      if (selectedBrand !== 'all') params.append('brand', selectedBrand);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      params.append('granularity', granularity);

      const response = await fetch(`/api/dashboard?${params}`);
      const result = await response.json();
      
      if (response.ok) {
        setDashboardData(result);
        // Update stores if available
        if (result.stores) {
          setStores(result.stores);
        }
      } else {
        console.error('Failed to fetch dashboard data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchReviews = async (page: number = 1) => {
    setReviewsLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (selectedStores.length > 0 && !selectedStores.includes('all')) {
        params.append('storeIds', selectedStores.join(','));
      }
      if (selectedBrand !== 'all') params.append('brand', selectedBrand);
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      params.append('sortBy', sortBy);
      params.append('page', page.toString());
      params.append('limit', '50');

      const response = await fetch(`/api/reviews?${params}`);
      const result = await response.json();
      
      if (response.ok) {
        setReviewsData(result);
        setCurrentPage(page);
      } else {
        console.error('Failed to fetch reviews:', result.error);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Fetch data when filters change
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      if (activeTab === 'dashboard') {
        fetchDashboardData();
      } else {
        fetchReviews(1);
      }
    }
  }, [selectedStores, selectedBrand, dateRange, granularity, sortBy, activeTab]);

  // Fetch data when switching tabs
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      if (activeTab === 'dashboard' && !dashboardData) {
        fetchDashboardData();
      } else if (activeTab === 'reviews' && !reviewsData) {
        fetchReviews(1);
      }
    }
  }, [activeTab]);

  const handlePageChange = (page: number) => {
    fetchReviews(page);
  };

  const handleRefresh = () => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else {
      fetchReviews(currentPage);
    }
  };

  const handleFetchFromGoogle = async () => {
    setFetchFromGoogleLoading(true);
    setFetchFromGoogleMessage(null);
    try {
      const res = await fetch('/api/fetch-reviews', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setFetchFromGoogleMessage(data.error || '取得に失敗しました');
        return;
      }
      const results = (data.results ?? []) as Array<{ newReviews?: number; totalReviews?: number; error?: string }>;
      const totalNew = results.reduce((s, r) => s + (r.newReviews ?? 0), 0);
      const totalFetched = results.reduce((s, r) => s + (r.totalReviews ?? 0), 0);
      if (totalNew > 0 || totalFetched > 0) {
        setFetchFromGoogleMessage(`取得完了: ${results.length}店舗から合計${totalFetched}件（新規${totalNew}件）`);
      } else {
        setFetchFromGoogleMessage('取得完了: 0件（APIキー・Places APIの有効化を確認してください）');
      }
      fetchDashboardData();
      fetchReviews(1);
      fetchStores();
    } catch (e) {
      setFetchFromGoogleMessage('取得に失敗しました');
      console.error(e);
    } finally {
      setFetchFromGoogleLoading(false);
    }
  };

  /** 店舗名の表示用クラス（ブランド色・太字） */
  const getStoreNameCellClass = (name: string, extra = '') => {
    const base = 'font-bold ';
    if (name.startsWith('アメモバ')) return base + 'text-green-600 ' + extra;
    if (name.startsWith('サクモバ')) return base + 'text-orange-600 ' + extra;
    return base + 'text-gray-900 ' + extra;
  };

  const openReviewPopup = async (storeId: string, storeName: string, rating: number) => {
    setReviewPopup({ storeId, storeName, rating });
    setPopupLoading(true);
    setPopupReviews([]);
    try {
      const params = new URLSearchParams();
      params.append('storeIds', storeId);
      params.append('rating', String(rating));
      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);
      params.append('sortBy', 'newest');
      params.append('limit', '100');
      const response = await fetch(`/api/reviews?${params}`);
      const result = await response.json();
      if (response.ok) {
        setPopupReviews(result.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching popup reviews:', error);
    } finally {
      setPopupLoading(false);
    }
  };

  const closeReviewPopup = () => {
    setReviewPopup(null);
    setPopupReviews([]);
  };

  /** 口コミをGoogleで開く（個別口コミのURLを優先してダイレクトで開く） */
  const openReviewOnGoogle = async (review: Review) => {
    const isPlaceUrl = (s: string) => /place_id=|maps\.google.*\/place\//.test(s) || /place\/\?q=place_id/.test(s);
    if (review.reviewUrl && !isPlaceUrl(review.reviewUrl)) {
      window.open(review.reviewUrl, '_blank');
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set('storeId', review.storeId);
      if (review.authorName) params.set('authorName', review.authorName);
      if (review.createdAt) params.set('createdAt', review.createdAt);
      const res = await fetch(`/api/review-url?${params}`);
      const data = (await res.json()) as { url?: string | null };
      const url = data?.url ?? review.reviewUrl;
      if (url) window.open(url, '_blank');
      else if (review.reviewUrl) window.open(review.reviewUrl, '_blank');
    } catch {
      if (review.reviewUrl) window.open(review.reviewUrl, '_blank');
    }
  };

  const loading = activeTab === 'dashboard' ? dashboardLoading : reviewsLoading;
  const data = activeTab === 'dashboard' ? dashboardData : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Common Navigation */}
      <CommonNavigation
        stores={stores}
        selectedStores={selectedStores}
        setSelectedStores={setSelectedStores}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        dateRange={dateRange}
        setDateRange={setDateRange}
        granularity={granularity}
        setGranularity={setGranularity}
        sortBy={sortBy}
        setSortBy={setSortBy}
        onRefresh={handleRefresh}
        onFetchFromGoogle={handleFetchFromGoogle}
        fetchFromGoogleLoading={fetchFromGoogleLoading}
        fetchFromGoogleMessage={fetchFromGoogleMessage}
        loading={loading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        singleSelection={true}
      />

      {/* Main Content with padding for fixed navigation */}
      <div style={{ paddingTop: `${headerHeight}px` }}>
        <div className="max-w-7xl mx-auto px-8 pb-20">
          {/* Dashboard Tab Content */}
          {activeTab === 'dashboard' && (
            <>
              {loading || !data ? (
                <div className="text-center">Loading...</div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        口コミ投稿件数
                      </h3>
                      <p className="text-3xl font-bold text-blue-600">
                        {data.summary.totalReviews.toLocaleString()}件
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        期間内の総投稿件数
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        ※取得は店舗・期間ごとに最新5件までです。
                      </p>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        平均評価
                      </h3>
                      <p className="text-3xl font-bold text-green-600">
                        {getStarRating(data.summary.averageRating)} {data.summary.averageRating.toFixed(1)}
                      </p>
                      <p className="text-sm text-gray-600 mt-2">
                        期間内の平均星評価
                      </p>
                    </div>
                  </div>

                  {/* Time Series Chart */}
                  <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      時系列推移
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={data.timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(value) => {
                              const date = new Date(value);
                              switch (granularity) {
                                case 'DAY':
                                  return `${date.getMonth() + 1}/${date.getDate()}`;
                                case 'WEEK':
                                  return `${date.getMonth() + 1}/${date.getDate()}`;
                                case 'MONTH':
                                  return `${date.getMonth() + 1}月`;
                                default:
                                  return value;
                              }
                            }}
                          />
                          <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                          <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                          <Tooltip 
                            labelFormatter={(value) => formatDate(value)}
                            formatter={(value: any, name: string) => {
                              if (name === 'reviewCount') {
                                return [`${value}件`, '口コミ件数'];
                              }
                              if (name === 'averageRating') {
                                return [`${value.toFixed(1)}⭐`, '平均評価'];
                              }
                              return [value, name];
                            }}
                          />
                          <Legend 
                            formatter={(value) => {
                              if (value === 'reviewCount') return '口コミ件数';
                              if (value === 'averageRating') return '平均評価';
                              return value;
                            }}
                          />
                          <Bar 
                            yAxisId="left" 
                            dataKey="reviewCount" 
                            fill="#3B82F6" 
                            name="reviewCount"
                            opacity={0.8}
                          />
                          <Line 
                            yAxisId="right" 
                            type="monotone" 
                            dataKey="averageRating" 
                            stroke="#10B981" 
                            strokeWidth={3}
                            name="averageRating"
                            dot={{ fill: '#10B981', r: 4 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      <p>• 青色の棒グラフ：口コミ投稿件数</p>
                      <p>• 緑色の折れ線グラフ：平均星評価</p>
                    </div>
                  </div>

                  {/* Store Comparison */}
                  <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      評価別
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              店舗
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <span className="text-lg">⭐⭐⭐⭐⭐</span>
                              <br />
                              <span className="text-xs">5</span>
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <span className="text-lg">⭐⭐⭐⭐</span>
                              <br />
                              <span className="text-xs">4</span>
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <span className="text-lg">⭐⭐⭐</span>
                              <br />
                              <span className="text-xs">3</span>
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <span className="text-lg">⭐⭐</span>
                              <br />
                              <span className="text-xs">2</span>
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <span className="text-lg">⭐</span>
                              <br />
                              <span className="text-xs">1</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            const order = sortStoresByRegion([...data.stores]).map((s) => s.id);
                            const orderedComparison = [...data.storeComparison].sort((a, b) => {
                              const ai = order.indexOf(a.storeId);
                              const bi = order.indexOf(b.storeId);
                              return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                            });
                            const maxByRating: { [k: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                            orderedComparison.forEach((store) => {
                              ([5, 4, 3, 2, 1] as const).forEach((r) => {
                                if (store.ratingCounts[r] > maxByRating[r]) maxByRating[r] = store.ratingCounts[r];
                              });
                            });
                            const countBg = (count: number, max: number) => {
                              if (count === 0 || max === 0) return { backgroundColor: '#ffffff', color: undefined };
                              const t = Math.min(1, count / max);
                              const r = Math.round(240 - t * 203);
                              const g = Math.round(253 - t * 154);
                              const b = Math.round(244 - t * 9);
                              const bg = `rgb(${r},${g},${b})`;
                              return {
                                backgroundColor: bg,
                                color: t >= 0.5 ? '#fff' : undefined
                              };
                            };
                            return orderedComparison.map((store) => (
                              <tr key={store.storeId} className="hover:bg-gray-50/80">
                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getStoreNameCellClass(store.storeName)}`}>
                                  {store.storeName}
                                </td>
                                {([5, 4, 3, 2, 1] as const).map((rating) => {
                                  const count = store.ratingCounts[rating];
                                  const max = maxByRating[rating];
const style = countBg(count, max);
                                    return (
                                    <td
                                      key={rating}
                                      className="px-6 py-4 whitespace-nowrap text-sm text-center cursor-pointer transition-colors"
                                      style={style}
                                      onClick={() => count > 0 && openReviewPopup(store.storeId, store.storeName, rating)}
                                    >
                                      {count.toLocaleString()}
                                    </td>
                                  );
                                })}
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Store by Period Table */}
                  {data.storeByPeriod && data.storeByPeriod.periodKeys.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6 mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        期間別
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200" style={{ width: 'max-content' }}>
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-gray-50 z-10">
                                店舗名
                              </th>
                              {data.storeByPeriod.periodKeys.map((key) => {
                                const date = new Date(key);
                                const label =
                                  granularity === 'MONTH'
                                    ? `${date.getMonth() + 1}月`
                                    : `${date.getMonth() + 1}/${date.getDate()}`;
                                return (
                                  <th
                                    key={key}
                                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                  >
                                    {label}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                              const order = sortStoresByRegion(
                                data.storeByPeriod!.rows.map((r) => ({ id: r.storeId, name: r.storeName }))
                              ).map((s) => s.id);
                              const ordered = [...data.storeByPeriod!.rows].sort((a, b) => {
                                const ai = order.indexOf(a.storeId);
                                const bi = order.indexOf(b.storeId);
                                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                              });
                              const maxByPeriod: Record<string, number> = {};
                              data.storeByPeriod!.periodKeys.forEach((key) => {
                                let max = 0;
                                ordered.forEach((row) => {
                                  const v = row.counts[key] ?? 0;
                                  if (v > max) max = v;
                                });
                                maxByPeriod[key] = max;
                              });
                              const countBg = (count: number, max: number) => {
                                if (count === 0 || max === 0) return { backgroundColor: '#ffffff', color: undefined };
                                const t = Math.min(1, count / max);
                                const r = Math.round(240 - t * 203);
                                const g = Math.round(253 - t * 154);
                                const b = Math.round(244 - t * 9);
                                const bg = `rgb(${r},${g},${b})`;
                                return {
                                  backgroundColor: bg,
                                  color: t >= 0.5 ? '#fff' : undefined
                                };
                              };
                              return ordered.map((row) => (
                                <tr key={row.storeId} className="hover:bg-gray-50/80">
                                  <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium sticky left-0 bg-white z-10 border-r border-gray-100 ${getStoreNameCellClass(row.storeName)}`}>
                                    {row.storeName}
                                  </td>
                                  {data.storeByPeriod!.periodKeys.map((key) => {
                                    const count = row.counts[key] ?? 0;
                                    const max = maxByPeriod[key] ?? 0;
                                    const style = countBg(count, max);
                                    return (
                                      <td
                                        key={key}
                                        className="px-3 py-3 whitespace-nowrap text-sm text-center transition-colors"
                                        style={style}
                                      >
                                        {count.toLocaleString()}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Reviews Tab Content */}
          {activeTab === 'reviews' && (
            <>
              {/* Reviews List */}
              <div className="bg-white rounded-lg shadow">
                {loading && !reviewsData ? (
                  <div className="p-12 text-center">
                    <p className="text-gray-600">Loading...</p>
                  </div>
                ) : reviewsData && reviewsData.reviews.length > 0 ? (
                  <>
                    <div className="p-6 border-b border-gray-200">
                      <p className="text-sm text-gray-600">
                        全 {reviewsData.pagination.totalCount.toLocaleString()} 件中 
                        {((currentPage - 1) * reviewsData.pagination.limit) + 1} - 
                        {Math.min(currentPage * reviewsData.pagination.limit, reviewsData.pagination.totalCount)} 件を表示
                      </p>
                    </div>

                    <div className="divide-y divide-gray-200">
                      {reviewsData.reviews.map((review) => (
                        <div key={review.id} className="p-6 hover:bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">
                                  {review.store.name}
                                </h3>
                                <span className="text-lg">
                                  {getStarRating(review.rating)}
                                </span>
                                <span className="text-sm text-gray-600">
                                  {review.rating}.0
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <span>{review.authorName || '匿名'}</span>
                                <span>•</span>
                                <span>{formatDate(review.createdAt)}</span>
                                <span>•</span>
                                <span>{getRelativeTime(review.createdAt)}</span>
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReviewOnGoogle(review)}
                            >
                              Googleで見る
                            </Button>
                          </div>

                          {review.text && (
                            <div className="text-gray-700 leading-relaxed">
                              {review.text}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {reviewsData.pagination.totalPages > 1 && (
                      <div className="p-6 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            ページ {currentPage} / {reviewsData.pagination.totalPages}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handlePageChange(currentPage - 1)}
                              disabled={currentPage === 1}
                            >
                              前へ
                            </Button>
                            
                            {/* Page numbers */}
                            {Array.from({ length: Math.min(5, reviewsData.pagination.totalPages) }, (_, i) => {
                              let pageNum;
                              if (reviewsData.pagination.totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= reviewsData.pagination.totalPages - 2) {
                                pageNum = reviewsData.pagination.totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? 'default' : 'outline'}
                                  onClick={() => handlePageChange(pageNum)}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                            
                            <Button
                              variant="outline"
                              onClick={() => handlePageChange(currentPage + 1)}
                              disabled={currentPage === reviewsData.pagination.totalPages}
                            >
                              次へ
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-12 text-center">
                    <p className="text-gray-600">
                      指定された条件に一致する口コミが見つかりませんでした。
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Review popup modal */}
      {reviewPopup && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          onClick={closeReviewPopup}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {reviewPopup.storeName} — {getStarRating(reviewPopup.rating)} の口コミ
              </h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 p-1"
                onClick={closeReviewPopup}
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {popupLoading ? (
                <p className="text-gray-500 text-center py-8">読み込み中...</p>
              ) : popupReviews.length === 0 ? (
                <p className="text-gray-500 text-center py-8">口コミはありません</p>
              ) : (
                <ul className="space-y-4">
                  {popupReviews.map((review) => (
                    <li key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <span>{review.authorName || '匿名'}</span>
                        <span>•</span>
                        <span>{formatDate(review.createdAt)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto"
                          onClick={() => openReviewOnGoogle(review)}
                        >
                          Googleで見る
                        </Button>
                      </div>
                      {review.text && (
                        <p className="text-gray-700 leading-relaxed">{review.text}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
