import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Resource } from "@/lib/types";

interface ResourceCardProps {
  resource: Resource & {
    category: string;
    metadata: {
      title: string;
      description: string;
      topics: string[];
    };
  };
}

export const ResourceCard = ({ resource }: ResourceCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardHeader>
      <CardTitle className="text-lg">{resource.metadata.title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-600 mb-3">{resource.metadata.description}</p>
      <div className="flex flex-wrap gap-2">
        <Badge>{resource.category}</Badge>
        {resource.metadata.topics.map(topic => (
          <Badge key={topic} variant="outline">{topic}</Badge>
        ))}
      </div>
    </CardContent>
  </Card>
);