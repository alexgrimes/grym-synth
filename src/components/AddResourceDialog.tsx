import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResources } from "@/contexts/ResourceContext";

interface AddResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: { url: string; topics: string[] }) => Promise<void>;
}

export function AddResourceDialog({ 
  open, 
  onOpenChange,
  onSubmit
}: AddResourceDialogProps) {
  const { isLoading } = useResources();
  const [url, setUrl] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({
        url,
        topics: selectedTopics
      });
      onOpenChange(false);
      setUrl('');
      setSelectedTopics([]);
    } catch (error) {
      console.error('Failed to add resource:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Resource</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL"
            type="url"
            required
          />
          {/* TODO: Add topic selection */}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Adding...' : 'Add Resource'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}