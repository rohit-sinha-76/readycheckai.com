import { z } from 'zod'

/**
 * Authentication Validation Schemas
 * Used for client and server-side validation of auth forms
 */

// Password validation - Strong password requirements
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

// Email validation
export const emailSchema = z.string()
  .email('Invalid email address')
  .min(1, 'Email is required')

// Forgot Password Form Schema
export const forgotPasswordSchema = z.object({
  email: emailSchema
})

// Reset Password Form Schema
export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// Login Schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
})

// Signup Schema
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// Password Strength Checker
export function getPasswordStrength(password: string): {
  score: number
  strength: 'weak' | 'medium' | 'strong'
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= 8) score += 25
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 15

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 10
  } else {
    feedback.push('Add lowercase letters')
  }

  if (/[A-Z]/.test(password)) {
    score += 10
  } else {
    feedback.push('Add uppercase letters')
  }

  if (/[0-9]/.test(password)) {
    score += 10
  } else {
    feedback.push('Add numbers')
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 20
    feedback.push('Great! Contains special characters')
  } else {
    feedback.push('Add special characters (!@#$%^&*)')
  }

  // Determine strength
  let strength: 'weak' | 'medium' | 'strong'
  if (score >= 80) {
    strength = 'strong'
  } else if (score >= 50) {
    strength = 'medium'
  } else {
    strength = 'weak'
  }

  return { score, strength, feedback }
}

// Profile Update Schema
export const profileUpdateSchema = z.object({
  full_name: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  company: z.string().max(100, 'Company name too long').optional(),
  job_title: z.string().max(100, 'Job title too long').optional(),
})

// Change Password Schema - Requires current password for security
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ['newPassword']
})

// Type exports
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
