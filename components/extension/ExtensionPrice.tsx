// components/extension/ExtensionPrice.tsx — an Engage extension's monthly
// price as this person sees it (lib/engage/priceRules.ts): a special price an
// admin set for them shows the usual one struck through before it,
// "$15 $5/month" or, for an intro offer, "$15 $1 first month"; otherwise
// just "$15/month".
import { formatUsd, monthlyLabel, shortPriceLabel, type EngagePriceInfo } from "@/lib/engage/priceRules"

export const isDiscount = (price: EngagePriceInfo) => price.special && price.cents < price.standardCents

export function ExtensionPrice({ price }: { price: EngagePriceInfo }) {
  if (!isDiscount(price)) return <>{monthlyLabel(price.cents)}</>
  return (
    <>
      <span className="sr-only">Usually {formatUsd(price.standardCents)}, for you </span>
      <s aria-hidden className="opacity-70">
        {formatUsd(price.standardCents)}
      </s>{" "}
      {shortPriceLabel(price)}
    </>
  )
}

// "Nov 30, 2026", the day a special price can last be bought on.
export function priceEndDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
}
