import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ACTIONS } from "@/features/home/actions";

// Visible category switch for desktop Discover — replaces the mobile metaphor
// where the category was encoded only in the back-header title. Each item routes
// to /a/:slug (the existing action param). Reuses the shared ACTIONS source.
export function CategorySegmented({ action }: { action: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation("home");

  return (
    <ToggleGroup
      type="single"
      value={action}
      onValueChange={(v) => {
        if (v) void navigate(`/a/${v}`);
      }}
      aria-label={t("nav.discover")}
    >
      {ACTIONS.map(({ slug, Icon, key }) => (
        <ToggleGroupItem key={slug} value={slug} aria-label={t(key)} className="gap-1.5 px-3">
          <Icon size={16} aria-hidden="true" />
          <span className="hidden lg:inline">{t(key)}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
