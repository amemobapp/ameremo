'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatStoreNameShort, sortStoresByRegion } from '@/lib/utils';
import { APP_VERSION } from '@/lib/version';
import { BarChart2, List, Filter, ChevronDown, X } from 'lucide-react';

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
  granularity?: 'DAY' | 'WEEK' | 'MONTH';
  setGranularity?: (granularity: 'DAY' | 'WEEK' | 'MONTH') => void;
  sortBy?: 'newest' | 'oldest' | 'rating-high' | 'rating-low';
  setSortBy?: (sortBy: 'newest' | 'oldest' | 'rating-high' | 'rating-low') => void;
  singleSelection?: boolean;
  activeTab?: 'dashboard' | 'reviews';
  setActiveTab?: (tab: 'dashboard' | 'reviews') => void;
}

function storeButtonLabel(name: string): string {
  return formatStoreNameShort(name);
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
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);

  return (
    <>
      {/* Fixed header: PC/SP 共通 3-row layout */}
      <div id="navigation-controls" className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Row 1: Title + Icon nav (集計 / 口コミ一覧 / フィルター) */}
          <div className="flex justify-between items-center py-3 min-h-[3rem]">
            <Link href="/" className="inline-flex items-start gap-1.5 shrink-0 hover:opacity-80 transition-opacity group" aria-label="アメレモ トップへ">
              <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">アメレモ</h1>
              <span className="inline-flex items-center justify-center text-[9px] sm:text-[11px] font-medium px-1 py-0.5 rounded bg-gray-200 text-gray-600 group-hover:bg-gray-300 leading-none mt-0.5" aria-label={`バージョン ${APP_VERSION}`}>v{APP_VERSION}</span>
            </Link>
            {setActiveTab && (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  aria-label="集計"
                  className={`p-2 rounded-full transition-colors touch-manipulation ${
                    activeTab === 'dashboard'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <BarChart2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  aria-label="口コミ一覧"
                  className={`p-2 rounded-full transition-colors touch-manipulation ${
                    activeTab === 'reviews'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <List className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setFilterModalOpen((v) => !v)}
                    aria-label="日付・フィルター"
                    aria-expanded={filterModalOpen}
                    aria-haspopup="true"
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors touch-manipulation"
                  >
                    <Filter className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  {filterModalOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setFilterModalOpen(false)}
                        aria-hidden
                      />
                      <div
                        className="absolute right-0 top-full mt-1 z-50 w-[min(320px,calc(100vw-24px))] max-h-[min(85vh,480px)] overflow-hidden flex flex-col rounded-lg border border-gray-200 bg-white shadow-xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="filter-modal-title"
                      >
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center shrink-0">
                          <h2 id="filter-modal-title" className="text-sm font-semibold text-gray-900">
                            日付・フィルター
                          </h2>
                          <button
                            type="button"
                            onClick={() => setFilterModalOpen(false)}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 shrink-0"
                            aria-label="閉じる"
                          >
                            <X className="w-4 h-4" strokeWidth={2.5} />
                          </button>
                        </div>
                        <div className="p-3 space-y-4 overflow-y-auto flex-1">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">期間</label>
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="date"
                                className="flex-1 min-w-[120px] p-2 border border-gray-300 rounded-md text-sm"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                              />
                              <span className="text-gray-500">〜</span>
                              <input
                                type="date"
                                className="flex-1 min-w-[120px] p-2 border border-gray-300 rounded-md text-sm"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                              />
                            </div>
                          </div>

                          {activeTab === 'dashboard' && granularity && setGranularity && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">集計粒度</label>
                              <div className="flex flex-wrap gap-2">
                                {(['DAY', 'WEEK', 'MONTH'] as const).map((g) => (
                                  <button
                                    key={g}
                                    type="button"
                                    onClick={() => setGranularity(g)}
                                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors touch-manipulation ${
                                      granularity === g
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {g === 'DAY' ? '日別' : g === 'WEEK' ? '週別' : '月別'}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {activeTab === 'reviews' && sortBy && setSortBy && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">並び順</label>
                              <div className="flex flex-wrap gap-2">
                                {([
                                  { value: 'newest' as const, label: '新しい順' },
                                  { value: 'oldest' as const, label: '古い順' },
                                  { value: 'rating-high' as const, label: '評価高い順' },
                                  { value: 'rating-low' as const, label: '評価低い順' }
                                ]).map(({ value, label }) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => setSortBy(value)}
                                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors touch-manipulation ${
                                      sortBy === value
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col gap-2 pt-2">
                            {onRefresh && (
                              <Button onClick={() => { onRefresh(); setFilterModalOpen(false); }} disabled={loading} className="w-full">
                                {loading ? '更新中...' : '更新'}
                              </Button>
                            )}
                            {onFetchFromGoogle && (
                              <Button
                                onClick={async () => { await onFetchFromGoogle(); setFilterModalOpen(false); }}
                                disabled={fetchFromGoogleLoading}
                                variant="outline"
                                className="w-full border-green-600 text-green-700 hover:bg-green-50"
                              >
                                {fetchFromGoogleLoading ? '取得中...' : '口コミ再取得'}
                              </Button>
                            )}
                            {fetchFromGoogleMessage && (
                              <p className="text-xs text-gray-600 font-annotation">{fetchFromGoogleMessage}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: すべて / アメ(モバ) / サク(モバ) — SPは店舗を同列に */}
          {setSelectedBrand && (
            <div className="relative">
              <div className="flex items-center gap-2 pb-2 flex-wrap">
                {(['all', 'AMEMOBA', 'SAKUMOBA'] as const).map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => {
                      setSelectedBrand(brand);
                      setSelectedStores(['all']);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors touch-manipulation ${
                      selectedBrand === brand
                        ? brand === 'all'
                          ? 'bg-gray-600 text-white border-gray-600'
                          : brand === 'AMEMOBA'
                            ? 'bg-green-500 text-white border-green-500'
                            : 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {brand === 'all'
                      ? 'すべて'
                      : brand === 'AMEMOBA'
                        ? (<><span className="sm:hidden">アメ</span><span className="hidden sm:inline">アメモバ</span></>)
                        : (<><span className="sm:hidden">サク</span><span className="hidden sm:inline">サクモバ</span></>)}
                  </button>
                ))}
                {/* SP: 店舗を同列に（右端まで幅を伸ばす） */}
                <div className="sm:hidden flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => setStoreModalOpen((v) => !v)}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation w-full min-w-0"
                    aria-label="店舗を選択"
                    aria-expanded={storeModalOpen}
                    aria-haspopup="true"
                  >
                    <span className="truncate min-w-0">
                      {selectedStores.includes('all') || selectedStores.length === 0
                        ? '店舗を選択'
                        : selectedStores.length === 1
                          ? storeButtonLabel(stores.find((s) => s.id === selectedStores[0])?.name ?? '店舗')
                          : `店舗（${selectedStores.length}件）`}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                  </button>
                </div>
              </div>
              {/* SP: 店舗ドロップダウン（右端まで幅いっぱい） */}
              {storeModalOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 sm:hidden"
                    onClick={() => setStoreModalOpen(false)}
                    aria-hidden
                  />
                  <div
                    className="sm:hidden absolute left-0 right-0 top-full mt-1 z-50 max-h-[min(70vh,400px)] overflow-hidden flex flex-col rounded-lg border border-gray-200 bg-white shadow-xl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="store-modal-title"
                  >
                      <div className="p-3 border-b border-gray-100 flex justify-between items-center shrink-0">
                        <h2 id="store-modal-title" className="text-sm font-semibold text-gray-900">
                          店舗を選択
                        </h2>
                        <button
                          type="button"
                          onClick={() => setStoreModalOpen(false)}
                          className="min-w-[3rem] min-h-[3rem] flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 touch-manipulation"
                          aria-label="閉じる"
                        >
                          <span className="text-6xl leading-none">×</span>
                        </button>
                      </div>
                      <div className="p-3 overflow-y-auto flex-1">
                        <div className="flex flex-wrap gap-2">
                          {sortStoresByRegion(stores).map((store) => (
                            <button
                              key={store.id}
                              onClick={() => {
                                if (singleSelection) {
                                  if (selectedStores.includes(store.id)) {
                                    setSelectedStores(['all']);
                                  } else {
                                    setSelectedStores([store.id]);
                                    setStoreModalOpen(false);
                                  }
                                } else {
                                  if (selectedStores.includes('all')) {
                                    setSelectedStores([store.id]);
                                  } else if (selectedStores.includes(store.id)) {
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
                              className={`px-3 py-2 text-sm rounded-full transition-colors touch-manipulation min-h-[2.5rem] ${storeBorderClass(store.name)} ${
                                selectedStores.includes(store.id) && !selectedStores.includes('all')
                                  ? storeActiveBgClass(store.name)
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {storeButtonLabel(store.name)}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStores(['all']);
                            setStoreModalOpen(false);
                          }}
                          className="mt-3 w-full py-2 text-sm rounded-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                        >
                          すべての店舗
                        </button>
                      </div>
                    </div>
                </>
              )}
            </div>
          )}

          {/* Row 3: Store chips (PC only) */}
          <div className="hidden sm:flex flex-wrap gap-1.5 pb-3">
            {sortStoresByRegion(stores).map((store) => (
              <button
                key={store.id}
                onClick={() => {
                  if (singleSelection) {
                    if (selectedStores.includes(store.id)) {
                      setSelectedStores(['all']);
                    } else {
                      setSelectedStores([store.id]);
                    }
                  } else {
                    if (selectedStores.includes('all')) {
                      setSelectedStores([store.id]);
                    } else if (selectedStores.includes(store.id)) {
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
                className={`px-2.5 py-1.5 text-xs rounded-full transition-colors touch-manipulation min-h-[2rem] ${storeBorderClass(store.name)} ${
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
      </div>

    </>
  );
}
