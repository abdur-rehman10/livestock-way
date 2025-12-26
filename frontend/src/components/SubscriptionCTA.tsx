import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

type SubscriptionVariant = "INFO_FREE_TRIP" | "BLOCKED_UPGRADE" | "REMINDER";

interface SubscriptionCTAProps {
  variant: SubscriptionVariant;
  monthlyPrice?: number | null;
  yearlyPrice?: number | null;
  onUpgradeClick?: () => void;
}

const variantConfig: Record<
  SubscriptionVariant,
  { title: string; description?: string; buttonLabel: string; tone: "info" | "warning" | "muted" }
> = {
  INFO_FREE_TRIP: {
    title: "You have 1 free trip available.",
    description: "View plans to keep hauling after your free trip.",
    buttonLabel: "View Plans",
    tone: "info",
  },
  BLOCKED_UPGRADE: {
    title: "Upgrade required to place offers.",
    description: "Subscribe to continue using LivestockWay.",
    buttonLabel: "Upgrade Now",
    tone: "warning",
  },
  REMINDER: {
    title: "Upgrade to unlock full access.",
    description: undefined,
    buttonLabel: "View Plans",
    tone: "muted",
  },
};

function getToneClasses(tone: "info" | "warning" | "muted") {
  if (tone === "warning") {
    return {
      card: "border-amber-200 bg-amber-50",
      text: "text-amber-900",
      badge: "bg-white text-amber-900 border-amber-200",
      button: "border-amber-300 text-amber-900 hover:bg-white",
    };
  }
  if (tone === "info") {
    return {
      card: "border-emerald-200 bg-emerald-50",
      text: "text-emerald-900",
      badge: "bg-white text-emerald-900 border-emerald-200",
      button: "border-emerald-300 text-emerald-900 hover:bg-white",
    };
  }
  return {
    card: "border-slate-200 bg-slate-50",
    text: "text-slate-800",
    badge: "bg-white text-slate-700 border-slate-200",
    button: "border-slate-200 text-slate-700 hover:bg-white",
  };
}

export function SubscriptionCTA({
  variant,
  monthlyPrice,
  yearlyPrice,
  onUpgradeClick,
}: SubscriptionCTAProps) {
  const cfg = variantConfig[variant];
  const tone = getToneClasses(cfg.tone);

  return (
    <Card className={`shadow-none ${tone.card}`}>
      <CardContent className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className={`text-sm font-medium ${tone.text}`}>
          <div className="flex items-center gap-2">
            <span>{cfg.title}</span>
            {(variant === "INFO_FREE_TRIP" || variant === "BLOCKED_UPGRADE") && (
              <Badge variant="secondary" className={tone.badge}>
                Individual plan
              </Badge>
            )}
          </div>
          {cfg.description && (
            <p className="text-xs text-gray-600 mt-1">{cfg.description}</p>
          )}
          {(monthlyPrice !== undefined || yearlyPrice !== undefined) && (
            <p className="text-xs text-gray-600 mt-1">
              {monthlyPrice !== undefined && monthlyPrice !== null
                ? `Monthly: $${monthlyPrice.toFixed(2)}`
                : "Monthly: N/A"}
              {" · "}
              {yearlyPrice !== undefined && yearlyPrice !== null
                ? `Yearly: $${yearlyPrice.toFixed(2)}`
                : "Yearly: N/A"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className={tone.button}
            onClick={onUpgradeClick}
          >
            {cfg.buttonLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
