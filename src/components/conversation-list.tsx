"use client";

import type { Conversation } from '../lib/storage/types';

export function ConversationList({ 
  conversations, 
  currentId, 
  onSelect 
}: { 
  conversations: Conversation[];
  currentId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="border-r w-64 p-4">
      <div className="space-y-2">
        {conversations.map(conversation => {
          const activeModel = conversation.models.responder;
          const timestamp = new Date(conversation.updatedAt).toLocaleDateString();
          
          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={`w-full text-left p-3 rounded-lg ${
                conversation.id === currentId 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{conversation.title}</div>
              <div className="text-sm text-gray-500">
                Responder: {activeModel}
              </div>
              <div className="text-xs text-gray-400">{timestamp}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
