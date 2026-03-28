import { serve } from 'inngest/next'
import { inngest, roadmapJob, certificateJob } from '@/lib/inngest'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [roadmapJob, certificateJob],
})
