import { describe, it, expect } from 'vitest'
import { 
  profileUpdateSchema, 
  changePasswordSchema,
  getPasswordStrength 
} from '@/contracts/auth'

describe('Profile Update Validation', () => {
  it('should validate correct profile data', () => {
    const validData = {
      full_name: 'John Doe',
      company: 'Tech Corp',
      job_title: 'Software Engineer'
    }

    const result = profileUpdateSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject full_name that is too short', () => {
    const invalidData = {
      full_name: 'A',
      company: 'Tech Corp',
      job_title: 'Engineer'
    }

    const result = profileUpdateSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('at least 2 characters')
    }
  })

  it('should reject full_name that is too long', () => {
    const invalidData = {
      full_name: 'A'.repeat(101),
      company: 'Tech Corp'
    }

    const result = profileUpdateSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('less than 100 characters')
    }
  })

  it('should reject full_name with invalid characters', () => {
    const invalidData = {
      full_name: 'John123',
      company: 'Tech Corp'
    }

    const result = profileUpdateSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('letters, spaces, hyphens')
    }
  })

  it('should allow optional company and job_title', () => {
    const validData = {
      full_name: 'John Doe'
    }

    const result = profileUpdateSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should accept names with hyphens and apostrophes', () => {
    const validData = {
      full_name: "Mary-Jane O'Connor"
    }

    const result = profileUpdateSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})

describe('Password Change Validation', () => {
  it('should validate correct password change data', () => {
    const validData = {
      currentPassword: 'OldPass123',
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123'
    }

    const result = changePasswordSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject when passwords do not match', () => {
    const invalidData = {
      currentPassword: 'OldPass123',
      newPassword: 'NewPass123',
      confirmPassword: 'DifferentPass123'
    }

    const result = changePasswordSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain("don't match")
    }
  })

  it('should reject when new password is same as current password', () => {
    const invalidData = {
      currentPassword: 'SamePass123',
      newPassword: 'SamePass123',
      confirmPassword: 'SamePass123'
    }

    const result = changePasswordSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('must be different')
    }
  })

  it('should reject weak new passwords', () => {
    const invalidData = {
      currentPassword: 'OldPass123',
      newPassword: 'weak',
      confirmPassword: 'weak'
    }

    const result = changePasswordSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('should require uppercase letter in new password', () => {
    const invalidData = {
      currentPassword: 'OldPass123',
      newPassword: 'newpass123',
      confirmPassword: 'newpass123'
    }

    const result = changePasswordSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('uppercase')
    }
  })

  it('should require lowercase letter in new password', () => {
    const invalidData = {
      currentPassword: 'OldPass123',
      newPassword: 'NEWPASS123',
      confirmPassword: 'NEWPASS123'
    }

    const result = changePasswordSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('lowercase')
    }
  })

  it('should require number in new password', () => {
    const invalidData = {
      currentPassword: 'OldPass123',
      newPassword: 'NewPassword',
      confirmPassword: 'NewPassword'
    }

    const result = changePasswordSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('number')
    }
  })

  it('should reject password shorter than 8 characters', () => {
    const invalidData = {
      currentPassword: 'OldPass123',
      newPassword: 'New123',
      confirmPassword: 'New123'
    }

    const result = changePasswordSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('at least 8 characters')
    }
  })
})

describe('Password Strength Checker', () => {
  it('should rate weak password correctly', () => {
    const result = getPasswordStrength('password')
    expect(result.strength).toBe('weak')
    expect(result.score).toBeLessThan(50)
  })

  it('should rate medium password correctly', () => {
    const result = getPasswordStrength('Password1')
    expect(result.strength).toBe('medium')
    expect(result.score).toBeGreaterThanOrEqual(50)
    expect(result.score).toBeLessThan(80)
  })

  it('should rate strong password correctly', () => {
    const result = getPasswordStrength('MyStr0ngP@ssword!')
    expect(result.strength).toBe('strong')
    expect(result.score).toBeGreaterThanOrEqual(80)
  })

  it('should provide feedback for weak passwords', () => {
    const result = getPasswordStrength('password')
    expect(result.feedback.length).toBeGreaterThan(0)
  })

  it('should reward longer passwords', () => {
    const short = getPasswordStrength('Pass123')
    const long = getPasswordStrength('Password123456')
    expect(long.score).toBeGreaterThan(short.score)
  })

  it('should reward special characters', () => {
    const noSpecial = getPasswordStrength('Password123')
    const withSpecial = getPasswordStrength('Password123!')
    expect(withSpecial.score).toBeGreaterThan(noSpecial.score)
  })

  it('should handle empty string in getPasswordStrength without error', () => {
    const result = getPasswordStrength('')
    expect(result.strength).toBe('weak')
    expect(result.score).toBe(0)
  })

  it('should reject XSS script tags in profile full_name', () => {
    const xssData = { full_name: '<script>alert("xss")</script>' }
    const result = profileUpdateSchema.safeParse(xssData)
    expect(result.success).toBe(false)
  })

  it('should reject whitespace-only password in changePasswordSchema', () => {
    const whitespaceData = {
      currentPassword: 'OldPass123',
      newPassword: '        ',
      confirmPassword: '        '
    }
    const result = changePasswordSchema.safeParse(whitespaceData)
    expect(result.success).toBe(false)
  })

  it('should handle 5000 character long password safely in strength check without crashing', () => {
    const longPassword = 'A1!' + 'a'.repeat(5000)
    const result = getPasswordStrength(longPassword)
    expect(result.score).toBeGreaterThan(0)
    expect(typeof result.strength).toBe('string')
  })
})
