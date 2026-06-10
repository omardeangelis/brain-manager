/** Replace the scaffold's `__TODAY__` placeholders with the local date (ISO YYYY-MM-DD). */
export const stampToday = (content: string, now: Date = new Date()): string => {
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-")
  return content.replaceAll("__TODAY__", today)
}
