import { useTranslation } from "react-i18next";
import { ActionGroupHeader } from "@/components/action-group-header";

const ACTIONS = [
  { slug: "eat", iconName: "Utensils", key: "home.actions.eat" },
  { slug: "drink", iconName: "Wine", key: "home.actions.drink" },
  { slug: "see", iconName: "Eye", key: "home.actions.see" },
  { slug: "do", iconName: "Footprints", key: "home.actions.do" },
  { slug: "buy", iconName: "ShoppingBag", key: "home.actions.buy" },
  { slug: "move", iconName: "Car", key: "home.actions.move" },
] as const;

export function ActionGrid() {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 py-2">
      {ACTIONS.map(({ slug, iconName, key }) => (
        <ActionGroupHeader
          key={slug}
          actionSlug={slug}
          actionLabel={t(key)}
          iconName={iconName}
          href={`/a/${slug}`}
        />
      ))}
    </div>
  );
}
