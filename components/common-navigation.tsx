'use client';

import { Button } from '@/components/ui/button';
import { sortStoresByRegion } from '@/lib/utils';

interface Store {
  id: string;
  name: string;
}

interface CommonNavigationProps {
  stores: Store[];
  selectedStores: string[];
  setSelectedStores: (stores: string[]) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  loading?: boolean;
  onRefresh?: () => void;
  // Dashboard specific props
  granularity?: 'DAY' | 'WEEK' | 'MONTH';
  setGranularity?: (granularity: 'DAY' | 'WEEK' | 'MONTH') => void;
  // Reviews specific props
  sortBy?: 'newest' | 'oldest' | 'rating-high' | 'rating-low';
  setSortBy?: (sortBy: 'newest' | 'oldest' | 'rating-high' | 'rating-low') => void;
  // Selection mode: single for dashboard, multiple for reviews
  singleSelection?: boolean;
  // Tab control
  activeTab?: 'dashboard' | 'reviews';
  setActiveTab?: (tab: 'dashboard' | 'reviews') => void;
}

export default function CommonNavigation({
  stores,
  selectedStores,
  setSelectedStores,
  dateRange,
  setDateRange,
  loading = false,
  onRefresh,
  granularity,
  setGranularity,
  sortBy,
  setSortBy,
  singleSelection = false,
  activeTab = 'dashboard',
  setActiveTab
}: CommonNavigationProps) {
  return (
    <>
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo/Title */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                アメモバ Google口コミモニター
              </h1>
            </div>

            {/* Tab Navigation */}
            {setActiveTab && (
              <nav className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  ダッシュボード
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'reviews'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  口コミ一覧
                </button>
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Fixed Controls */}
      <div id="navigation-controls" className="fixed top-16 left-0 right-0 bg-white shadow-md z-40">
        <div className="max-w-7xl mx-auto p-4">
          {/* Store Filter Buttons */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedStores(['all'])}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  selectedStores.includes('all') 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                全店舗
              </button>
              {sortStoresByRegion(stores).map((store) => (
                <button
                  key={store.id}
                  onClick={() => {
                    if (singleSelection) {
                      // Single selection mode (dashboard): replace current selection
                      setSelectedStores([store.id]);
                    } else {
                      // Multiple selection mode (reviews): toggle behavior
                      if (selectedStores.includes('all')) {
                        setSelectedStores([store.id]);
                      } else if (selectedStores.includes(store.id)) {
                        // If this is the last selected store, select 'all'
                        if (selectedStores.length === 1) {
                          setSelectedStores(['all']);
                        } else {
                          setSelectedStores(selectedStores.filter(id => id !== store.id));
                        }
                      } else {
                        setSelectedStores([...selectedStores, store.id]);
                      }
                    }
                  }}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${
                    selectedStores.includes(store.id) && !selectedStores.includes('all')
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {store.name.replace('アメモバ買取 ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range and Additional Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="date"
                className="p-2 border border-gray-300 rounded-md"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <span className="text-gray-500 font-medium px-2">〜</span>
              <input
                type="date"
                className="p-2 border border-gray-300 rounded-md"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>

            {/* Dashboard: Granularity */}
            {activeTab === 'dashboard' && granularity && setGranularity && (
              <select
                className="p-2 border border-gray-300 rounded-md"
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as 'DAY' | 'WEEK' | 'MONTH')}
              >
                <option value="DAY">日別</option>
                <option value="WEEK">週別</option>
                <option value="MONTH">月別</option>
              </select>
            )}

            {/* Reviews: Sort */}
            {activeTab === 'reviews' && sortBy && setSortBy && (
              <select
                className="p-2 border border-gray-300 rounded-md"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">新しい順</option>
                <option value="oldest">古い順</option>
                <option value="rating-high">評価高い順</option>
                <option value="rating-low">評価低い順</option>
              </select>
            )}

            {/* Refresh Button */}
            {onRefresh && (
              <Button onClick={onRefresh} disabled={loading}>
                {loading ? '更新中...' : '更新'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
