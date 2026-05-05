import type { Locale } from '@/i18n/config'

export type StoryKind = 'challenge' | 'solution'

export type StoryItem = {
  body: string
  kind: StoryKind
  metricLabel: string
  metricUnit?: string
  metricValue: string
  number: number
  title: string
}

export type ProofPoint = {
  label: string
  value: string
}

export type HomeContent = {
  cta: {
    body: string
    headline: string
    href: string
    label: string
  }
  deploymentHighlights: ProofPoint[]
  hero: {
    primaryCtaLabel: string
    secondaryCtaLabel?: string
    headline: string
    subline: string
  }
  locale: Locale
  proofPoints: ProofPoint[]
  statement: {
    headline: string
    lead: string
  }
  storyItems: StoryItem[]
}

export type SiteSettings = {
  companyName: string
  contact: {
    address?: string
    email: string
    phone?: string
  }
  footerLinks: Array<{
    href: string
    label: string
  }>
  navigation: Array<{
    href: string
    label: string
  }>
  seo: {
    description: string
    title: string
  }
  tagline: string
}

export type Article = {
  body: string
  category: 'company' | 'market' | 'technology'
  excerpt: string
  publishedAt: string
  slug: string
  title: string
}
