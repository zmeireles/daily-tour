import { useTranslation } from "react-i18next";
import { ActionGroupHeader } from "@/components/action-group-header";

const ACTIONS = [
  { slug: "eat", iconName: "Utensils", key: "actions.eat" },
  { slug: "drink", iconName: "Wine", key: "actions.drink" },
  { slug: "see", iconName: "Eye", key: "actions.see" },
  { slug: "do", iconName: "Footprints", key: "actions.do" },
  { slug: "buy", iconName: "ShoppingBag", key: "actions.buy" },
  { slug: "move", iconName: "Car", key: "actions.move" },
] as const;

export function ActionGrid() {
  const { t } = useTranslation("home");

  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
      <ActionGroupHeader
        actionSlug="chat"
        actionLabel={t("actions.chat")}
        iconName="MessageCircle"
        href="/chat"
      />
    </div>
  );
}
