import { useState } from 'react';
import axios from 'axios';
import { Loader2, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface Ticket {
  ticketId: string;
  type: string;
  status: string;
  priorityScore: number;
  imageUrl: string;
  votes: number;
}

interface Props {
  tickets: Ticket[];
  onUpdate: () => void;
  onReward?: (points: number) => void;
}

const COLUMNS = ['Received', 'Verifying', 'In Progress', 'Fixed'];

export default function KanbanBoard({ tickets, onUpdate, onReward }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const moveTicket = async (ticketId: string, currentStatus: string) => {
    const currentIndex = COLUMNS.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === COLUMNS.length - 1) return;

    const nextStatus = COLUMNS[currentIndex + 1];
    setLoadingId(ticketId);

    try {
      const res = await axios.put(`${API_URL}/tickets/${ticketId}/status`, { status: nextStatus });
      if (res.data.rewardPoints && onReward) {
        onReward(res.data.rewardPoints);
      }
      onUpdate();
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const colTickets = tickets.filter(t => t.status === col);
        
        return (
          <div key={col} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 min-w-[250px] flex flex-col h-[500px] transition-colors duration-300">
            <h4 className="font-bold text-gray-700 dark:text-gray-200 mb-3 flex justify-between items-center">
              {col}
              <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                {colTickets.length}
              </span>
            </h4>
            
            <div className="flex-1 overflow-y-auto space-y-3">
              {colTickets.map(ticket => (
                <div key={ticket.ticketId} className="bg-white dark:bg-gray-700 p-3 rounded shadow-sm border border-gray-200 dark:border-gray-600 transition-colors duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold capitalize text-sm text-gray-900 dark:text-white">{ticket.type.replace('_', ' ')}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                       ticket.priorityScore > 0.7 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 
                       ticket.priorityScore > 0.4 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    }`}>
                      {ticket.priorityScore.toFixed(2)}
                    </span>
                  </div>
                  
                  <img src={ticket.imageUrl.startsWith('http') ? ticket.imageUrl : `http://localhost:4000${ticket.imageUrl}`} className="w-full h-24 object-cover rounded mb-2 bg-gray-50 dark:bg-gray-600" />
                  
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{ticket.votes} Votes</span>
                    
                    {col !== 'Fixed' && (
                      <button 
                        onClick={() => moveTicket(ticket.ticketId, ticket.status)}
                        disabled={loadingId === ticket.ticketId}
                        className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                      >
                        {loadingId === ticket.ticketId ? <Loader2 className="w-3 h-3 animate-spin"/> : <ArrowRight className="w-3 h-3"/>}
                        Next
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {colTickets.length === 0 && (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed border-gray-200 dark:border-gray-600 rounded">
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
