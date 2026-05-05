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
      'Ein interaktives Wind- und Speicherfeld nach dem ON.energy WebGL-Motiv: Turbinen, Speicher und Netzrouten reagieren als ein System.',
    eyebrow: 'WebGL Windfeld',
    metaDescription:
      'Interaktive Windpark-Visualisierung mit Turbinen, Speicher und Netzrouten.',
    metaTitle: 'Windpark WebGL | Ostasien Energie',
    modes: [
      {
        body: 'Turbinen drehen mit variabler Geschwindigkeit und speisen saubere Energie in den lokalen Netzknoten ein.',
        label: 'Wind input',
        metric: '6 turbines',
      },
      {
        body: 'Batteriespeicher glätten Böen, verschieben Überschüsse und halten die Einspeisung planbar.',
        label: 'Storage buffer',
        metric: '300 MWh',
      },
      {
        body: 'Netzrouten bündeln Wind, Speicher und Umspannwerk in einer dispatchfähigen Flexibilitätszone.',
        label: 'Grid export',
        metric: '99.8%',
      },
    ],
    title: 'Windenergie trifft flexible Speicher',
  },
  en: {
    body:
      'An interactive wind and storage field based on the ON.energy WebGL motif: turbines, batteries, and grid routes operating as one system.',
    eyebrow: 'WebGL wind field',
    metaDescription:
      'Interactive wind farm visualization with turbines, storage, and grid routes.',
    metaTitle: 'Wind Farm WebGL | East Asia Power',
    modes: [
      {
        body: 'Turbines rotate at variable speed and feed clean generation into the local grid node.',
        label: 'Wind input',
        metric: '6 turbines',
      },
      {
        body: 'Battery storage absorbs gust-driven output, shifts surplus power, and makes delivery dispatchable.',
        label: 'Storage buffer',
        metric: '300 MWh',
      },
      {
        body: 'Grid routes coordinate wind, storage, and the substation as one flexible export zone.',
        label: 'Grid export',
        metric: '99.8%',
      },
    ],
    title: 'Wind generation meets flexible storage',
  },
  zh: {
    body:
      '按 ON.energy WebGL 风格补回风电场景：风机、储能柜和并网线路在同一个互动场景里联动。',
    eyebrow: 'WebGL 风电场',
    metaDescription: '带风机、储能和并网线路的交互式风电场 WebGL 页面。',
    metaTitle: '风电场 WebGL | 东亚电力',
    modes: [
      {
        body: '风机以动态速度旋转，把清洁出力送入本地电网节点。',
        label: '风电输入',
        metric: '6 台风机',
      },
      {
        body: '储能系统吸收风功率波动，转移富余电力，让输出更可调度。',
        label: '储能缓冲',
        metric: '300 MWh',
      },
      {
        body: '并网线路把风机、储能和升压站组织成一个可响应的灵活性区域。',
        label: '并网输出',
        metric: '99.8%',
      },
    ],
    title: '风电出力与灵活储能协同',
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
