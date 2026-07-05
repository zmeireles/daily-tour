import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useGuesthouses } from "./use-guesthouses";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";

export function GuesthouseList() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useGuesthouses();

  if (isLoading) {
    return <LoadingState variant="table" />;
  }
  if (isError) {
    return (
      <ErrorState
        description={t("guesthouses.list.error", "Failed to load guesthouses.")}
        onRetry={() => void refetch()}
      />
    );
  }

  const guesthouses = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("guesthouses.title", "Guesthouses")}</h1>
        <Button size="sm" onClick={() => void navigate("/admin/guesthouses/new")}>
          {t("guesthouses.new", "New Guesthouse")}
        </Button>
      </div>

      {guesthouses.length === 0 ? (
        <EmptyState
          icon="Home"
          title={t("empty_states.guesthouses.title", "No guesthouses yet")}
          description={t(
            "empty_states.guesthouses.description",
            "Add a guesthouse so guests can be linked to the right place to stay.",
          )}
          ctaLabel={t("empty_states.guesthouses.cta", "Add your first guesthouse")}
          ctaHref="/admin/guesthouses/new"
        />
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">
                  {t("guesthouses.list.name", "Name")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("guesthouses.list.slug", "Slug")}
                </th>
                <th className="px-4 py-2 text-left font-medium">
                  {t("guesthouses.list.address", "Address")}
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  {t("guesthouses.list.actions", "Actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {guesthouses.map((gh) => (
                <tr key={gh.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {gh.name["en"] ?? Object.values(gh.name)[0] ?? gh.id}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{gh.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
                    {gh.address}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void navigate(`/admin/guesthouses/${gh.id}`)}
                      >
                        {t("guesthouses.list.edit", "Edit")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
