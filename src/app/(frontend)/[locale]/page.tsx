import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { ScrollStory } from '@/components/ScrollStory'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { getArticles, getHomeContent, getSiteSettings } from '@/lib/content'
import { isLocale, locales, type Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

const pageLabels: Record<
  Locale,
  {
    deploymentTitle: string
    expertiseLabel: string
    impactTitle: string
    insightsTitle: string
    readMore: string
    statementAlt: string
    storyTitle: string
    viewAll: string
  }
> = {
  de: {
    deploymentTitle: 'Deployment',
    expertiseLabel: 'Unsere Expertise',
    impactTitle: 'Bewährte Leistung. Für Zuverlässigkeit gebaut.',
    insightsTitle: 'Einblicke',
    readMore: 'Mehr lesen',
    statementAlt: 'Speicheranlage im Netz',
    storyTitle: 'Netzvolatilität in Asien',
    viewAll: 'Alle Einblicke',
  },
  en: {
    deploymentTitle: 'Deployment',
    expertiseLabel: 'Our Expertise',
    impactTitle: 'Proven impact. Built for performance.',
    insightsTitle: 'Insights',
    readMore: 'Read more',
    statementAlt: 'Grid storage site',
    storyTitle: 'Grid volatility across Asia',
    viewAll: 'View all insights',
  },
  zh: {
    deploymentTitle: '项目部署',
    expertiseLabel: '核心能力',
    impactTitle: '经过验证的影响力，为可靠运行而建。',
    insightsTitle: '洞察',
    readMore: '阅读全文',
    statementAlt: '电网储能站',
    storyTitle: '亚洲电网波动场景',
    viewAll: '查看全部洞察',
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
  const settings = await getSiteSettings(locale)

  return {
    description: settings.seo.description,
    title: settings.seo.title,
  }
}

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params

  if (!isLocale(rawLocale)) {
    notFound()
  }

  const locale = rawLocale
  const [settings, home, articles] = await Promise.all([
    getSiteSettings(locale),
    getHomeContent(locale),
    getArticles(locale),
  ])
  const labels = pageLabels[locale]
  const featuredArticles = articles.slice(0, 3)

  return (
    <>
      <SiteHeader currentPath={`/${locale}`} locale={locale} settings={settings} />
      <main>
        <section className="hero-section">
          <Image
            alt=""
            className="hero-image"
            fill
            priority
            sizes="100vw"
            src="/assets/hero-grid-storage.png"
          />
          <div className="hero-scrim" />
          <div className="hero-content">
            <h1>{home.hero.headline}</h1>
            <p>{home.hero.subline}</p>
            <div className="hero-actions">
              <a className="button-primary" href={home.cta.href}>
                {home.hero.primaryCtaLabel}
                <span aria-hidden="true">→</span>
              </a>
              {home.hero.secondaryCtaLabel && (
                <Link className="button-secondary" href={`/${locale}/news`}>
                  {home.hero.secondaryCtaLabel}
                </Link>
              )}
            </div>
            <div className="hero-topics" aria-label="Core capabilities">
              {home.storyItems.slice(0, 3).map((item) => (
                <span key={`${item.kind}-${item.number}`}>
                  <i aria-hidden="true" />
                  {item.title}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="statement-section" id="company">
          <div className="statement-card">
            <span className="statement-label">
              <i aria-hidden="true" />
              {labels.expertiseLabel}
            </span>
            <h2>{home.statement.headline}</h2>
            <p>{home.statement.lead}</p>
            <ul>
              {home.storyItems
                .filter((item) => item.kind === 'challenge')
                .slice(0, 3)
                .map((item) => (
                  <li key={item.title}>
                    <span>{item.metricValue}</span>
                    {item.metricLabel}
                  </li>
                ))}
            </ul>
          </div>
        </section>

        <ScrollStory items={home.storyItems} />

        <section className="impact-band">
          <h2>{labels.impactTitle}</h2>
          <div className="impact-grid">
            {home.proofPoints.map((point) => (
              <div key={`${point.value}-${point.label}`}>
                <strong>{point.value}</strong>
                <span>{point.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="deployment-section" id="projects">
          <div className="section-heading">
            <h2>{labels.deploymentTitle}</h2>
            <p>{settings.tagline}</p>
          </div>
          <div className="deployment-grid">
            <figure className="deployment-feature">
              <Image
                alt={labels.statementAlt}
                fill
                sizes="(max-width: 900px) 100vw, 58vw"
                src="/assets/deployment-storage-site.png"
              />
              <figcaption>
                <strong>{home.deploymentHighlights[0]?.value}</strong>
                <span>{home.deploymentHighlights[0]?.label}</span>
              </figcaption>
            </figure>
            <div className="deployment-stats">
              {home.deploymentHighlights.map((highlight) => (
                <div key={`${highlight.value}-${highlight.label}`}>
                  <strong>{highlight.value}</strong>
                  <span>{highlight.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="insights-section">
          <div className="section-heading">
            <h2>{labels.insightsTitle}</h2>
            <Link href={`/${locale}/news`}>{labels.viewAll}</Link>
          </div>
          <div className="article-grid">
            {featuredArticles.map((article) => (
              <article className="article-card" key={article.slug}>
                <span>{article.category}</span>
                <time dateTime={article.publishedAt}>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                  }).format(new Date(article.publishedAt))}
                </time>
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <Link href={`/${locale}/news/${article.slug}`}>
                  {labels.readMore}
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-section">
          <div>
            <h2>{home.cta.headline}</h2>
            <p>{home.cta.body}</p>
          </div>
          <a className="button-primary dark" href={home.cta.href}>
            {home.cta.label}
            <span aria-hidden="true">→</span>
          </a>
        </section>
      </main>
      <SiteFooter locale={locale} settings={settings} />
    </>
  )
}
