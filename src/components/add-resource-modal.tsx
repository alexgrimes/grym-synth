import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

interface AddResourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ResourceSubmission) => Promise<void>;
}

interface ResourceSubmission {
  url: string;
  type: 'book' | 'video' | 'tutorial' | 'documentation';
  category: 'dsp' | 'juce' | 'midi' | 'realtime';
}

export const AddResourceModal = ({ open, onOpenChange, onSubmit }: AddResourceModalProps) => {
  const [url, setUrl] = useState('');
  const [type, setType] = useState<ResourceSubmission['type']>('documentation');
  const [category, setCategory] = useState<ResourceSubmission['category']>('dsp');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit({ url, type, category });
      setUrl('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add resource:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Learning Resource</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="url">Resource URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Resource Type</Label>
            <Select value={type} onValueChange={(value: ResourceSubmission['type']) => setType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documentation">Documentation</SelectItem>
                <SelectItem value="tutorial">Tutorial</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="book">Book</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(value: ResourceSubmission['category']) => setCategory(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dsp">DSP</SelectItem>
                <SelectItem value="juce">JUCE</SelectItem>
                <SelectItem value="midi">MIDI</SelectItem>
                <SelectItem value="realtime">Real-time Audio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Resource
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};