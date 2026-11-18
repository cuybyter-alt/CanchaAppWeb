import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

export const DEFAULT_VENUE_TIMEZONE = 'America/Bogota';

const FALLBACK_TIMEZONES = [
  'America/Bogota',
  'America/Argentina/Buenos_Aires',
  'America/Cancun',
  'America/Chicago',
  'America/Lima',
  'America/Los_Angeles',
  'America/Mexico_City',
  'America/New_York',
  'America/Panama',
  'America/Santiago',
  'America/Sao_Paulo',
  'America/Toronto',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Berlin',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Paris',
  'UTC',
];

export function isValidIanaTimezone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function getDeviceTimezone(): string | null {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidIanaTimezone(timezone) ? timezone : null;
  } catch {
    return null;
  }
}

export function resolveTimezone(
  value: string | null | undefined,
  fallback: string = DEFAULT_VENUE_TIMEZONE,
): string {
  return isValidIanaTimezone(value) ? value : fallback;
}

export function getTimezoneOptions(current?: string | null): string[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
  ).supportedValuesOf?.('timeZone');

  const options = new Set(supported && supported.length > 0 ? supported : FALLBACK_TIMEZONES);
  const deviceTimezone = getDeviceTimezone();

  if (deviceTimezone) options.add(deviceTimezone);
  if (current && isValidIanaTimezone(current)) options.add(current);

  return [...options].sort((a, b) => a.localeCompare(b));
}

function toZonedDate(value: string | Date, timezone: string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  try {
    return toZonedTime(date, resolveTimezone(timezone));
  } catch {
    return null;
  }
}

export function formatTime24(
  value: string | Date,
  timezone: string = DEFAULT_VENUE_TIMEZONE,
): string {
  const date = toZonedDate(value, timezone);
  return date ? format(date, 'HH:mm') : '—';
}

export function formatDateLabel(
  value: string | Date,
  timezone: string = DEFAULT_VENUE_TIMEZONE,
): string {
  const date = toZonedDate(value, timezone);
  return date ? format(date, 'd MMM yyyy', { locale: es }) : '—';
}

export function formatEndTime24(
  value: string | Date,
  timezone: string = DEFAULT_VENUE_TIMEZONE,
): string {
  const label = formatTime24(value, timezone);
  return label === '00:00' ? '23:59' : label;
}

export function formatTimeRange24(
  start: string | Date,
  end: string | Date,
  timezone: string = DEFAULT_VENUE_TIMEZONE,
): string {
  const startLabel = formatTime24(start, timezone);
  const endLabel = formatEndTime24(end, timezone);
  if (startLabel === '—' || endLabel === '—') return '—';
  return `${startLabel} - ${endLabel}`;
}

export function getTodayISO(timezone: string = DEFAULT_VENUE_TIMEZONE): string {
  const today = toZonedDate(new Date(), timezone);
  return today ? format(today, 'yyyy-MM-dd') : new Date().toISOString().slice(0, 10);
}

export function getMinutesInTimezone(
  value: string | Date,
  timezone: string = DEFAULT_VENUE_TIMEZONE,
): number | null {
  const date = toZonedDate(value, timezone);
  return date ? date.getHours() * 60 + date.getMinutes() : null;
}

export function getNowMinutesInTimezone(
  timezone: string = DEFAULT_VENUE_TIMEZONE,
): number {
  return getMinutesInTimezone(new Date(), timezone) ?? 0;
}
