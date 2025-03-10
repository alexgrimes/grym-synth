'use client';

import { useResourceContext } from '@/context/resource-context';
import { UrlInput } from './url-input';
import { Resource } from '@shared/types';

export function ResourceSidebar() {
  const { resources, selectedResource, addResource, selectResource } = useResourceContext();

  const handleUrlProcessed = (resource: Resource) => {
    addResource(resource);
  };

  return (
    <div className="h-[calc(100vh-64px)] overflow-y-auto p-6 border-r">
      <h2 className="text-xl font-semibold mb-6">Resources</h2>
      
      <div className="mb-6">
        <UrlInput onProcessed={handleUrlProcessed} />
      </div>

      <div className="space-y-2">
        {resources.map(resource => (
          <button
            key={resource.url}
            onClick={() => selectResource(resource)}
            className={`w-full text-left p-2 rounded-lg hover:bg-muted transition-colors ${
              selectedResource?.url === resource.url ? 'bg-muted' : ''
            }`}
          >
            <h3 className="font-medium">{resource.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {resource.summary}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}