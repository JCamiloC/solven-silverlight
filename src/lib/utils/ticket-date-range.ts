/** Límites del día en hora local (misma lógica que la tabla de tickets). */
export function getLocalDayBounds(startDate: string, endDate: string) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

export function isCreatedAtInLocalDateRange(
  createdAt: string,
  startDate: string,
  endDate: string
): boolean {
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false

  const { start, end } = getLocalDayBounds(startDate, endDate)
  return created >= start.getTime() && created <= end.getTime()
}
