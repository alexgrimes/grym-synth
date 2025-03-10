import { BookOpen, Code, Music, Clock, Settings } from 'lucide-react';
import { Button } from '../ui/button';

export function Sidebar() {
  return (
    <div className="w-16 bg-white border-r flex flex-col items-center py-4">
      <Button variant="ghost" size="icon" className="mb-4">
        <BookOpen className="h-6 w-6 text-gray-700" />
      </Button>
      <Button variant="ghost" size="icon" className="mb-4">
        <Code className="h-6 w-6 text-gray-700" />
      </Button>
      <Button variant="ghost" size="icon" className="mb-4">
        <Music className="h-6 w-6 text-gray-700" />
      </Button>
      <Button variant="ghost" size="icon" className="mt-auto">
        <Settings className="h-6 w-6 text-gray-700" />
      </Button>
    </div>
  );
}