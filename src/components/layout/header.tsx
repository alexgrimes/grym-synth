import React, { useState } from 'react';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface HeaderProps {
  className?: string;
  onAddResource?: () => void;
}

export function Header({ className, onAddResource }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('');

  return (
    <header className={`border-b p-4 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <h1 className="text-xl font-semibold">Audio Learning Hub</h1>
        <div className="flex items-center gap-4">
          <SearchBar
            value={searchValue}
            onChange={setSearchValue}
          />
          {onAddResource && (
            <Button onClick={onAddResource} className="ml-4">
              <Plus className="h-5 w-5 mr-2" />
              Add Resource
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}