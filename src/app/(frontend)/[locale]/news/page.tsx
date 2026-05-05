import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { getArticles, getSiteSettings } from '@/lib/content'
import { isLocale, locales, type Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

const newsLabels: Record<Locale, { intro: string; readMore: string; title: string }> = {
  de: {
    intro: 'Marktupdates, technische Perspektiven und Unternehmensnachrichten.',
    readMore: 'Mehr lesen',
    title: 'Einblicke',
  },
  en: {
    intro: 'Market updates, technical perspectives, and company news.',
    readMore: 'Read more',
    title: 'Insights',
  },
  zh: {
    intro: '市场更新、技术视角和公司新闻。',
    readMore: '阅读全文',
    title: '洞察',
  },
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: rawLocale } = await params
  const locale = isLocale(rawLocale) ? rawLocale : 'en'
  const labels = newsLabels[locale]

  return {
    description: labels.intro,
    title: `${labels.title} | East Asia Power`,
  }
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params

  if (!isLocale(rawLocale)) {
    notFound()
  }

  const locale = rawLocale
  const [settings, articles] = await Promise.all([getSiteSettings(locale), getArticles(locale)])
  const labels = newsLabels[locale]

  return (
    <>
      <SiteHeader currentPath={`/${locale}/news`} locale={locale} settings={settings} />
      <main className="news-page">
        <section className="news-hero">
          <h1>{labels.title}</h1>
          <p>{labels.intro}</p>
        </section>
        <section className="article-grid news-grid">
          {articles.map((article) => (
            <article className="article-card" key={article.slug}>
              <span>{article.category}</span>
              <time dateTime={article.publishedAt}>
                {new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
                  new Date(article.publishedAt),
                )}
              </time>
              <h2>{article.title}</h2>
              <p>{article.excerpt}</p>
              <Link href={`/${locale}/news/${article.slug}`}>
                {labels.readMore}
                <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </section>
      </main>
      <SiteFooter locale={locale} settings={settings} />
    </>
  )
}
