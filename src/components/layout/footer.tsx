import Link from 'next/link'
import { CheckCircle, Twitter, Linkedin, Mail } from 'lucide-react'

export function Footer() {
  const footerNavigation = {
    product: [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Verify Certificate', href: '/verify' },
      { name: 'Pricing', href: '/pricing' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '/legal/privacy-policy' },
      { name: 'Terms & Conditions', href: '/legal/terms-and-conditions' },
    ],
  }

  const socialLinks = [
    {
      name: 'Twitter',
      href: 'https://twitter.com/readycheck_ai',
      icon: Twitter,
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/readycheck-ai',
      icon: Linkedin,
    },
  ]

  return (
    <footer className="bg-surface" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link className="flex items-center space-x-2" href="/">
              <CheckCircle className="h-8 w-8 text-success-500" />
              <span className="font-bold text-xl text-foreground">
                ReadyCheck AI
              </span>
            </Link>
            <p className="text-sm leading-6 text-muted-foreground">
              The Industry Standard AI Certification Platform. Prove your AI expertise with verifiable credentials.
            </p>
            <div className="flex space-x-6">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-foreground">Product</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerNavigation.product.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-muted-foreground hover:text-foreground"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-semibold leading-6 text-foreground">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  {footerNavigation.legal.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className="text-sm leading-6 text-muted-foreground hover:text-foreground"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>


        <div className="mt-8 border-t border-border pt-8 md:flex md:items-center md:justify-between">
          <div className="flex space-x-6 md:order-2">
            <a
              href="mailto:support@readycheck.ai"
              className="text-muted-foreground hover:text-foreground"
            >
              <Mail className="h-6 w-6" />
              <span className="sr-only">Email support</span>
            </a>
          </div>
          <p className="mt-8 text-xs leading-5 text-muted-foreground md:order-1 md:mt-0">
            &copy; 2024 ReadyCheck AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
