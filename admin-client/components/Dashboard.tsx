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
const MapUpdater = dynamic(() => import('./MapUpdater'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function Dashboard({ onReward }: { onReward?: (points: number) => void }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'map' | 'kanban'>('map');
  const [mapIcon, setMapIcon] = useState<any>(null);
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null);

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
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setUserCenter([pos.coords.latitude, pos.coords.longitude]);
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
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
    const interval = setInterval(fetchTickets, 3000);
    return () => clearInterval(interval);
  }, []);

  const center: [number, number] = userCenter
    ? userCenter
    : tickets.length > 0
      ? [tickets[0].location.coordinates[1], tickets[0].location.coordinates[0]]
      : [40.7128, -74.0060];

  const seedData = async () => {
    if (confirm('Add demo data? This will add fake tickets to the system.')) {
      try {
        setLoading(true);
        await axios.post(`${API_URL}/seed`);
        await fetchTickets();
      } catch (error) {
        console.error("Seed failed", error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* View Switcher */}
      <div className="flex justify-end gap-2">
        <button 
          onClick={seedData}
          className="px-3 py-1.5 rounded-md text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 transition border border-purple-200 dark:border-purple-800"
        >
          🌱 Seed Demo Data
        </button>
        <button 
          onClick={() => setView('map')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${view === 'map' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          <MapIcon className="w-4 h-4" />
          Map View
        </button>
        <button 
          onClick={() => { setView('kanban'); fetchTickets(); }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${view === 'kanban' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          <LayoutGrid className="w-4 h-4" />
          Kanban Board
        </button>
      </div>

      {loading ? (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
             <div className="lg:col-span-1 space-y-3">
                 <TicketSkeleton />
                 <TicketSkeleton />
                 <TicketSkeleton />
             </div>
         </div>
      ) : view === 'kanban' ? (
        <KanbanBoard tickets={tickets} onUpdate={fetchTickets} onReward={onReward} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map View */}
          <div className="lg:col-span-2 h-[400px] lg:h-[600px] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm z-0">
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
              <MapUpdater center={center} />
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
                      <span className="text-xs text-gray-600">Votes: {ticket.votes}</span>
                      <br/>
                      <img src={ticket.imageUrl.startsWith('http') ? ticket.imageUrl : `http://localhost:4000${ticket.imageUrl}`} alt="issue" className="w-24 h-24 object-cover mt-1 rounded" />
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Priority List */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 h-[600px] overflow-y-auto transition-colors duration-300">
            <h3 className="text-lg font-bold mb-4 sticky top-0 bg-white dark:bg-gray-800 pb-2 border-b dark:border-gray-700 flex items-center gap-2 text-gray-900 dark:text-white transition-colors duration-300">
              <List className="w-5 h-5 text-gray-500 dark:text-gray-400"/>
              Priority Queue
            </h3>
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div key={ticket.ticketId} className="p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition duration-200">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold capitalize text-gray-800 dark:text-gray-200">{ticket.type.replace('_', ' ')}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      ticket.priorityScore > 0.7 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 
                      ticket.priorityScore > 0.4 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    }`}>
                      {ticket.priorityScore.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Confidence: {(ticket.aiConfidence * 100).toFixed(0)}% • Votes: {ticket.votes}</p>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded">{ticket.status}</span>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && <p className="text-gray-400 dark:text-gray-500 text-center py-4">No issues reported yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
