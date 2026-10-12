// Shared Clerk appearance for the sign-in / sign-up pages, matching the
// marketing site's cream + charcoal (Onest) theme. fontFamily is "inherit" so
// the card picks up the Onest font set on the auth layout wrapper.
export const authAppearance = {
  variables: {
    colorPrimary: "#1A1A1A",
    colorText: "#0A0A0A",
    colorTextSecondary: "#6B7280",
    colorBackground: "#FFFDF8",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#0A0A0A",
    colorNeutral: "#0A0A0A",
    colorDanger: "#DC2626",
    borderRadius: "12px",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "w-full max-w-[400px]",
    card: "bg-[#FFFDF8] border border-[#E5E3DE] rounded-2xl shadow-[0_16px_50px_rgba(10,10,10,0.08)]",
    cardBox: "shadow-none",
    headerTitle: "text-[#0A0A0A] font-semibold",
    headerSubtitle: "text-[#6B7280]",
    socialButtonsBlockButton:
      "border border-[#E5E3DE] bg-white hover:bg-[#F3F1EB] text-[#0A0A0A] transition-colors",
    socialButtonsBlockButtonText: "text-[#0A0A0A] font-medium",
    dividerLine: "bg-[#E5E3DE]",
    dividerText: "text-[#9CA3AF]",
    formFieldLabel: "text-[#374151]",
    formFieldInput:
      "bg-white border-[#E5E3DE] text-[#0A0A0A] focus-within:border-[#1A1A1A] rounded-lg",
    formButtonPrimary:
      "bg-[#1A1A1A] hover:bg-black text-white rounded-lg transition-colors shadow-none normal-case",
    footerActionText: "text-[#6B7280]",
    footerActionLink: "text-[#1A1A1A] hover:text-black font-semibold",
    identityPreviewText: "text-[#0A0A0A]",
    identityPreviewEditButton: "text-[#1A1A1A]",
    formResendCodeLink: "text-[#1A1A1A]",
    otpCodeFieldInput: "bg-white border-[#E5E3DE] text-[#0A0A0A]",
    alertText: "text-[#374151]",
    formFieldInputShowPasswordButton: "text-[#6B7280] hover:text-[#0A0A0A]",
  },
}
