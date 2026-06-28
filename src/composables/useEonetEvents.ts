import { ref, computed } from 'vue';
import type { EonetEvent } from '@/types/eonet';
import { fetchEvents } from '@/api/eonet';

const CACHE_KEY = 'eonet-cache';

export function useEonetEvents() {
  const events = ref<EonetEvent[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const activeCategories = ref<Set<string>>(new Set());

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: EonetEvent[] = JSON.parse(cached);
      events.value = parsed;
      activeCategories.value = new Set(parsed.flatMap(e => e.categories.map(c => c.id)));
    }
  } catch {}

  const filteredEvents = computed(() =>
    events.value.filter(event =>
      event.categories.some(cat => activeCategories.value.has(cat.id))
    )
  );

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const result: EonetEvent[] = (await fetchEvents({ status: 'open', limit: 1000 })).events;
      events.value = result;
      activeCategories.value = new Set(result.flatMap(e => e.categories.map(c => c.id)));
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load events';
    } finally {
      loading.value = false;
    }
  }

  return { events, filteredEvents, activeCategories, loading, error, load };
}
