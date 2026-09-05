const PT_MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseLocalDate(dateStr?: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m, day: d };
}

export function formatDueDateHuman(
  dueDateStr: string,
  todayStr: string
): {
  formattedDate: string;
  badgeLabel: string;
  urgency: "overdue" | "today" | "tomorrow" | "soon" | "normal";
} {
  const parsed = parseLocalDate(dueDateStr);
  const formattedDate = parsed
    ? `${parsed.day} ${PT_MONTHS_SHORT[parsed.month - 1]} ${parsed.year}`
    : dueDateStr;

  if (dueDateStr < todayStr) {
    // Calculate days overdue
    const d1 = new Date(dueDateStr + "T12:00:00");
    const d2 = new Date(todayStr + "T12:00:00");
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
    return {
      formattedDate,
      badgeLabel: diffDays === 1 ? "Atrasada há 1 dia" : `Atrasada há ${diffDays} dias`,
      urgency: "overdue"
    };
  }

  if (dueDateStr === todayStr) {
    return {
      formattedDate,
      badgeLabel: "Vence hoje",
      urgency: "today"
    };
  }

  const d1 = new Date(todayStr + "T12:00:00");
  const d2 = new Date(dueDateStr + "T12:00:00");
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return {
      formattedDate,
      badgeLabel: "Vence amanhã",
      urgency: "tomorrow"
    };
  }

  if (diffDays <= 7) {
    return {
      formattedDate,
      badgeLabel: `Vence em ${diffDays} dias`,
      urgency: "soon"
    };
  }

  return {
    formattedDate,
    badgeLabel: formattedDate,
    urgency: "normal"
  };
}

