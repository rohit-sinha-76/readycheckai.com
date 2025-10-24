/**
 * ReadyCheck AI - Type System Entry Point
 * Phase 5: Comprehensive TypeScript Architecture
 */

// Core domain types
export * from './core'

// API and request/response types
export * from './api'

// Database and Supabase integration types
// export * from './database'  // TODO: Fix database type exports
export * from './supabase'

// State management types
export * from './state'

// Validation schemas and runtime type checking  
// export * from './validation'  // TODO: Fix export conflicts with api.ts

// Export default as empty object to satisfy ESLint
const typeExports = {}
export default typeExports
