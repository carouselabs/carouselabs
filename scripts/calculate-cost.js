/* eslint-disable */
// scripts/calculate-cost.js
//
// One-time per-credit API cost calculator for CarouseLabs.
// Run: node scripts/calculate-cost.js
//
// All token counts are ESTIMATES derived from the real prompt files
// (lib/ai/prompts/*.ts, the breakdown + caption routes). They are deliberately
// exposed as constants below so you can tweak them as the prompts evolve.
// Rule of thumb used: ~4 chars/token, ~0.75 words/token.

// ───────────────────────── Vendor prices (June 2026) ─────────────────────────
const CLAUDE_INPUT_PER_TOKEN = 3.0 / 1_000_000; // Sonnet 4.6: $3.00 / 1M input
const CLAUDE_OUTPUT_PER_TOKEN = 15.0 / 1_000_000; // Sonnet 4.6: $15.00 / 1M output
const IMAGE_COST = 0.045; // gpt-image-2, medium quality, 4:5 (safe avg)
// NewsAPI / Resend / Upstash Redis / Cloudflare R2 → $0 marginal at our volume.

// ───────────────── Per-action token estimates (input, output) ────────────────
// Rationale for each is noted; these come from reading the actual prompts.
const ACTIONS = {
  // ideas.ts: ~500 tok static instructions + ~150 profile + ~200 news headlines.
  // Output: 10 one-line ideas (~30 words each).
  idea: { in: 900, out: 400, label: "Idea generation (10 ideas)" },

  // breakdown route: long strategist instruction (~1.1k tok) + profile + hook.
  // Output capped at max_tokens 3000; rich multi-section deep dive (~2k tok).
  breakdown: { in: 1300, out: 2000, label: "Breakdown / deep dive" },

  // caption route: CAPTION_GHOSTWRITER_INSTRUCTION (~530 tok) + profile +
  // the FULL deepDive fed back in (~2k tok) + format. Output: 1500-2500 char caption.
  caption: { in: 2800, out: 600, label: "Caption generation" },

  // imagePrompt.ts: ghostwriter instr + big builder that embeds the deepDive
  // TWICE (~4k tok) + caption + reference instructions. Output: 400+ word image
  // prompt + caption (JSON).
  imagePromptText: { in: 5500, out: 1200, label: "Image-prompt (Claude text)" },

  // carouselPrompt.ts: similar large builder with deepDive + caption embedded.
  // Output: 7-8 slide objects (headline + per-slide image prompt) as JSON.
  carouselPromptText: { in: 5000, out: 2000, label: "Carousel-prompt (Claude text)" },
};

const CAROUSEL_SLIDES = 8;

// ─────────────────────── Path mix assumptions ───────────────────────
const PATH_MIX = { A: 0.2, B: 0.3, C: 0.5 }; // carousel = flagship → 50%
const CREDITS_PER_MONTH = 30;
const PRO_PRICE = 34;

// Idea generation volume (separate from credits). Treated as 90 idea-generation
// calls/day (each call returns 10 ideas).
const IDEA_CALLS_PER_DAY = 90;
const DAYS = 30;

// ─────────────────────────── Cost helpers ───────────────────────────
function claudeCost(a) {
  return a.in * CLAUDE_INPUT_PER_TOKEN + a.out * CLAUDE_OUTPUT_PER_TOKEN;
}
function usd(n) {
  return "$" + n.toFixed(n < 1 ? 4 : 2);
}
function pct(n) {
  return (n * 100).toFixed(1) + "%";
}

// Per-action Claude costs
const cost = {
  idea: claudeCost(ACTIONS.idea),
  breakdown: claudeCost(ACTIONS.breakdown),
  caption: claudeCost(ACTIONS.caption),
  imagePromptText: claudeCost(ACTIONS.imagePromptText),
  carouselPromptText: claudeCost(ACTIONS.carouselPromptText),
};

// Per-path credit costs
const pathA = cost.breakdown + cost.caption;
const pathB = cost.breakdown + cost.caption + cost.imagePromptText + IMAGE_COST;
const pathC =
  cost.breakdown + cost.caption + cost.carouselPromptText + CAROUSEL_SLIDES * IMAGE_COST;

const weightedCredit = PATH_MIX.A * pathA + PATH_MIX.B * pathB + PATH_MIX.C * pathC;

// Monthly credit costs
const monthlyWorst = CREDITS_PER_MONTH * pathC; // all carousel
const monthlyRealistic = CREDITS_PER_MONTH * weightedCredit;

// Idea-generation monthly cost (separate)
const ideaMonthly = IDEA_CALLS_PER_DAY * DAYS * cost.idea;

