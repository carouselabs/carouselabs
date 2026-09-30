import { Badge } from "@/components/ui/badge";

// Marks a curated CarouseLabs preset. Shared by the Home dropdown and the
// Profiles list so the two cannot label them differently. Brand purple (the
// accent token), distinct from the grey "default" pill used for the user's own
// default profile.
export function RecommendedBadge() {
  return (
    <Badge variant="accent" className="ml-1.5 font-semibold">
      ★ CarouseLabs Pick
    </Badge>
  );
}
