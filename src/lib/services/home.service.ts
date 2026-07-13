import { db } from "@/lib/db";
import { announcements, reminders } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { format } from "date-fns";
import { listAuditLogs } from "./audit.service";
import type { AuditLogRow } from "@/lib/utils/audit-labels";
import type { Announcement, Reminder } from "@/lib/db/schema";

// ─── Inicio del padrón ────────────────────────────────────────────────────────
// Todo lo que muestra el Inicio: solo datos de gestión y del padrón, sin
// montos ni información financiera (pedido explícito del cliente).

export interface UpcomingBirthday {
  affiliateId: string;
  fullName: string;
  phone: string | null;
  photoUrl: string | null;
  /** Fecha del próximo cumpleaños (YYYY-MM-DD) */
  nextDate: string;
  daysUntil: number;
  turnsAge: number | null;
}

export interface AffiliationAnniversary {
  affiliateId: string;
  fullName: string;
  affiliationDate: string;
  years: number;
}

export interface PadronHome {
  totalAffiliates: number;
  activeAffiliates: number;
  inactiveAffiliates: number;
  /** Altas de este mes (por fecha de afiliación) */
  newThisMonth: number;
  docsPending: number;
  docsMissing: number;
  byEmploymentType: Array<{ type: string; count: number }>;
  birthdays: UpcomingBirthday[];
  anniversaries: AffiliationAnniversary[];
  announcements: Announcement[];
  pendingReminders: Reminder[];
  overdueReminders: number;
  recentActivity: AuditLogRow[];
  lastExport: { createdAt: string; status: string; periodEnd: string } | null;
}

/** Próximo cumpleaños a partir de hoy; maneja 29/02 en años no bisiestos. */
function nextBirthday(birthDate: string, today: Date): { date: Date; age: number } | null {
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return null;

  const build = (year: number) => {
    // 29/02 en año no bisiesto → se festeja el 28/02
    const day = m === 2 && d === 29 && !isLeapYear(year) ? 28 : d;
    return new Date(year, m - 1, day, 12, 0, 0);
  };

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = build(today.getFullYear());
  if (next < startOfToday) next = build(today.getFullYear() + 1);

  return { date: next, age: next.getFullYear() - y };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export async function getPadronHome(): Promise<PadronHome> {
  const today = new Date();
  const month = today.getMonth() + 1;
  const nextMonth = (month % 12) + 1;
  const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
  const monthEnd = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");

  const [padronRows, employmentRows, birthdayRows, anniversaryRows, activeAnnouncements, reminderRows, activity, exportRows] =
    await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
          COUNT(*) FILTER (WHERE affiliation_date BETWEEN ${monthStart} AND ${monthEnd})::int AS new_this_month,
          COUNT(*) FILTER (WHERE status = 'active' AND documentation_status = 'pending')::int AS docs_pending,
          COUNT(*) FILTER (WHERE status = 'active' AND documentation_status = 'missing')::int AS docs_missing
        FROM affiliates
      `),
      db.execute(sql`
        SELECT employment_type AS type, COUNT(*)::int AS count
        FROM affiliates
        WHERE status = 'active' AND employment_type IS NOT NULL
        GROUP BY employment_type
        ORDER BY count DESC
      `),
      db.execute(sql`
        SELECT id, full_name AS "fullName", phone, photo_url AS "photoUrl", birth_date AS "birthDate"
        FROM affiliates
        WHERE status = 'active'
          AND birth_date IS NOT NULL
          AND EXTRACT(MONTH FROM birth_date)::int IN (${month}, ${nextMonth})
      `),
      db.execute(sql`
        SELECT id, full_name AS "fullName", affiliation_date AS "affiliationDate"
        FROM affiliates
        WHERE status = 'active'
          AND affiliation_date IS NOT NULL
          AND EXTRACT(MONTH FROM affiliation_date)::int = ${month}
      `),
      db.query.announcements.findMany({
        where: eq(announcements.active, true),
        orderBy: [desc(announcements.createdAt)],
        limit: 5,
      }),
      db.query.reminders.findMany({
        where: eq(reminders.status, "pending"),
        orderBy: [sql`${reminders.dueDate} ASC NULLS LAST`, desc(reminders.createdAt)],
        limit: 8,
      }),
      listAuditLogs({ page: 1, limit: 8 }),
      db.execute(sql`
        SELECT created_at AS "createdAt", status, period_end AS "periodEnd"
        FROM export_logs
        ORDER BY created_at DESC
        LIMIT 1
      `),
    ]);

  const padron = padronRows.rows[0] as {
    total: number;
    active: number;
    inactive: number;
    new_this_month: number;
    docs_pending: number;
    docs_missing: number;
  };

  // Cumpleaños dentro de los próximos 30 días
  const birthdays: UpcomingBirthday[] = (
    birthdayRows.rows as Array<{
      id: string;
      fullName: string;
      phone: string | null;
      photoUrl: string | null;
      birthDate: string;
    }>
  )
    .map((row) => {
      const next = nextBirthday(String(row.birthDate).slice(0, 10), today);
      if (!next) return null;
      const daysUntil = daysBetween(today, next.date);
      if (daysUntil > 30) return null;
      return {
        affiliateId: row.id,
        fullName: row.fullName,
        phone: row.phone,
        photoUrl: row.photoUrl,
        nextDate: format(next.date, "yyyy-MM-dd"),
        daysUntil,
        turnsAge: next.age > 0 ? next.age : null,
      };
    })
    .filter((b): b is UpcomingBirthday => b !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Aniversarios de afiliación que caen este mes (1 año o más)
  const anniversaries: AffiliationAnniversary[] = (
    anniversaryRows.rows as Array<{ id: string; fullName: string; affiliationDate: string }>
  )
    .map((row) => {
      const date = String(row.affiliationDate).slice(0, 10);
      const years = today.getFullYear() - Number(date.slice(0, 4));
      return {
        affiliateId: row.id,
        fullName: row.fullName,
        affiliationDate: date,
        years,
      };
    })
    .filter((a) => a.years >= 1)
    .sort((a, b) => b.years - a.years)
    .slice(0, 10);

  const overdueRemindersRows = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM reminders
    WHERE status = 'pending' AND due_date IS NOT NULL AND due_date < CURRENT_DATE
  `);

  const lastExportRow = exportRows.rows[0] as
    | { createdAt: string | Date; status: string; periodEnd: string }
    | undefined;

  return {
    totalAffiliates: padron?.total ?? 0,
    activeAffiliates: padron?.active ?? 0,
    inactiveAffiliates: padron?.inactive ?? 0,
    newThisMonth: padron?.new_this_month ?? 0,
    docsPending: padron?.docs_pending ?? 0,
    docsMissing: padron?.docs_missing ?? 0,
    byEmploymentType: (employmentRows.rows as Array<{ type: string; count: number }>) ?? [],
    birthdays,
    anniversaries,
    announcements: activeAnnouncements,
    pendingReminders: reminderRows,
    overdueReminders: (overdueRemindersRows.rows[0] as { count: number })?.count ?? 0,
    recentActivity: activity.data,
    lastExport: lastExportRow
      ? {
          createdAt:
            lastExportRow.createdAt instanceof Date
              ? lastExportRow.createdAt.toISOString()
              : String(lastExportRow.createdAt),
          status: lastExportRow.status,
          periodEnd: String(lastExportRow.periodEnd).slice(0, 10),
        }
      : null,
  };
}
