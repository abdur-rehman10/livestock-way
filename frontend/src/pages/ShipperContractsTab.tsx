import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageSquare, FileText, CheckCircle, Clock, TruckIcon, MapPin, Plus, AlertCircle, Flag, Users, DollarSign, FileCheck, Activity } from 'lucide-react';
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { GenerateContractPopup } from "../components/GenerateContractPopup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  fetchContracts,
  sendContract,
  updateContract,
  type ContractRecord,
} from "../api/marketplace";
import { fetchLoadById, type LoadDetail } from "../lib/api";
import { useNavigate } from "react-router-dom";

type ContractFormData = {
  priceAmount?: string | number;
  priceType?: string;
  paymentMethod?: string;
  paymentSchedule?: string;
  contractInfo?: {
    haulerName?: string;
    route?: { origin?: string; destination?: string };
    animalType?: string;
    headCount?: number;
  };
  [key: string]: unknown;
};

interface ContractWithLoad extends ContractRecord {
  load?: LoadDetail | null;
}

export default function ShipperContractsTab() {
  const [contracts, setContracts] = useState<ContractWithLoad[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const navigate = useNavigate();

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedId) ?? null,
    [contracts, selectedId]
  );

  const negotiationContracts = useMemo(() => 
    contracts.filter(c => ['DRAFT', 'SENT'].includes(c.status.toUpperCase())),
    [contracts]
  );
  
  const confirmedContracts = useMemo(() => 
    contracts.filter(c => c.status.toUpperCase() === 'ACCEPTED'),
    [contracts]
  );

  const totalNegotiatedCost = useMemo(() => {
    return confirmedContracts.reduce((total, contract) => {
      if (contract.price_amount) {
        const amount = Number(contract.price_amount);
        if (contract.price_type === 'per-mile') {
          return total + (amount * 200); // Assuming 200 miles average
        }
        return total + amount;
      }
      return total;
    }, 0);
  }, [confirmedContracts]);

  const refresh = async () => {
    try {
      setLoading(true);
      const resp = await fetchContracts();
      const contractsWithLoads = await Promise.all(
        resp.items.map(async (contract) => {
          let load: LoadDetail | null = null;
          try {
            load = await fetchLoadById(Number(contract.load_id));
          } catch (err) {
            console.warn('Failed to load load details:', err);
          }
          return { ...contract, load };
        })
      );
      setContracts(contractsWithLoads);
      if (!selectedId && contractsWithLoads.length) {
        setSelectedId(contractsWithLoads[0].id);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load contracts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSave = async (data: ContractFormData, sendNow: boolean) => {
    if (!selectedContract) return;
    const priceAmountRaw = Number(data.priceAmount ?? 0);
    const priceAmount = Number.isFinite(priceAmountRaw) ? priceAmountRaw : 0;
    const payload: Record<string, unknown> = {
      ...data,
      contractInfo: data.contractInfo,
    };
    try {
      await updateContract(selectedContract.id, {
        price_amount: priceAmount,
        price_type: data.priceType,
        payment_method: data.paymentMethod,
        payment_schedule: data.paymentSchedule,
        contract_payload: payload,
      });
      if (sendNow) {
        await sendContract(selectedContract.id);
      }
      toast.success(sendNow ? "Contract sent." : "Contract updated.");
      setModalOpen(false);
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update contract.");
    }
  };

  const handleViewContract = (contract: ContractWithLoad) => {
    setSelectedId(contract.id);
    if (contract.status.toUpperCase() === 'ACCEPTED') {
      setShowViewDialog(true);
    } else {
      setModalOpen(true);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading contracts…</div>;
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold">My Contracts</h1>
        <p className="text-sm text-gray-500">
          Once contract is generated and confirmed by hauler, Hauler can generate trip and you can view it in your Trips
        </p>
      </div>

      {/* 4 Analytics Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#e8f7f1' }}>
              <Users className="w-5 h-5" style={{ color: '#53ca97' }} />
            </div>
          </div>
          <div className="text-2xl mb-1">{contracts.length}</div>
          <div className="text-sm text-gray-600">Total Connections Made</div>
          <div className="text-xs text-gray-500 mt-2">With haulers</div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl mb-1">${(totalNegotiatedCost / 1000).toFixed(1)}K</div>
          <div className="text-sm text-gray-600">Total Cost Negotiated</div>
          <div className="text-xs text-gray-500 mt-2">Across all contracts</div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
              <FileCheck className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-2xl mb-1">{confirmedContracts.length}</div>
          <div className="text-sm text-gray-600">Total Contracts Made</div>
          <div className="text-xs text-gray-500 mt-2">Successfully confirmed</div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-100">
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="text-2xl mb-1">{negotiationContracts.length}</div>
          <div className="text-sm text-gray-600">Active Negotiations</div>
          <div className="text-xs text-gray-500 mt-2">In progress</div>
        </Card>
      </div>

      {/* Important Message */}
      <Card className="p-5 mb-8 border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-700">
              <strong>Important:</strong> Please negotiate all terms, pricing, and conditions through messages or phone calls before submitting a contract. This ensures both parties are aligned on expectations.
            </p>
          </div>
        </div>
      </Card>

      {/* Under Negotiation Section */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5" style={{ color: '#53ca97' }} />
          <h2 className="text-xl font-semibold">Under Negotiation ({negotiationContracts.length})</h2>
        </div>

        <div className="space-y-5">
          {negotiationContracts.map((contract) => (
            <Card key={contract.id} className="p-6 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold">Contract #{contract.id}</h3>
                    <Badge
                      className="text-xs px-2 py-0.5 capitalize"
                      variant={contract.status.toUpperCase() === 'SENT' ? 'default' : 'outline'}
                      style={contract.status.toUpperCase() === 'SENT' ? { backgroundColor: '#53ca97', color: 'white' } : {}}
                    >
                      {contract.status.toLowerCase()}
                    </Badge>
                  </div>
                  
                  {contract.load && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{contract.load.pickup_location} → {contract.load.dropoff_location}</span>
                      </div>
                      {contract.load.species && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TruckIcon className="w-4 h-4" />
                          <span className="capitalize">{contract.load.species}{contract.load.quantity ? ` - ${contract.load.quantity} head` : ''}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <p className="text-sm font-medium" style={{ color: '#53ca97' }}>
                      Contract Value: ${contract.price_amount ? Number(contract.price_amount).toLocaleString() : '0.00'}{contract.price_type === 'per-mile' ? '/mile' : ' total'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {contract.sent_at ? `Sent: ${new Date(contract.sent_at).toLocaleDateString()}` : `Created: ${new Date(contract.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[140px]">
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-5 py-2.5 text-sm whitespace-nowrap"
                    onClick={() => handleViewContract(contract)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {['DRAFT', 'SENT'].includes(contract.status.toUpperCase()) ? 'View & Edit' : 'View Contract'}
                  </Button>
                  {contract.status.toUpperCase() === 'DRAFT' && (
                    <Button
                      size="sm"
                      className="px-5 py-2.5 text-sm whitespace-nowrap"
                      style={{ backgroundColor: '#53ca97', color: 'white' }}
                      onClick={async () => {
                        setSelectedId(contract.id);
                        await handleSave(
                          (contract.contract_payload ?? {}) as ContractFormData,
                          true
                        );
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Send Contract
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Confirmed Contracts Section */}
      <div className="pt-6">
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle className="w-5 h-5" style={{ color: '#53ca97' }} />
          <h2 className="text-xl font-semibold">Confirmed Contracts ({confirmedContracts.length})</h2>
        </div>

        <div className="space-y-5">
          {confirmedContracts.map((contract) => (
            <Card key={contract.id} className="p-6 border-green-200 bg-green-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-base">Contract #{contract.id}</h3>
                    <Badge
                      className="text-xs px-2 py-0.5"
                      style={{ backgroundColor: '#53ca97', color: 'white' }}
                    >
                      Confirmed
                    </Badge>
                  </div>
                  
                  {contract.load && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{contract.load.pickup_location} → {contract.load.dropoff_location}</span>
                      </div>
                      {contract.load.species && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <TruckIcon className="w-4 h-4" />
                          <span className="capitalize">{contract.load.species}{contract.load.quantity ? ` - ${contract.load.quantity} head` : ''}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 mb-4">
                    <p className="text-sm font-medium" style={{ color: '#53ca97' }}>
                      Contract Value: ${contract.price_amount ? Number(contract.price_amount).toLocaleString() : '0.00'}{contract.price_type === 'per-mile' ? '/mile' : ' total'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {contract.accepted_at ? `Accepted: ${new Date(contract.accepted_at).toLocaleDateString()}` : `Confirmed: ${new Date(contract.updated_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[140px]">
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-5 py-2.5 text-sm whitespace-nowrap"
                    onClick={() => handleViewContract(contract)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Contract
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="px-5 py-2.5 text-sm whitespace-nowrap"
                    onClick={() => navigate('/shipper/trips')}
                  >
                    <TruckIcon className="w-4 h-4 mr-2" />
                    View Trips
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {selectedContract && ['DRAFT', 'SENT'].includes(selectedContract.status.toUpperCase()) && (
        <GenerateContractPopup
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onGenerate={(data) => handleSave(data, true)}
          onSaveDraft={(data) => handleSave(data, false)}
          isEditMode={true}
          contractInfo={
            (() => {
              const payload = selectedContract.contract_payload as ContractFormData | undefined;
              const info = payload?.contractInfo;
              if (!info && selectedContract.load) {
                // Build from load data if contractInfo is missing
                return {
                  haulerName: 'Hauler',
                  route: {
                    origin: selectedContract.load.pickup_location || '',
                    destination: selectedContract.load.dropoff_location || '',
                  },
                  animalType: selectedContract.load.species || '',
                  headCount: selectedContract.load.quantity || 0,
                  price: selectedContract.price_amount ? Number(selectedContract.price_amount) : 0,
                  priceType: (selectedContract.price_type === 'per-mile' ? 'per-mile' : 'total') as 'per-mile' | 'total',
                };
              }
              if (!info) return undefined;
              // Ensure all required fields are present, otherwise return undefined
              if (
                info.haulerName &&
                info.route?.origin &&
                info.route?.destination &&
                info.animalType &&
                info.headCount !== undefined &&
                info.headCount !== null
              ) {
                const price = selectedContract.price_amount 
                  ? Number(selectedContract.price_amount) 
                  : (typeof (payload as any)?.price === 'number' ? (payload as any).price : 0);
                const priceType = selectedContract.price_type === 'per-mile' 
                  ? 'per-mile' 
                  : 'total';
                return {
                  haulerName: info.haulerName,
                  route: {
                    origin: info.route.origin,
                    destination: info.route.destination,
                  },
                  animalType: info.animalType,
                  headCount: info.headCount,
                  price,
                  priceType: priceType as 'per-mile' | 'total',
                };
              }
              return undefined;
            })()
          }
          initialData={{
            ...(selectedContract.contract_payload ?? {}),
            priceAmount: selectedContract.price_amount ? String(selectedContract.price_amount) : "",
            priceType: (selectedContract.price_type === 'per-mile' ? 'per-mile' : 'total') as 'per-mile' | 'total',
            paymentMethod: selectedContract.payment_method ?? undefined,
            paymentSchedule: selectedContract.payment_schedule ?? undefined,
          }}
        />
      )}

      {/* View Contract Dialog for Confirmed Contracts */}
      {selectedContract && selectedContract.status.toUpperCase() === 'ACCEPTED' && (
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Contract #{selectedContract.id}</DialogTitle>
              <DialogDescription>
                Contract Status: <Badge className="capitalize" style={{ backgroundColor: '#53ca97', color: 'white' }}>Confirmed</Badge>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedContract.load && (
                <>
                  <div>
                    <h4 className="font-semibold mb-2">Route</h4>
                    <p className="text-sm text-gray-600">
                      {selectedContract.load.pickup_location} → {selectedContract.load.dropoff_location}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedContract.load.species && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Species</p>
                        <p className="text-sm font-medium capitalize">{selectedContract.load.species}</p>
                      </div>
                    )}
                    {selectedContract.load.quantity && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Quantity</p>
                        <p className="text-sm font-medium">{selectedContract.load.quantity} head</p>
                      </div>
                    )}
                    {(selectedContract.load as any).weight && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Weight</p>
                        <p className="text-sm font-medium">{Number((selectedContract.load as any).weight).toLocaleString()} kg</p>
                      </div>
                    )}
                    {selectedContract.load.pickup_date && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Pickup Date</p>
                        <p className="text-sm font-medium">
                          {new Date(selectedContract.load.pickup_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
              <div>
                <h4 className="font-semibold mb-2">Contract Terms</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Price</p>
                    <p className="text-lg font-semibold" style={{ color: '#53ca97' }}>
                      ${selectedContract.price_amount ? Number(selectedContract.price_amount).toLocaleString() : '0.00'}{selectedContract.price_type === 'per-mile' ? '/mile' : ' total'}
                    </p>
                  </div>
                  {selectedContract.payment_method && (
                    <div>
                      <p className="text-xs text-gray-500">Payment Method</p>
                      <p className="text-sm">{selectedContract.payment_method}</p>
                    </div>
                  )}
                  {selectedContract.payment_schedule && (
                    <div>
                      <p className="text-xs text-gray-500">Payment Schedule</p>
                      <p className="text-sm">{selectedContract.payment_schedule}</p>
                    </div>
                  )}
                </div>
              </div>
              {selectedContract.contract_payload && Object.keys(selectedContract.contract_payload).length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Contract Details</h4>
                  <div className="space-y-4">
                    {(() => {
                      const payload = selectedContract.contract_payload as Record<string, any>;
                      const sections: JSX.Element[] = [];
                      
                      // Basic Contract Info
                      if (payload.contractType || payload.contractDuration) {
                        sections.push(
                          <div key="basic" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Basic Information</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.contractType && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Contract Type</p>
                                  <p className="text-sm font-medium capitalize">{payload.contractType.replace(/-/g, ' ')}</p>
                                </div>
                              )}
                              {payload.contractDuration && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Duration</p>
                                  <p className="text-sm font-medium capitalize">{payload.contractDuration.replace(/-/g, ' ')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Payment Terms
                      if (payload.paymentMethod || payload.paymentSchedule || payload.depositRequired) {
                        sections.push(
                          <div key="payment" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Payment Terms</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.paymentMethod && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                                  <p className="text-sm font-medium capitalize">{payload.paymentMethod.replace(/-/g, ' ')}</p>
                                </div>
                              )}
                              {payload.paymentSchedule && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Payment Schedule</p>
                                  <p className="text-sm font-medium capitalize">{payload.paymentSchedule.replace(/-/g, ' ')}</p>
                                </div>
                              )}
                              {payload.depositRequired && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Deposit Required</p>
                                  <p className="text-sm font-medium capitalize">{payload.depositRequired === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.depositPercentage && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Deposit Percentage</p>
                                  <p className="text-sm font-medium">{payload.depositPercentage}%</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Trip Details
                      if (payload.pickupDate || payload.deliveryDate || payload.estimatedDistance || payload.routeType) {
                        sections.push(
                          <div key="trip" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Trip Details</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.pickupDate && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Pickup Date</p>
                                  <p className="text-sm font-medium">
                                    {payload.pickupDate} {payload.pickupTime ? `at ${payload.pickupTime}` : ''}
                                  </p>
                                </div>
                              )}
                              {payload.deliveryDate && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Delivery Date</p>
                                  <p className="text-sm font-medium">
                                    {payload.deliveryDate} {payload.deliveryTime ? `at ${payload.deliveryTime}` : ''}
                                  </p>
                                </div>
                              )}
                              {payload.estimatedDistance && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Estimated Distance</p>
                                  <p className="text-sm font-medium">{payload.estimatedDistance} miles</p>
                                </div>
                              )}
                              {payload.routeType && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Route Type</p>
                                  <p className="text-sm font-medium capitalize">{payload.routeType}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Animal Welfare
                      if (payload.restStopsRequired || payload.temperatureMonitoring || payload.ventilationRequired || payload.waterAccessRequired) {
                        sections.push(
                          <div key="welfare" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Animal Welfare</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.restStopsRequired && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Rest Stops Required</p>
                                  <p className="text-sm font-medium capitalize">{payload.restStopsRequired === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.restStopInterval && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Rest Stop Interval</p>
                                  <p className="text-sm font-medium">{payload.restStopInterval} hours</p>
                                </div>
                              )}
                              {payload.temperatureMonitoring && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Temperature Monitoring</p>
                                  <p className="text-sm font-medium capitalize">{payload.temperatureMonitoring === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.temperatureRange && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Temperature Range</p>
                                  <p className="text-sm font-medium">{payload.temperatureRange}°F</p>
                                </div>
                              )}
                              {payload.ventilationRequired && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Ventilation Required</p>
                                  <p className="text-sm font-medium capitalize">{payload.ventilationRequired === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.waterAccessRequired && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Water Access Required</p>
                                  <p className="text-sm font-medium capitalize">{payload.waterAccessRequired === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.feedingSchedule && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-500 mb-1">Feeding Schedule</p>
                                  <p className="text-sm font-medium">{payload.feedingSchedule}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Insurance & Liability
                      if (payload.insuranceCoverage || payload.liabilityLimit || payload.cargoInsurance) {
                        sections.push(
                          <div key="insurance" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Insurance & Liability</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.insuranceCoverage && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Insurance Coverage</p>
                                  <p className="text-sm font-medium capitalize">{payload.insuranceCoverage}</p>
                                </div>
                              )}
                              {payload.liabilityLimit && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Liability Limit</p>
                                  <p className="text-sm font-medium">${Number(payload.liabilityLimit).toLocaleString()}</p>
                                </div>
                              )}
                              {payload.cargoInsurance && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Cargo Insurance</p>
                                  <p className="text-sm font-medium capitalize">{payload.cargoInsurance === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.additionalInsurance && (
                                <div className="col-span-2">
                                  <p className="text-xs text-gray-500 mb-1">Additional Insurance</p>
                                  <p className="text-sm font-medium">{payload.additionalInsurance}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Compliance & Documentation
                      if (payload.healthCertificates || payload.movementPermits || payload.dotCompliance || payload.animalWelfareCompliance) {
                        sections.push(
                          <div key="compliance" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Compliance & Documentation</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.healthCertificates && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Health Certificates</p>
                                  <p className="text-sm font-medium capitalize">{payload.healthCertificates}</p>
                                </div>
                              )}
                              {payload.movementPermits && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Movement Permits</p>
                                  <p className="text-sm font-medium capitalize">{payload.movementPermits}</p>
                                </div>
                              )}
                              {payload.dotCompliance && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">DOT Compliance</p>
                                  <p className="text-sm font-medium capitalize">{payload.dotCompliance}</p>
                                </div>
                              )}
                              {payload.animalWelfareCompliance && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Animal Welfare Compliance</p>
                                  <p className="text-sm font-medium capitalize">{payload.animalWelfareCompliance}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Special Requirements
                      if (payload.specialHandling || payload.equipmentRequirements || payload.emergencyContact) {
                        sections.push(
                          <div key="special" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Special Requirements</h5>
                            <div className="space-y-2">
                              {payload.specialHandling && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Special Handling</p>
                                  <p className="text-sm font-medium">{payload.specialHandling}</p>
                                </div>
                              )}
                              {payload.equipmentRequirements && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Equipment Requirements</p>
                                  <p className="text-sm font-medium">{payload.equipmentRequirements}</p>
                                </div>
                              )}
                              {payload.emergencyContact && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Emergency Contact</p>
                                    <p className="text-sm font-medium">{payload.emergencyContact}</p>
                                  </div>
                                  {payload.emergencyPhone && (
                                    <div>
                                      <p className="text-xs text-gray-500 mb-1">Emergency Phone</p>
                                      <p className="text-sm font-medium">{payload.emergencyPhone}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {payload.veterinarianOnCall && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Veterinarian On Call</p>
                                  <p className="text-sm font-medium">{payload.veterinarianOnCall}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Terms & Conditions
                      if (payload.cancellationPolicy || payload.lateFeePolicy || payload.disputeResolution || payload.forcemajeure) {
                        sections.push(
                          <div key="terms" className="border-b pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Terms & Conditions</h5>
                            <div className="grid grid-cols-2 gap-3">
                              {payload.cancellationPolicy && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Cancellation Policy</p>
                                  <p className="text-sm font-medium capitalize">{payload.cancellationPolicy.replace(/-/g, ' ')}</p>
                                </div>
                              )}
                              {payload.lateFeePolicy && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Late Fee Policy</p>
                                  <p className="text-sm font-medium capitalize">{payload.lateFeePolicy === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                              {payload.disputeResolution && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Dispute Resolution</p>
                                  <p className="text-sm font-medium capitalize">{payload.disputeResolution}</p>
                                </div>
                              )}
                              {payload.forcemajeure && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Force Majeure</p>
                                  <p className="text-sm font-medium capitalize">{payload.forcemajeure === 'yes' ? 'Yes' : 'No'}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      // Additional Notes
                      if (payload.additionalTerms || payload.specialInstructions) {
                        sections.push(
                          <div key="notes" className="pb-3">
                            <h5 className="text-sm font-semibold mb-2 text-gray-700">Additional Notes</h5>
                            <div className="space-y-2">
                              {payload.additionalTerms && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Additional Terms</p>
                                  <p className="text-sm font-medium">{payload.additionalTerms}</p>
                                </div>
                              )}
                              {payload.specialInstructions && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Special Instructions</p>
                                  <p className="text-sm font-medium">{payload.specialInstructions}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      
                      return sections.length > 0 ? sections : null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
