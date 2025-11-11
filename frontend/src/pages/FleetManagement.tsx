import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { 
  Truck, 
  Plus, 
  Edit, 
  Trash2, 
  Wrench,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  User,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  plate: string;
  type: string;
  capacity: string;
  status: 'available' | 'assigned' | 'maintenance';
  driver?: string;
  currentTrip?: string;
  nextMaintenance: string;
  documents: {
    insurance: string;
    registration: string;
  };
}

interface Driver {
  id: string;
  name: string;
  license: string;
  licenseExpiry: string;
  phone: string;
  rating: number;
  tripsCompleted: number;
  earnings: string;
  status: 'active' | 'inactive';
}

interface MaintenanceTask {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  type: string;
  dueDate: string;
  status: 'scheduled' | 'overdue' | 'completed';
  notes?: string;
}

const mockVehicles: Vehicle[] = [
  {
    id: 'V001',
    plate: 'TX-1234',
    type: 'Livestock Trailer',
    capacity: '50 head',
    status: 'assigned',
    driver: 'John Smith',
    currentTrip: 'T001',
    nextMaintenance: 'Nov 15, 2025',
    documents: {
      insurance: 'Valid until Dec 2025',
      registration: 'Valid until Jan 2026',
    },
  },
  {
    id: 'V002',
    plate: 'TX-5678',
    type: 'Livestock Trailer',
    capacity: '75 head',
    status: 'available',
    nextMaintenance: 'Nov 20, 2025',
    documents: {
      insurance: 'Valid until Dec 2025',
      registration: 'Valid until Jan 2026',
    },
  },
  {
    id: 'V003',
    plate: 'TX-9012',
    type: 'Livestock Truck',
    capacity: '40 head',
    status: 'maintenance',
    nextMaintenance: 'Oct 30, 2025',
    documents: {
      insurance: 'Valid until Dec 2025',
      registration: 'Valid until Jan 2026',
    },
  },
];

const mockDrivers: Driver[] = [
  {
    id: 'D001',
    name: 'John Smith',
    license: 'TX-CDL-12345',
    licenseExpiry: 'Dec 31, 2026',
    phone: '+1 (555) 123-4567',
    rating: 4.8,
    tripsCompleted: 247,
    earnings: '$42,500',
    status: 'active',
  },
  {
    id: 'D002',
    name: 'Maria Garcia',
    license: 'TX-CDL-67890',
    licenseExpiry: 'Nov 15, 2025',
    phone: '+1 (555) 234-5678',
    rating: 4.9,
    tripsCompleted: 189,
    earnings: '$38,200',
    status: 'active',
  },
  {
    id: 'D003',
    name: 'Robert Johnson',
    license: 'TX-CDL-11223',
    licenseExpiry: 'Jan 20, 2026',
    phone: '+1 (555) 345-6789',
    rating: 4.7,
    tripsCompleted: 156,
    earnings: '$31,800',
    status: 'active',
  },
];

const mockMaintenance: MaintenanceTask[] = [
  {
    id: 'M001',
    vehicleId: 'V001',
    vehiclePlate: 'TX-1234',
    type: 'Oil Change',
    dueDate: 'Nov 15, 2025',
    status: 'scheduled',
  },
  {
    id: 'M002',
    vehicleId: 'V003',
    vehiclePlate: 'TX-9012',
    type: 'Tire Replacement',
    dueDate: 'Oct 30, 2025',
    status: 'scheduled',
  },
  {
    id: 'M003',
    vehicleId: 'V002',
    vehiclePlate: 'TX-5678',
    type: 'Annual Inspection',
    dueDate: 'Nov 20, 2025',
    status: 'scheduled',
  },
];

