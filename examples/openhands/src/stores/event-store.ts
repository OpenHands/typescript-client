import { create } from 'zustand';
import type { Event } from '@openhands/client';

interface EventStore {
  events: Event[];
  addEvent: (event: Event) => void;
  setEvents: (events: Event[]) => void;
  clearEvents: () => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  setEvents: (events) => set({ events }),
  clearEvents: () => set({ events: [] }),
}));
