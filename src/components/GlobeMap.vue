<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import { useMapLibre } from '@/composables/useMapLibre';
import { useEonetEvents } from '@/composables/useEonetEvents';
import { toGeoJson } from '@/utils/geojson';
import maplibregl from 'maplibre-gl';
import forestPng from '@/assets/events/forest.png';
import volcanicPng from '@/assets/events/volcanic.png';
import stormPng from '@/assets/events/storm.png';
import floodPng from '@/assets/events/flood.png';
import earthquakePng from '@/assets/events/earthquake.png';
import landslidePng from '@/assets/events/landslide.png';
import icebergPng from '@/assets/events/iceberg.png';

const categoryImages: Record<string, string> = {
  wildfires:    forestPng,
  volcanoes:    volcanicPng,
  severeStorms: stormPng,
  floods:       floodPng,
  earthquakes:  earthquakePng,
  landslides:   landslidePng,
  seaLakeIce:   icebergPng,
};

const mapContainer = ref<HTMLElement>();
const showCredits = ref(false);

const panelOpen = ref(true);
const panelPos = ref({ x: 16, y: 16 });
const dragOffset = ref({ x: 0, y: 0 });

function onDragMove(e: MouseEvent) {
  panelPos.value = { x: e.clientX - dragOffset.value.x, y: e.clientY - dragOffset.value.y };
}

function onDragEnd() {
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
}

function onDragStart(e: MouseEvent) {
  dragOffset.value = { x: e.clientX - panelPos.value.x, y: e.clientY - panelPos.value.y };
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
}
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
});

const { map, mapReady } = useMapLibre(mapContainer);
const { events, filteredEvents, activeCategories, loading, error, load } = useEonetEvents();

const isGlobe = ref(true);
function toggleProjection() {
  if (!map.value) return;
  isGlobe.value = !isGlobe.value;
  map.value.setProjection({ type: isGlobe.value ? 'globe' : 'mercator' });
}

const categories = computed(() =>
  [...new Map(
    events.value.flatMap(event => event.categories.map(category => [category.id, category]))
  ).values()]
);
load();

function toggleCategory(id: string) {
  if (activeCategories.value.has(id)) {
    activeCategories.value.delete(id);
  } else {
    activeCategories.value.add(id);
  }
  activeCategories.value = new Set(activeCategories.value);
}

let layersSetUp = false;
let activePopup: maplibregl.Popup | null = null;
let featureClicked = false;

function wildfireGeoJson(val = filteredEvents.value) {
  return toGeoJson(val.filter(e => e.categories.some(c => c.id === 'wildfires')));
}
function otherGeoJson(val = filteredEvents.value) {
  return toGeoJson(val.filter(e => e.categories.every(c => c.id !== 'wildfires')));
}

function updateSources() {
  (map.value!.getSource('eonet-wildfires') as maplibregl.GeoJSONSource)?.setData(wildfireGeoJson());
  (map.value!.getSource('eonet-others') as maplibregl.GeoJSONSource)?.setData(otherGeoJson());
}

function showPopup(coordinates: [number, number], title: string, category: string) {
  featureClicked = true;
  setTimeout(() => { featureClicked = false; }, 0);
  activePopup?.remove();
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(title)}`;
  activePopup = new maplibregl.Popup()
    .setLngLat(coordinates)
    .setHTML(`<strong>${title}</strong><div class="popup-category">${category}</div><a class="popup-search-link" href="${googleUrl}" target="_blank" rel="noopener"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 20 20" fill="currentColor" style="display:inline;vertical-align:-1px;margin-right:4px"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>Search on Google</a>`)
    .addTo(map.value!);
  activePopup.on('close', () => { activePopup = null; });
}

