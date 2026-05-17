import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { usePlaces, useArchivePlace } from "./use-places";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "published") return "default";
  if (status === "archived") return "destructive";
  if (status === "owner_approved") return "secondary";
  return "outline";
}

export function PlaceList() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePlaces();
  const archiveMutation = useArchivePlace();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t("places.list.loading", "Loading…")}</p>;
  }
  if (isError) {
    return <p className="text-destructive text-sm">{t("places.list.error", "Failed to load places.")}</p>;
  }

  const places = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("places.title", "Places")}</h1>
        <Button size="sm" onClick={() => void navigate("/admin/places/new")}>
          {t("places.new", "New Place")}
        </Button>
      </div>

      {places.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("places.list.empty", "No places yet.")}</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">{t("places.list.name", "Name")}</th>
                <th className="px-4 py-2 text-left font-medium">{t("places.list.status", "Status")}</th>
                <th className="px-4 py-2 text-left font-medium">{t("places.list.address", "Address")}</th>
                <th className="px-4 py-2 text-right font-medium">{t("places.list.actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {places.map((place) => (
                <tr key={place.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {place.name["en"] ?? Object.values(place.name)[0] ?? place.id}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(place.status)}>{place.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">
                    {place.address}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void navigate(`/admin/places/${place.id}`)}
                      >
                        {t("places.list.edit", "Edit")}
                      </Button>
                      {place.status !== "archived" && (
                        confirmId === place.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={archiveMutation.isPending}
                              onClick={() => {
                                archiveMutation.mutate(place.id, {
                                  onSuccess: () => setConfirmId(null),
                                });
                              }}
                            >
                              {t("places.archive.yes", "Archive")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmId(null)}
                            >
                              {t("places.archive.no", "Cancel")}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmId(place.id)}
                          >
                            {t("places.archive.button", "Archive")}
                          </Button>
                        )
                      )}
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
