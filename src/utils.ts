/**
 * Formatting helpers for SomLuul Application
 */

export function formatTimeAgo(dateString: string, lang: string = 'so'): string {
  if (!dateString) return lang === 'so' ? 'Hada' : 'now';
  
  // Backwards compatibility with pre-seeded relative times
  if (!dateString.includes('T') && isNaN(Date.parse(dateString))) {
    return dateString;
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return dateString;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  // Guard against slight clock skew
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const isSomali = lang === 'so';

  if (diffSec < 10) {
    return isSomali ? 'Hada' : 'now';
  }
  if (diffSec < 60) {
    return isSomali ? `${diffSec} ilbiriqsi` : `${diffSec}s`;
  }
  if (diffMin < 60) {
    return isSomali ? `${diffMin} daqiiqo` : `${diffMin}m`;
  }
  if (diffHour < 24) {
    return isSomali ? `${diffHour} saacood` : `${diffHour}h`;
  }
  if (diffDay < 30) {
    return isSomali ? `${diffDay} maalmood` : `${diffDay}d`;
  }
  if (diffMonth < 12) {
    return isSomali ? `${diffMonth} bilood` : `${diffMonth}mo`;
  }
  return isSomali ? `${diffYear} sano` : `${diffYear}y`;
}
