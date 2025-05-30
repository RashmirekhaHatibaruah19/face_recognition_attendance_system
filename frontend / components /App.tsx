/** @jsxImportSource https://esm.sh/react@18.2.0 */
import React, { useState, useEffect } from "https://esm.sh/react@18.2.0";
import type { AttendanceStats } from "../../shared/types.ts";

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      // Try to use initial data first
      const initialData = (window as any).__INITIAL_DATA__;
      if (initialData && !stats) {
        setStats(initialData);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/attendance/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setError(null);
      } else {
        setError('Failed to load statistics');
      }
    } catch (err) {
      setError('Error loading statistics');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed top-4 left-4 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg shadow">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading system data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed top-4 left-4 bg-red-100 text-red-800 px-4 py-2 rounded-lg shadow">
        <div className="flex items-center space-x-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border max-w-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">System Status</h3>
      
      {stats && (
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Total Users:</span>
            <span className="font-medium">{stats.total_users}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Present Today:</span>
            <span className="font-medium text-green-600">{stats.present_today}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Check-ins Today:</span>
            <span className="font-medium text-blue-600">{stats.total_checkins_today}</span>
          </div>
          
          {stats.recent_checkins.length > 0 && (
            <div className="border-t pt-2 mt-2">
              <p className="font-medium mb-1">Recent Activity:</p>
              <div className="space-y-1">
                {stats.recent_checkins.slice(0, 3).map((checkin, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="truncate mr-2">{checkin.user_name}</span>
                    <span className="text-gray-500">
                      {new Date(checkin.check_in_time).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="border-t pt-2 mt-2 text-center">
            <button 
              onClick={loadStats}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
