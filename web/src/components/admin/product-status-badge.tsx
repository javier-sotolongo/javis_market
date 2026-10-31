import { Badge } from "@/components/ui/badge";

const LABELS = { ACTIVE: ["Published", "green"], DRAFT: ["Draft", "amber"], ARCHIVED: ["Archived", "gray"] } as const;

export function ProductStatusBadge({ status }: { readonly status: keyof typeof LABELS }) {
  const [label, tone] = LABELS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
