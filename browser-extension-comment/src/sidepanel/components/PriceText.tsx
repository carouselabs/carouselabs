// The plan's monthly price as this account sees it (extensionPrice): "$15/month",
// or a special price after the usual one struck through, "$15 $5/month".
import { extensionPrice } from "@/lib/extensionAccess";
import type { ExtensionAccess } from "@/lib/api";

export function PriceText({ access }: { access: ExtensionAccess | null }) {
  const { label, was } = extensionPrice(access);
  if (!was) return <>{label}</>;
  return (
    <>
      <span className="sr-only">Usually {was}, for you </span>
      <s aria-hidden className="opacity-70">
        {was}
      </s>{" "}
      {label}
    </>
  );
}
