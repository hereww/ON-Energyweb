import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { WindFarmExperience } from '@/components/WindFarmExperience'
import { getSiteSettings } from '@/lib/content'
import { isLocale, locales, type Locale } from '@/i18n/config'

export const dynamic = 'force-dynamic'

const windLabels: Record<
  Locale,
  {
    body: string
    eyebrow: string
    metaDescription: string
    metaTitle: string
    modes: Array<{
      body: string
      label: string
      metric: string
    }>
    title: string
  }
> = {
  de: {
    body:
      'Eine scrollgesteuerte Sequenz nach dem ON.energy Grid-Volatility-Motiv: Marktstress, lokale Speicher und flexible Netzausgänge erscheinen als zusammenhängende Szene.',
    eyebrow: 'Grid Volatility',
    metaDescription:
      'Scrollgesteuerte Grid-Volatility-Sequenz mit Speicher-, Netz- und Marktstress-Szenen.',
    metaTitle: 'Grid Volatility Sequenz | Ostasien Energie',
    modes: [
      {
        body: 'Der Spitzenbedarf steigt schneller als neue Übertragungskapazität. Die Szene bleibt dunkel, dicht und angespannt, wie im heruntergeladenen ON.energy-Sequenzmaterial.',
        label: 'Challenge 1',
        metric: 'Volatile market',
      },
      {
        body: 'Lokale Speicher liegen nah an der Last, nehmen Überschüsse auf und geben Energie zurück, wenn das System sie braucht.',
        label: 'Solution 1',
        metric: 'Local storage',
      },
      {
        body: 'Speicher und Netzknoten werden als flexible Zone koordiniert, damit volatile Erzeugung als planbarer Ausgang nutzbar wird.',
        label: 'Solution 2',
        metric: 'Clean flexibility',
      },
    ],
    title: 'Grid volatility meets flexible storage',
  },
  en: {
    body:
      'A scroll-controlled sequence based on the ON.energy Grid Volatility motif: market stress, local storage, and flexible export appear as one cinematic system.',
    eyebrow: 'Grid Volatility',
    metaDescription:
      'Scroll-controlled Grid Volatility sequence with storage, grid, and market-stress scenes.',
    metaTitle: 'Grid Volatility Sequence | East Asia Power',
    modes: [
      {
        body: 'Demand is rising faster than new transmission capacity. The scene stays dark, dense, and tense, matching the downloaded ON.energy sequence material.',
        label: 'Challenge 1',
        metric: 'Volatile market',
      },
      {
        body: 'Distributed storage sits close to load, absorbs surplus generation, and returns energy when the grid needs it.',
        label: 'Solution 1',
        metric: 'Local storage',
      },
      {
        body: 'Storage and grid nodes work as a flexible zone, turning volatile generation into a more dependable export.',
        label: 'Solution 2',
        metric: 'Clean flexibility',
      },
    ],
    title: 'Grid volatility meets flexible storage',
  },
  zh: {
    body:
      '按下载的 ON.energy Grid Volatility 序列帧还原：市场压力、本地储能和灵活并网在同一个滚动叙事画面里浮现。',
    eyebrow: 'Grid Volatility',
    metaDescription: '使用下载素材还原的 Grid Volatility 滚动序列帧页面。',
    metaTitle: 'Grid Volatility 序列帧 | 东亚电力',
    modes: [
      {
        body: '负荷增长快于新增输电能力，画面保持黑底、低饱和建筑体块和黄色警示光，贴近原站下载序列帧的紧张感。',
        label: '挑战 1',
        metric: '波动市场',
      },
      {
        body: '分布式储能靠近负荷布置，吸收富余电量，并在电网紧张时释放，缓解局部拥堵。',
        label: '方案 1',
        metric: '本地储能',
      },
      {
        body: '储能与电网节点被组织成可响应的灵活性区域，把波动性发电转化成更可靠的输出。',
        label: '方案 2',
        metric: '清洁灵活性',
      },
    ],
    title: '电网波动与灵活储能协同',
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
  const labels = windLabels[locale]

  return {
    description: labels.metaDescription,
    title: labels.metaTitle,
  }
}

export default async function WindPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params

  if (!isLocale(rawLocale)) {
    notFound()
  }

  const locale = rawLocale
  const [settings] = await Promise.all([getSiteSettings(locale)])
  const labels = windLabels[locale]

  return (
    <>
      <SiteHeader currentPath={`/${locale}/wind`} locale={locale} settings={settings} />
      <main>
        <WindFarmExperience
          body={labels.body}
          eyebrow={labels.eyebrow}
          modes={labels.modes}
          title={labels.title}
        />
      </main>
      <SiteFooter locale={locale} settings={settings} />
    </>
  )
}
