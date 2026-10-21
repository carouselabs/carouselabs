// The plan's price as this account sees it (extensionPrice): "$15/month", or
// a special price after the usual one struck through, "$15 $5/month" or
// "$15 $1 first month". `withThen` adds what an intro offer becomes
// (", then $15/month"), for a sentence.
import { extensionPrice } from "@/lib/extensionAccess";
import type { ExtensionAccess } from "@/lib/api";

export function PriceText({ access, withThen = false }: { access: ExtensionAccess | null; withThen?: boolean }) {
  const { label, was, then } = extensionPrice(access);
  const after = withThen && then ? `, ${then}` : "";
  if (!was) return <>{label + after}</>;
  return (
    <>
      <span className="sr-only">Usually {was}, for you </span>
      <s aria-hidden className="opacity-70">
        {was}
      </s>{" "}
      {label + after}
    </>
  );
}
