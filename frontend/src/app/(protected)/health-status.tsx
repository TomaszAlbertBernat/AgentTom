'use client';

import { useHealthQuery, useHealthDetailsQuery } from '@/lib/hooks/useHealth';

export default function HealthStatus() {
  const { data: health, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } = useHealthQuery();
  const { data: healthDetails, isLoading: detailsLoading, isError: detailsError, refetch: refetchDetails } = useHealthDetailsQuery();

  const isLoading = healthLoading || detailsLoading;
  const isError = healthError || detailsError;

  if (isLoading) return <div className="opacity-60">Loading health status...</div>;
  if (isError) return (
    <div className="text-sm text-red-600 flex items-center gap-2">
      Failed to load health status
      <button className="underline text-xs" onClick={() => { refetchHealth(); refetchDetails(); }}>Retry</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">System Health</h2>

      {/* Basic Health Status */}
      <div className="border rounded p-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            health?.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="font-medium">System Status</span>
          <span className={`text-sm px-2 py-1 rounded ${
            health?.status === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {health?.status || 'unknown'}
          </span>
        </div>
      </div>

      {/* Detailed Health Status */}
      {healthDetails && (
        <div className="border rounded p-3">
          <div className="font-medium mb-2">Service Status</div>
          <div className="space-y-2">
            {Object.entries(healthDetails.services || {}).map(([service, status]) => (
              <div key={service} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'connected' || status === 'available' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm capitalize">{service}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  status === 'connected' || status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {status}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t">
            <div className="text-sm opacity-60">
              Auth Mode: <span className="font-medium">{healthDetails.auth_mode || 'unknown'}</span>
            </div>
            <div className="text-sm opacity-60">
              Last Updated: <span className="font-medium">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
