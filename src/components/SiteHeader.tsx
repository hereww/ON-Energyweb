'use client'

import Link from 'next/link'
import { useState } from 'react'

import { localeLabels, locales, localizePath, type Locale } from '@/i18n/config'
import type { SiteSettings } from '@/content/types'

type SiteHeaderProps = {
  currentPath: string
  locale: Locale
  settings: SiteSettings
}

function localizedHref(href: string, locale: Locale): string {
  if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) {
    return href
  }

  if (href.startsWith('/#')) {
    return `/${locale}${href.slice(1)}`
  }

  if (href.startsWith('/')) {
    return `/${locale}${href}`
  }

  if (href.startsWith('#')) {
    return `/${locale}${href}`
  }

  return href
}

function BrandMark({ companyName }: { companyName: string }) {
  return (
    <span className="brand-mark" aria-label={companyName}>
      <svg aria-hidden="true" viewBox="0 0 48 48">
        <path d="M8 12 24 4l16 8v8L24 12 8 20z" />
        <path d="M8 24v9l16 8v-9z" />
        <path d="M40 24v9l-16 8v-9z" />
      </svg>
      <span>
        <strong>{companyName}</strong>
        <small>Power systems</small>
      </span>
    </span>
  )
}

export function SiteHeader({ currentPath, locale, settings }: SiteHeaderProps) {
  const [open, setOpen] = useState(false)
  const contactHref = settings.contact.email ? `mailto:${settings.contact.email}` : `/${locale}#contact`

  return (
    <header className="site-header">
      <Link className="brand-link" href={`/${locale}`} onClick={() => setOpen(false)}>
        <BrandMark companyName={settings.companyName} />
      </Link>

      <nav className={`site-nav ${open ? 'is-open' : ''}`} aria-label="Primary navigation">
        {settings.navigation.map((item) => (
          <Link
            href={localizedHref(item.href, locale)}
            key={`${item.href}-${item.label}`}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="header-actions">
        <div className="language-switcher" aria-label="Language">
          {locales.map((nextLocale) => (
            <Link
              aria-current={nextLocale === locale ? 'page' : undefined}
              href={localizePath(currentPath, nextLocale)}
              key={nextLocale}
            >
              {localeLabels[nextLocale]}
            </Link>
          ))}
        </div>
        <a className="header-cta" href={contactHref}>
          {locale === 'zh' ? '联系' : locale === 'de' ? 'Kontakt' : 'Contact'}
        </a>
        <button
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="menu-button"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
