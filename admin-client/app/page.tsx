"use client";

import { useState, useEffect } from "react";
import Dashboard from "../components/Dashboard";
import KarmaCard from "../components/KarmaCard";
import { ThemeToggle } from "../components/ThemeToggle";

export default function Home() {
  const [workerScore, setWorkerScore] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("worker_karma");
    if (saved) setWorkerScore(parseInt(saved, 10));
    else setWorkerScore(0);
  }, []);

  const handleReward = (points: number) => {
    const newScore = workerScore + points;
    setWorkerScore(newScore);
    localStorage.setItem("worker_karma", newScore.toString());
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 transition-colors duration-300">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-purple-900 dark:text-purple-400 tracking-tight">CivicFlo Admin</h1>
           <p className="text-sm text-gray-600 dark:text-gray-400">Worker Portal & Issue Management</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-purple-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">
             Staff Access
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-6 md:col-span-1">
          <section>
             <KarmaCard score={workerScore} title="Worker Reputation" />
             <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Instructions</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-disc pl-4">
                  <li>Monitor the Kanban board for new tickets.</li>
                  <li>Move tickets to In Progress when you start working.</li>
                  <li>Move to Fixed to complete and earn points.</li>
                </ul>
             </div>
          </section>
        </div>

        <section className="md:col-span-3">
          <Dashboard onReward={handleReward} />
        </section>
      </div>
    </main>
  );
}
