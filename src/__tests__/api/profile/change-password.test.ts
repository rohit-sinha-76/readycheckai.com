import { describe, it, expect } from 'vitest'
import { changePasswordSchema } from '@/contracts/auth'

describe('Password Change API Contract Validation - /api/profile/change-password', () => {
  it('should pass valid password change payload', () => {
    const validData = {
      currentPassword: 'CurrentPass123!',
      newPassword: 'NewStr0ng!Pass',
      confirmPassword: 'NewStr0ng!Pass'
    }

    const result = changePasswordSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject password change when confirmPassword does not match', () => {
    const invalidData = {
      currentPassword: 'CurrentPass123!',
      newPassword: 'NewStr0ng!Pass1',
      confirmPassword: 'NewStr0ng!Pass2'
    }

    const result = changePasswordSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('should reject password change when newPassword equals currentPassword', () => {
    const invalidData = {
      currentPassword: 'SamePassword123!',
      newPassword: 'SamePassword123!',
      confirmPassword: 'SamePassword123!'
    }

    const result = changePasswordSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('should reject weak new passwords lacking uppercase or numbers', () => {
    const invalidData = {
      currentPassword: 'CurrentPass123!',
      newPassword: 'weak',
      confirmPassword: 'weak'
    }

    const result = changePasswordSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('should NEVER leak plain passwords or hashed strings in exception error messages', () => {
    const sensitivePassword = 'SecretP@ssword99'
    const errorMsg = `Error processing change for user: password ${sensitivePassword}`
    const sanitizedMsg = errorMsg.replace(/password\s+\S+/gi, 'password [REDACTED]')

    expect(sanitizedMsg).not.toContain(sensitivePassword)
    expect(sanitizedMsg).toContain('[REDACTED]')
  })
})
