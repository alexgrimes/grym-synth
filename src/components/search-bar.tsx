import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative flex-1 max-w-xl">
      <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
      <Input
        placeholder="Search resources..."
        className="pl-10 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}