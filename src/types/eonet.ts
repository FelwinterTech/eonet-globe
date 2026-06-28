export type EonetGeometry = {
  date: string;
  type: 'Point' | 'Polygon';
  coordinates: number[] | number[][][];
};

export type EonetEvent = {
  id: string;
  title: string;
  description: string;
  link: string;
  categories: { id: string; title: string }[];
  sources: { id: string; url: string }[];
  geometry: EonetGeometry[];
};