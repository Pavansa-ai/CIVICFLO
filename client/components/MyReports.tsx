'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function MyReports() {
  const [ids, setIds] = useState<string[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadIds = () => {
    try {
      const saved = localStorage.getItem('my_reports');
      const list = saved ? JSON.parse(saved) : [];
      setIds(Array.isArray(list) ? list : []);
    } catch {
      setIds([]);
    }
  };

  const fetchTickets = async () => {
    if (!ids.length) {
      setTickets([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/tickets`);
      const mine = res.data.filter((t: any) => ids.includes(t.ticketId));
      setTickets(mine);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIds();
  }, []);

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 10000);
    return () => clearInterval(interval);
  }, [ids]);

  if (!ids.length) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-gray-800 dark:text-white">My Reports</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">No reports yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="font-bold text-gray-800 dark:text-white">My Reports</h3>
      {loading ? (
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">Loading...</div>
      ) : (
        <div className="mt-3 space-y-2">
          {tickets.map((t) => (
            <div key={t.ticketId} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-700">
              <div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 capitalize">{t.type.replace('_',' ')}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">ID: {t.ticketId.slice(0,8)}...</div>
              </div>
              <div className={`text-xs px-2 py-1 rounded font-bold ${
                t.status === 'Fixed'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              }`}>
                {t.status === 'Fixed' ? 'Resolved' : t.status}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
