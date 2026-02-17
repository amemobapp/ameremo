'use client';

import { Button } from '@/components/ui/button';
import { sortStoresByRegion } from '@/lib/utils';

interface Store {
  id: string;
  name: string;
}

export type BrandFilter = 'all' | 'AMEMOBA' | 'SAKUMOBA';

interface CommonNavigationProps {
  stores: Store[];
  selectedStores: string[];
  setSelectedStores: (stores: string[]) => void;
  selectedBrand?: BrandFilter;
  setSelectedBrand?: (brand: BrandFilter) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  loading?: boolean;
  onRefresh?: () => void;
  onFetchFromGoogle?: () => void | Promise<void>;
  fetchFromGoogleLoading?: boolean;
  fetchFromGoogleMessage?: string | null;
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

function storeDisplayName(name: string): string {
  if (name.startsWith('アメモバ買取 ')) return name.replace('アメモバ買取 ', '');
  if (name.startsWith('サクモバ ')) return name.replace('サクモバ ', '');
  return name;
}

function storeButtonLabel(name: string): string {
  if (name.startsWith('アメモバ')) return `Am ${storeDisplayName(name)}`;
  if (name.startsWith('サクモバ')) return `Sk ${storeDisplayName(name)}`;
  return storeDisplayName(name);
}

function storeBorderClass(name: string): string {
  if (name.startsWith('アメモバ')) return 'border-2 border-green-500';
  if (name.startsWith('サクモバ')) return 'border-2 border-orange-500';
  return 'border border-gray-300';
}

function storeActiveBgClass(name: string): string {
  if (name.startsWith('アメモバ')) return 'bg-green-500 text-white';
  if (name.startsWith('サクモバ')) return 'bg-orange-500 text-white';
  return 'bg-blue-500 text-white';
}

export default function CommonNavigation({
  stores,
  selectedStores,
  setSelectedStores,
  selectedBrand = 'all',
  setSelectedBrand,
  dateRange,
  setDateRange,
  loading = false,
  onRefresh,
  onFetchFromGoogle,
  fetchFromGoogleLoading = false,
  fetchFromGoogleMessage,
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
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">
                アメモバ Google口コミモニター
              </h1>
              {/* Brand buttons */}
              {setSelectedBrand && (
                <div className="flex items-center gap-1">
                  {(['all', 'AMEMOBA', 'SAKUMOBA'] as const).map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => {
                        setSelectedBrand(brand);
                        setSelectedStores(['all']);
                      }}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        selectedBrand === brand
                          ? brand === 'all'
                            ? 'bg-gray-600 text-white border-gray-600'
                            : brand === 'AMEMOBA'
                              ? 'bg-green-500 text-white border-green-500'
                              : 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {brand === 'all' ? 'すべて' : brand === 'AMEMOBA' ? 'Am' : 'Sk'}
                    </button>
                  ))}
                </div>
              )}
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
            <div className="flex flex-wrap gap-1.5">
              {sortStoresByRegion(stores).map((store) => (
                <button
                  key={store.id}
                  onClick={() => {
                    if (singleSelection) {
                      // Single selection: click active (selected) store → switch to all (全選択)
                      if (selectedStores.includes(store.id)) {
                        setSelectedStores(['all']);
                      } else {
                        setSelectedStores([store.id]);
                      }
                    } else {
                      // Multiple selection mode (reviews): toggle behavior
                      if (selectedStores.includes('all')) {
                        setSelectedStores([store.id]);
                      } else if (selectedStores.includes(store.id)) {
                        // If this is the last selected store, select 'all' (全選択)
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
                  className={`px-2 py-1 text-xs rounded transition-colors ${storeBorderClass(store.name)} ${
                    selectedStores.includes(store.id) && !selectedStores.includes('all')
                      ? storeActiveBgClass(store.name)
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {storeButtonLabel(store.name)}
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
            {/* 口コミをGoogleから取得 */}
            {onFetchFromGoogle && (
              <Button
                onClick={onFetchFromGoogle}
                disabled={fetchFromGoogleLoading}
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50"
              >
                {fetchFromGoogleLoading ? '取得中...' : '口コミデータを再取得'}
              </Button>
            )}
            {fetchFromGoogleMessage && (
              <span className="text-sm text-gray-600">{fetchFromGoogleMessage}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
