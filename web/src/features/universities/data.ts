"use client";

/**
 * The directory's data layer.
 *
 * Replaces a module-level import of all forty universities. §78 is explicit that the
 * complete database must never reach the client, and the array was fine at forty and
 * would not be at four hundred — the point of moving it is that the page size no longer
 * depends on the catalogue size.
 *
 * Two requests per filter change, not one: the grid is paged and the map is not. See
 * `/api/universities/pins` for why that is two endpoints rather than a compromise.
 *
 * Filters are debounced together rather than per-field. Someone setting a city and then
 * a type produces one request, not two, and the search box does not fire on every
 * keystroke.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UniversityCard {
  id: string;
  slug: string;
  name: string;
  city: string;
  type: "PUBLIC" | "PRIVATE";
  languages: string[];
  tuitionDisplay: string;
  programCount: number;
  scholarship: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface UniversityPin {
  slug: string;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Facets {
  cities: string[];
  languages: string[];
  types: readonly string[];
}

export interface DirectoryFilters {
  search: string;
  city: string | null;
  type: string | null;
  language: string | null;
  scholarship: boolean;
  sort: "name" | "city" | "founded";
  page: number;
  limit: number;
}

export const INITIAL_FILTERS: DirectoryFilters = {
  search: "",
  city: null,
  type: null,
  language: null,
  scholarship: false,
  sort: "name",
  page: 1,
  limit: 12,
};

/** Only send what is set. An empty `city=` would be a filter value the server rejects. */
function toQuery(filters: DirectoryFilters, forPins = false): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.city) params.set("city", filters.city);
  if (filters.type) params.set("type", filters.type);
  if (filters.language) params.set("language", filters.language);
  if (filters.scholarship) params.set("scholarship", "true");
  if (!forPins) {
    params.set("sort", filters.sort);
    params.set("page", String(filters.page));
    params.set("limit", String(filters.limit));
  }
  return params.toString();
}

export interface DirectoryState {
  items: UniversityCard[];
  pins: UniversityPin[];
  total: number;
  page: number;
  pageCount: number;
  loading: boolean;
  error: string | null;
}

const DEBOUNCE_MS = 250;

export function useDirectory(filters: DirectoryFilters): DirectoryState {
  const [state, setState] = useState<DirectoryState>({
    items: [], pins: [], total: 0, page: 1, pageCount: 1, loading: true, error: null,
  });

  const key = useMemo(() => `${toQuery(filters)}|${toQuery(filters, true)}`, [filters]);

  /**
   * Abort the previous request when the filter changes again.
   *
   * Without this, a fast typist can have three requests in flight and the slowest one
   * wins — the list settles on a result for a query nobody is looking at any more.
   */
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setState((s) => ({ ...s, loading: true, error: null }));

      void (async () => {
        try {
          const [listRes, pinRes] = await Promise.all([
            fetch(`/api/universities?${toQuery(filters)}`, { signal: controller.signal }),
            fetch(`/api/universities/pins?${toQuery(filters, true)}`, { signal: controller.signal }),
          ]);

          if (!listRes.ok) {
            setState((s) => ({ ...s, loading: false, error: "We could not load the directory." }));
            return;
          }

          const list = (await listRes.json()) as {
            items: UniversityCard[]; total: number; page: number; pageCount: number;
          };
          const pins = pinRes.ok ? ((await pinRes.json()) as UniversityPin[]) : [];

          setState({
            items: list.items, pins, total: list.total,
            page: list.page, pageCount: list.pageCount,
            loading: false, error: null,
          });
        } catch (error) {
          // An abort is the expected outcome of typing, not a failure to report.
          if ((error as { name?: string })?.name === "AbortError") return;
          setState((s) => ({ ...s, loading: false, error: "We could not reach the server." }));
        }
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [key, filters]);

  return state;
}

export function useFacets(): Facets {
  const [facets, setFacets] = useState<Facets>({ cities: [], languages: [], types: ["PUBLIC", "PRIVATE"] });

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/universities/facets");
        if (response.ok) setFacets((await response.json()) as Facets);
      } catch {
        // The toolbar degrades to search plus type, which are not derived from data.
      }
    })();
  }, []);

  return facets;
}

/** Filter changes reset to page one. Staying on page four of a result set that now has
 *  two pages shows an empty grid and reads as "no results" rather than "wrong page". */
export function useFilters() {
  const [filters, setFilters] = useState<DirectoryFilters>(INITIAL_FILTERS);

  const update = useCallback((patch: Partial<DirectoryFilters>) => {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: "page" in patch ? (patch.page ?? 1) : 1,
    }));
  }, []);

  const reset = useCallback(() => setFilters(INITIAL_FILTERS), []);

  return { filters, update, reset };
}
