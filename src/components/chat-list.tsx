"use client";

import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import type { StoredChat } from '../lib/storage/chat-storage';

interface ChatListProps {
  chats: StoredChat[];
  currentChat: StoredChat;
  onChatSelect: (chat: StoredChat) => void;
}

export function ChatList({ chats, currentChat, onChatSelect }: ChatListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Chats</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {chats.map((chat) => (
            <Button
              key={chat.id}
              variant={chat.id === currentChat.id ? 'default' : 'ghost'}
              className="w-full justify-start text-left"
              onClick={() => onChatSelect(chat)}
            >
              <div className="truncate">
                {chat.messages.length > 0
                  ? chat.messages[0].content.slice(0, 30) + '...'
                  : 'New conversation'}
              </div>
              <div className="text-xs opacity-50 mt-1">
                {new Date(chat.messages[0]?.timestamp ?? Date.now()).toLocaleString()}
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
