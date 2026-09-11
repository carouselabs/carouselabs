// /admin/prefill-user — pre-create a user's onboarding profile by email.
import { PrefillUserForm } from "@/components/admin/PrefillUserForm"

export const dynamic = "force-dynamic"

export default function AdminPrefillUserPage() {
  return <PrefillUserForm />
}