// Set up layers once — fires when map is ready AND we have events
watch([mapReady, filteredEvents] as const, async ([ready, val]) => {
  if (!ready || !val.length || layersSetUp) return;
  layersSetUp = true;

  await Promise.all(
    Object.entries(categoryImages).map(async ([id, url]) => {
      if (map.value!.hasImage(id)) return;
      const { data } = await map.value!.loadImage(url);
      map.value!.addImage(id, data);
    })
  );

  // Wildfire source — clustered
  map.value!.addSource('eonet-wildfires', {
    type: 'geojson',
    data: wildfireGeoJson(val),
    cluster: true,
    clusterMaxZoom: 8,
    clusterRadius: 50,
  });

  // All other events — no clustering
  map.value!.addSource('eonet-others', {
    type: 'geojson',
    data: otherGeoJson(val),
  });

  // Wildfire cluster circles
  map.value!.addLayer({
    id: 'wildfire-clusters',
    type: 'circle',
    source: 'eonet-wildfires',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step', ['get', 'point_count'],
        '#fb923c', 20, '#f97316', 100, '#ea580c',
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        12, 20, 16, 100, 20,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#000',
    },
  });

  // Wildfire cluster count label
  map.value!.addLayer({
    id: 'wildfire-cluster-count',
    type: 'symbol',
    source: 'eonet-wildfires',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': 13,
    },
    paint: { 'text-color': '#000' },
  });

  // Unclustered wildfire icons
  map.value!.addLayer({
    id: 'wildfire-points',
    type: 'symbol',
    source: 'eonet-wildfires',
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': 'wildfires',
      'icon-size': 0.06,
      'icon-allow-overlap': true,
    },
  });

  // Other event icons (no clustering)
  map.value!.addLayer({
    id: 'eonet-points',
    type: 'symbol',
    source: 'eonet-others',
    layout: {
      'icon-image': ['get', 'category'],
      'icon-size': 0.06,
      'icon-allow-overlap': true,
    },
  });

  // Wildfire cluster click → zoom in
  map.value!.on('click', 'wildfire-clusters', async (e) => {
    const features = map.value!.queryRenderedFeatures(e.point, { layers: ['wildfire-clusters'] });
    if (!features.length) return;
    const clusterId = features[0].properties!.cluster_id as number;
    const source = map.value!.getSource('eonet-wildfires') as maplibregl.GeoJSONSource;
    const zoom = await source.getClusterExpansionZoom(clusterId);
    map.value!.easeTo({
      center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
      zoom,
    });
  });

  // Unclustered wildfire click → popup
  map.value!.on('click', 'wildfire-points', (e) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const { title, category } = feature.properties as { title: string; category: string };
    showPopup((feature.geometry as GeoJSON.Point).coordinates as [number, number], title, category);
  });

  // Other event click → popup
  map.value!.on('click', 'eonet-points', (e) => {
    const feature = e.features?.[0];
    if (!feature) return;
    const { title, category } = feature.properties as { title: string; category: string };
    showPopup((feature.geometry as GeoJSON.Point).coordinates as [number, number], title, category);
  });

  // Close popup when clicking empty map space
  map.value!.on('click', () => {
    if (!featureClicked) activePopup?.remove();
  });

  for (const layer of ['wildfire-clusters', 'wildfire-points', 'eonet-points']) {
    map.value!.on('mouseenter', layer, () => { map.value!.getCanvas().style.cursor = 'pointer'; });
    map.value!.on('mouseleave', layer, () => { map.value!.getCanvas().style.cursor = ''; });
  }
}, { immediate: true });

