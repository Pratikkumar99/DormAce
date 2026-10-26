import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import ConversationList from '../components/chat/ConversationList.jsx';
import ChatWindow from '../components/chat/ChatWindow.jsx';
import { cx } from '../lib/format.js';

export default function Chat() {
  const { id } = useParams();
  const nav = useNavigate();

  return (
    <div className="card -mx-4 flex h-[calc(100dvh-9.5rem)] overflow-hidden rounded-none border-x-0 dark:border-neutral-800 sm:mx-0 sm:rounded-xl sm:border-x md:h-[calc(100dvh-9rem)]">
      {/* Conversations sidebar */}
      <aside
        className={cx(
          'w-full shrink-0 overflow-y-auto border-r border-neutral-200 dark:border-neutral-800 md:block md:w-80 lg:w-96',
          id && 'hidden'
        )}
      >
        <div className="sticky top-0 border-b border-neutral-200 bg-white px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="font-semibold text-neutral-900 dark:text-neutral-100">
            Messages
          </h1>
        </div>

        <ConversationList activeId={id} />
      </aside>

      {/* Chat area */}
      <section className={cx('min-w-0 flex-1', !id && 'hidden md:block')}>
        {id ? (
          <ChatWindow
            key={id}
            id={id}
            onBack={() => nav('/chat')}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-white text-neutral-400 dark:bg-neutral-950 dark:text-neutral-500">
            <MessageCircle
              className="h-10 w-10"
              strokeWidth={1.2}
            />
            <p className="mt-3 text-sm">
              Select a conversation
            </p>
          </div>
        )}
      </section>
    </div>
  );
}