// app/(marketing)/formats/ideas-cross-link.ts
// Light-touch cross-links from /formats topics to existing /ideas/[niche]
// pages, where a topic genuinely overlaps a niche's interests. Not every
// topic has an entry — only where the overlap is real, not forced.

export const IDEAS_CROSS_LINK: Record<string, { slug: string; name: string }[]> = {
  networking: [
    { slug: "recruiters", name: "Recruiters" },
    { slug: "linkedin-coaches", name: "LinkedIn Coaches" },
  ],
  "career-change": [
    { slug: "career-coaches", name: "Career Coaches" },
    { slug: "recruiters", name: "Recruiters" },
  ],
  leadership: [
    { slug: "executive-coaches", name: "Executive Coaches" },
    { slug: "leadership-coaches", name: "Leadership Coaches" },
  ],
  productivity: [{ slug: "productivity-coaches", name: "Productivity Coaches" }],
  "remote-work": [
    { slug: "hr-professionals", name: "HR Professionals" },
    { slug: "project-managers", name: "Project Managers" },
  ],
  sales: [
    { slug: "b2b-sales-professionals", name: "B2B Sales Professionals" },
    { slug: "sales-managers", name: "Sales Managers" },
    { slug: "sales-coaches", name: "Sales Coaches" },
  ],
  "personal-finance": [
    { slug: "personal-finance-coaches", name: "Personal Finance Coaches" },
    { slug: "financial-advisors", name: "Financial Advisors" },
  ],
  "mental-health-at-work": [
    { slug: "mental-health-coaches", name: "Mental Health Coaches" },
    { slug: "therapists", name: "Therapists" },
  ],
  "job-searching": [
    { slug: "recruiters", name: "Recruiters" },
    { slug: "career-coaches", name: "Career Coaches" },
  ],
  "startup-growth": [
    { slug: "startup-founders", name: "Startup Founders" },
    { slug: "growth-hackers", name: "Growth Hackers" },
  ],
  "public-speaking": [
    { slug: "public-speaking-coaches", name: "Public Speaking Coaches" },
    { slug: "speakers", name: "Speakers" },
  ],
  "time-management": [{ slug: "productivity-coaches", name: "Productivity Coaches" }],
  "work-life-balance": [
    { slug: "wellness-coaches", name: "Wellness Coaches" },
    { slug: "life-coaches", name: "Life Coaches" },
  ],
  "team-building": [
    { slug: "hr-professionals", name: "HR Professionals" },
    { slug: "project-managers", name: "Project Managers" },
  ],
  "customer-service": [{ slug: "community-managers", name: "Community Managers" }],
  innovation: [{ slug: "innovation-consultants", name: "Innovation Consultants" }],
  "diversity-and-inclusion": [
    { slug: "diversity-inclusion-consultants", name: "Diversity & Inclusion Consultants" },
  ],
  "employee-engagement": [{ slug: "hr-professionals", name: "HR Professionals" }],
  negotiation: [
    { slug: "sales-coaches", name: "Sales Coaches" },
    { slug: "business-coaches", name: "Business Coaches" },
  ],
  "goal-setting": [
    { slug: "life-coaches", name: "Life Coaches" },
    { slug: "mindset-coaches", name: "Mindset Coaches" },
  ],
  mentorship: [
    { slug: "executive-coaches", name: "Executive Coaches" },
    { slug: "career-coaches", name: "Career Coaches" },
  ],
  "personal-development": [
    { slug: "life-coaches", name: "Life Coaches" },
    { slug: "mindset-coaches", name: "Mindset Coaches" },
  ],
  "resume-writing": [
    { slug: "recruiters", name: "Recruiters" },
    { slug: "career-coaches", name: "Career Coaches" },
  ],
  "interview-tips": [
    { slug: "recruiters", name: "Recruiters" },
    { slug: "career-coaches", name: "Career Coaches" },
  ],
  "salary-negotiation": [
    { slug: "career-coaches", name: "Career Coaches" },
    { slug: "recruiters", name: "Recruiters" },
  ],
  "workplace-culture": [{ slug: "hr-professionals", name: "HR Professionals" }],
  onboarding: [
    { slug: "hr-professionals", name: "HR Professionals" },
    { slug: "project-managers", name: "Project Managers" },
  ],
  "performance-reviews": [
    { slug: "hr-professionals", name: "HR Professionals" },
    { slug: "executive-coaches", name: "Executive Coaches" },
  ],
  "burnout-prevention": [
    { slug: "wellness-coaches", name: "Wellness Coaches" },
    { slug: "mental-health-coaches", name: "Mental Health Coaches" },
  ],
  "career-pivot": [{ slug: "career-coaches", name: "Career Coaches" }],
  "skill-development": [
    { slug: "corporate-trainers", name: "Corporate Trainers" },
    { slug: "course-creators", name: "Course Creators" },
  ],
  "thought-leadership": [
    { slug: "ceos-executives", name: "CEOs & Executives" },
    { slug: "linkedin-ghostwriters", name: "LinkedIn Ghostwriters" },
  ],
  "professional-development": [
    { slug: "corporate-trainers", name: "Corporate Trainers" },
    { slug: "career-coaches", name: "Career Coaches" },
  ],
  "workplace-communication": [
    { slug: "hr-professionals", name: "HR Professionals" },
    { slug: "executive-coaches", name: "Executive Coaches" },
  ],
  "personal-branding": [
    { slug: "linkedin-coaches", name: "LinkedIn Coaches" },
    { slug: "linkedin-ghostwriters", name: "LinkedIn Ghostwriters" },
  ],
}
