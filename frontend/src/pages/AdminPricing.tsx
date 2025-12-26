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
  fetchIndividualPackages,
  updateIndividualPackage,
  type PricingCompanyTier,
  type IndividualPackage,
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
import { Textarea } from "../components/ui/textarea";

type EditablePackage = Pick<IndividualPackage, "code" | "name" | "description" | "features"> & {
  id?: number;
};

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
  const [packages, setPackages] = useState<EditablePackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<EditablePackage | null>(null);
  const [packageSaving, setPackageSaving] = useState(false);
  const [packageFormError, setPackageFormError] = useState<string | null>(null);

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

  useEffect(() => {
    let ignore = false;
    setPackagesLoading(true);
    setPackagesError(null);
    fetchIndividualPackages()
      .then((resp) => {
        if (ignore) return;
        const normalized = (resp.items || []).map((p) => ({
          id: p.id,
          code: p.code,
          name: p.name,
          description: p.description,
          features: p.features || {},
        }));
        setPackages(normalized);
      })
      .catch((err: any) => {
        if (ignore) return;
        setPackagesError(err?.message || "Failed to load packages");
      })
      .finally(() => {
        if (ignore) return;
        setPackagesLoading(false);
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

      <Card>
        <CardHeader>
          <CardTitle>Individual Hauler Packages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {packagesError && <div className="text-xs text-rose-600">{packagesError}</div>}
          {packagesLoading ? (
            <div className="text-sm text-slate-600">Loading packages…</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {["FREE", "PAID"].map((code) => {
                const pkg = packages.find((p) => p.code === code);
                return (
                  <Card key={code} className="border border-slate-200">
                    <CardHeader className="space-y-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{pkg?.name || `${code} Plan`}</CardTitle>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPackage(
                              pkg ?? {
                                code: code as EditablePackage["code"],
                                name: `${code} Plan`,
                                description: "",
                                features: {},
                              }
                        );
                        setPackageDialogOpen(true);
                        setPackagesError(null);
                        setPackageFormError(null);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Code: {code}
                      </p>
                      <p className="text-sm text-slate-600">{pkg?.description || "No description"}</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">Features</p>
                      <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                        {Array.isArray(pkg?.features?.feature_list) && pkg?.features?.feature_list.length
                          ? pkg!.features.feature_list.map((f: any, idx: number) => (
                              <li key={idx}>{String(f)}</li>
                            ))
                          : <li className="text-slate-500">No feature list</li>}
                      </ul>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        {"trip_tracking_limit" in (pkg?.features ?? {}) && (
                          <div>Trip tracking: {pkg?.features?.trip_tracking_limit ?? "—"}</div>
                        )}
                        {"documents_validation_limit" in (pkg?.features ?? {}) && (
                          <div>Doc validation: {pkg?.features?.documents_validation_limit ?? "—"}</div>
                        )}
                        {"outside_trips_limit" in (pkg?.features ?? {}) && (
                          <div>Outside trips: {pkg?.features?.outside_trips_limit ?? "—"}</div>
                        )}
                        {"trips_unlimited" in (pkg?.features ?? {}) && (
                          <div>Trips unlimited: {pkg?.features?.trips_unlimited ? "Yes" : "No"}</div>
                        )}
                        {"loadboard_unlimited" in (pkg?.features ?? {}) && (
                          <div>Loadboard unlimited: {pkg?.features?.loadboard_unlimited ? "Yes" : "No"}</div>
                        )}
                        {"truckboard_unlimited" in (pkg?.features ?? {}) && (
                          <div>Truckboard unlimited: {pkg?.features?.truckboard_unlimited ? "Yes" : "No"}</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Package</DialogTitle>
            <DialogDescription>
              Update name, description, and features. Code is fixed and packages cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {packageFormError && (
              <div className="text-xs text-rose-600">{packageFormError}</div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Package Code</Label>
              <Input value={editingPackage?.code ?? ""} disabled />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={editingPackage?.name ?? ""}
                onChange={(e) =>
                  setEditingPackage((prev) =>
                    prev ? { ...prev, name: e.target.value } : prev
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={editingPackage?.description ?? ""}
                onChange={(e) =>
                  setEditingPackage((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Feature List (comma separated)</Label>
              <Input
                value={
                  Array.isArray(editingPackage?.features?.feature_list)
                    ? (editingPackage?.features?.feature_list as any[]).join(", ")
                    : ""
                }
                onChange={(e) => {
                  const parts = e.target.value
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean);
                  setEditingPackage((prev) =>
                    prev
                      ? {
                          ...prev,
                          features: { ...(prev.features || {}), feature_list: parts },
                        }
                      : prev
                  );
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Trip tracking limit</Label>
                <Input
                  type="number"
                  value={editingPackage?.features?.trip_tracking_limit ?? ""}
                  onChange={(e) =>
                    setEditingPackage((prev) =>
                      prev
                        ? {
                            ...prev,
                            features: {
                              ...(prev.features || {}),
                              trip_tracking_limit:
                                e.target.value === "" ? null : Number(e.target.value),
                            },
                          }
                        : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Doc validation limit</Label>
                <Input
                  type="number"
                  value={editingPackage?.features?.documents_validation_limit ?? ""}
                  onChange={(e) =>
                    setEditingPackage((prev) =>
                      prev
                        ? {
                            ...prev,
                            features: {
                              ...(prev.features || {}),
                              documents_validation_limit:
                                e.target.value === "" ? null : Number(e.target.value),
                            },
                          }
                        : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Outside trips limit</Label>
                <Input
                  type="number"
                  value={editingPackage?.features?.outside_trips_limit ?? ""}
                  onChange={(e) =>
                    setEditingPackage((prev) =>
                      prev
                        ? {
                            ...prev,
                            features: {
                              ...(prev.features || {}),
                              outside_trips_limit:
                                e.target.value === "" ? null : Number(e.target.value),
                            },
                          }
                        : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Trips unlimited</Label>
                <Switch
                  checked={Boolean(editingPackage?.features?.trips_unlimited)}
                  onCheckedChange={(checked) =>
                    setEditingPackage((prev) =>
                      prev
                        ? {
                            ...prev,
                            features: { ...(prev.features || {}), trips_unlimited: checked },
                          }
                        : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Loadboard unlimited</Label>
                <Switch
                  checked={Boolean(editingPackage?.features?.loadboard_unlimited)}
                  onCheckedChange={(checked) =>
                    setEditingPackage((prev) =>
                      prev
                        ? {
                            ...prev,
                            features: { ...(prev.features || {}), loadboard_unlimited: checked },
                          }
                        : prev
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Truckboard unlimited</Label>
                <Switch
                  checked={Boolean(editingPackage?.features?.truckboard_unlimited)}
                  onCheckedChange={(checked) =>
                    setEditingPackage((prev) =>
                      prev
                        ? {
                            ...prev,
                            features: { ...(prev.features || {}), truckboard_unlimited: checked },
                          }
                        : prev
                    )
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPackageDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingPackage) return;
                setPackageFormError(null);
                const trimmedName = (editingPackage.name ?? "").trim();
                if (!trimmedName) {
                  setPackageFormError("Name is required.");
                  return;
                }
                if (editingPackage.code === "FREE") {
                  const feats = editingPackage.features || {};
                  const t = feats.trip_tracking_limit;
                  const d = feats.documents_validation_limit;
                  const o = feats.outside_trips_limit;
                  if (
                    t === undefined ||
                    t === null ||
                    Number(t) <= 0 ||
                    d === undefined ||
                    d === null ||
                    Number(d) <= 0 ||
                    o === undefined ||
                    o === null ||
                    Number(o) <= 0
                  ) {
                    setPackageFormError(
                      "Free plan must include trip tracking, document validation, and outside trips limits greater than 0."
                    );
                    return;
                  }
                }
                try {
                  setPackageSaving(true);
                  const updated = await updateIndividualPackage(editingPackage.code as any, {
                    name: trimmedName,
                    description: editingPackage.description,
                    features: editingPackage.features,
                  });
                  setPackages((prev) => {
                    const existingIdx = prev.findIndex((p) => p.code === updated.code);
                    if (existingIdx >= 0) {
                      const copy = [...prev];
                      copy[existingIdx] = {
                        code: updated.code,
                        name: updated.name,
                        description: updated.description,
                        features: updated.features,
                        id: updated.id,
                      };
                      return copy;
                    }
                    return [
                      ...prev,
                      {
                        code: updated.code,
                        name: updated.name,
                        description: updated.description,
                        features: updated.features,
                        id: updated.id,
                      },
                    ];
                  });
                  toast.success(`Package ${updated.code} updated`);
                  setPackageDialogOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || "Failed to update package");
                } finally {
                  setPackageSaving(false);
                }
              }}
              disabled={packageSaving || !editingPackage?.name}
            >
              {packageSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
