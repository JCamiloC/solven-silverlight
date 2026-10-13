import type { SupabaseClient } from '@supabase/supabase-js'
import { differenceInCalendarDays } from 'date-fns'
import { sendMail } from '@/lib/mailer'
import {
  buildExpirationAlerts,
  filterForExpiredDailyDigest,
  filterForWeeklyDigest,
} from './build-expiration-alerts'
import { buildDailyExpiredDigestHtml, buildWeeklyUpcomingDigestHtml } from './alert-digest-email'
import { getAlertsSupportEmail } from './constants'

const DIGEST_WEEKLY = 'weekly_upcoming'
const DIGEST_DAILY_EXPIRED = 'daily_expired'

async function getLastDigestSentAt(admin: SupabaseClient, digestType: string): Promise<Date | null> {
  const { data, error } = await admin
    .from('alert_digest_log')
    .select('sent_at')
    .eq('digest_type', digestType)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return null
    throw error
  }
  if (!data?.sent_at) return null
  return new Date(data.sent_at as string)
}

async function logDigest(admin: SupabaseClient, digestType: string, itemCount: number) {
  const { error } = await admin.from('alert_digest_log').insert({
    digest_type: digestType,
    item_count: itemCount,
  })
  if (error && error.code !== '42P01' && error.code !== 'PGRST205') throw error
}

async function isDigestLogAvailable(admin: SupabaseClient): Promise<boolean> {
  const { error } = await admin.from('alert_digest_log').select('id').limit(1)
  if (!error) return true
  if (error.code === 'PGRST205' || error.code === '42P01') return false
  throw error
}

export interface DispatchResult {
  weeklySent: boolean
  weeklyCount: number
  dailyExpiredSent: boolean
  dailyExpiredCount: number
  skippedReason?: string
}

export async function dispatchAlertDigests(admin: SupabaseClient): Promise<DispatchResult> {
  const logReady = await isDigestLogAvailable(admin)
  if (!logReady) {
    return {
      weeklySent: false,
      weeklyCount: 0,
      dailyExpiredSent: false,
      dailyExpiredCount: 0,
      skippedReason:
        'Falta la tabla alert_digest_log. Ejecuta database/create-alert-digest-log.sql en Supabase.',
    }
  }

  const summary = await buildExpirationAlerts(admin, { clientIds: null })
  const weeklyItems = filterForWeeklyDigest(summary)
  const expiredItems = filterForExpiredDailyDigest(summary)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://silverlight.net.co'
  const to = getAlertsSupportEmail()

  let weeklySent = false
  let dailyExpiredSent = false

  const lastWeekly = await getLastDigestSentAt(admin, DIGEST_WEEKLY)
  const daysSinceWeekly = lastWeekly ? differenceInCalendarDays(new Date(), lastWeekly) : 999

  if (weeklyItems.length > 0 && daysSinceWeekly >= 7) {
    await sendMail({
      to,
      subject: `[Solven] Resumen semanal: ${weeklyItems.length} vencimiento(s) próximo(s)`,
      html: buildWeeklyUpcomingDigestHtml(weeklyItems, appUrl),
    })
    await logDigest(admin, DIGEST_WEEKLY, weeklyItems.length)
    weeklySent = true
  }

  const lastDaily = await getLastDigestSentAt(admin, DIGEST_DAILY_EXPIRED)
  const daysSinceDaily = lastDaily ? differenceInCalendarDays(new Date(), lastDaily) : 999

  if (expiredItems.length > 0 && daysSinceDaily >= 1) {
    await sendMail({
      to,
      subject: `[Solven] Vencidos hoy: ${expiredItems.length} ítem(s) requieren acción`,
      html: buildDailyExpiredDigestHtml(expiredItems, appUrl),
    })
    await logDigest(admin, DIGEST_DAILY_EXPIRED, expiredItems.length)
    dailyExpiredSent = true
  }

  return {
    weeklySent,
    weeklyCount: weeklyItems.length,
    dailyExpiredSent,
    dailyExpiredCount: expiredItems.length,
  }
}
