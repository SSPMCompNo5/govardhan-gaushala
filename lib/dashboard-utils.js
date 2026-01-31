// Performance optimization utilities for dashboard pages
// Provides caching, debouncing, and memoization helpers

// Simple in-memory cache with TTL
const cache = new Map();

export function getCached(key, ttlMs = 30000) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < ttlMs) {
        return entry.data;
    }
    return null;
}

export function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(key) {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
}

// Debounce function for search inputs
export function debounce(fn, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

// Throttle function for scroll events
export function throttle(fn, limit = 100) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Fetch with caching and abort support
export async function fetchWithCache(url, options = {}, ttlMs = 30000) {
    const cacheKey = `${url}:${JSON.stringify(options)}`;

    // Check cache first
    const cached = getCached(cacheKey, ttlMs);
    if (cached) {
        return cached;
    }

    try {
        const res = await fetch(url, {
            ...options,
            cache: 'no-store',
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setCache(cacheKey, data);
        return data;
    } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        throw error;
    }
}

// Batch multiple API calls with Promise.allSettled for resilience
export async function batchFetch(requests, ttlMs = 30000) {
    const results = await Promise.allSettled(
        requests.map(req =>
            fetchWithCache(req.url, req.options || {}, ttlMs)
                .catch(() => req.fallback || null)
        )
    );

    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        return requests[index].fallback || null;
    });
}

// Skeleton loader helper
export function SkeletonCard({ className = '', lines = 3 }) {
    return (
        <div className={`animate-pulse ${className}`}>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            {[...Array(lines)].map((_, i) => (
                <div key={i} className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-2" style={{ width: `${80 - i * 10}%` }}></div>
            ))}
        </div>
    );
}

// Format date helper (avoids repeated date parsing)
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export function formatDate(date) {
    if (!date) return '-';
    try {
        return dateFormatter.format(new Date(date));
    } catch {
        return '-';
    }
}

export function formatDateTime(date) {
    if (!date) return '-';
    try {
        return dateTimeFormatter.format(new Date(date));
    } catch {
        return '-';
    }
}

// Number formatter
const numberFormatter = new Intl.NumberFormat('en-IN');

export function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return numberFormatter.format(num);
}
