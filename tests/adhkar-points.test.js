import { describe, expect, it } from 'vitest';
import { calculateUserPoints } from '../src/lib/points.js';

describe('Adhkar category points', () => {
  it('awards both morning and evening categories from one daily activity log', () => {
    const activities = [{ id: 'adhkar', title: 'أذكار الصباح والمساء' }];
    const logs = [{
      activityId: 'adhkar',
      amount: 1,
      completed: true,
      details: { completedCategories: { الصباح: true, المساء: true } },
    }];

    expect(calculateUserPoints(logs, activities, { currentStreak: 0 })).toMatchObject({
      worshipPoints: 50,
      adhkarCount: 2,
    });
  });

  it('keeps legacy adhkar logs worth one category', () => {
    const activities = [{ id: 'adhkar', title: 'أذكار' }];
    expect(calculateUserPoints([{ activityId: 'adhkar', amount: 1 }], activities, { currentStreak: 0 }))
      .toMatchObject({ worshipPoints: 25, adhkarCount: 1 });
  });

  it('uses unique Quran pages instead of an overbroad page range', () => {
    const activities = [{ id: 'reading', type: 'read' }];
    const logs = [{
      activityId: 'reading',
      amount: 2,
      details: { pagesRead: [10, 10, 11], pagesCount: 2 },
    }];

    expect(calculateUserPoints(logs, activities, { currentStreak: 0 })).toMatchObject({
      worshipPoints: 20,
      quranPagesCount: 2,
    });
  });
});
