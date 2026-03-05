import { X, SquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatHeaderProps {
  onNewChat: () => void;
  onClose: () => void;
}

export function ChatHeader({ onNewChat, onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-gray-600 to-gray-700 rounded-t-lg">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-white">Shop Helper</h3>
      </div>
      <div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onNewChat}
          className="h-8 w-8 text-white hover:bg-gray-600"
        >
          <SquarePlus className="h-4 w-4 text-white" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 text-white hover:bg-gray-600"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
