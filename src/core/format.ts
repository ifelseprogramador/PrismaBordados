import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Uma coluna `date` do Postgres (sem hora — `orderDate`, `deliveryDate`,
 * `paymentDueDate`) vem como string `"YYYY-MM-DD"`. `new Date("YYYY-MM-DD")`
 * interpreta isso como meia-noite UTC, que em qualquer fuso atrás de UTC
 * (Brasil inteiro, UTC-3) já virou o dia ANTERIOR quando formatado no
 * horário local — resultado: a data exibida fica um dia a menos que a
 * gravada. Corrigido tratando esse formato como horário LOCAL
 * (`T00:00:00` sem `Z`/offset), nunca UTC. Uma string com hora (ISO
 * completo, de timestamp) continua interpretada normalmente — só datas
 * "puras" precisam do ajuste.
 */
function parseDate(date: Date | string): Date {
  if (typeof date === "string" && DATE_ONLY_PATTERN.test(date)) {
    return new Date(`${date}T00:00:00`);
  }
  return typeof date === "string" ? new Date(date) : date;
}

export function formatDate(date: Date | string): string {
  return format(parseDate(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: Date | string): string {
  return format(parseDate(date), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(parseDate(date), { locale: ptBR, addSuffix: true });
}
