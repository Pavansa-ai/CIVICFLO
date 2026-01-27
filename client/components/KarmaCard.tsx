import { Trophy, Star, TrendingUp } from 'lucide-react';

interface Props {
  score: number;
}

export default function KarmaCard({ score }: Props) {
  // Determine rank based on score
  let rank = "Citizen Observer";
  let color = "text-gray-600 dark:text-gray-300";
  let bg = "bg-gray-100 dark:bg-gray-700";

  if (score >= 50) {
    rank = "Urban Guardian";
    color = "text-purple-600 dark:text-purple-300";
    bg = "bg-purple-100 dark:bg-purple-900/30";
  } else if (score >= 20) {
    rank = "Community Hero";
    color = "text-blue-600 dark:text-blue-300";
    bg = "bg-blue-100 dark:bg-blue-900/30";
  } else if (score >= 5) {
    rank = "Active Reporter";
    color = "text-green-600 dark:text-green-300";
    bg = "bg-green-100 dark:bg-green-900/30";
  }

  // Calculate progress to next level (simple logic)
  const nextLevel = score < 5 ? 5 : score < 20 ? 20 : 50;
  const progress = Math.min(100, (score / nextLevel) * 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-full ${bg}`}>
          <Trophy className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">Civic Karma</h3>
          <p className={`text-xs font-semibold ${color}`}>{rank}</p>
        </div>
        <div className="ml-auto text-right">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{score}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 block">pts</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Progress to next rank</span>
          <span>{score} / {nextLevel}</span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <div className="flex-shrink-0 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded text-[10px] flex items-center gap-1 text-yellow-700 dark:text-yellow-300">
           <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
           First Report
        </div>
        <div className="flex-shrink-0 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded text-[10px] flex items-center gap-1 text-green-700 dark:text-green-300">
           <TrendingUp className="w-3 h-3" />
           Top Contributor
        </div>
      </div>
    </div>
  );
}
