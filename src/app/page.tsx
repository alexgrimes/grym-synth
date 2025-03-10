import { ChatPanel } from '../components/chat-panel';

export default function Home() {
  return (
    <main className="flex h-screen">
      <div className="flex-1 flex">
        {/* Left side - Resource/URL handling (later) */}
        <div className="w-[600px] border-r bg-white">
          <div className="p-4">
            Future URL/Resource Input
          </div>
        </div>

        {/* Right side - Chat */}
        <div className="flex-1">
          <ChatPanel />
        </div>
      </div>
    </main>
  );
}
