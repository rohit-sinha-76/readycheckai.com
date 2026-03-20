import fs from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

// Create DOMPurify instance for server-side rendering
const window = new JSDOM('').window
const purify = DOMPurify(window)

const LEGAL_DIR = path.join(process.cwd(), 'legal')

const slugToFile: Record<string, string> = {
  'terms-and-conditions': 'terms-and-conditions.md',
  'privacy-policy': 'privacy-policy.md',
  'refund-and-cancellation-policy': 'refund-and-cancellation-policy.md',
  'cookie-policy': 'cookie-policy.md',
  'data-processing-addendum': 'data-processing-addendum.md',
  'security-and-responsible-disclosure': 'security-and-responsible-disclosure.md',
  'payment-and-billing-terms': 'payment-and-billing-terms.md',
  'acceptable-use-policy': 'acceptable-use-policy.md',
  'ip-and-licensing-statement': 'ip-and-licensing-statement.md',
  // Addenda
  'addenda-india': path.join('addenda', 'india-privacy-addendum.md'),
  'addenda-eu': path.join('addenda', 'eu-privacy-addendum.md'),
  'addenda-uk': path.join('addenda', 'uk-privacy-addendum.md'),
  'addenda-us': path.join('addenda', 'us-privacy-addendum.md'),
}

const slugToTitle: Record<string, string> = {
  'terms-and-conditions': 'Terms and Conditions',
  'privacy-policy': 'Privacy Policy',
  'refund-and-cancellation-policy': 'Refund and Cancellation Policy',
  'cookie-policy': 'Cookie Policy',
  'data-processing-addendum': 'Data Processing Addendum',
  'security-and-responsible-disclosure': 'Security and Responsible Disclosure',
  'payment-and-billing-terms': 'Payment and Billing Terms',
  'acceptable-use-policy': 'Acceptable Use Policy',
  'ip-and-licensing-statement': 'Intellectual Property and Licensing',
  'addenda-india': 'India Privacy Addendum',
  'addenda-eu': 'EU/EEA Privacy Addendum',
  'addenda-uk': 'UK Privacy Addendum',
  'addenda-us': 'US Privacy Addendum',
}

// Company details for replacement
const COMPANY_DETAILS = {
  LEGAL_ENTITY_NAME: 'ReadyCheck AI Technologies Pvt. Ltd.',
  PRIVACY_EMAIL: 'privacy@readycheck.ai',
  SECURITY_EMAIL: 'security@readycheck.ai',
  SUPPORT_EMAIL: 'support@readycheck.ai',
  LEGAL_EMAIL: 'legal@readycheck.ai',
  BILLING_EMAIL: 'billing@readycheck.ai',
  ABUSE_EMAIL: 'abuse@readycheck.ai',
  REGISTERED_ADDRESS: 'To be provided',
  GRIEVANCE_OFFICER_NAME: 'To be appointed',
  GRIEVANCE_OFFICER_EMAIL: 'privacy@readycheck.ai',
  DPO_NAME: 'To be appointed',
  CURRENT_YEAR: new Date().getFullYear().toString(),
  EFFECTIVE_DATE: 'To be announced',
  LAST_UPDATED: 'To be announced',
  TERMS_URL: '/legal/terms-and-conditions',
  PRIVACY_POLICY_URL: '/legal/privacy-policy',
  REFUND_POLICY_URL: '/legal/refund-and-cancellation-policy',
  COOKIE_POLICY_URL: '/legal/cookie-policy',
  SECURITY_POLICY_URL: '/legal/security-and-responsible-disclosure'
}

function replaceVariables(content: string): string {
  let result = content
  Object.entries(COMPANY_DETAILS).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
    result = result.replace(pattern, value)
  })
  return result
}

function getMarkdown(slug: string): string {
  const rel = slugToFile[slug]
  if (!rel) return ''
  const filePath = path.join(LEGAL_DIR, rel)
  if (!fs.existsSync(filePath)) return ''
  return fs.readFileSync(filePath, 'utf8')
}

export const dynamic = 'force-static'

export async function generateStaticParams() {
  return Object.keys(slugToFile).map((slug) => ({
    slug,
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const title = slugToTitle[slug]
  if (!title) {
    return {
      title: 'Legal Document Not Found',
    }
  }
  
  return {
    title: `${title} - ReadyCheck AI`,
    description: `${title} for ReadyCheck AI platform.`,
  }
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const rawMarkdown = getMarkdown(slug)
  if (!rawMarkdown) return notFound()

  // Replace variables in markdown
  const processedMarkdown = replaceVariables(rawMarkdown)
  
  // Convert markdown to HTML (synchronous)
  const rawHtml = marked(processedMarkdown) as string
  
  // Sanitize HTML
  const sanitizedHtml = purify.sanitize(rawHtml)
  
  const title = slugToTitle[slug] || 'Legal Document'

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
            <p className="text-muted-foreground">ReadyCheck AI Technologies Pvt. Ltd.</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div 
            className="legal-content prose prose-neutral dark:prose-invert max-w-none
              prose-headings:text-foreground prose-headings:font-semibold prose-headings:border-b prose-headings:border-border prose-headings:pb-2 prose-headings:mb-4
              prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-6
              prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-4
              prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-3
              prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4
              prose-ul:text-foreground prose-ul:mb-4 prose-ul:pl-6
              prose-ol:text-foreground prose-ol:mb-4 prose-ol:pl-6
              prose-li:mb-1 prose-li:leading-relaxed
              prose-strong:text-foreground prose-strong:font-semibold
              prose-em:text-foreground prose-em:italic
              prose-blockquote:border-l-4 prose-blockquote:border-primary/20 prose-blockquote:bg-muted/20 prose-blockquote:p-4 prose-blockquote:my-4
              prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded
              prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
              prose-table:border-collapse prose-table:border prose-table:border-border
              prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-3 prose-th:text-left prose-th:font-semibold
              prose-td:border prose-td:border-border prose-td:p-3
              prose-hr:border-border prose-hr:my-8"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
          
          {/* Footer notice */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="bg-muted/30 rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Legal Notice:</strong> This document contains important legal terms that affect your rights and obligations.
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                If you have questions about these terms, please contact us at{' '}
                <a href="mailto:legal@readycheck.ai" className="text-primary hover:underline">
                  legal@readycheck.ai
                </a>
              </p>
              <p className="text-sm text-muted-foreground">
                Last updated: {COMPANY_DETAILS.LAST_UPDATED} | Version: 1.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
