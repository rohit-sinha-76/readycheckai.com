import { describe, it, expect } from 'vitest'
import { profileUpdateSchema } from '@/contracts/auth'

describe('Profile Update API Contract Validation - /api/profile/update', () => {
  it('should pass valid profile payload', () => {
    const validData = {
      full_name: 'John Doe',
      company: 'Tech Corp',
      job_title: 'Senior Engineer'
    }

    const result = profileUpdateSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject full_name shorter than 2 characters', () => {
    const invalidData = { full_name: 'A' }
    const result = profileUpdateSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('should reject full_name with digits', () => {
    const invalidData = { full_name: 'John123' }
    const result = profileUpdateSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('should reject XSS script tags in profile full_name', () => {
    const maliciousData = { full_name: '<script>alert(1)</script>' }
    const result = profileUpdateSchema.safeParse(maliciousData)
    expect(result.success).toBe(false)
  })

  it('should allow optional company and job_title fields', () => {
    const validData = { full_name: 'John Doe' }
    const result = profileUpdateSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})
