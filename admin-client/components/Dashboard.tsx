'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function Dashboard({ onReward }: { onReward?: (points: number) => void }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapIcon, setMapIcon] = useState<any>(null);
  const STATUSES = ['New', 'In Progress', 'Fixed'];
  const localChangesRef = useRef<Map<string, string>>(new Map());
  const normalizeStatus = (s: string) => {
    const x = (s || '').toLowerCase();
    if (x === 'resolved') return 'Fixed';
    if (x === 'fixed') return 'Fixed';
    if (x === 'inprogress' || x === 'in progress') return 'In Progress';
    return 'New';
  };

  useEffect(() => {
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
      const lc = localChangesRef.current;
      const incoming = Array.isArray(res.data) ? res.data : [];
      const merged = incoming.map((t: any) => {
        const override = lc.get(t.ticketId);
        const status = override ? override : normalizeStatus(t.status);
        return { ...t, status };
      });
      setTickets(merged);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000);
    return () => clearInterval(interval);
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = { New: [], 'In Progress': [], Fixed: [] };
    for (const t of tickets) {
      const key = STATUSES.includes(t.status) ? t.status : normalizeStatus(t.status);
      groups[key].push(t);
    }
    return groups;
  }, [tickets]);

  const updateStatus = async (ticketId: string, nextStatus: string) => {
    const prev = localChangesRef.current.get(ticketId) ?? tickets.find((t) => t.ticketId === ticketId)?.status;
    localChangesRef.current.set(ticketId, nextStatus);
    setTickets((current) => current.map((t) => (t.ticketId === ticketId ? { ...t, status: nextStatus } : t)));
    try {
      const lower = nextStatus === 'Fixed' ? 'resolved' : nextStatus === 'In Progress' ? 'inprogress' : 'new';
      await axios.patch(
        `${API_URL}/tickets/${ticketId}/status`,
        { status: nextStatus },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
      );
      // If server expects lowercase variants, try a second pass silently
      await axios.patch(
        `${API_URL}/tickets/${ticketId}/status`,
        { status: lower },
        { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }
      ).catch(() => {});
    } catch {
      if (prev) localChangesRef.current.set(ticketId, prev);
      setTickets((current) => current.map((t) => (t.ticketId === ticketId ? { ...t, status: prev || 'New' } : t)));
    }
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain');
    const ticket = tickets.find((t) => t.ticketId === ticketId);
    if (!ticket) return;
    const prev = ticket.status;
    await updateStatus(ticketId, status);
    if (status === 'Fixed' && prev !== 'Fixed' && onReward) {
      onReward(50);
    }
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  const center: [number, number] = tickets.length > 0 
    ? [tickets[0].location.coordinates[1], tickets[0].location.coordinates[0]] 
    : [40.7128, -74.0060];

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Issue Kanban</h2>
          <div className="text-xs text-gray-500 dark:text-gray-400">Drag cards to update status</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {STATUSES.map((status) => (
            <div
              key={status}
              className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 min-h-[220px]"
              onDragOver={allowDrop}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{status}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {grouped[status].length}
                </span>
              </div>
              <div className="space-y-2">
                {grouped[status].map((t) => (
                  <div
                    key={t.ticketId}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', t.ticketId);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm cursor-grab"
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">
                        {t.type.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{t.ticketId.slice(0, 6)}…</div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Priority: {t.priorityScore.toFixed(2)}
                    </div>
                    <div className="mt-2">
                      <img
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', t.ticketId);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        src={t.imageUrl.startsWith('http') ? t.imageUrl : `http://localhost:4000${t.imageUrl}`}
                        alt="issue"
                        className="w-full h-20 object-cover rounded"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
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
