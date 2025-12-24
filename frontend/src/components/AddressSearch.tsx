import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Input } from './ui/input';
import { cn } from './ui/utils';

type NominatimAddress = {
  road?: string;
  house_number?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

type NormalizedResult = {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
  address: NominatimAddress;
};

export type MappedAddress = {
  addressLine1: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  fullText: string;
  lat: string;
  lon: string;
};

type AddressSearchProps = {
  value: string;
  onChange: (text: string) => void;
  onSelect: (mapped: MappedAddress) => void;
  disabled?: boolean;
};

const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 6;
const DEBOUNCE_MS = 300;

const normalizeResults = (raw: unknown): NormalizedResult[] => {
  const data = Array.isArray(raw) ? raw : (raw as { results?: unknown[] } | null)?.results;
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const result = item as Partial<NormalizedResult> & {
        address?: NominatimAddress;
        place_id?: string | number;
      };
      if (!result.display_name) return null;
      return {
        place_id: result.place_id ?? result.display_name,
        display_name: result.display_name,
        lat: result.lat ? String(result.lat) : '',
        lon: result.lon ? String(result.lon) : '',
        address: result.address ?? {},
      };
    })
    .filter(Boolean) as NormalizedResult[];
};

const mapResult = (result: NormalizedResult): MappedAddress => {
  const addressLine1 = [result.address.house_number, result.address.road].filter(Boolean).join(' ').trim();
  const area = result.address.suburb || result.address.neighbourhood || '';
  const city =
    result.address.city ||
    result.address.town ||
    result.address.village ||
    result.address.municipality ||
    result.address.county ||
    '';
  return {
    addressLine1,
    area,
    city,
    state: result.address.state || '',
    postalCode: result.address.postcode || '',
    country: result.address.country || '',
    fullText: result.display_name,
    lat: result.lat || '',
    lon: result.lon || '',
  };
};

export function AddressSearch({ value, onChange, onSelect, disabled }: AddressSearchProps) {
  const [suggestions, setSuggestions] = useState<NormalizedResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const suppressFetchRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    abortRef.current?.abort();

    const query = value.trim();
    if (suppressFetchRef.current) {
      suppressFetchRef.current = false;
      return;
    }
    if (query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      const baseUrl = import.meta.env.VITE_GEOCODE_SEARCH_URL?.trim();
      const url = baseUrl
        ? `${baseUrl}?q=${encodeURIComponent(query)}`
        : `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${MAX_RESULTS}&q=${encodeURIComponent(query)}`;
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      try {
        const referrer = typeof window !== 'undefined' ? window.location.origin : undefined;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          referrer,
          referrerPolicy: referrer ? 'origin' : undefined,
        });
        if (!response.ok) {
          throw new Error(`Geocode request failed: ${response.status}`);
        }
        const data = await response.json();
        const normalized = normalizeResults(data);
        setSuggestions(normalized);
        setIsOpen(true);
        setHighlightedIndex(normalized.length ? 0 : -1);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error(err);
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const handleSelect = (result: NormalizedResult) => {
    const mapped = mapResult(result);
    suppressFetchRef.current = true;
    onChange(mapped.fullText);
    onSelect(mapped);
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setIsOpen(true);
    }
    if (!suggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      if (highlightedIndex >= 0) {
        event.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const showEmptyState = !isLoading && value.trim().length >= MIN_QUERY_LENGTH && suggestions.length === 0;

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (suggestions.length) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search address"
        disabled={disabled}
        className="h-10 sm:h-11 text-sm sm:text-[15px] dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400"
        aria-autocomplete="list"
        aria-expanded={isOpen}
      />
      {isOpen ? (
        <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-900 z-50">
          {isLoading ? (
            <div className="px-3 py-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Searching...
            </div>
          ) : null}
          {showEmptyState ? (
            <div className="px-3 py-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              No results found
            </div>
          ) : null}
          {suggestions.map((result, index) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => handleSelect(result)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'w-full text-left px-3 py-2 text-xs sm:text-sm transition-colors',
                index === highlightedIndex
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70',
              )}
            >
              {result.display_name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
