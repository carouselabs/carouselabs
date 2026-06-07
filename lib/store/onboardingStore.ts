"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface OnboardingState {
  role: string
  industry: string
  niche: string
  topics: string[]
  audienceRole: string
  audienceSeniority: string
  audienceIndustry: string
  coreProblem: string
  goals: string[]
  primaryGoal: string
  tones: string[]
  setRole: (role: string) => void
  setIndustry: (industry: string) => void
  setNiche: (niche: string) => void
  setTopics: (topics: string[]) => void
  setAudienceRole: (role: string) => void
  setAudienceSeniority: (seniority: string) => void
  setAudienceIndustry: (industry: string) => void
  setCoreProblem: (problem: string) => void
  setGoals: (goals: string[]) => void
  setPrimaryGoal: (goal: string) => void
  setTones: (tones: string[]) => void
  reset: () => void
}

const defaults = {
  role: "",
  industry: "",
  niche: "",
  topics: [] as string[],
  audienceRole: "",
  audienceSeniority: "",
  audienceIndustry: "",
  coreProblem: "",
  goals: [] as string[],
  primaryGoal: "",
  tones: [] as string[],
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...defaults,
      setRole: (role) => set({ role }),
      setIndustry: (industry) => set({ industry }),
      setNiche: (niche) => set({ niche }),
      setTopics: (topics) => set({ topics }),
      setAudienceRole: (audienceRole) => set({ audienceRole }),
      setAudienceSeniority: (audienceSeniority) => set({ audienceSeniority }),
      setAudienceIndustry: (audienceIndustry) => set({ audienceIndustry }),
      setCoreProblem: (coreProblem) => set({ coreProblem }),
      setGoals: (goals) => set({ goals }),
      setPrimaryGoal: (primaryGoal) => set({ primaryGoal }),
      setTones: (tones) => set({ tones }),
      reset: () => set(defaults),
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
