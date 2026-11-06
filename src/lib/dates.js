/**
 * Date calculations and Arabic formatting respecting user timezone.
 */

export function getTodayDateString(timeZone = 'Africa/Cairo') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Returns "YYYY-MM-DD"
  } catch {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function getDateOffset(baseDate, daysOffset) {
  const d = new Date(`${baseDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + daysOffset);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatArabicDate(dateStr, includeDayName = true) {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const options = {
      weekday: includeDayName ? 'long' : undefined,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Intl.DateTimeFormat('ar-EG', options).format(date);
  } catch {
    return dateStr;
  }
}

export function getRelativeDayLabel(targetDate, todayDate) {
  if (targetDate === todayDate) return 'اليوم';
  if (targetDate === getDateOffset(todayDate, -1)) return 'أمس';
  if (targetDate === getDateOffset(todayDate, -2)) return 'قبل يومين';
  return formatArabicDate(targetDate, true);
}

export function getPastDaysList(todayDate, count = 7) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const date = getDateOffset(todayDate, -i);
    list.push({
      date,
      label: i === 0 ? 'اليوم' : i === 1 ? 'أمس' : formatArabicDate(date, false),
      isToday: i === 0,
    });
  }
  return list;
}

export function getDayOfWeek(dateStr) {
  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay();
}
