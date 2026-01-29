'use client';

import { useState } from 'react';
import axios from 'axios';
import { Camera, MapPin, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function ReportIssue({ onSuccess }: { onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [ticket, setTicket] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      
      // Auto-get location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            console.error("Error getting location:", error);
            // Fallback location for demo (City center)
             setLocation({ lat: 40.7128, lng: -74.0060 });
          }
        );
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !location) return;

    setLoading(true);
    setStatus('idle');
    setMessage('');

    const formData = new FormData();
    formData.append('image', file);
    formData.append('lat', location.lat.toString());
    formData.append('lng', location.lng.toString());
    formData.append('description', 'User report from PWA');

    try {
      let response;
      try {
        response = await axios.post(`${API_URL}/report`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch {
        const fallbackBody = {
          type: 'pothole',
          description: 'User report from PWA',
          location: { lat: location.lat, lng: location.lng }
        };
        response = await axios.post(`${API_URL}/tickets`, fallbackBody, {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const ticketData = response.data.ticket || response.data;
      setTicket(ticketData);
      setStatus('success');
      setMessage(response.data.message || 'Report submitted successfully');
      try {
        const saved = localStorage.getItem('my_reports');
        const list = saved ? JSON.parse(saved) : [];
        const id = ticketData?.ticketId || ticketData?.id;
        if (id) {
          const updated = Array.from(new Set([...list, id]));
          localStorage.setItem('my_reports', JSON.stringify(updated));
        }
      } catch {}
      
      if (onSuccess) onSuccess();

      // Reset form after delay
      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setTicket(null);
        setStatus('idle');
      }, 5000);

    } catch (error: any) {
      console.error(error);
      setStatus('error');
      setMessage(error.response?.data?.error || error.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-300">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
        <Camera className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        Report Issue
      </h2>

      {status === 'success' ? (
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md text-center">
          <CheckCircle className="w-12 h-12 text-green-500 dark:text-green-400 mx-auto mb-2" />
          <p className="font-semibold text-green-700 dark:text-green-300">{message}</p>
          {ticket && (
             <div className="mt-2 text-sm text-left bg-white dark:bg-gray-700 p-2 rounded border border-green-100 dark:border-green-800 text-gray-800 dark:text-gray-200">
                <p><strong>Type:</strong> {ticket.type}</p>
                <p><strong>Confidence:</strong> {(ticket.aiConfidence * 100).toFixed(1)}%</p>
                <p><strong>Priority:</strong> {ticket.priorityScore.toFixed(2)}</p>
             </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {preview ? (
              <img src={preview} alt="Preview" className="max-h-64 rounded-md object-cover" />
            ) : (
              <>
                <Camera className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Tap to take photo</p>
              </>
            )}
          </div>

          {location && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <MapPin className="w-4 h-4" />
              <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {message}
            </div>
          )}

          <button 
            type="submit" 
            disabled={!file || loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 flex justify-center items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing AI...
              </>
            ) : (
              'Submit Report'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
