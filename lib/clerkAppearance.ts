// Shared Clerk appearance for the sign-in / sign-up pages, matching the
// redesign tokens (app/globals.css, light theme). Clerk's `variables` need
// literal colors, so the token values are repeated here — keep them in step.
// fontFamily is "inherit" so the card picks up Geist from the auth layout.
export const authAppearance = {
  variables: {
    colorPrimary: "#211F1C",
    colorText: "#211F1C",
    colorTextSecondary: "#67625B",
    colorBackground: "#FFFDF9",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#211F1C",
    colorNeutral: "#211F1C",
    colorDanger: "#B91C1C",
    borderRadius: "12px",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "w-full max-w-[400px]",
    card: "bg-surface border border-border rounded-showcase shadow-popover",
    cardBox: "shadow-none",
    headerTitle: "text-foreground font-semibold",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton:
      "min-h-11 border border-control-border bg-surface-raised hover:bg-surface-muted text-foreground transition-colors",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
    formFieldLabel: "text-foreground",
    formFieldInput:
      "min-h-11 bg-surface-raised border-control-border text-foreground focus-within:border-brand rounded-control",
    formButtonPrimary:
      "min-h-11 bg-primary hover:bg-primary-hover text-primary-foreground rounded-control transition-colors shadow-none normal-case",
    footerActionText: "text-muted-foreground",
    footerActionLink: "text-foreground hover:text-brand font-semibold",
    identityPreviewText: "text-foreground",
    identityPreviewEditButton: "text-foreground",
    formResendCodeLink: "text-foreground",
    otpCodeFieldInput: "bg-surface-raised border-control-border text-foreground",
    alertText: "text-foreground",
    formFieldInputShowPasswordButton: "text-muted-foreground hover:text-foreground",
  },
}
