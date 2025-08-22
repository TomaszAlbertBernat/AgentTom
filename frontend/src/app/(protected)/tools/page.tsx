import { Suspense } from 'react';
import ToolsList from './tools-list';

export default async function ToolsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tools</h1>
      <Suspense>
        {/* Client list with React Query */}
        <ToolsList />
      </Suspense>
    </div>
  );
}


