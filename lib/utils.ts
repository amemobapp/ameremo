export function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP');
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('ja-JP');
}

export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return 'たった今';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}日前`;
  
  return formatDate(date);
}

export function getStarRating(rating: number): string {
  return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
}

export function sortStoresByRegion(stores: Array<{ name: string; id: string }>): Array<{ name: string; id: string }> {
  // Define the order: Amemoba (Tokyo → Chiba → Nagoya), then Sakumoba
  const regionOrder = [
    'アメモバ買取 東京上野本店',
    'アメモバ買取 秋葉原店',
    'アメモバ買取 新宿東南口店',
    'アメモバ買取 柏店',
    'アメモバ買取 大宮マルイ店',
    'アメモバ買取 名古屋大須店',
    'サクモバ 東京秋葉原店',
    'サクモバ 新宿西口店',
    'サクモバ 名古屋大須店'
  ];

  return stores.sort((a, b) => {
    const aIndex = regionOrder.indexOf(a.name);
    const bIndex = regionOrder.indexOf(b.name);
    
    // If both stores are in our predefined order, use that
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If only one is in our order, put the known one first
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // If neither is in our order, sort alphabetically
    return a.name.localeCompare(b.name);
  });
}
