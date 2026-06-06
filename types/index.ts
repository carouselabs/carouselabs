export type { User, Profile, Idea, Breakdown, Post, Slide, Subscription, LinkedInAccount, UsageCounter } from '@prisma/client'

export interface IdeaGenerateRequest {
  mode: 'AUTO' | 'SEEDED'
  seedText?: string
  sessionId?: string
}

export interface BreakdownRequest {
  ideaId: string
}

export interface PostGenerateRequest {
  ideaId: string
  format: 'CAPTION' | 'IMAGE' | 'CAROUSEL'
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface SSEEvent {
  type: 'token' | 'progress' | 'complete' | 'error'
  payload: unknown
}

export interface VoicePreset {
  name: string
  tone: string[]
  examples: string[]
}

export interface AudienceConfig {
  personas: string[]
  painPoints: string[]
  desires: string[]
}
