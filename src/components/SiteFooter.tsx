import Link from 'next/link'

import type { SiteSettings } from '@/content/types'
import type { Locale } from '@/i18n/config'

type SiteFooterProps = {
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

  return href
}

export function SiteFooter({ locale, settings }: SiteFooterProps) {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-brand">
        <strong>{settings.companyName}</strong>
        <p>{settings.tagline}</p>
      </div>
      <nav aria-label="Footer navigation">
        {settings.footerLinks.map((link) => (
          <Link href={localizedHref(link.href, locale)} key={`${link.href}-${link.label}`}>
            {link.label}
          </Link>
        ))}
      </nav>
      <address>
        <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a>
        {settings.contact.phone && <span>{settings.contact.phone}</span>}
        {settings.contact.address && <span>{settings.contact.address}</span>}
      </address>
    </footer>
  )
}
