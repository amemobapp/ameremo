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

/** ブランド順（アメモバ→サクモバ）、続けて地域順で店舗を並べる */
export function sortStoresByRegion(stores: Array<{ name: string; id: string }>): Array<{ name: string; id: string }> {
  const brandOrder = (name: string) => {
    if (name.startsWith('アメモバ')) return 0;
    if (name.startsWith('サクモバ')) return 1;
    return 2;
  };
  const regionOrder = ['上野', '秋葉原', '新宿', '柏', '大宮', '名古屋'];
  const getRegionIndex = (name: string) => {
    const i = regionOrder.findIndex((r) => name.includes(r));
    return i === -1 ? 99 : i;
  };

  return [...stores].sort((a, b) => {
    const brandA = brandOrder(a.name);
    const brandB = brandOrder(b.name);
    if (brandA !== brandB) return brandA - brandB;
    const regionA = getRegionIndex(a.name);
    const regionB = getRegionIndex(b.name);
    if (regionA !== regionB) return regionA - regionB;
    return a.name.localeCompare(b.name);
  });
}
