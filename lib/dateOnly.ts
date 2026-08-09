export function formatDateOnly(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function parseDateOnly(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return new Date(value);

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
}

export function validateBirthDate(
  date: Date,
  now = new Date(),
): string | null {
  const selected = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  if (selected.getTime() > today.getTime()) {
    return 'Birth date cannot be in the future.';
  }

  const earliest = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );

  if (selected.getTime() < earliest.getTime()) {
    return 'Enter a birth date within the last 18 years.';
  }

  return null;
}