export function FleetManagement() {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers' | 'maintenance'>('vehicles');
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [maintenanceDate, setMaintenanceDate] = useState<Date>();

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Vehicle added successfully');
    setIsAddVehicleOpen(false);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsAddVehicleOpen(true);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      toast.success('Vehicle deleted');
    }
  };

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Driver invitation sent');
    setIsAddDriverOpen(false);
  };

  const handleDeactivateDriver = (driverId: string) => {
    if (confirm('Are you sure you want to deactivate this driver?')) {
      toast.success('Driver deactivated');
    }
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Maintenance task scheduled');
    setIsAddMaintenanceOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'active':
      case 'completed':
        return 'bg-green-500';
      case 'assigned':
      case 'scheduled':
        return 'bg-blue-500';
      case 'maintenance':
      case 'overdue':
        return 'bg-orange-500';
      case 'inactive':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDaysUntilExpiry = (date: string) => {
    const expiry = new Date(date);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl text-[#172039]">Fleet Management</h1>
          <p className="text-gray-600">Manage your vehicles, drivers, and maintenance</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {mockVehicles.length} vehicles total • {mockVehicles.filter(v => v.status === 'available').length} available
            </div>
            <Button onClick={() => setIsAddVehicleOpen(true)} className="bg-[#29CA8D] hover:bg-[#24b67d]">
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </div>

          <div className="grid gap-4">
            {mockVehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-8 h-8 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg text-gray-900">{vehicle.plate}</h3>
                          <Badge className={`${getStatusColor(vehicle.status)} text-white`}>
                            {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Type</div>
                            <div className="text-gray-900">{vehicle.type}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Capacity</div>
                            <div className="text-gray-900">{vehicle.capacity}</div>
                          </div>
                          {vehicle.driver && (
                            <div>
                              <div className="text-gray-600">Driver</div>
                              <div className="text-gray-900">{vehicle.driver}</div>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          Next Maintenance: {vehicle.nextMaintenance}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditVehicle(vehicle)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {mockDrivers.length} drivers total • {mockDrivers.filter(d => d.status === 'active').length} active
            </div>
            <Button onClick={() => setIsAddDriverOpen(true)} className="bg-[#29CA8D] hover:bg-[#24b67d]">
              <Plus className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          </div>

          <div className="grid gap-4">
            {mockDrivers.map((driver) => {
              const daysUntilExpiry = getDaysUntilExpiry(driver.licenseExpiry);
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
                            <h3 className="text-lg text-gray-900">{driver.name}</h3>
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
                          <div className="grid grid-cols-4 gap-4 text-sm mb-2">
                            <div>
                              <div className="text-gray-600">License</div>
                              <div className="text-gray-900">{driver.license}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Trips</div>
                              <div className="text-gray-900">{driver.tripsCompleted}</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Rating</div>
                              <div className="text-gray-900">{driver.rating} ⭐</div>
                            </div>
                            <div>
                              <div className="text-gray-600">Earnings</div>
                              <div className="text-gray-900">{driver.earnings}</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            License Expires: {driver.licenseExpiry} ({daysUntilExpiry} days)
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          View Profile
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeactivateDriver(driver.id)}
                        >
                          Deactivate
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4 mt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {mockMaintenance.length} scheduled tasks
            </div>
            <Button onClick={() => setIsAddMaintenanceOpen(true)} className="bg-[#29CA8D] hover:bg-[#24b67d]">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Maintenance
            </Button>
          </div>

          <div className="grid gap-4">
            {mockMaintenance.map((task) => (
              <Card key={task.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-base text-gray-900">{task.type}</h4>
                          <Badge className={`${getStatusColor(task.status)} text-white`}>
                            {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          Vehicle: {task.vehiclePlate} • Due: {task.dueDate}
                        </div>
                      </div>
                    </div>
                    <Button size="sm">Mark Complete</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Vehicle Dialog */}
      <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVehicle ? 'Edit' : 'Add'} Vehicle</DialogTitle>
            <DialogDescription>Enter vehicle details</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddVehicle} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>License Plate</Label>
                <Input placeholder="TX-1234" required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trailer">Livestock Trailer</SelectItem>
                    <SelectItem value="truck">Livestock Truck</SelectItem>
                    <SelectItem value="semi">Semi Trailer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input placeholder="e.g., 50 head" required />
            </div>

            <div className="space-y-2">
              <Label>Insurance Document</Label>
              <Input type="file" accept=".pdf,.jpg,.png" />
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
              <Button type="submit" className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]">
                {selectedVehicle ? 'Update' : 'Add'} Vehicle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Driver Dialog */}
      <Dialog open={isAddDriverOpen} onOpenChange={setIsAddDriverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Driver</DialogTitle>
            <DialogDescription>Send an invitation to join your fleet</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDriver} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="John Smith" required />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="john@example.com" required />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input type="tel" placeholder="+1 (555) 123-4567" required />
            </div>

            <div className="space-y-2">
              <Label>CDL License Number</Label>
              <Input placeholder="TX-CDL-12345" required />
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
              <Button type="submit" className="flex-1 bg-[#29CA8D] hover:bg-[#24b67d]">
                Send Invitation
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Maintenance Dialog */}
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
                  {mockVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate} - {v.type}
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
                  <SelectItem value="oil">Oil Change</SelectItem>
                  <SelectItem value="tire">Tire Replacement</SelectItem>
                  <SelectItem value="inspection">Annual Inspection</SelectItem>
                  <SelectItem value="brake">Brake Service</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 w-4 h-4" />
                    {maintenanceDate ? maintenanceDate.toDateString() : 'Select date'}
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
