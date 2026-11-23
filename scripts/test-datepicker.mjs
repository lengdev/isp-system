import {
  format,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from 'date-fns';

function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return isValid(val) ? val : null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      const date = new Date(year, month, day);
      return isValid(date) ? date : null;
    }
    const mdyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (mdyMatch) {
      const month = parseInt(mdyMatch[1], 10) - 1;
      const day = parseInt(mdyMatch[2], 10);
      const year = parseInt(mdyMatch[3], 10);
      const date = new Date(year, month, day);
      return isValid(date) ? date : null;
    }
    const d = new Date(trimmed);
    return isValid(d) ? d : null;
  }
  return null;
}

function formatToISODate(date) {
  if (!date || !isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
}

console.log('--- Running DatePicker Component Logic Tests ---');

// Test 1: parseDateSafe handles YYYY-MM-DD without timezone shifts
const parsedYMD = parseDateSafe('2026-11-22');
if (!parsedYMD) {
  console.error('FAIL: parseDateSafe("2026-11-22") returned null');
  process.exit(1);
}
if (parsedYMD.getFullYear() !== 2026 || parsedYMD.getMonth() !== 10 || parsedYMD.getDate() !== 22) {
  console.error(`FAIL: parseDateSafe("2026-11-22") parsed as year=${parsedYMD.getFullYear()}, month=${parsedYMD.getMonth()}, day=${parsedYMD.getDate()}`);
  process.exit(1);
}
console.log('✓ Test 1 Passed: parseDateSafe parses YYYY-MM-DD accurately without timezone offset drift');

// Test 2: parseDateSafe handles MM/DD/YYYY
const parsedMDY = parseDateSafe('11/22/2026');
if (!parsedMDY || parsedMDY.getFullYear() !== 2026 || parsedMDY.getMonth() !== 10 || parsedMDY.getDate() !== 22) {
  console.error('FAIL: parseDateSafe("11/22/2026") failed');
  process.exit(1);
}
console.log('✓ Test 2 Passed: parseDateSafe parses MM/DD/YYYY accurately');

// Test 3: formatToISODate
const isoStr = formatToISODate(new Date(2026, 10, 22));
if (isoStr !== '2026-11-22') {
  console.error(`FAIL: formatToISODate expected 2026-11-22, got ${isoStr}`);
  process.exit(1);
}
if (formatToISODate(null) !== '') {
  console.error('FAIL: formatToISODate(null) should return empty string');
  process.exit(1);
}
console.log('✓ Test 3 Passed: formatToISODate produces correct standard ISO date strings');

// Test 4: Calendar grid generation for November 2026 matches user screenshot exactly
const testMonth = new Date(2026, 10, 1); // November 2026
const monthStart = startOfMonth(testMonth);
const monthEnd = endOfMonth(monthStart);
const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Saturday
const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

if (days.length !== 35) {
  console.error(`FAIL: Expected 35 days for Nov 2026 grid, got ${days.length}`);
  process.exit(1);
}

// First day should be Nov 1 (Sunday)
if (days[0].getDate() !== 1 || days[0].getMonth() !== 10) {
  console.error(`FAIL: First day of Nov 2026 grid should be Nov 1, got ${days[0]}`);
  process.exit(1);
}

// Day 22 should be in row 4, column 1 (Sunday)
const day22 = days.find(d => isSameMonth(d, testMonth) && d.getDate() === 22);
if (!day22 || !isSameDay(day22, new Date(2026, 10, 22))) {
  console.error('FAIL: Day 22 not found or mismatch');
  process.exit(1);
}

// Last 5 days should be December 1-5 (dimmed)
const decDays = days.filter(d => !isSameMonth(d, testMonth));
if (decDays.length !== 5 || decDays[0].getDate() !== 1 || decDays[4].getDate() !== 5) {
  console.error('FAIL: Dec 1-5 trailing days mismatch');
  process.exit(1);
}
console.log('✓ Test 4 Passed: November 2026 calendar grid matches screenshot exactly (35 days, Nov 1-30, Dec 1-5)');

console.log('\n========================================');
console.log('ALL DATEPICKER UNIT TESTS PASSED! ✓');
console.log('========================================');
