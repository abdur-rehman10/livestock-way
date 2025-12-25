import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  fetchIndividualPricing,
  updateIndividualPricing,
  fetchCompanyPricing,
  updateCompanyPricing,
  type PricingCompanyTier,
} from "../api/admin";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";

export default function AdminPricing() {
  const [individualPrice, setIndividualPrice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedPrice, setLastSavedPrice] = useState<number | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaving, setCompanySaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  type EditableTier = {
    id?: number | null;
    tempId?: string;
    name: string;
    min_vehicles: number | null;
    max_vehicles: number | null;
    monthly_price: number | null;
    sales_form_link: string | null;
    is_enterprise: boolean;
    sort_order: number;
  };
  const [tiers, setTiers] = useState<EditableTier[]>([]);
  const [editingTier, setEditingTier] = useState<EditableTier | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    fetchIndividualPricing()
      .then((data) => {
        if (ignore) return;
        if (data?.monthly_price != null) {
          const parsed = Number(data.monthly_price);
          setIndividualPrice(String(parsed));
          setLastSavedPrice(parsed);
        }
      })
      .catch((err: any) => {
        if (ignore) return;
        setError(err?.message || "Failed to load individual pricing");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    setCompanyLoading(true);
    setCompanyError(null);
    fetchCompanyPricing()
      .then((data) => {
        if (ignore) return;
        setTiers(
          (data.tiers || []).map((t) => ({
            id: t.id,
            name: t.name,
            min_vehicles: t.min_vehicles != null ? Number(t.min_vehicles) : null,
            max_vehicles: t.max_vehicles != null ? Number(t.max_vehicles) : null,
            monthly_price: t.monthly_price != null ? Number(t.monthly_price) : null,
            sales_form_link: t.sales_form_link,
            is_enterprise: t.is_enterprise,
            sort_order: t.sort_order,
          }))
        );
      })
      .catch((err: any) => {
        if (ignore) return;
        setCompanyError(err?.message || "Failed to load company pricing");
      })
      .finally(() => {
        if (ignore) return;
        setCompanyLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleSaveIndividual = async () => {
    const price = Number(individualPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Monthly price must be a positive number.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await updateIndividualPricing(price);
      setLastSavedPrice(price);
      toast.success("Individual pricing updated.");
    } catch (err: any) {
      setError(err?.message || "Failed to update pricing");
      toast.error(err?.message || "Failed to update pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleEditTier = (tier?: EditableTier) => {
    if (!tier) {
      setEditingTier({
        id: null,
        tempId: crypto.randomUUID?.() || String(Date.now()),
        name: "",
        min_vehicles: null,
        max_vehicles: null,
        monthly_price: null,
        sales_form_link: null,
        is_enterprise: false,
        sort_order: (tiers[tiers.length - 1]?.sort_order ?? -1) + 1,
      });
    } else {
      setEditingTier({ ...tier });
    }
    setCompanyError(null);
    setDialogOpen(true);
  };

  const handleRemoveTier = (id?: number | null, tempId?: string) => {
    setTiers((prev) =>
      prev.filter(
        (t) =>
          (id != null ? t.id !== id : true) &&
          (tempId ? (t as any).tempId !== tempId : true)
      )
    );
  };

  const hasOverlap = (list: typeof tiers) => {
    const nonEnterprise = list.filter((t) => !t.is_enterprise);
    const sorted = [...nonEnterprise].sort((a, b) => (a.min_vehicles ?? 0) - (b.min_vehicles ?? 0));
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (
        prev.max_vehicles != null &&
        curr.min_vehicles != null &&
        curr.min_vehicles <= prev.max_vehicles
      ) {
        return true;
      }
    }
    return false;
  };

  const handleSaveTier = () => {
    if (!editingTier) return;
    const isEnterprise =
      editingTier.is_enterprise || editingTier.name.trim().toLowerCase() === "enterprise";
    if (!editingTier.name.trim()) {
      setCompanyError("Tier name is required.");
      return;
    }
    if (isEnterprise) {
      const link = editingTier.sales_form_link?.trim() || "";
      if (!link) {
        setCompanyError("Enterprise tier requires a sales form link.");
        return;
      }
      try {
        const url = new URL(link);
        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("invalid");
        }
      } catch {
        setCompanyError("Enter a valid URL (http/https) for the sales form link.");
        return;
      }
    } else {
      if (
        editingTier.min_vehicles == null ||
        editingTier.max_vehicles == null ||
        editingTier.min_vehicles <= 0 ||
        editingTier.max_vehicles <= 0
      ) {
        setCompanyError("Min and max vehicles are required and must be positive.");
        return;
      }
      if (editingTier.min_vehicles > editingTier.max_vehicles) {
        setCompanyError("Min vehicles cannot exceed max vehicles.");
        return;
      }
      if (!editingTier.monthly_price || Number(editingTier.monthly_price) <= 0) {
        setCompanyError("Monthly price must be a positive number.");
        return;
      }
    }

    const nextTiers = (() => {
      const existingIdx = tiers.findIndex(
        (t) =>
          ((editingTier.tempId && (t as any).tempId === editingTier.tempId)) ||
          (editingTier.id && editingTier.id > 0 && t.id === editingTier.id)
      );
      const normalized = {
        ...editingTier,
        is_enterprise: isEnterprise,
        monthly_price: isEnterprise ? null : editingTier.monthly_price,
        sales_form_link: isEnterprise ? editingTier.sales_form_link : editingTier.sales_form_link,
      };
      if (existingIdx >= 0) {
        const copy = [...tiers];
        copy[existingIdx] = normalized;
        return copy;
      }
      return [...tiers, normalized];
    })();

    if (nextTiers.length > 4) {
      setCompanyError("Maximum of 4 tiers allowed.");
      return;
    }
    if (hasOverlap(nextTiers)) {
      setCompanyError("Tier ranges must not overlap.");
      return;
    }

    setTiers(nextTiers);
    setDialogOpen(false);
    setCompanyError(null);
  };

  const handleSaveCompanyPricing = async () => {
    if (hasOverlap(tiers)) {
      setCompanyError("Tier ranges must not overlap.");
      return;
    }
    try {
      setCompanySaving(true);
      setCompanyError(null);
      const payload = tiers.map((t, idx) => ({
        name: t.name,
        min_vehicles: t.is_enterprise ? null : t.min_vehicles,
        max_vehicles: t.is_enterprise ? null : t.max_vehicles,
        monthly_price: t.is_enterprise ? null : t.monthly_price,
        sales_form_link: t.is_enterprise ? t.sales_form_link : t.sales_form_link,
        is_enterprise: t.is_enterprise,
        sort_order: t.sort_order ?? idx,
      }));
      const result = await updateCompanyPricing(payload);
      setTiers(
        (result.tiers || []).map((t) => ({
          id: t.id,
          name: t.name,
          min_vehicles: t.min_vehicles,
          max_vehicles: t.max_vehicles,
          monthly_price: t.monthly_price,
          sales_form_link: t.sales_form_link,
          is_enterprise: t.is_enterprise,
          sort_order: t.sort_order,
        }))
      );
      toast.success("Company pricing updated.");
    } catch (err: any) {
      setCompanyError(err?.message || "Failed to update company pricing");
      toast.error(err?.message || "Failed to update company pricing");
    } finally {
      setCompanySaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">Admin</p>
        <h1 className="text-2xl font-semibold text-slate-900">Pricing</h1>
        <p className="text-sm text-slate-600">
          Configure monthly pricing for individual haulers and company tiers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pricing configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="individual">
            <TabsList>
              <TabsTrigger value="individual">Individual Hauler Pricing</TabsTrigger>
              <TabsTrigger value="company">Company Hauler Tiers</TabsTrigger>
            </TabsList>
            <TabsContent value="individual" className="pt-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-700">
                  Manage the monthly subscription price for individual haulers.
                </p>
                <Separator />
                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-xs text-slate-500">Current monthly price</div>
                    <div className="text-sm font-semibold text-slate-900">
                      {lastSavedPrice != null
                        ? `$${lastSavedPrice.toFixed(2)}`
                        : "Not set"}
                    </div>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={individualPrice}
                    onChange={(e) => setIndividualPrice(e.target.value)}
                    disabled={loading || saving}
                    className="w-64"
                    placeholder="Enter monthly price"
                  />
                  {error && (
                    <div className="text-xs text-rose-600">{error}</div>
                  )}
                  <Button
                    onClick={handleSaveIndividual}
                    disabled={loading || saving || !individualPrice}
                  >
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="company" className="pt-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-700">
                  Define company tiers, vehicle ranges, and enterprise contact options.
                </p>
                <Separator />
                <div className="space-y-3">
                  {companyError && (
                    <div className="text-xs text-rose-600">{companyError}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Configure up to 4 tiers. Enterprise tiers disable pricing and require a sales form link. Ranges must not overlap; next min should be greater than previous max.
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleEditTier()}
                      disabled={companyLoading || companySaving || tiers.length >= 4}
                    >
                      Add Tier
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-4 py-2 text-left">Tier Name</th>
                          <th className="px-4 py-2 text-left">Min Vehicles</th>
                          <th className="px-4 py-2 text-left">Max Vehicles</th>
                          <th className="px-4 py-2 text-left">Monthly Price</th>
                          <th className="px-4 py-2 text-left">Enterprise</th>
                          <th className="px-4 py-2 text-left">Sales Form Link</th>
                          <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyLoading ? (
                          <tr>
                            <td className="px-4 py-3 text-slate-500" colSpan={7}>
                              Loading tiers…
                            </td>
                          </tr>
                        ) : tiers.length === 0 ? (
                          <tr>
                            <td className="px-4 py-3 text-slate-500" colSpan={7}>
                              No tiers configured yet.
                            </td>
                          </tr>
                        ) : (
                          tiers
                            .slice()
                            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                            .map((tier) => (
                              <tr key={tier.id ?? (tier as any).tempId}>
                                <td className="px-4 py-2">{tier.name}</td>
                                <td className="px-4 py-2">
                                  {tier.is_enterprise ? "—" : tier.min_vehicles ?? "—"}
                                </td>
                                <td className="px-4 py-2">
                                  {tier.is_enterprise ? "—" : tier.max_vehicles ?? "—"}
                                </td>
                                <td className="px-4 py-2">
                                  {tier.is_enterprise
                                    ? "—"
                                    : tier.monthly_price != null
                                    ? `$${Number(tier.monthly_price).toFixed(2)}`
                                    : "—"}
                                </td>
                                <td className="px-4 py-2">{tier.is_enterprise ? "Yes" : "No"}</td>
                                <td className="px-4 py-2">
                                  {tier.is_enterprise ? tier.sales_form_link ?? "—" : "—"}
                                </td>
                                <td className="px-4 py-2 space-x-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditTier(tier)}
                                    disabled={companySaving}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-rose-700 border-rose-200"
                                    onClick={() =>
                                      handleRemoveTier(tier.id, (tier as any).tempId)
                                    }
                                    disabled={companySaving}
                                  >
                                    Remove
                                  </Button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveCompanyPricing}
                      disabled={companySaving || companyLoading || tiers.length === 0}
                    >
                      {companySaving ? "Saving…" : "Save company tiers"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTier?.id ? "Edit Tier" : "Add Tier"}</DialogTitle>
            <DialogDescription>
              Configure the vehicle range and pricing for this company tier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Tier Name</Label>
              <Input
               value={editingTier?.name ?? ""}
               onChange={(e) =>
                  setEditingTier((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
                placeholder="e.g., Starter, Growth, Enterprise"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={
                  !!(
                    editingTier?.is_enterprise ||
                    (editingTier?.name ?? "").trim().toLowerCase() === "enterprise"
                  )
                }
                onCheckedChange={(checked) =>
                  setEditingTier((prev) =>
                    prev
                      ? {
                          ...prev,
                          is_enterprise: checked,
                          monthly_price: checked ? null : prev.monthly_price,
                          min_vehicles: checked ? null : prev.min_vehicles,
                          max_vehicles: checked ? null : prev.max_vehicles,
                        }
                      : prev
                  )
                }
              />
              <Label className="text-xs">Enterprise tier (disables pricing)</Label>
            </div>
            {!(
              editingTier?.is_enterprise ||
              (editingTier?.name ?? "").trim().toLowerCase() === "enterprise"
            ) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Min Vehicles</Label>
                 <Input
                    type="number"
                    min="1"
                    value={editingTier?.min_vehicles ?? ""}
                    onChange={(e) =>
                      setEditingTier((prev) =>
                        prev
                          ? {
                              ...prev,
                              min_vehicles: e.target.value === "" ? null : Number(e.target.value),
                            }
                          : prev
                      )
                    }
                    placeholder="e.g., 1"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Vehicles</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingTier?.max_vehicles ?? ""}
                    onChange={(e) =>
                      setEditingTier((prev) =>
                        prev
                          ? {
                              ...prev,
                              max_vehicles: e.target.value === "" ? null : Number(e.target.value),
                            }
                          : prev
                      )
                    }
                    placeholder="e.g., 5"
                  />
                </div>
              </div>
            )}
            {!(
              editingTier?.is_enterprise ||
              (editingTier?.name ?? "").trim().toLowerCase() === "enterprise"
            ) && (
              <div className="space-y-1">
                <Label className="text-xs">Monthly Price</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingTier?.monthly_price ?? ""}
                  onChange={(e) =>
                    setEditingTier((prev) =>
                      prev
                        ? {
                            ...prev,
                            monthly_price:
                              e.target.value === "" ? null : Number(e.target.value),
                          }
                        : prev
                    )
                  }
                  placeholder="e.g., 199"
                />
              </div>
            )}
            {(editingTier?.is_enterprise ||
              (editingTier?.name ?? "").trim().toLowerCase() === "enterprise") && (
              <div className="space-y-1">
                <Label className="text-xs">Sales Form Link</Label>
                <Input
                  type="url"
                  value={editingTier?.sales_form_link ?? ""}
                  onChange={(e) =>
                    setEditingTier((prev) =>
                      prev ? { ...prev, sales_form_link: e.target.value } : prev
                    )
                  }
                  placeholder="https://..."
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTier}>
              Save Tier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
