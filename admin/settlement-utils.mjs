export function entrySupplyAmount(entry) {
  const headcount = Math.max(0, Number(entry?.headcount) || 0);
  if (entry?.totalAmount !== undefined && entry?.totalAmount !== null) {
    const stored = Number(entry.totalAmount);
    if (Number.isFinite(stored) && stored >= 0) return Math.round(stored);
  }
  const price = Number(entry?.mealPrice);
  return Math.round((Number.isFinite(price) && price >= 0 ? price : 0) * headcount);
}

/**
 * Build a monthly statement from meal ledger records.
 * VAT is allocated cumulatively by date so the sum of daily tax lines
 * always equals round(monthly taxable supply * 10%).
 */
export function buildMonthlyStatementRows(entries, companyId, startDate, endDate) {
  const daily = new Map();

  for (const entry of entries || []) {
    if (entry?.companyId !== companyId) continue;
    const date = String(entry?.serviceDate || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < startDate || date > endDate) continue;

    const count = Number(entry.headcount);
    if (!Number.isInteger(count) || count <= 0) continue;
    if (entry.mealPeriod !== "lunch" && entry.mealPeriod !== "dinner") continue;

    let day = daily.get(date);
    if (!day) {
      day = { date, lunchPeople: 0, dinnerPeople: 0, people: 0, amount: 0, weightedPrice: 0 };
      daily.set(date, day);
    }

    const supply = entrySupplyAmount(entry);
    const price = Number(entry.mealPrice);
    if (entry.mealPeriod === "dinner") day.dinnerPeople += count;
    else day.lunchPeople += count;
    day.people += count;
    day.amount += supply;
    day.weightedPrice += Number.isFinite(price) && price >= 0 ? price * count : supply;
  }

  const days = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date));
  let cumulativeSupply = 0;
  let cumulativeTax = 0;

  return days.map((day) => {
    cumulativeSupply += day.amount;
    const taxToDate = Math.round(cumulativeSupply * 0.1);
    const tax = taxToDate - cumulativeTax;
    cumulativeTax = taxToDate;
    return {
      ...day,
      unitPrice: day.people ? Math.round(day.weightedPrice / day.people) : 0,
      tax
    };
  });
}