// Margins (on the 30-credit cost only, per the brief)
const marginWorst = (PRO_PRICE - monthlyWorst) / PRO_PRICE;
const marginRealistic = (PRO_PRICE - monthlyRealistic) / PRO_PRICE;
const priceFor70Worst = monthlyWorst / (1 - 0.7);
const priceFor80Realistic = monthlyRealistic / (1 - 0.8);

// ──────────────────────────── Rendering ────────────────────────────
function rule(width = 72) {
  return "─".repeat(width);
}
function row(cols, widths, aligns) {
  return cols
    .map((c, i) => {
      const s = String(c);
      return aligns[i] === "r" ? s.padStart(widths[i]) : s.padEnd(widths[i]);
    })
    .join("  ");
}

console.log("\n" + "═".repeat(72));
console.log("  CarouseLabs — API Cost Calculator (Sonnet 4.6 @ $3/$15 per 1M)");
console.log("═".repeat(72));

// 1. Per-action breakdown
console.log("\n▌ PER-ACTION COST (Claude text only; image cost added separately)\n");
{
  const w = [30, 9, 9, 11, 11];
  const al = ["l", "r", "r", "r", "r"];
  console.log(row(["Action", "In tok", "Out tok", "In $", "Out $"], w, al));
  console.log(rule(72));
  for (const key of Object.keys(ACTIONS)) {
    const a = ACTIONS[key];
    console.log(
      row(
        [
          a.label,
          a.in,
          a.out,
          usd(a.in * CLAUDE_INPUT_PER_TOKEN),
          usd(a.out * CLAUDE_OUTPUT_PER_TOKEN),
        ],
        w,
        al
      ) + "   = " + usd(cost[key])
    );
  }
  console.log(rule(72));
  console.log("  gpt-image-2 per image (flat): " + usd(IMAGE_COST));
}

// 2. Per-credit paths
console.log("\n▌ COST PER CREDIT (1 credit = 1 breakdown click → output path)\n");
{
  const w = [44, 12];
  const al = ["l", "r"];
  console.log(row(["Path", "Cost"], w, al));
  console.log(rule(60));
  console.log(row(["A — Caption Only (breakdown + caption)", usd(pathA)], w, al));
  console.log(
    row(["B — Caption + Image (+img prompt + 1 image)", usd(pathB)], w, al)
  );
  console.log(
    row(
      ["C — Caption + Carousel (+carousel prompt + 8 imgs)", usd(pathC)],
      w,
      al
    )
  );
  console.log(rule(60));
  console.log(
    row(
      [
        `Weighted avg/credit (A ${pct(PATH_MIX.A)}, B ${pct(
          PATH_MIX.B
        )}, C ${pct(PATH_MIX.C)})`,
        usd(weightedCredit),
      ],
      w,
      al
    )
  );
}

// 3. Monthly costs
console.log("\n▌ MONTHLY COST\n");
{
  const w = [50, 12];
  const al = ["l", "r"];
  console.log(
    row([`30 credits — WORST case (all Path C / carousel)`, usd(monthlyWorst)], w, al)
  );
  console.log(
    row([`30 credits — REALISTIC (weighted avg)`, usd(monthlyRealistic)], w, al)
  );
  console.log(
    row(
      [
        `Idea gen — ${IDEA_CALLS_PER_DAY} calls/day × ${DAYS}d (separate)`,
        usd(ideaMonthly),
      ],
      w,
      al
    )
  );
}

// 4. Pricing & margin
console.log("\n▌ PRICING & GROSS MARGIN  (margin = (price − cost) / price)\n");
{
  const w = [50, 12];
  const al = ["l", "r"];
  console.log(row([`At $${PRO_PRICE} Pro — margin WORST case`, pct(marginWorst)], w, al));
  console.log(
    row([`At $${PRO_PRICE} Pro — margin REALISTIC case`, pct(marginRealistic)], w, al)
  );
  console.log(rule(64));
  console.log(
    row([`Price needed for 70% margin (worst case)`, usd(priceFor70Worst)], w, al)
  );
  console.log(
    row(
      [`Price needed for 80% margin (realistic case)`, usd(priceFor80Realistic)],
      w,
      al
    )
  );
}

console.log("\n" + rule(72));
console.log(
  "Note: margins above cover the 30 credits only. Idea-generation (" +
    usd(ideaMonthly) +
    "/mo at the assumed volume)\nis platform-wide, not per-user — fold a per-user share in if you want a fully-loaded margin."
);
console.log(rule(72) + "\n");