// Update sources when filter or fresh fetch changes after setup
watch(filteredEvents, () => {
  if (!layersSetUp) return;
  updateSources();
});
</script>
<template>
  <div class="relative w-full h-full" @click="showCredits = false">
    <div ref="mapContainer" class="w-full h-full" />

    <!-- Draggable filter panel -->
    <div
      class="fixed z-20 bg-amber-50 rounded-2xl border-2 border-black shadow-[4px_4px_0px_black] w-52 select-none"
      :style="{ left: panelPos.x + 'px', top: panelPos.y + 'px' }"
    >
      <div
        @mousedown="onDragStart"
        class="flex items-center justify-between px-3 py-2 bg-sky-400 rounded-t-2xl border-b-2 border-black cursor-grab active:cursor-grabbing"
        :class="{ 'rounded-b-2xl': !panelOpen }"
      >
        <span class="text-sm font-black text-black tracking-wide">Filters</span>
        <button
          @mousedown.stop
          @click="panelOpen = !panelOpen"
          class="text-black/60 hover:text-black leading-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 transition-transform" :class="{ 'rotate-180': panelOpen }" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <div v-if="panelOpen" class="flex flex-col gap-0.5 p-2 max-h-80 overflow-y-auto">
        <!-- Loading -->
        <div v-if="loading && !events.length" class="flex items-center justify-center gap-2 py-4 text-sm text-gray-600 font-semibold">
          <svg class="animate-spin w-4 h-4 text-sky-500 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </div>

        <!-- Error -->
        <div v-else-if="error" class="flex flex-col gap-2 py-2 px-1">
          <p class="text-xs font-bold text-red-700 wrap-break-word">{{ error }}</p>
          <button
            @click="load()"
            class="text-xs font-black bg-sky-400 hover:bg-sky-500 border-2 border-black shadow-[2px_2px_0px_black] px-2 py-1 rounded-xl transition-colors"
          >
            Retry
          </button>
        </div>

        <!-- Empty -->
        <p v-else-if="categories.length === 0" class="py-4 text-center text-sm text-gray-500 font-semibold">
          No events found
        </p>

        <!-- Category list -->
        <template v-else>
          <label
            v-for="cat in categories"
            :key="cat.id"
            class="flex items-center gap-2 px-2 py-1.5 rounded-xl text-sm font-bold text-gray-900 cursor-pointer hover:bg-amber-100 transition-colors"
          >
            <input
              type="checkbox"
              :checked="activeCategories.has(cat.id)"
              @change="toggleCategory(cat.id)"
              class="accent-sky-500 shrink-0 w-4 h-4"
            />
            <img
              v-if="categoryImages[cat.id]"
              :src="categoryImages[cat.id]"
              class="w-5 h-5 shrink-0"
            />
            {{ cat.title }}
          </label>
        </template>
      </div>
    </div>

    <button
      @click.stop="toggleProjection"
      class="absolute bottom-10 left-2 z-10 bg-amber-50 hover:bg-amber-100 text-black font-bold text-xs px-2 py-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_black] cursor-pointer transition-colors"
    >
      {{ isGlobe ? 'Flat map' : 'Globe' }}
    </button>

    <button
      @click.stop="showCredits = !showCredits"
      class="absolute bottom-10 right-2 z-10 bg-amber-50 hover:bg-amber-100 text-black font-bold text-xs px-2 py-1 rounded-xl border-2 border-black shadow-[2px_2px_0px_black] cursor-pointer transition-colors"
    >
      Icon credits
    </button>

    <div
      v-if="showCredits"
      @click.stop
      class="absolute bottom-14 right-2 z-10 bg-amber-50 text-gray-900 text-xs rounded-2xl border-2 border-black shadow-[4px_4px_0px_black] p-3 w-64"
    >
      <p class="font-black text-sm mb-2">Icon Credits</p>
      <ul class="space-y-1">
        <li><a href="https://www.flaticon.com/free-icons/wildfire" target="_blank" rel="noopener" class="font-semibold underline hover:text-sky-600">Wildfire — Freepik / Flaticon</a></li>
        <li><a href="https://www.flaticon.com/free-icons/volcano" target="_blank" rel="noopener" class="font-semibold underline hover:text-sky-600">Volcano — Freepik / Flaticon</a></li>
        <li><a href="https://www.flaticon.com/free-icons/tornado" target="_blank" rel="noopener" class="font-semibold underline hover:text-sky-600">Storm — Freepik / Flaticon</a></li>
        <li><a href="https://www.flaticon.com/free-icons/flood" target="_blank" rel="noopener" class="font-semibold underline hover:text-sky-600">Flood — Freepik / Flaticon</a></li>
        <li><a href="https://www.flaticon.com/free-icons/earthquake" target="_blank" rel="noopener" class="font-semibold underline hover:text-sky-600">Earthquake — Freepik / Flaticon</a></li>
        <li><a href="https://www.flaticon.com/free-icons/landslide" target="_blank" rel="noopener" class="font-semibold underline hover:text-sky-600">Landslide — Freepik / Flaticon</a></li>
        <li><a href="https://www.flaticon.com/free-icons/iceberg" target="_blank" rel="noopener" class="font-semibold underline hover:text-sky-600">Sea & Lake Ice — Freepik / Flaticon</a></li>
        <li><a href="https://www.flaticon.com/free-icons/drought" target="_blank" rel="noopener" class="font-semibold underline hover:text-sky-600">Drought — Freepik / Flaticon</a></li>
        <li><a href="https://www.flaticon.com/free-icons/global" target="_blank" rel="noopener" class="font-semibold underline hover:text-sky-600">Global icons created by Freepik - Flaticon</a></li>
      </ul>
    </div>
  </div>
</template>

<style>
.maplibregl-popup-content {
  background: #fffbeb;
  border: 2px solid #000;
  border-radius: 16px;
  box-shadow: 4px 4px 0 #000;
  padding: 10px 32px 10px 14px;
  font-weight: 600;
  color: #111;
  min-width: 140px;
}

.maplibregl-popup-close-button {
  font-size: 1.1rem;
  font-weight: 900;
  color: #000;
  padding: 2px 8px;
}

.maplibregl-popup-tip {
  border-top-color: #000 !important;
  border-bottom-color: #000 !important;
}

.popup-category {
  font-size: 0.8rem;
  font-weight: 600;
  color: #555;
  margin-top: 2px;
}

.popup-search-link {
  display: inline-block;
  margin-top: 10px;
  padding: 4px 10px;
  background: #38bdf8;
  border: 2px solid #000;
  border-radius: 20px;
  box-shadow: 2px 2px 0 #000;
  font-size: 0.75rem;
  font-weight: 800;
  color: #000;
  text-decoration: none;
  transition: background 0.15s;
}

.popup-search-link:hover {
  background: #0ea5e9;
}
</style>
