import { onBeforeUnmount, onMounted, ref, shallowRef, type Ref } from 'vue';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export function useMapLibre(container: Ref<HTMLElement | undefined>) {
  const map = shallowRef<maplibregl.Map>();
  const mapReady = ref(false);

  onMounted(() => {
    map.value = new maplibregl.Map({
      container: container.value!,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [0, 20],
      zoom: 3,
    });
    map.value.on('style.load', () => {
      map.value!.setProjection({ type: 'globe' });
      mapReady.value = true;
    });
  });

  onBeforeUnmount(() => map.value?.remove());

  return { map, mapReady };
}