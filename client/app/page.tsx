"use client";

import { useState, useEffect } from "react";
import ReportIssue from "../components/ReportIssue";
import Dashboard from "../components/Dashboard";
import KarmaCard from "../components/KarmaCard";
import MyReports from "../components/MyReports";
import { ThemeToggle } from "../components/ThemeToggle";

export default function Home() {
  const [karma, setKarma] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("civic_karma");
    if (saved) setKarma(parseInt(saved, 10));
    else setKarma(35); // Initial demo score
  }, []);

  const handleReportSuccess = () => {
    const newScore = karma + 10;
    setKarma(newScore);
    localStorage.setItem("civic_karma", newScore.toString());
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 transition-colors duration-300">
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-400 tracking-tight">CivicFlo</h1>
           <p className="text-sm text-gray-600 dark:text-gray-400">Turning Citizen Noise into Civic Intelligence</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">
             AI Powered
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Report & Karma */}
        <div className="space-y-6">
          <section>
             <h2 className="text-lg font-bold mb-2 text-gray-700 dark:text-gray-200">Citizen Actions</h2>
             <ReportIssue onSuccess={handleReportSuccess} />
          </section>
          
          <section>
             <KarmaCard score={karma} />
          </section>
          
          <section>
             <MyReports />
          </section>
        </div>

        {/* Right Column: Dashboard (Map Only) */}
        <section className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
            Live Civic Intelligence Map
          </h2>
          <Dashboard />
        </section>
      </div>
    </main>
  );
}
