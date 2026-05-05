import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getPreferredLocale } from '@/i18n/config'

export default async function RootPage() {
  const incomingHeaders = await headers()
  redirect(`/${getPreferredLocale(incomingHeaders.get('accept-language'))}`)
}
