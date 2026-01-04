import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  fetchContracts,
  sendContract,
  updateContract,
  type ContractRecord,
} from "../api/marketplace";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { GenerateContractPopup } from "../components/GenerateContractPopup";

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

export default function ShipperContractsTab() {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedId) ?? null,
    [contracts, selectedId]
  );

  const refresh = async () => {
    try {
      setLoading(true);
      const resp = await fetchContracts();
      setContracts(resp.items);
      if (!selectedId && resp.items.length) {
        setSelectedId(resp.items[0].id);
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

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading contracts…</div>;
  }

  return (
    <>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Contracts</h1>
            <p className="text-sm text-gray-500">
              Review and manage contracts sent to haulers.
            </p>
          </div>
          <Badge variant="secondary" className="bg-primary-50 text-emerald-700">
            Total: {contracts.length}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Contracts</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {contracts.length === 0 ? (
                <p className="text-sm text-gray-500">No contracts yet.</p>
              ) : (
                <ScrollArea className="h-[360px] pr-2">
                  <div className="space-y-3">
                    {contracts.map((contract) => {
                      const isActive = contract.id === selectedId;
                      return (
                        <button
                          key={contract.id}
                          className={[
                            "w-full rounded-2xl border p-3 text-left transition",
                            isActive
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                              : "border-gray-200 hover:bg-gray-50",
                          ].join(" ")}
                          onClick={() => setSelectedId(contract.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                Contract #{contract.id}
                              </p>
                              <p className="text-xs text-gray-500">
                                Load #{contract.load_id} • Offer {contract.offer_id ?? "—"}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {contract.status.toLowerCase()}
                            </Badge>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            {contract.created_at
                              ? new Date(contract.created_at).toLocaleDateString()
                              : "—"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {!selectedContract ? (
                <p className="text-sm text-gray-500">Select a contract to view details.</p>
              ) : (
                <>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Status</span>
                      <Badge variant="secondary" className="capitalize">
                        {selectedContract.status.toLowerCase()}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-gray-600">
                      <div>
                        Price:{" "}
                        {selectedContract.price_amount
                          ? `$${selectedContract.price_amount}`
                          : "—"}{" "}
                        {selectedContract.price_type === "per-mile" ? "/mile" : ""}
                      </div>
                      <div>Payment method: {selectedContract.payment_method ?? "—"}</div>
                      <div>Payment schedule: {selectedContract.payment_schedule ?? "—"}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {["DRAFT", "SENT"].includes(selectedContract.status) && (
                      <Button variant="outline" onClick={() => setModalOpen(true)}>
                        Edit Contract
                      </Button>
                    )}
                    {selectedContract.status === "DRAFT" && (
                      <Button
                        className="bg-primary text-white hover:bg-primary-600"
                        onClick={() =>
                          handleSave(
                            (selectedContract.contract_payload ?? {}) as ContractFormData,
                            true
                          )
                        }
                      >
                        Send Contract
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedContract && (
        <GenerateContractPopup
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onGenerate={(data) => handleSave(data, true)}
          onSaveDraft={(data) => handleSave(data, false)}
          contractInfo={
            (selectedContract.contract_payload as ContractFormData)?.contractInfo
          }
          initialData={{
            ...(selectedContract.contract_payload ?? {}),
            priceAmount: selectedContract.price_amount ?? "",
            priceType: selectedContract.price_type ?? "total",
          }}
        />
      )}
    </>
  );
}
