import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PostLoadDialog } from './PostLoadDialog';
import { MapPin, Clock, Truck, DollarSign, Edit, Copy, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { fetchMyLoads, API_BASE_URL } from "../lib/api";
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
  status: ApiLoad["status"];
  uiStatus: 'pending' | 'active' | 'completed';
  driver?: string;
  postedDate: string;
  assigned_to?: string | null;
  assigned_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  epod_url?: string | null;
}

function resolveEpodUrl(url?: string | null) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url}`;
}

interface MyLoadsTabProps {
  onTrackLoad?: (load: MyLoad) => void;
}

export function MyLoadsTab({ onTrackLoad }: MyLoadsTabProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed'>('active');
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
          const transformed: MyLoad[] = data.map((load: ApiLoad) => {
            const uiStatus =
              load.status === "assigned" || load.status === "in_transit"
                ? "active"
                : load.status === "delivered"
                  ? "completed"
                  : "pending";

            return {
              id: `L${load.id}`,
              species: load.species,
              quantity: `${load.quantity} head`,
              pickup: load.pickup_location,
              dropoff: load.dropoff_location,
              pickupDate: new Date(load.pickup_date).toLocaleString(),
              price: load.offer_price
                ? `$${Number(load.offer_price).toFixed(0)}`
                : "$0",
              status: load.status,
              uiStatus,
              postedDate: new Date(load.created_at).toLocaleDateString(),
              driver: undefined,
              assigned_to: load.assigned_to,
              assigned_at: load.assigned_at,
              started_at: load.started_at,
              completed_at: load.completed_at,
              epod_url: load.epod_url,
            };
          });

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
    if (load.uiStatus !== 'pending') {
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
    if (load.uiStatus === 'active') {
      if (!confirm('Cancelling an active trip may incur fees. Continue?')) {
        return;
      }
    }
    toast.success('Load cancelled');
  };

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

  const renderLoadCard = (load: MyLoad) => {
    const isPending = load.uiStatus === 'pending';
    const isActive = load.uiStatus === 'active';
    const isCompleted = load.uiStatus === 'completed';

    return (
      <Card key={load.id}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-600 mb-1">Load #{load.id}</div>
              <h3 className="text-base text-gray-900">{load.species} - {load.quantity}</h3>
            </div>
            <Badge 
              variant={isActive ? 'default' : isPending ? 'secondary' : isCompleted ? 'outline' : 'destructive'}
              className={isActive ? 'bg-[#F97316]' : isPending ? 'bg-gray-500' : isCompleted ? 'bg-green-500 text-white' : ''}
            >
              {load.uiStatus.charAt(0).toUpperCase() + load.uiStatus.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-[#F97316] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-gray-900">{load.pickup}</div>
              <div className="text-gray-600">{load.dropoff}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {load.pickupDate}
            </div>
          </div>

          {load.driver && (
            <div className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
              <Truck className="w-4 h-4 text-gray-600" />
              <span className="text-gray-900">Driver: {load.driver}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-1 text-[#F97316]">
              <DollarSign className="w-4 h-4" />
              <span className="text-lg">{load.price}</span>
            </div>

            <div className="flex gap-2">
              {isPending && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(load)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(load)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(load)}
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </Button>
                </>
              )}
              {isActive && (
                <Button
                  onClick={() => onTrackLoad?.(load)}
                  className="bg-[#F97316] hover:bg-[#ea580c]"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Track
                </Button>
              )}
              {isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const epodUrl = resolveEpodUrl(load.epod_url);
                    if (epodUrl) {
                      window.open(epodUrl, "_blank");
                    } else {
                      toast.info("No ePOD available yet.");
                    }
                  }}
                >
                  View ePOD
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <span>Status:</span>
                  <span className="font-medium">{load.status}</span>
                  {load.started_at && (
                    <span>
                      • Started {new Date(load.started_at).toLocaleString()}
                    </span>
                  )}
                  {load.completed_at && (
                    <span>
                      • Delivered {new Date(load.completed_at).toLocaleString()}
                    </span>
                  )}
                  {resolveEpodUrl(load.epod_url) && (
                    <>
                      <span>•</span>
                      <a
                        href={resolveEpodUrl(load.epod_url) ?? "#"}
                        className="text-emerald-700 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View ePOD
                      </a>
                    </>
                  )}
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
