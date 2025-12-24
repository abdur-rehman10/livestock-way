import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  Truck,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  AlertCircle,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchDrivers as fetchDriversApi,
  createDriver as createDriverApi,
  updateDriverStatus,
  deleteDriver as deleteDriverApi,
  fetchTrucks as fetchTrucksApi,
  createTruck as createTruckApi,
  deleteTruck as deleteTruckApi,
  type DriverRecord,
  type TruckRecord,
} from "../api/fleet";

interface MaintenanceTask {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  type: string;
  dueDate: string;
  status: "scheduled" | "overdue" | "completed";
  notes?: string;
}

const mockMaintenance: MaintenanceTask[] = [
  {
    id: "M001",
    vehicleId: "V001",
    vehiclePlate: "TX-1234",
    type: "Oil Change",
    dueDate: "Nov 15, 2025",
    status: "scheduled",
  },
  {
    id: "M002",
    vehicleId: "V003",
    vehiclePlate: "TX-9012",
    type: "Tire Replacement",
    dueDate: "Oct 30, 2025",
    status: "scheduled",
  },
  {
    id: "M003",
    vehicleId: "V002",
    vehiclePlate: "TX-5678",
    type: "Annual Inspection",
    dueDate: "Nov 20, 2025",
    status: "scheduled",
  },
];

const TRUCK_TYPES = [
  { value: "cattle_trailer", label: "Cattle Trailer" },
  { value: "horse_trailer", label: "Horse Trailer" },
  { value: "sheep_trailer", label: "Sheep Trailer" },
  { value: "pig_trailer", label: "Pig Trailer" },
  { value: "mixed_livestock", label: "Mixed Livestock" },
  { value: "other", label: "Other" },
];

const MAINTENANCE_TYPES = [
  { value: "oil", label: "Oil Change" },
  { value: "tire", label: "Tire Replacement" },
  { value: "inspection", label: "Annual Inspection" },
  { value: "brake", label: "Brake Service" },
  { value: "other", label: "Other" },
];

const initialVehicleForm = {
  truck_name: "",
  plate_number: "",
  truck_type: "cattle_trailer",
  capacity: "",
  height_m: "",
  width_m: "",
  length_m: "",
  axle_count: "",
  max_gross_weight_kg: "",
  max_axle_weight_kg: "",
  hazmat_permitted: false,
  species_supported: "",
  notes: "",
};

const initialDriverForm = {
  full_name: "",
  phone: "",
  license_number: "",
  license_expiry: "",
};

