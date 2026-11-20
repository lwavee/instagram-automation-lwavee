export const publishingTimezone = "Asia/Kolkata";

const localInput = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function istToUtc(value: string) {
  if (!localInput.test(value)) throw new Error("Enter a valid date and time in IST.");
  const date = new Date(value + ":00+05:30");
  if (Number.isNaN(date.getTime()) || formatIstInput(date) !== value) {
    throw new Error("Enter a valid date and time in IST.");
  }
  return date.toISOString();
}

export function formatIstInput(date: string | Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: publishingTimezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(date));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return part("year") + "-" + part("month") + "-" + part("day") + "T" + part("hour") + ":" + part("minute");
}

