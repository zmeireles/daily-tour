import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { ChevronRight, CircleCheck, Circle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePlaces } from "@/features/backoffice/places/use-places";
import { useGuesthouses } from "@/features/backoffice/guesthouses/use-guesthouses";
import { useProfile } from "@/features/backoffice/profile/use-profile";

interface ChecklistItem {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

function ItemRow({ item }: { item: ChecklistItem }) {
  const Icon = item.done ? CircleCheck : Circle;
  const iconClass = cn("h-5 w-5 shrink-0", item.done ? "text-primary" : "text-muted-foreground");

  if (item.done) {
    return (
      <div className="flex min-h-11 items-center gap-3 px-1 text-sm text-muted-foreground">
        <Icon className={iconClass} />
        <span className="line-through">{item.label}</span>
      </div>
    );
  }

  return (
    <Link
      to={item.href}
      className="flex min-h-11 items-center gap-3 rounded-md px-1 text-sm hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className={iconClass} />
      <span className="flex-1 font-medium text-foreground">{item.label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

// First-run onboarding checklist. Renders ONLY while setup is incomplete (a place,
// a guesthouse and a profile photo missing) and hides itself once all three exist.
// Stays silent while its queries load/error so it never flashes speculatively.
export function SetupChecklist() {
  const { t } = useTranslation("admin");
  const places = usePlaces();
  const guesthouses = useGuesthouses();
  const profile = useProfile();

  const settled =
    !places.isLoading &&
    !guesthouses.isLoading &&
    !profile.isLoading &&
    !places.isError &&
    !guesthouses.isError &&
    !profile.isError;
  if (!settled) return null;

  const hasGuesthouse = (guesthouses.data?.data.length ?? 0) > 0;
  // usePlaces includes archived rows; an archived-only owner has nothing live for
  // guests, so archived places don't count as "has a place".
  const hasPlace = (places.data?.data.filter((p) => p.status !== "archived").length ?? 0) > 0;
  const hasPhoto = !!profile.data?.photo;
  if (hasGuesthouse && hasPlace && hasPhoto) return null;

  const items: ChecklistItem[] = [
    {
      key: "guesthouse",
      label: t("dashboard.checklist.add_guesthouse", "Add your guesthouse"),
      href: "/admin/guesthouses/new",
      done: hasGuesthouse,
    },
    {
      key: "place",
      label: t("dashboard.checklist.add_place", "Add your first place"),
      href: "/admin/places/new",
      done: hasPlace,
    },
    {
      key: "photo",
      label: t("dashboard.checklist.add_photo", "Add a profile photo"),
      href: "/admin/profile",
      done: hasPhoto,
    },
  ];
  const doneCount = items.filter((i) => i.done).length;

  return (
    <Card className="border-dashed shadow-none">
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">
            {t("dashboard.checklist.title", "Finish setting up")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.checklist.progress", "{{done}} of {{total}} done", {
              done: doneCount,
              total: items.length,
            })}
          </p>
        </div>
        <div className="flex flex-col">
          {items.map((item) => (
            <ItemRow key={item.key} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
