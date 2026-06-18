import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Overline } from "@/components/overline";
import { ACTIONS } from "@/features/home/actions";

export function ActionGrid() {
  const { t } = useTranslation("home");

  return (
    <div className="grid grid-cols-2 gap-3 px-4 py-2">
      {ACTIONS.map(({ slug, Icon, key }) => (
        <Link
          key={slug}
          to={`/a/${slug}`}
          className="aspect-square rounded-xl bg-surface-container-low p-6 flex flex-col items-start justify-between active:scale-95 transition"
        >
          <Icon size={28} aria-hidden="true" className="text-primary" />
          <Overline className="text-primary">{t(key)}</Overline>
        </Link>
      ))}
    </div>
  );
}