export function FleetManagement() {
  const [activeTab, setActiveTab] = useState<"vehicles" | "drivers" | "maintenance">(
    "vehicles"
  );
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [maintenanceDate, setMaintenanceDate] = useState<Date>();
  const [vehicles, setVehicles] = useState<TruckRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [driversLoading, setDriversLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);
  const [driverForm, setDriverForm] = useState(initialDriverForm);
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
  const [driverSubmitting, setDriverSubmitting] = useState(false);

  const loadVehicles = useCallback(async () => {
    try {
      setVehiclesLoading(true);
      setVehiclesError(null);
      const resp = await fetchTrucksApi();
      setVehicles(resp.items ?? []);
    } catch (err: any) {
      console.error("Failed to load vehicles", err);
      setVehiclesError(err?.message || "Failed to load vehicles");
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    try {
      setDriversLoading(true);
      setDriversError(null);
      const resp = await fetchDriversApi();
      setDrivers(resp.items ?? []);
    } catch (err: any) {
      console.error("Failed to load drivers", err);
      setDriversError(err?.message || "Failed to load drivers");
    } finally {
      setDriversLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
    loadDrivers();
  }, [loadVehicles, loadDrivers]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setVehicleSubmitting(true);
      await createTruckApi({
        truck_name: vehicleForm.truck_name.trim(),
        plate_number: vehicleForm.plate_number.trim(),
        truck_type: vehicleForm.truck_type,
        capacity_weight_kg: vehicleForm.capacity ? Number(vehicleForm.capacity) : null,
        height_m: vehicleForm.height_m ? Number(vehicleForm.height_m) : null,
        width_m: vehicleForm.width_m ? Number(vehicleForm.width_m) : null,
        length_m: vehicleForm.length_m ? Number(vehicleForm.length_m) : null,
        axle_count: vehicleForm.axle_count ? Number(vehicleForm.axle_count) : null,
        max_gross_weight_kg: vehicleForm.max_gross_weight_kg
          ? Number(vehicleForm.max_gross_weight_kg)
          : null,
        max_axle_weight_kg: vehicleForm.max_axle_weight_kg
          ? Number(vehicleForm.max_axle_weight_kg)
          : null,
        hazmat_permitted: vehicleForm.hazmat_permitted,
        species_supported: vehicleForm.species_supported.trim() || null,
        notes: vehicleForm.notes.trim() || null,
      });
      toast.success("Vehicle saved");
      setIsAddVehicleOpen(false);
      setVehicleForm(initialVehicleForm);
      loadVehicles();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save vehicle");
    } finally {
      setVehicleSubmitting(false);
    }
  };

  const handleDeleteVehicle = (vehicleId: number) => {
    if (!confirm("Remove this vehicle?")) return;
    deleteTruckApi(vehicleId)
      .then(() => {
        toast.success("Vehicle removed");
        loadVehicles();
      })
      .catch((err) => toast.error(err?.message || "Failed to remove vehicle"));
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setDriverSubmitting(true);
      await createDriverApi({
        full_name: driverForm.full_name,
        phone: driverForm.phone,
        license_number: driverForm.license_number,
        license_expiry: driverForm.license_expiry || null,
      });
      toast.success("Driver added");
      setIsAddDriverOpen(false);
      setDriverForm(initialDriverForm);
      loadDrivers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add driver");
    } finally {
      setDriverSubmitting(false);
    }
  };

  const handleDeactivateDriver = (driverId: number) => {
    if (!confirm("Deactivate this driver?")) return;
    updateDriverStatus(driverId, "inactive")
      .then(() => {
        toast.success("Driver deactivated");
        loadDrivers();
      })
      .catch((err) => toast.error(err?.message || "Failed to deactivate driver"));
  };

  const handleDeleteDriver = (driverId: number) => {
    if (!confirm("Remove this driver?")) return;
    deleteDriverApi(driverId)
      .then(() => {
        toast.success("Driver removed");
        loadDrivers();
      })
      .catch((err) => toast.error(err?.message || "Failed to remove driver"));
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Maintenance scheduling coming soon");
    setIsAddMaintenanceOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "available":
      case "completed":
        return "bg-green-500";
      case "scheduled":
      case "assigned":
        return "bg-blue-500";
      case "maintenance":
      case "overdue":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDaysUntilExpiry = (date?: string | null) => {
    if (!date) return Number.POSITIVE_INFINITY;
    const expiry = new Date(date);
    if (Number.isNaN(expiry.getTime())) return Number.POSITIVE_INFINITY;
    const today = new Date();
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const availableVehicles = useMemo(
    () => vehicles.filter((v) => v.status === "active").length,
    [vehicles]
  );
  const activeDrivers = useMemo(
    () => drivers.filter((d) => d.status === "active").length,
    [drivers]
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#172039]">Fleet Management</h1>
          <p className="text-gray-600">Manage your vehicles, drivers, and maintenance</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {vehicles.length} vehicles total • {availableVehicles} active
            </div>
            <Button
              onClick={() => setIsAddVehicleOpen(true)}
              className="bg-[#29CA8D] hover:bg-[#24b67d]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </div>

          {vehiclesLoading ? (
            <p className="text-sm text-gray-500">Loading vehicles…</p>
          ) : vehiclesError ? (
            <p className="text-sm text-rose-600">{vehiclesError}</p>
          ) : vehicles.length === 0 ? (
            <p className="text-sm text-gray-500">No vehicles yet.</p>
          ) : (
            <div className="grid gap-4">
              {vehicles.map((vehicle) => (
                <Card key={vehicle.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Truck className="w-8 h-8 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg text-gray-900">
                              {vehicle.truck_name || vehicle.plate_number}
                            </h3>
                            <Badge className={`${getStatusColor(vehicle.status)} text-white`}>
                              {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">Plate</div>
                              <div className="text-gray-900">{vehicle.plate_number}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Type</div>
                              <div className="text-gray-900">{vehicle.truck_type}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Capacity</div>
                              <div className="text-gray-900">
                                {vehicle.capacity ? `${vehicle.capacity} kg` : "—"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">Height</div>
                              <div className="text-gray-900">
                                {vehicle.height_m ? `${vehicle.height_m} m` : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Width</div>
                              <div className="text-gray-900">
                                {vehicle.width_m ? `${vehicle.width_m} m` : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Length</div>
                              <div className="text-gray-900">
                                {vehicle.length_m ? `${vehicle.length_m} m` : "—"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">Axles</div>
                              <div className="text-gray-900">
                                {vehicle.axle_count ? vehicle.axle_count : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Max Gross</div>
                              <div className="text-gray-900">
                                {vehicle.max_gross_weight_kg
                                  ? `${vehicle.max_gross_weight_kg} kg`
                                  : "—"}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Max Axle</div>
                              <div className="text-gray-900">
                                {vehicle.max_axle_weight_kg
                                  ? `${vehicle.max_axle_weight_kg} kg`
                                  : "—"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 text-sm">
                            <span className="text-gray-600">Hazmat:</span>{" "}
                            <span className="text-gray-900">
                              {vehicle.hazmat_permitted ? "Permitted" : "Not permitted"}
                            </span>
                          </div>
                          {vehicle.species_supported && (
                            <p className="mt-2 text-sm text-gray-600">
                              Species: {vehicle.species_supported}
                            </p>
                          )}
                          {vehicle.notes && (
                            <p className="text-sm text-gray-500 mt-1">{vehicle.notes}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteVehicle(Number(vehicle.id))}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {drivers.length} drivers total • {activeDrivers} active
            </div>
            <Button
              onClick={() => setIsAddDriverOpen(true)}
              className="bg-[#29CA8D] hover:bg-[#24b67d]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          </div>

          {driversLoading ? (
            <p className="text-sm text-gray-500">Loading drivers…</p>
          ) : driversError ? (
            <p className="text-sm text-rose-600">{driversError}</p>
          ) : drivers.length === 0 ? (
            <p className="text-sm text-gray-500">No drivers yet.</p>
          ) : (
            <div className="grid gap-4">
              {drivers.map((driver) => {
                const daysUntilExpiry = getDaysUntilExpiry(driver.license_expiry);
                const isExpiring = daysUntilExpiry < 90 && daysUntilExpiry > 0;
                return (
                  <Card key={driver.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg text-gray-900">{driver.full_name}</h3>
                              <Badge className={`${getStatusColor(driver.status)} text-white`}>
                                {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                              </Badge>
                              {isExpiring && (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  License Expiring
                                </Badge>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                              <div>
                                <div className="text-gray-600">License</div>
                                <div className="text-gray-900">
                                  {driver.license_number || "—"}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-600">License Expiry</div>
                                <div className="text-gray-900">
                                  {driver.license_expiry
                                    ? new Date(driver.license_expiry).toLocaleDateString()
                                    : "Not set"}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-600">Phone</div>
                                <div className="text-gray-900">{driver.phone_number || "—"}</div>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeactivateDriver(Number(driver.id))}
                              >
                                Deactivate
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteDriver(Number(driver.id))}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {mockMaintenance.length} maintenance tasks scheduled
            </div>
            <Button
              onClick={() => setIsAddMaintenanceOpen(true)}
              className="bg-[#29CA8D] hover:bg-[#24b67d]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Task
            </Button>
          </div>
          <div className="grid gap-4">
            {mockMaintenance.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg text-gray-900">
                      {task.vehiclePlate} • {task.type}
                    </h3>
                    <p className="text-sm text-gray-600">Due: {task.dueDate}</p>
                    {task.notes && <p className="text-sm text-gray-500 mt-1">{task.notes}</p>}
                  </div>
                  <Badge className={`${getStatusColor(task.status)} text-white`}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vehicle</DialogTitle>
            <DialogDescription>Create a new vehicle for your fleet</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddVehicle} className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle Name</Label>
              <Input
                placeholder="e.g. Livestock Trailer #1"
                value={vehicleForm.truck_name}
                onChange={(e) => setVehicleForm((prev) => ({ ...prev, truck_name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Plate Number</Label>
              <Input
                placeholder="TX-1234"
                value={vehicleForm.plate_number}
                onChange={(e) =>
                  setVehicleForm((prev) => ({ ...prev, plate_number: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Truck Type</Label>
              <Select
                value={vehicleForm.truck_type}
                onValueChange={(value) =>
                  setVehicleForm((prev) => ({ ...prev, truck_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TRUCK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Capacity (kg)</Label>
              <Input
                type="number"
                min="0"
                value={vehicleForm.capacity}
                onChange={(e) =>
                  setVehicleForm((prev) => ({ ...prev, capacity: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Height (m)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={vehicleForm.height_m}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({ ...prev, height_m: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Width (m)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={vehicleForm.width_m}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({ ...prev, width_m: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Length (m)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={vehicleForm.length_m}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({ ...prev, length_m: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Axle Count</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={vehicleForm.axle_count}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({ ...prev, axle_count: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Max Gross Weight (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={vehicleForm.max_gross_weight_kg}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({
                      ...prev,
                      max_gross_weight_kg: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Axle Weight (kg)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={vehicleForm.max_axle_weight_kg}
                  onChange={(e) =>
                    setVehicleForm((prev) => ({
                      ...prev,
                      max_axle_weight_kg: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={vehicleForm.hazmat_permitted}
                onCheckedChange={(checked) =>
                  setVehicleForm((prev) => ({ ...prev, hazmat_permitted: !!checked }))
                }
              />
              <Label>Hazmat Permitted</Label>
            </div>
            <div className="space-y-2">
              <Label>Supported Species</Label>
              <Input
                placeholder="Cattle, horses"
                value={vehicleForm.species_supported}
                onChange={(e) =>
                  setVehicleForm((prev) => ({
                    ...prev,
                    species_supported: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Additional details"
                value={vehicleForm.notes}
                onChange={(e) =>
                  setVehicleForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddVehicleOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
                disabled={vehicleSubmitting}
              >
                {vehicleSubmitting ? "Saving…" : "Save Vehicle"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddDriverOpen} onOpenChange={setIsAddDriverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Driver</DialogTitle>
            <DialogDescription>Add a driver to your fleet</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDriver} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                placeholder="John Smith"
                value={driverForm.full_name}
                onChange={(e) =>
                  setDriverForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={driverForm.phone}
                onChange={(e) => setDriverForm((prev) => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>CDL License Number</Label>
              <Input
                placeholder="TX-CDL-12345"
                value={driverForm.license_number}
                onChange={(e) =>
                  setDriverForm((prev) => ({ ...prev, license_number: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>License Expiry</Label>
              <Input
                type="date"
                value={driverForm.license_expiry}
                onChange={(e) =>
                  setDriverForm((prev) => ({ ...prev, license_expiry: e.target.value }))
                }
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDriverOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]"
                disabled={driverSubmitting}
              >
                {driverSubmitting ? "Saving…" : "Add Driver"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMaintenanceOpen} onOpenChange={setIsAddMaintenanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Maintenance</DialogTitle>
            <DialogDescription>Create a new maintenance task</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMaintenance} className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.plate_number} - {v.truck_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Maintenance Type</Label>
              <Select required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 w-4 h-4" />
                    {maintenanceDate ? maintenanceDate.toDateString() : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={maintenanceDate} onSelect={setMaintenanceDate} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddMaintenanceOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]">
                Schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
