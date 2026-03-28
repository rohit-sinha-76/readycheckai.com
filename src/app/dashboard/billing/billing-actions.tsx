'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Download, Loader2 } from 'lucide-react'


interface PaymentRecord {
  razorpay_payment_id: string
  amount: number
  currency: string
  description: string | null
  created_at: string
  status: string
}

export function BillingPortalButton({ userHasRazorpayCustomer }: { userHasRazorpayCustomer: boolean }) {
  const [loading, setLoading] = useState(false)

  const handlePortalAccess = async () => {
    if (!userHasRazorpayCustomer) {
      alert('No Razorpay customer ID found. Please make a purchase first.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/billing/portal')
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to access billing portal')
      }

      // If the API returns JSON with URL, open it
      const data = await response.json()
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch (error) {
      console.error('Portal access error:', error)
      alert(error instanceof Error ? error.message : 'Failed to access billing portal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      className="w-full"
      onClick={handlePortalAccess}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <ExternalLink className="w-4 h-4 mr-2" />
      )}
      Razorpay Portal
    </Button>
  )
}

export function DownloadInvoicesButton() {
  const [loading, setLoading] = useState(false)

  const handleDownloadInvoices = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/billing/invoices?limit=50&format=json')
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch invoices')
      }

      const data = await response.json()
      
      if (data.invoices && data.invoices.length > 0) {
        // For now, show a summary of available invoices
        const invoiceList = data.invoices.map((inv: {
          formatted_date: string;
          formatted_amount: string;
          payment_id: string;
        }) => 
          `${inv.formatted_date} - ${inv.formatted_amount} (${inv.payment_id})`
        ).join('\n')
        
        alert(`Found ${data.count} invoices:\n\n${invoiceList}\n\nClick individual "Receipt" buttons to download each invoice.`)
      } else {
        alert('No invoices found.')
      }
    } catch (error) {
      console.error('Download invoices error:', error)
      alert(error instanceof Error ? error.message : 'Failed to download invoices')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      className="w-full"
      onClick={handleDownloadInvoices}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Download Invoices
    </Button>
  )
}

export function ReceiptButton({ payment }: { payment: PaymentRecord }) {
  const [loading, setLoading] = useState(false)

  const handleDownloadReceipt = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/billing/receipt/${payment.razorpay_payment_id}?format=html`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate receipt')
      }

      // Get the HTML content and open in new window
      const htmlContent = await response.text()
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.write(htmlContent)
        newWindow.document.close()
      }
    } catch (error) {
      console.error('Receipt generation error:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate receipt')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleDownloadReceipt}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Receipt
    </Button>
  )
}
