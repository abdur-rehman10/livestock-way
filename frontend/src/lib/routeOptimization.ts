/**
 * Route Optimization Utilities
 * Calculates all possible route combinations for multi-load trips
 */

export interface Waypoint {
  id: string;
  type: 'origin' | 'pickup' | 'dropoff' | 'destination';
  loadId?: string;
  contractId?: string;
  location: {
    text: string;
    lat: number | null;
    lng: number | null;
  };
}

export interface RouteCombination {
  id: string;
  waypoints: Waypoint[];
  sequence: string[]; // Array of waypoint IDs in order
  distance_km?: number;
  duration_min?: number;
  estimated_cost?: number;
  isCalculating?: boolean;
  error?: string;
}

/**
 * Generate all valid route combinations
 * Constraints:
 * - Truck origin must be first
 * - Truck destination must be last
 * - Each load's pickup must come before its dropoff
 */
export function generateRouteCombinations(
  truckOrigin: { text: string; lat: number | null; lng: number | null },
  truckDestination: { text: string; lat: number | null; lng: number | null },
  loads: Array<{
    loadId: string;
    contractId: string;
    pickup: { text: string; lat: number | null; lng: number | null };
    dropoff: { text: string; lat: number | null; lng: number | null };
  }>
): RouteCombination[] {
  if (loads.length === 0) {
    // Single route: origin -> destination
    return [{
      id: 'route_1',
      waypoints: [
        { id: 'origin', type: 'origin', location: truckOrigin },
        { id: 'destination', type: 'destination', location: truckDestination },
      ],
      sequence: ['origin', 'destination'],
    }];
  }

  const combinations: RouteCombination[] = [];
  
  // Create waypoint objects
  const waypoints: Waypoint[] = [
    { id: 'origin', type: 'origin', location: truckOrigin },
  ];
  
  loads.forEach((load, index) => {
    waypoints.push({
      id: `pickup_${load.loadId}`,
      type: 'pickup',
      loadId: load.loadId,
      contractId: load.contractId,
      location: load.pickup,
    });
    waypoints.push({
      id: `dropoff_${load.loadId}`,
      type: 'dropoff',
      loadId: load.loadId,
      contractId: load.contractId,
      location: load.dropoff,
    });
  });
  
  waypoints.push({
    id: 'destination',
    type: 'destination',
    location: truckDestination,
  });

  // Generate all valid permutations
  // For small number of loads, we can generate all combinations
  // For larger numbers, we'd use a more efficient algorithm
  
  if (loads.length === 1) {
    // Only one load: origin -> pickup -> dropoff -> destination
    combinations.push({
      id: 'route_1',
      waypoints,
      sequence: ['origin', `pickup_${loads[0].loadId}`, `dropoff_${loads[0].loadId}`, 'destination'],
    });
  } else if (loads.length === 2) {
    // Two loads: generate all valid combinations
    const load1 = loads[0];
    const load2 = loads[1];
    
    // Combination 1: Load1 pickup -> Load1 dropoff -> Load2 pickup -> Load2 dropoff
    combinations.push({
      id: 'route_1',
      waypoints,
      sequence: [
        'origin',
        `pickup_${load1.loadId}`,
        `dropoff_${load1.loadId}`,
        `pickup_${load2.loadId}`,
        `dropoff_${load2.loadId}`,
        'destination',
      ],
    });
    
    // Combination 2: Load1 pickup -> Load2 pickup -> Load1 dropoff -> Load2 dropoff
    combinations.push({
      id: 'route_2',
      waypoints,
      sequence: [
        'origin',
        `pickup_${load1.loadId}`,
        `pickup_${load2.loadId}`,
        `dropoff_${load1.loadId}`,
        `dropoff_${load2.loadId}`,
        'destination',
      ],
    });
    
    // Combination 3: Load1 pickup -> Load2 pickup -> Load2 dropoff -> Load1 dropoff
    combinations.push({
      id: 'route_3',
      waypoints,
      sequence: [
        'origin',
        `pickup_${load1.loadId}`,
        `pickup_${load2.loadId}`,
        `dropoff_${load2.loadId}`,
        `dropoff_${load1.loadId}`,
        'destination',
      ],
    });
    
    // Combination 4: Load2 pickup -> Load1 pickup -> Load1 dropoff -> Load2 dropoff
    combinations.push({
      id: 'route_4',
      waypoints,
      sequence: [
        'origin',
        `pickup_${load2.loadId}`,
        `pickup_${load1.loadId}`,
        `dropoff_${load1.loadId}`,
        `dropoff_${load2.loadId}`,
        'destination',
      ],
    });
    
    // Combination 5: Load2 pickup -> Load1 pickup -> Load2 dropoff -> Load1 dropoff
    combinations.push({
      id: 'route_5',
      waypoints,
      sequence: [
        'origin',
        `pickup_${load2.loadId}`,
        `pickup_${load1.loadId}`,
        `dropoff_${load2.loadId}`,
        `dropoff_${load1.loadId}`,
        'destination',
      ],
    });
    
    // Combination 6: Load2 pickup -> Load2 dropoff -> Load1 pickup -> Load1 dropoff
    combinations.push({
      id: 'route_6',
      waypoints,
      sequence: [
        'origin',
        `pickup_${load2.loadId}`,
        `dropoff_${load2.loadId}`,
        `pickup_${load1.loadId}`,
        `dropoff_${load1.loadId}`,
        'destination',
      ],
    });
  } else {
    // For 3+ loads, use a more efficient approach
    // Generate combinations using recursive permutation with constraints
    const loadPairs = loads.map((load, idx) => ({
      pickupId: `pickup_${load.loadId}`,
      dropoffId: `dropoff_${load.loadId}`,
      loadId: load.loadId,
      contractId: load.contractId,
    }));
    
    // Generate valid sequences recursively
    function generateSequences(
      remainingPairs: typeof loadPairs,
      currentSequence: string[],
      allSequences: string[][]
    ) {
      if (remainingPairs.length === 0) {
        allSequences.push([...currentSequence]);
        return;
      }
      
      // Try adding each remaining pair's pickup first
      for (let i = 0; i < remainingPairs.length; i++) {
        const pair = remainingPairs[i];
        const newRemaining = [...remainingPairs];
        newRemaining.splice(i, 1);
        
        // Add pickup
        currentSequence.push(pair.pickupId);
        
        // Try all positions for dropoff (must be after pickup)
        for (let dropoffPos = currentSequence.length; dropoffPos <= currentSequence.length + newRemaining.length; dropoffPos++) {
          const sequenceWithDropoff = [...currentSequence];
          sequenceWithDropoff.splice(dropoffPos, 0, pair.dropoffId);
          generateSequences(newRemaining, sequenceWithDropoff, allSequences);
        }
        
        // Backtrack
        currentSequence.pop();
      }
    }
    
    const allSequences: string[][] = [];
    generateSequences(loadPairs, [], allSequences);
    
    // Create combinations from sequences
    allSequences.forEach((sequence, idx) => {
      combinations.push({
        id: `route_${idx + 1}`,
        waypoints,
        sequence: ['origin', ...sequence, 'destination'],
      });
    });
  }

  return combinations;
}

