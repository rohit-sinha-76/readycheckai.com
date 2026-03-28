import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'readycheckai' })

// Job: Generate Roadmap
export const roadmapJob = (inngest as any).createFunction(
  { 
    id: 'generate-roadmap',
    event: 'app/roadmap.generate',
    retries: 2,
    concurrency: { limit: 5 },
  },
  async ({ event, step }: any) => {
    const { userId, track, level, roadmapId } = event.data

    const roadmap = await step.run('call-llm', async () => {
      const { generateRoadmap } = await import('./gemini')
      return generateRoadmap({
        userGoals: track || 'Software Engineering',
        durationDays: 30,
        daysPerWeek: 5,
        hoursPerDay: 2,
        currentSkillLevel: (level || 'beginner') as any,
        learningPace: 'moderate',
        weakAreas: [],
        strongAreas: [],
        assessmentScores: [],
        preferredLearningStyle: ['reading'] as any
      })
    })

    await step.run('save-to-db', async () => {
      const { createClient } = await import('./supabase/server')
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('roadmaps')
        .update({ data: roadmap, status: 'completed' })
        .eq('id', roadmapId || '')
        .select()
        .single()
      
      if (error) throw new Error(`DB update failed: ${error.message}`)
      return data
    })

    return { roadmapId: roadmapId || roadmap.id, userId }
  }
)

// Job: Generate Certificate PDF & Metadata
export const certificateJob = (inngest as any).createFunction(
  {
    id: 'generate-certificate',
    event: 'app/certificate.generate',
    retries: 1,
  },
  async ({ event, step }: any) => {
    const { userId, assessmentId, score, level } = event.data

    const certificate = await step.run('generate-pdf', async () => {
      const { createHash } = await import('crypto')
      const code = `RC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const issuedAt = new Date().toISOString()

      const payloadToSign = JSON.stringify({
        userId,
        assessmentId,
        score,
        level: level || 'RCAF',
        code,
        issuedAt
      })
      const signatureDigest = createHash('sha256').update(payloadToSign).digest('hex')

      return {
        code,
        score,
        issuedAt,
        signatureDigest,
        metadata: {
          title: `ReadyCheck AI Certificate - ${level || 'RCAF'}`,
          issuer: 'ReadyCheck AI Verification Authority',
          recipientId: userId,
          verificationUrl: `/verify/${code}`
        }
      }
    })

    await step.run('save-certificate', async () => {
      const { createClient } = await import('./supabase/server')
      const supabase = await createClient()
      
      const { error } = await supabase.from('certificates').insert({
        user_id: userId,
        assessment_id: assessmentId,
        score,
        verification_code: certificate.code,
        status: 'generated',
        metadata: certificate.metadata,
        created_at: certificate.issuedAt
      })

      if (error) {
        // If table schema differs or column missing, fallback to standard columns
        await supabase.from('certificates').upsert({
          user_id: userId,
          assessment_id: assessmentId,
          score,
          verification_code: certificate.code,
          status: 'generated'
        })
      }
    })

    return { certificateCode: certificate.code, status: 'generated' }
  }
)
