import Link from 'next/link'
import { Shield, FileText, CreditCard, Eye, Scale, Gavel } from 'lucide-react'

const legalSections = [
  {
    title: 'Core Policies',
    description: 'Essential legal documents governing your use of our services',
    icon: FileText,
    links: [
      { href: '/legal/terms-and-conditions', label: 'Terms & Conditions', description: 'Legal agreement for using ReadyCheck AI services' },
      { href: '/legal/privacy-policy', label: 'Privacy Policy', description: 'How we collect, use, and protect your personal information' },
      { href: '/legal/refund-and-cancellation-policy', label: 'Refund & Cancellation Policy', description: 'Terms for subscription cancellations and refunds' },
      { href: '/legal/acceptable-use-policy', label: 'Acceptable Use Policy', description: 'Guidelines for proper use of our platform' },
    ]
  },
  {
    title: 'Privacy & Data',
    description: 'Information about data handling and privacy rights',
    icon: Shield,
    links: [
      { href: '/legal/cookie-policy', label: 'Cookie Policy', description: 'How we use cookies and tracking technologies' },
      { href: '/legal/data-processing-addendum', label: 'Data Processing Addendum', description: 'Additional terms for enterprise customers' },
    ]
  },
  {
    title: 'Business Terms',
    description: 'Commercial and operational policies',
    icon: CreditCard,
    links: [
      { href: '/legal/payment-and-billing-terms', label: 'Payment & Billing Terms', description: 'Subscription, payment, and billing policies' },
      { href: '/legal/ip-and-licensing-statement', label: 'Intellectual Property & Licensing', description: 'Rights and ownership of platform content' },
    ]
  },
  {
    title: 'Security & Trust',
    description: 'Our commitment to security and responsible practices',
    icon: Eye,
    links: [
      { href: '/legal/security-and-responsible-disclosure', label: 'Security & Responsible Disclosure', description: 'Security measures and vulnerability reporting' },
    ]
  },
  {
    title: 'Regional Compliance',
    description: 'Jurisdiction-specific privacy and legal requirements',
    icon: Scale,
    links: [
      { href: '/legal/addenda-india', label: 'India Privacy Addendum', description: 'DPDP Act compliance for Indian users' },
      { href: '/legal/addenda-eu', label: 'EU/EEA Privacy Addendum', description: 'GDPR compliance for European users' },
      { href: '/legal/addenda-uk', label: 'UK Privacy Addendum', description: 'UK GDPR compliance for UK users' },
      { href: '/legal/addenda-us', label: 'US Privacy Addendum', description: 'CCPA/CPRA compliance for US users' },
    ]
  }
]

export async function generateMetadata() {
  return {
    title: 'Legal - ReadyCheck AI',
    description: 'Legal documents, privacy policies, and terms of service for ReadyCheck AI platform.',
  }
}

export default function LegalIndexPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <Gavel className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-4">Legal Center</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transparent policies and legal documents that govern your use of ReadyCheck AI services
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 md:gap-12">
            {legalSections.map((section) => {
              const IconComponent = section.icon
              return (
                <section key={section.title} className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">{section.title}</h2>
                      <p className="text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {section.links.map((link) => (
                      <Link 
                        key={link.href}
                        href={link.href}
                        className="group p-6 bg-card border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
                      >
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {link.label}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          {link.description}
                        </p>
                        <div className="mt-4 text-sm font-medium text-primary group-hover:underline">
                          Read document →
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Contact Section */}
          <div className="mt-16 pt-8 border-t border-border">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Questions about our legal policies?</h3>
              <p className="text-muted-foreground">
                If you have questions about any of these documents, please don&apos;t hesitate to contact us.
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <a href="mailto:legal@readycheck.ai" className="text-primary hover:underline">
                  Legal: legal@readycheck.ai
                </a>
                <a href="mailto:privacy@readycheck.ai" className="text-primary hover:underline">
                  Privacy: privacy@readycheck.ai
                </a>
                <a href="mailto:support@readycheck.ai" className="text-primary hover:underline">
                  General: support@readycheck.ai
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
