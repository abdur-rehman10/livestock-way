import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PostLoadDialog } from './PostLoadDialog';
import { MapPin, Clock, Truck, DollarSign, Edit, Copy, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { fetchMyLoads } from "../lib/api";
import type { Load as ApiLoad } from "../lib/api";

interface MyLoad {
  id: string;
  rawId: number;
  species: string;
  quantity: string;
  pickup: string;
  dropoff: string;
  pickupDate: string;
  price: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  postedDate: string;
  assigned_to?: string | null;
  assigned_at?: string | null;
}

interface MyLoadsTabProps {
  onTrackLoad?: (load: MyLoad) => void;
}

export function MyLoadsTab({ onTrackLoad }: MyLoadsTabProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed' | 'cancelled'>('active');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<MyLoad | null>(null);
  const [myLoads, setMyLoads] = useState<MyLoad[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const CURRENT_SHIPPER_ID = "demo_shipper_1";

  useEffect(() => {
    let isMounted = true;

    async function loadMyLoads() {
      try {
        setIsLoading(true);
        setError(null);

        const data = await fetchMyLoads(CURRENT_SHIPPER_ID);

        if (isMounted) {
          const transformed: MyLoad[] = data.map((load: ApiLoad) => ({
            id: `L${load.id}`,
            rawId: load.id,
            species: load.species,
            quantity: `${load.quantity} head`,
            pickup: load.pickup_location,
            dropoff: load.dropoff_location,
            pickupDate: new Date(load.pickup_date).toLocaleString(),
            price: load.offer_price
              ? `$${Number(load.offer_price).toFixed(0)}`
              : "$0",
            status:
              load.status === "assigned"
                ? "active"
                : load.status === "completed"
                  ? "completed"
                  : load.status === "cancelled"
                    ? "cancelled"
                    : "pending",
            postedDate: new Date(load.created_at).toLocaleDateString(),
            assigned_to: load.assigned_to ?? null,
            assigned_at: load.assigned_at ?? null,
          }));

          setMyLoads(transformed);
        }
      } catch (err: any) {
        console.error('Failed to load loads:', err);
        setError(err?.message || 'Failed to load loads');
        toast.error('Failed to load your loads');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMyLoads();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleEdit = (load: MyLoad) => {
    if (load.status !== 'pending') {
      toast.error('Only pending loads can be edited');
      return;
    }
    setSelectedLoad(load);
    setIsEditOpen(true);
  };

  const handleDuplicate = (load: MyLoad) => {
    setSelectedLoad(load);
    setIsEditOpen(true);
    toast.info('Load details copied. Make changes and post.');
  };

  const handleCancel = (load: MyLoad) => {
    if (load.status === 'active') {
      if (!confirm('Cancelling an active trip may incur fees. Continue?')) {
        return;
      }
    }
    toast.success('Load cancelled');
  };

  const pendingLoads = myLoads.filter(l => l.status === 'pending');
  const activeLoads = myLoads.filter(l => l.status === 'active');
  const completedLoads = myLoads.filter(l => l.status === 'completed');

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Loading your loads...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  const renderEmptyState = (type: string) => (
    <div className="text-center py-12">
      <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-400" />
      <h3 className="text-lg text-gray-900 mb-2">No {type} loads</h3>
      <p className="text-sm text-gray-600">
        {type === 'pending' && 'Post a load to get started'}
        {type === 'active' && 'No loads currently in transit'}
        {type === 'completed' && 'No completed loads yet'}
        {type === 'cancelled' && 'No cancelled loads'}
      </p>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {isLoading && (
        <div className="p-4 text-sm text-gray-500">
          Loading your loads...
        </div>
      )}

      {error && (
        <div className="p-4 text-sm text-red-500">{error}</div>
      )}

      {!isLoading && !error && myLoads.length === 0 && (
        <div className="p-4 text-sm text-gray-500">
          You haven't posted any loads yet.
        </div>
      )}

      {!isLoading && !error && myLoads.length > 0 && (
        <div className="space-y-4">
          {myLoads.map((load) => (
            <Card key={load.id}>
              <CardContent className="p-4 space-y-2">
                <div className="font-semibold">{load.species}</div>
                <div className="text-sm text-gray-500">
                  {load.quantity} • {load.pickup} → {load.dropoff}
                </div>
                <div className="text-sm text-gray-600">
                  Pickup: {load.pickupDate}
                </div>
                {load.price && (
                  <div className="text-sm font-medium">
                    Offer: {load.price}
                  </div>
                )}
                {load.assigned_to ? (
                  <div className="text-xs mt-1">
                    Assigned to: <span className="font-medium">{load.assigned_to}</span>{" "}
                    {load.assigned_at
                      ? `at ${new Date(
                          load.assigned_at as unknown as string
                        ).toLocaleString()}`
                      : ""}
                  </div>
                ) : (
                  <div className="text-xs mt-1 text-amber-600">Not yet assigned</div>
                )}
                <div className="text-xs text-gray-400">
                  Status: {load.status}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit/Duplicate Load Dialog */}
      <PostLoadDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialData={selectedLoad}
      />
    </div>
  );
}
