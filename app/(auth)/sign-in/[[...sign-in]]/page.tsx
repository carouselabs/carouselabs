import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex justify-center">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#7C3AED",
            colorBackground: "#0D0D1A",
            colorInputBackground: "#080810",
            colorInputText: "#F0F0FA",
            colorText: "#F0F0FA",
            colorTextSecondary: "rgba(255,255,255,0.5)",
            colorNeutral: "#F0F0FA",
            borderRadius: "12px",
            fontFamily: "Inter, system-ui, sans-serif",
          },
          elements: {
            rootBox: "w-full max-w-[400px]",
            card: "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-2xl",
            cardBox: "shadow-none",
            headerTitle: "text-[#F0F0FA] font-semibold",
            headerSubtitle: "text-[rgba(255,255,255,0.5)]",
            socialButtonsBlockButton:
              "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-[#F0F0FA] transition-colors",
            formFieldLabel: "text-[rgba(255,255,255,0.7)]",
            formFieldInput:
              "bg-[#080810] border-[rgba(255,255,255,0.08)] text-[#F0F0FA] focus-within:border-[#7C3AED] rounded-lg",
            formButtonPrimary:
              "bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors",
            footerActionLink: "text-[#A78BFA] hover:text-[#7C3AED]",
            dividerLine: "bg-[rgba(255,255,255,0.08)]",
            dividerText: "text-[rgba(255,255,255,0.5)]",
            identityPreviewText: "text-[#F0F0FA]",
            identityPreviewEditButton: "text-[#A78BFA]",
            formResendCodeLink: "text-[#A78BFA]",
            otpCodeFieldInput:
              "bg-[#080810] border-[rgba(255,255,255,0.08)] text-[#F0F0FA]",
            alertText: "text-[rgba(255,255,255,0.7)]",
          },
        }}
      />
    </div>
  )
}
