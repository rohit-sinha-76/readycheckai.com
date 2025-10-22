'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const profileUpdateSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  public_id: z.string()
    .min(3, 'Public ID must be at least 3 characters')
    .max(30, 'Public ID must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, numbers, underscore, and hyphen allowed')
    .regex(/^[a-zA-Z0-9]/, 'Must start with a letter or number'),
  profile_is_public: z.boolean(),
  date_of_birth: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(255).optional(),
  website_url: z.string().url().optional().or(z.literal('')),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  github_url: z.string().url().optional().or(z.literal('')),
  job_title: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  industry: z.string().optional(),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  timezone: z.string().optional(),
})

export async function updateUserProfile(userId: string, data: z.infer<typeof profileUpdateSchema>) {
  const supabase = await createClient()
  
  // Validate the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user || user.id !== userId) {
    throw new Error('Unauthorized')
  }

  // Validate the input data
  const validatedData = profileUpdateSchema.parse(data)
  
  // Check if public_id is unique (if changed)
  if (validatedData.public_id) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('public_id', validatedData.public_id)
      .neq('id', userId)
      .single()
    
    if (existingUser) {
      throw new Error('Public ID already taken')
    }
  }

  // Convert empty strings to null for optional URL fields
  const updateData = {
    ...validatedData,
    website_url: validatedData.website_url || null,
    linkedin_url: validatedData.linkedin_url || null,
    github_url: validatedData.github_url || null,
    date_of_birth: validatedData.date_of_birth || null,
    bio: validatedData.bio || null,
    location: validatedData.location || null,
    job_title: validatedData.job_title || null,
    company: validatedData.company || null,
    industry: validatedData.industry || null,
    timezone: validatedData.timezone || null,
    first_name: validatedData.first_name || null,
    last_name: validatedData.last_name || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)

  if (error) {
    console.error('Profile update error:', error)
    throw new Error(error.message || 'Failed to update profile')
  }

  // Revalidate relevant paths
  revalidatePath('/profile/settings')
  revalidatePath('/dashboard')
  revalidatePath(`/u/${validatedData.public_id}`)
}

export async function checkPublicIdAvailability(publicId: string): Promise<boolean> {
  if (!publicId || publicId.length < 3) {
    return false
  }

  const supabase = await createClient()
  
  // Check database availability
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('public_id', publicId)
    .single()

  return !existingUser
}

export async function deleteUserAccount(reason?: string) {
  const supabase = await createClient()
  
  // Validate the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  // Create deletion request using the database function
  const { data, error } = await supabase
    .rpc('request_account_deletion', { 
      deletion_reason: reason || 'No reason provided' 
    })

  if (error) {
    console.error('Account deletion request error:', error)
    throw new Error(error.message || 'Failed to request account deletion')
  }

  // Note: Actual deletion is handled by admin/compliance team
  // This just creates a deletion request in the system
  
  return { deletionRequestId: data }
}

export async function getUserByPublicId(publicId: string) {
  const supabase = await createClient()
  
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      public_id,
      full_name,
      bio,
      location,
      website_url,
      linkedin_url,
      github_url,
      job_title,
      company,
      industry,
      experience_level,
      profile_is_public,
      created_at,
      avatar_url
    `)
    .eq('public_id', publicId)
    .eq('profile_is_public', true)
    .single()

  if (error || !user) {
    return null
  }

  return user
}

export async function getUserAchievements(userId: string, isPublic: boolean = true) {
  const supabase = await createClient()
  
  // Only return achievements if profile is public or user is viewing their own profile
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const isOwnProfile = currentUser?.id === userId
  
  if (!isPublic && !isOwnProfile) {
    return { certificates: [], stats: null }
  }

  // Get certificates
  const { data: certificates } = await supabase
    .from('user_certificates')
    .select(`
      id,
      certification_level,
      score,
      issued_at,
      expires_at,
      status
    `)
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('issued_at', { ascending: false })

  // Get assessment statistics
  const { data: sessions } = await supabase
    .from('assessment_sessions')
    .select('assessment_results, completed_at')
    .eq('user_id', userId)
    .eq('session_type', 'certification')
    .not('assessment_results', 'is', null)

  let stats = null
  if (sessions && sessions.length > 0) {
    const scores = sessions
      .map(s => s.assessment_results?.[0]?.final_score)
      .filter(score => typeof score === 'number')
    
    if (scores.length > 0) {
      stats = {
        totalAssessments: sessions.length,
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        highestScore: Math.max(...scores),
        completionRate: Math.round((certificates?.length || 0) / sessions.length * 100)
      }
    }
  }

  return {
    certificates: certificates || [],
    stats
  }
}

export async function generatePublicId(): Promise<string> {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('generate_unique_public_id')
  
  if (error) {
    throw new Error('Failed to generate public ID')
  }
  
  return data
}
