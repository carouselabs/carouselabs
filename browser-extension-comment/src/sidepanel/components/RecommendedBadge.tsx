// Marks a curated CarouseLabs preset. Shared by the Home dropdown and the
// Profiles list so the two cannot label them differently. Purple to match the
// brand, and distinct from the grey "default" pill used for the user's own
// default profile.
export function RecommendedBadge() {
  return (
    <span className="ml-1.5 inline-flex shrink-0 items-center rounded-full bg-[rgba(124,58,237,0.1)] px-1.5 py-0.5 text-[10px] font-semibold text-[#7C3AED]">
      ★ CarouseLabs Pick
    </span>
  );
}
