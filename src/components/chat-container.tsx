"use client";

import { ChatPanel } from './chat-panel';

export function ChatContainer() {
  return (
    <div className="h-full flex flex-col">
      <ChatPanel />
    </div>
  );
}
