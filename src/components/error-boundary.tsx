import { useState } from 'react';
import { Button } from './ui/button';

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700">
        <h3 className="font-medium mb-2">Something went wrong</h3>
        <Button 
          onClick={() => setError(null)}
          variant="destructive"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return children;
}