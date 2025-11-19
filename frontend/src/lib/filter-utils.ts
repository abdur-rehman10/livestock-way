/**
 * Filter utilities for search and filtering functionality
 * Provides real filtering logic for loads, trips, etc.
 */

/**
 * Generic search filter
 */
export function searchFilter<T extends Record<string, any>>(
  items: T[],
  searchQuery: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchQuery.trim()) return items;

  const query = searchQuery.toLowerCase();

  return items.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(query);
    })
  );
}

/**
 * Filter loads by multiple criteria
 */
export interface LoadFilters {
  species?: string;
  origin?: string;
  destination?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  distance?: number;
  status?: string;
  searchQuery?: string;
}

export function filterLoads<T extends Record<string, any>>(
  loads: T[],
  filters: LoadFilters
): T[] {
  let filtered = [...loads];

  // Search query
  if (filters.searchQuery) {
    filtered = searchFilter(filtered, filters.searchQuery, [
      'species',
      'origin',
      'destination',
      'postedBy',
      'id',
    ]);
  }

  // Species filter
  if (filters.species && filters.species !== 'all') {
    filtered = filtered.filter(load =>
      load.species?.toLowerCase() === filters.species?.toLowerCase()
    );
  }

  // Origin filter
  if (filters.origin) {
    filtered = filtered.filter(load =>
      load.origin?.toLowerCase().includes(filters.origin?.toLowerCase() || '')
    );
  }

  // Destination filter
  if (filters.destination) {
    filtered = filtered.filter(load =>
      load.destination?.toLowerCase().includes(filters.destination?.toLowerCase() || '')
    );
  }

  // Status filter
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(load =>
      load.status?.toLowerCase() === filters.status?.toLowerCase()
    );
  }

  // Price range filter
  const hasMin = typeof filters.priceMin === "number" && filters.priceMin > 0;
  const hasMax = typeof filters.priceMax === "number" && filters.priceMax > 0;
  if (hasMin || hasMax) {
    filtered = filtered.filter((load) => {
      const price = parseFloat(load.price?.replace(/[^0-9.]/g, "") || "0");
      const min = hasMin ? filters.priceMin! : 0;
      const max = hasMax ? filters.priceMax! : Infinity;
      return price >= min && price <= max;
    });
  }

  // Distance filter
  if (filters.distance !== undefined && filters.distance > 0) {
    filtered = filtered.filter(load => {
      const distance = parseFloat(load.distance?.replace(/[^0-9.]/g, '') || '0');
      return distance <= (filters.distance || Infinity);
    });
  }

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    filtered = filtered.filter(load => {
      const loadDate = new Date(load.pickupDate || load.postedDate);
      const from = filters.dateFrom ? new Date(filters.dateFrom) : new Date(0);
      const to = filters.dateTo ? new Date(filters.dateTo) : new Date('2100-01-01');
      return loadDate >= from && loadDate <= to;
    });
  }

  return filtered;
}

/**
 * Sort items by field
 */
export function sortBy<T extends Record<string, any>>(
  items: T[],
  field: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal === bVal) return 0;

    const comparison = aVal < bVal ? -1 : 1;
    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Paginate items
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): T[] {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return items.slice(start, end);
}

/**
 * Get unique values from array of objects
 */
export function getUniqueValues<T extends Record<string, any>>(
  items: T[],
  field: keyof T
): any[] {
  const values = items.map(item => item[field]).filter(Boolean);
  return Array.from(new Set(values));
}
