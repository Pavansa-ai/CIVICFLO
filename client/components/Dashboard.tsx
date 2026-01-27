'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import { Loader2, LayoutGrid, Map as MapIcon, List } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import KanbanBoard from './KanbanBoard';
import { TicketSkeleton } from './Skeleton';

// Dynamic import for Leaflet (SSR fix)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false, loading: () => <div className="h-full w-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" /> });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function Dashboard() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapIcon, setMapIcon] = useState<any>(null);

  useEffect(() => {
    // Client-side only Leaflet setup
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        const icon = L.default.icon({
          iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
          iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
          shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
        setMapIcon(icon);
      });
    }
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API_URL}/tickets`);
      setTickets(res.data);
    } catch (error) {
      console.error("Failed to fetch tickets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const center: [number, number] = tickets.length > 0 
    ? [tickets[0].location.coordinates[1], tickets[0].location.coordinates[0]] 
    : [40.7128, -74.0060]; // Default NY

  return (
    <div className="space-y-4">
      {loading ? (
         <div className="h-[400px] lg:h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      ) : (
        <div className="h-[400px] lg:h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm z-0">
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {tickets.map((ticket) => (
                <Marker 
                  key={ticket.ticketId} 
                  position={[ticket.location.coordinates[1], ticket.location.coordinates[0]]}
                  {...(mapIcon ? { icon: mapIcon } : {})}
                >
                  <Popup>
                    <div className="p-1 text-gray-900">
                      <strong className="block text-sm capitalize">{ticket.type.replace('_', ' ')}</strong>
                      <span className="text-xs text-gray-600">Priority: {ticket.priorityScore.toFixed(2)}</span>
                      <br />
                      <span className="text-xs text-gray-600">Status: {ticket.status}</span>
                      <br/>
                      <img src={ticket.imageUrl.startsWith('http') ? ticket.imageUrl : `http://localhost:4000${ticket.imageUrl}`} alt="issue" className="w-24 h-24 object-cover mt-1 rounded" />
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
        </div>
      )}
    </div>
  );
}
