// Ukrainian formatting shared by the map panel, quest cards and profile.

const dateTimeFormat = new Intl.DateTimeFormat('uk-UA', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Kyiv',
});

const dateFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Kyiv' });

export const formatDateTime = (iso: string | null) => (iso ? dateTimeFormat.format(new Date(iso)) : '—');

export const formatDate = (iso: string) => dateFormat.format(new Date(iso));

export const formatDuration = (hours: number | null) => (hours === null ? '—' : `${hours.toLocaleString('uk-UA')} год`);
