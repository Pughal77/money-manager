export interface DonutSliceInput {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface ComputedDonutSlice extends DonutSliceInput {
  percentage: number; // 0..100
  startAngleDeg: number;
  endAngleDeg: number;
  pathData: string;
  labelX: number;
  labelY: number;
  showLabel: boolean;
}

export interface ComputedDonutChart {
  total: number;
  isSingleFullRing: boolean;
  slices: ComputedDonutSlice[];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDegFromTopClockwise: number) {
  const angleRad = ((angleDegFromTopClockwise - 90) * Math.PI) / 180;
  return {
    x: Number((cx + r * Math.cos(angleRad)).toFixed(3)),
    y: Number((cy + r * Math.sin(angleRad)).toFixed(3)),
  };
}

export function describeDonutArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const clampedEnd = Math.min(endAngleDeg, startAngleDeg + 359.99);
  const outerStart = polarToCartesian(cx, cy, outerR, startAngleDeg);
  const outerEnd = polarToCartesian(cx, cy, outerR, clampedEnd);
  const innerEnd = polarToCartesian(cx, cy, innerR, clampedEnd);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngleDeg);
  const largeArcFlag = clampedEnd - startAngleDeg > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

export function computeDonutSlices(
  items: DonutSliceInput[],
  cx: number = 110,
  cy: number = 110,
  outerRadius: number = 95,
  innerRadius: number = 46
): ComputedDonutChart {
  const active = items.filter((item) => item.value > 0);
  const total = active.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0 || active.length === 0) {
    return { total: 0, isSingleFullRing: false, slices: [] };
  }

  const midR = (outerRadius + innerRadius) / 2;

  if (active.length === 1) {
    const only = active[0];
    const labelPos = polarToCartesian(cx, cy, midR, 180);
    return {
      total,
      isSingleFullRing: true,
      slices: [
        {
          ...only,
          percentage: 100,
          startAngleDeg: 0,
          endAngleDeg: 360,
          pathData: describeDonutArc(cx, cy, outerRadius, innerRadius, 0, 359.99),
          labelX: labelPos.x,
          labelY: labelPos.y,
          showLabel: true,
        },
      ],
    };
  }

  let currentAngle = 0;
  const slices: ComputedDonutSlice[] = active.map((item) => {
    const fraction = item.value / total;
    const sweep = fraction * 360;
    const startAngleDeg = currentAngle;
    const endAngleDeg = currentAngle + sweep;
    currentAngle = endAngleDeg;

    const midAngle = startAngleDeg + sweep / 2;
    const labelPos = polarToCartesian(cx, cy, midR, midAngle);
    const percentage = Math.round(fraction * 1000) / 10;

    return {
      ...item,
      percentage,
      startAngleDeg,
      endAngleDeg,
      pathData: describeDonutArc(cx, cy, outerRadius, innerRadius, startAngleDeg, endAngleDeg),
      labelX: labelPos.x,
      labelY: labelPos.y,
      showLabel: percentage >= 10,
    };
  });

  return {
    total,
    isSingleFullRing: false,
    slices,
  };
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseYmd(dateStr: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { year: y || 2026, month: m || 1, day: d || 1 };
}