/**
 * Calculate route metrics for a combination using OSRM
 */
export async function calculateRouteMetrics(
  waypoints: Waypoint[],
  sequence: string[],
  routeMode: 'fastest' | 'shortest' | 'avoid-tolls' = 'fastest'
): Promise<{ distance_km: number; duration_min: number } | null> {
  // Get waypoints in sequence order
  const orderedWaypoints = sequence
    .map(id => waypoints.find(w => w.id === id))
    .filter((w): w is Waypoint => w !== undefined);

  // Filter out waypoints without coordinates
  const waypointsWithCoords = orderedWaypoints.filter(
    w => w.location.lat !== null && w.location.lng !== null
  );

  if (waypointsWithCoords.length < 2) {
    return null;
  }

  // Build OSRM coordinates string
  const coords = waypointsWithCoords
    .map(w => `${w.location.lng},${w.location.lat}`)
    .join(';');

  const baseUrl = 'https://router.project-osrm.org';
  const url = `${baseUrl}/route/v1/driving/${coords}?overview=full&geometries=polyline6&steps=true`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'livestockway-route-optimization/1.0',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const route = data?.routes?.[0];
    
    if (!route) {
      return null;
    }

    return {
      distance_km: route.distance ? Number(route.distance) / 1000 : 0,
      duration_min: route.duration ? Number(route.duration) / 60 : 0,
    };
  } catch (error) {
    console.error('Error calculating route metrics:', error);
    return null;
  }
}

/**
 * Calculate route metrics using OAASIS API
 */
export async function calculateRouteMetricsOAASIS(
  waypoints: Waypoint[],
  sequence: string[],
  routeMode: 'fastest' | 'shortest' | 'avoid-tolls' = 'fastest',
  apiKey: string
): Promise<{ distance_km: number; duration_min: number } | null> {
  // Get waypoints in sequence order
  const orderedWaypoints = sequence
    .map(id => waypoints.find(w => w.id === id))
    .filter((w): w is Waypoint => w !== undefined);

  // Filter out waypoints without coordinates
  const waypointsWithCoords = orderedWaypoints.filter(
    w => w.location.lat !== null && w.location.lng !== null
  );

  if (waypointsWithCoords.length < 2) {
    return null;
  }

  // TODO: Implement OAASIS API call once we know the endpoint structure
  // This is a placeholder - need to check Swagger docs for actual API format
  // For now, fallback to OSRM if OAASIS fails
  const baseUrl = import.meta.env.VITE_OAASIS_ROUTING_API_URL || 'https://routing.oaasis.cc';
  
  try {
    // Build coordinates string for OAASIS (format may vary - check Swagger)
    const coords = waypointsWithCoords
      .map(w => `${w.location.lng},${w.location.lat}`)
      .join(';');

    // Try OAASIS API (adjust endpoint based on actual API)
    const response = await fetch(`${baseUrl}/api/route/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        waypoints: waypointsWithCoords.map(w => ({
          lat: w.location.lat,
          lng: w.location.lng,
        })),
        profile: routeMode === 'fastest' ? 'driving' : routeMode === 'shortest' ? 'driving' : 'driving',
        optimize: true,
      }),
    });

    if (!response.ok) {
      // Fallback to OSRM if OAASIS fails
      return await calculateRouteMetrics(waypoints, sequence, routeMode);
    }

    const data = await response.json();
    
    return {
      distance_km: data.distance_km || data.distance || 0,
      duration_min: data.duration_min || (data.duration ? data.duration / 60 : 0),
    };
  } catch (error) {
    console.error('Error calculating route metrics with OAASIS, falling back to OSRM:', error);
    // Fallback to OSRM
    return await calculateRouteMetrics(waypoints, sequence, routeMode);
  }
}
