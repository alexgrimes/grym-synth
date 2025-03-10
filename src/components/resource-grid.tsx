'use client';

import { Resource } from '@shared/types';
import { ResourceCard } from './resource-card';

interface ResourceGridProps {
  resources: Resource[];
  onResourceClick?: (resource: Resource) => void;
}

export function ResourceGrid({ resources, onResourceClick }: ResourceGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onClick={() => onResourceClick?.(resource)}
        />
      ))}
    </div>
  );
}