function formatYmd(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

export interface PeriodRangeInfo {
  monthLabel: string; // e.g. "Nov"
  fullMonthYearLabel: string; // e.g. "November 2026"
  rangeLabel: string; // e.g. "01/11 - 30/11"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export function getMonthDateRange(yearMonth: string): PeriodRangeInfo {
  const [yStr, mStr] = yearMonth.split('-');
  const year = Number(yStr) || 2026;
  const month = Number(mStr) || 1;
  const lastDay = daysInMonth(year, month);
  const mm = String(month).padStart(2, '0');
  const ddLast = String(lastDay).padStart(2, '0');
  return {
    monthLabel: SHORT_MONTHS[month - 1] ?? 'Jan',
    fullMonthYearLabel: `${FULL_MONTHS[month - 1] ?? 'January'} ${year}`,
    rangeLabel: `01/${mm} - ${ddLast}/${mm}`,
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${ddLast}`,
  };
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  const [yStr, mStr] = yearMonth.split('-');
  const year = Number(yStr) || 2026;
  const month = Number(mStr) || 1;
  const d = new Date(Date.UTC(year, month - 1 + deltaMonths, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function shiftDateByDays(dateStr: string, deltaDays: number): string {
  const { year, month, day } = parseYmd(dateStr);
  const dt = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function getWeekDateRange(anchorDate: string): PeriodRangeInfo {
  const { year, month, day } = parseYmd(anchorDate);
  const dt = new Date(Date.UTC(year, month - 1, day));
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(Date.UTC(year, month - 1, day + diffToMonday));
  const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));

  const startDate = formatYmd(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate());
  const endDate = formatYmd(sunday.getUTCFullYear(), sunday.getUTCMonth() + 1, sunday.getUTCDate());
  const d1 = String(monday.getUTCDate()).padStart(2, '0');
  const m1 = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const d2 = String(sunday.getUTCDate()).padStart(2, '0');
  const m2 = String(sunday.getUTCMonth() + 1).padStart(2, '0');

  return {
    monthLabel: SHORT_MONTHS[monday.getUTCMonth()] ?? 'Jan',
    fullMonthYearLabel: `${FULL_MONTHS[monday.getUTCMonth()] ?? 'January'} ${monday.getUTCFullYear()}`,
    rangeLabel: `${d1}/${m1} - ${d2}/${m2}`,
    startDate,
    endDate,
  };
}

export interface CalendarCell {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  inCurrentMonth: boolean;
}

/**
 * Builds a 6-week (42-cell) Monday-first calendar grid (`Mon` .. `Sun`) matching the Calendar reference screen.
 */
export function buildCalendarMonthGrid(yearMonth: string, mondayFirst: boolean = true): CalendarCell[] {
  const [yStr, mStr] = yearMonth.split('-');
  const year = Number(yStr) || 2026;
  const month = Number(mStr) || 1;
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const dow = firstOfMonth.getUTCDay(); // 0=Sun .. 6=Sat
  const leadingDays = mondayFirst ? (dow === 0 ? 6 : dow - 1) : dow;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const dayOffset = i - leadingDays + 1;
    const cellDate = new Date(Date.UTC(year, month - 1, dayOffset));
    const cYear = cellDate.getUTCFullYear();
    const cMonth = cellDate.getUTCMonth() + 1;
    const cDay = cellDate.getUTCDate();
    cells.push({
      date: formatYmd(cYear, cMonth, cDay),
      dayNumber: cDay,
      inCurrentMonth: cYear === year && cMonth === month,
    });
  }
  return cells;
}

/**
 * Formats "2026-11-13" -> "13 Nov (Fri)"
 */
export function formatDayCardHeader(dateStr: string): string {
  const { year, month, day } = parseYmd(dateStr);
  const dt = new Date(Date.UTC(year, month - 1, day));
  const wd = SHORT_WEEKDAYS[dt.getUTCDay()] ?? 'Mon';
  const mon = SHORT_MONTHS[month - 1] ?? 'Jan';
  return `${day} ${mon} (${wd})`;
}

/**
 * Formats "2026-11-20" -> "20 Nov 2026"
 */
export function formatDisplayDate(dateStr: string): string {
  const { year, month, day } = parseYmd(dateStr);
  const mon = SHORT_MONTHS[month - 1] ?? 'Jan';
  return `${day} ${mon} ${year}`;
}

/**
 * Formats "2026-11-20" -> "Fri, 20 Nov"
 */
export function formatPickerBannerDate(dateStr: string): string {
  const { year, month, day } = parseYmd(dateStr);
  const dt = new Date(Date.UTC(year, month - 1, day));
  const wd = SHORT_WEEKDAYS[dt.getUTCDay()] ?? 'Mon';
  const mon = SHORT_MONTHS[month - 1] ?? 'Jan';
  return `${wd}, ${day} ${mon}`;
}
