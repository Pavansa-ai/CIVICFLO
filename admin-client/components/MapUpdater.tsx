'use client';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}
