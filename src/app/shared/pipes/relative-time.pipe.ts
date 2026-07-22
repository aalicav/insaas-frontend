import { Pipe, PipeTransform } from '@angular/core';

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

const ABSOLUTE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const FULL_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * "há 5 min", "há 2 h", "ontem", "há 3 dias"; acima de 7 dias vira data absoluta.
 * Use `fullDate()` no atributo `title` para expor a data completa.
 */
@Pipe({ name: 'relativeTime', standalone: true })
export class RelativeTimePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined, fallback = '—'): string {
    const date = toDate(value);
    if (!date) return fallback;

    const diff = Date.now() - date.getTime();
    if (diff < MINUTE) return 'agora mesmo';
    if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`;
    if (diff < DAY) {
      const hours = Math.floor(diff / HOUR);
      return hours === 1 ? 'há 1 h' : `há ${hours} h`;
    }
    const days = Math.floor(diff / DAY);
    if (days === 1) return 'ontem';
    if (days <= 7) return `há ${days} dias`;
    return ABSOLUTE_FORMAT.format(date);
  }
}

export function fullDate(value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  return date ? FULL_FORMAT.format(date) : '';
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
