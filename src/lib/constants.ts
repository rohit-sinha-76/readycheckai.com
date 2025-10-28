// Application constants and configuration

export const APP_CONFIG = {
  name: 'ReadyCheck AI',
  description: 'AI Skills Assessment Platform for Teams and Organizations',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://readycheck.ai',
  version: '1.0.0',
  author: 'ReadyCheck AI Team',
} as const

export const ROUTES = {
  HOME: '/',
  ASSESSMENT: '/assess',
  PRICING: '/pricing',
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  DASHBOARD: '/dashboard',
  RESULTS: '/results',
  ROADMAP: '/roadmap',
} as const

export const API_ENDPOINTS = {
  ASSESSMENTS: {
    START: '/api/assessment/start',
    SUBMIT: '/api/assessment/submit',
  },
} as const

export const ASSESSMENT_CONFIG = {
  TOTAL_QUESTIONS: 18,
  CATEGORIES: {
    AI_FUNDAMENTALS: 'AI Fundamentals',
    PRACTICAL_TOOLS: 'Practical Tools',
    BUSINESS_APPLICATION: 'Business Application',
    ETHICS_SAFETY: 'Ethics & Safety',
  },
  SCORING: {
    MAX_POINTS: 100,
    PASS_THRESHOLD: 60,
    SKILL_LEVELS: {
      BEGINNER: { min: 0, max: 49, label: 'Beginner' },
      DEVELOPING: { min: 50, max: 69, label: 'Developing' },
      PROFICIENT: { min: 70, max: 84, label: 'Proficient' },
      ADVANCED: { min: 85, max: 100, label: 'Advanced' },
    },
  },
} as const

export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['Single assessment', 'Basic results', 'Individual use only'],
    limits: {
      assessments: 1,
      teamMembers: 0,
      teams: 0,
    },
  },
  INDIVIDUAL: {
    id: 'individual',
    name: 'Individual',
    monthlyPrice: 1900, // $19 in cents
    annualPrice: 15600, // $156 in cents (18% discount)
    features: ['Unlimited assessments', 'Detailed analytics', 'PDF reports', 'Progress tracking'],
    limits: {
      assessments: -1, // unlimited
      teamMembers: 0,
      teams: 0,
    },
  },
  PROFESSIONAL: {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 2900, // $29 in cents
    annualPrice: 23800, // $238 in cents (18% discount)
    features: [
      'Everything in Individual',
      'Team collaboration (5 members)',
      'Team analytics',
      'Priority support',
    ],
    limits: {
      assessments: -1, // unlimited
      teamMembers: 5,
      teams: 3,
    },
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 9900, // $99 in cents
    annualPrice: 81180, // $811.80 in cents (18% discount)
    features: [
      'Everything in Professional',
      'Unlimited team members',
      'Custom branding',
      'SSO integration',
      'Dedicated support',
    ],
    limits: {
      assessments: -1, // unlimited
      teamMembers: -1, // unlimited
      teams: -1, // unlimited
    },
  },
} as const

export const TEAM_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const

export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
} as const

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  UNPAID: 'unpaid',
} as const

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  TEAM_NAME_MIN_LENGTH: 2,
  TEAM_NAME_MAX_LENGTH: 50,
  COMPANY_NAME_MAX_LENGTH: 100,
  MAX_TEAM_MEMBERS_FREE: 0,
  MAX_TEAM_MEMBERS_PROFESSIONAL: 5,
} as const

export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection and try again.',
  AUTHENTICATION: 'Please log in to continue.',
  AUTHORIZATION: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
} as const

export const SUCCESS_MESSAGES = {
  ASSESSMENT_SUBMITTED: 'Assessment completed successfully!',
  TEAM_CREATED: 'Team created successfully!',
  INVITATION_SENT: 'Invitation sent successfully!',
  SUBSCRIPTION_UPDATED: 'Subscription updated successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
} as const
