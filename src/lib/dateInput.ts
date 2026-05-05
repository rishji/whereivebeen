export type ParsedDateInput = { isoDate: string } | { error: string };

const REAL_DATE_ERROR = "Enter a real date in mm-dd-yyyy format.";

export function assistDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const month = digits.slice(0, 2);
  const day = digits.slice(2, 4);
  const year = digits.slice(4);

  return [month, day, year].filter(Boolean).join("-");
}

export function parseDateInput(value: string): ParsedDateInput {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);

  if (!match) {
    return { error: REAL_DATE_ERROR };
  }

  const [, monthText, dayText, yearText] = match;
  const month = Number(monthText);
  const day = Number(dayText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { error: REAL_DATE_ERROR };
  }

  return { isoDate: `${yearText}-${monthText}-${dayText}` };
}

export function formatIsoDateForInput(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");

  return `${month}-${day}-${year}`;
}

export function isDateRangeValid(startDate: string, endDate: string): boolean {
  return startDate <= endDate;
}
