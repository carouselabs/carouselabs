import { z } from 'zod'

export const ideaGenerateSchema = z.object({
  mode: z.enum(['AUTO', 'SEEDED']),
  seedText: z.string().max(500).optional(),
  sessionId: z.string().optional(),
})

export const ideaMoreSchema = z.object({
  sessionId: z.string(),
  existingIds: z.array(z.string()).max(50),
})

export const breakdownRequestSchema = z.object({
  ideaId: z.string().cuid(),
})

export const postGenerateSchema = z.object({
  ideaId: z.string().cuid(),
  format: z.enum(['CAPTION', 'IMAGE', 'CAROUSEL']),
  overrides: z.record(z.string()).optional(),
})

export const profileUpdateSchema = z.object({
  identity: z.string().min(10).max(500),
  industry: z.string().min(2).max(100),
  niche: z.string().max(200).optional(),
  audience: z.object({
    personas: z.array(z.string()),
    painPoints: z.array(z.string()),
    desires: z.array(z.string()),
  }),
  goals: z.array(z.string()).max(10),
  tone: z.array(z.string()).max(5),
  topics: z.array(z.string()).max(20),
  doNotUse: z.array(z.string()).max(20),
  cadence: z.number().int().min(1).max(30).optional(),
  referenceCreators: z.array(z.string()).max(10),
})

export const subscriptionCreateSchema = z.object({
  planId: z.string(),
})

export type IdeaGenerateInput = z.infer<typeof ideaGenerateSchema>
export type IdeaMoreInput = z.infer<typeof ideaMoreSchema>
export type PostGenerateInput = z.infer<typeof postGenerateSchema>
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>
