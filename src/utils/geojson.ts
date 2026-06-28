import type { EonetEvent } from '@/types/eonet';
import type { FeatureCollection, Geometry } from 'geojson';

export function toGeoJson(events: EonetEvent[]): FeatureCollection<Geometry> {
  return {
    type: 'FeatureCollection',
    features: events.map(event => {
      const latest = event.geometry[event.geometry.length -1];
      return {
        type: 'Feature',
        geometry: {
          type: latest.type,
          coordinates: latest.coordinates,
        } as Geometry,
        properties: {
          id: event.id,
          title: event.title,
          category: event.categories[0]?.id ?? '',
          sources: JSON.stringify(event.sources),
        },
      };
    }),
  };
}
