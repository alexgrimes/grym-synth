// src/components/layout/main-layout.tsx
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResourceCard } from "@/components/resource-card";
import { Activity, Code, Music2, Binary, Box, Layers, Brain, Workflow, Plus, Search } from 'lucide-react';
import type { Resource } from "@/lib/types";
import { useResources } from "@/contexts/ResourceContext";
import { AddResourceDialog } from "@/components/AddResourceDialog";

interface Topic {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface Category {
  title: string;
  topics: Topic[];
}

interface ExtendedResource extends Resource {
  category: 'dsp' | 'juce' | 'midi' | 'realtime';
  metadata: {
    title: string;
    description: string;
    topics: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime?: string;
  };
}

function isExtendedResource(resource: Resource): resource is ExtendedResource {
  if (!resource || typeof resource !== 'object') return false;
  
  const hasCategory = (
    'category' in resource &&
    typeof resource.category === 'string' &&
    ['dsp', 'juce', 'midi', 'realtime'].includes(resource.category)
  );
  
  const hasMetadata = (
    'metadata' in resource &&
    resource.metadata &&
    typeof resource.metadata === 'object' &&
    'title' in resource.metadata &&
    typeof resource.metadata.title === 'string' &&
    'description' in resource.metadata &&
    typeof resource.metadata.description === 'string' &&
    'topics' in resource.metadata &&
    Array.isArray(resource.metadata.topics) &&
    'difficulty' in resource.metadata &&
    typeof resource.metadata.difficulty === 'string' &&
    ['beginner', 'intermediate', 'advanced'].includes(resource.metadata.difficulty)
  );
  
  return Boolean(hasCategory && hasMetadata);
}

const MainLayout = () => {
  const { resources, isLoading, addResource } = useResources();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddResource = async (submission: {
    url: string;
    topics: string[];
  }) => {
    try {
      await addResource({
        url: submission.url,
        categories: [],
        topics: submission.topics
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Failed to add resource:', error);
    }
  };

  const categories: Category[] = [
    {
      title: "Algorithmic Composition",
      topics: [
        { id: 'stochastic', label: 'Stochastic Processes', icon: <Binary /> },
        { id: 'markov', label: 'Markov Chains', icon: <Workflow /> },
        { id: 'generative', label: 'Generative Systems', icon: <Brain /> }
      ]
    },
    {
      title: "DSP & Spectral",
      topics: [
        { id: 'spectral', label: 'Spectral Analysis', icon: <Activity /> },
        { id: 'granular', label: 'Granular Synthesis', icon: <Layers /> },
        { id: 'convolution', label: 'Convolution', icon: <Box /> }
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {resources?.map((resource: Resource) => (
              isExtendedResource(resource) ? (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                />
              ) : null
            ))}
          </div>
        </ScrollArea>
      </div>
      
      <div className="p-4 border-t">
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Resource
        </Button>
      </div>

      <AddResourceDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddResource}
      />
    </div>
  );
};

export default MainLayout;