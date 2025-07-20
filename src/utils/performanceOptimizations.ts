import { useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * Performance optimization utilities for large datasets and complex operations
 */

/**
 * Debounce function to limit rapid function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function to limit function calls to once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * Memoize expensive computations
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

/**
 * Virtual scrolling for large lists
 */
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const totalHeight = items.length * itemHeight;
    
    return {
      totalHeight,
      visibleCount,
      getVisibleItems: (scrollTop: number) => {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const endIndex = Math.min(
          items.length - 1,
          startIndex + visibleCount + overscan * 2
        );
        
        return {
          startIndex,
          endIndex,
          items: items.slice(startIndex, endIndex + 1),
          offsetY: startIndex * itemHeight,
        };
      },
    };
  }, [items, itemHeight, containerHeight, overscan]);
}

/**
 * Batch operations to reduce re-renders
 */
export function useBatchedUpdates<T>() {
  const [updates, setUpdates] = useState<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const addUpdate = useCallback((update: T) => {
    setUpdates(prev => [...prev, update]);
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Batch updates
    timeoutRef.current = setTimeout(() => {
      setUpdates([]);
    }, 16); // Next frame
  }, []);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return { updates, addUpdate };
}

/**
 * Lazy loading for expensive components
 */
export function useLazyComponent<T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    const loadComponent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const module = await importFn();
        
        if (mounted) {
          setComponent(module.default);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadComponent();
    
    return () => {
      mounted = false;
    };
  }, [importFn]);
  
  return { Component, loading, error };
}

/**
 * Optimize array operations for large datasets
 */
export class OptimizedArray<T> {
  private items: T[] = [];
  private indices: Map<string, number> = new Map();
  private getKey: (item: T) => string;
  
  constructor(getKey: (item: T) => string) {
    this.getKey = getKey;
  }
  
  add(item: T): void {
    const key = this.getKey(item);
    const existingIndex = this.indices.get(key);
    
    if (existingIndex !== undefined) {
      this.items[existingIndex] = item;
    } else {
      this.indices.set(key, this.items.length);
      this.items.push(item);
    }
  }
  
  remove(key: string): boolean {
    const index = this.indices.get(key);
    if (index === undefined) return false;
    
    this.items.splice(index, 1);
    this.indices.delete(key);
    
    // Update indices for items after the removed item
    for (let i = index; i < this.items.length; i++) {
      const itemKey = this.getKey(this.items[i]);
      this.indices.set(itemKey, i);
    }
    
    return true;
  }
  
  find(key: string): T | undefined {
    const index = this.indices.get(key);
    return index !== undefined ? this.items[index] : undefined;
  }
  
  filter(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }
  
  map<U>(mapper: (item: T) => U): U[] {
    return this.items.map(mapper);
  }
  
  sort(compareFn: (a: T, b: T) => number): void {
    this.items.sort(compareFn);
    
    // Rebuild indices
    this.indices.clear();
    this.items.forEach((item, index) => {
      this.indices.set(this.getKey(item), index);
    });
  }
  
  get length(): number {
    return this.items.length;
  }
  
  toArray(): T[] {
    return [...this.items];
  }
}

/**
 * Memory-efficient data pagination
 */
export function usePagination<T>(
  data: T[],
  pageSize: number = 20
) {
  const [currentPage, setCurrentPage] = useState(0);
  
  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return data.slice(start, end);
  }, [data, currentPage, pageSize]);
  
  const totalPages = Math.ceil(data.length / pageSize);
  const hasNextPage = currentPage < totalPages - 1;
  const hasPrevPage = currentPage > 0;
  
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);
  
  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrevPage]);
  
  const goToPage = useCallback((page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);
  
  return {
    data: paginatedData,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
  };
}

/**
 * Optimize re-renders with shallow comparison
 */
export function useShallowMemo<T>(value: T): T {
  const ref = useRef<T>(value);
  
  if (!shallowEqual(ref.current, value)) {
    ref.current = value;
  }
  
  return ref.current;
}

function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return false;
  }
  
  if (obj1 === null || obj2 === null) {
    return obj1 === obj2;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(name: string) {
  const startTime = useRef<number>();
  
  useEffect(() => {
    startTime.current = performance.now();
    
    return () => {
      if (startTime.current) {
        const duration = performance.now() - startTime.current;
        console.log(`⏱️ ${name} took ${duration.toFixed(2)}ms`);
      }
    };
  }, [name]);
}

/**
 * Intersection observer for lazy loading
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<Element | null>(null);
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        setEntry(entry);
      },
      options
    );
    
    observer.observe(element);
    
    return () => observer.disconnect();
  }, [options]);
  
  return { elementRef, isIntersecting, entry };
}

// Import useState for useBatchedUpdates
import { useState } from 'react';