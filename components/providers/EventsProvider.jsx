'use client';

import { createContext, useContext, useEffect, useRef } from 'react';

const EventsContext = createContext({ subscribe: () => () => {} });

export default function EventsProvider({ children, channels = [] }) {
  const subscribersRef = useRef(new Set());

  useEffect(() => {
    const url = `/api/events?channels=${encodeURIComponent(channels.join(','))}`;
    const es = new EventSource(url, { withCredentials: true });
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        subscribersRef.current.forEach((cb) => {
          try { cb(data); } catch {}
        });
      } catch {}
    };
    es.onerror = () => {};
    return () => { try { es.close(); } catch {} };
  }, [channels.join(',')]);

  const value = {
    subscribe: (cb) => {
      subscribersRef.current.add(cb);
      return () => subscribersRef.current.delete(cb);
    }
  };

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  return useContext(EventsContext);
}


