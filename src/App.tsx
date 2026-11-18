import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DownloadCloud } from 'lucide-react';
import { MeshBackground } from './components/MeshBackground';
import { TitleBar } from './components/TitleBar';
import { NavRail } from './components/NavRail';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ChatArea } from './components/ChatArea';
import { SettingsView } from './components/SettingsView';
import { NotificationToast } from './components/NotificationToast';
import { AuthScreen } from './components/AuthScreen';
import { NewConversationModal } from './components/NewConversationModal';
import { CallOverlay } from './components/CallOverlay';
import { ProfileModal } from './components/ProfileModal';
import { useChatStore } from './store/useChatStore';

export const App: React.FC = () => {
  const activeTab = useChatStore((s) => s.activeTab);
  const session = useChatStore((s) => s.session);
  const initializeApp = useChatStore((s) => s.initializeApp);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const setSelfStatus = useChatStore((s) => s.setSelfStatus);
  const setWindowFocused = useChatStore((s) => s.setWindowFocused);
  const updateStatus = useChatStore((s) => s.updateStatus);
  const setUpdateStatus = useChatStore((s) => s.setUpdateStatus);
  const installUpdate = useChatStore((s) => s.installUpdate);

  useEffect(() => {
    void initializeApp();

    const unsubNotif = window.lemchat?.onNotificationClicked((conversationId) => {
      void selectConversation(conversationId);
    });

    const unsubTrayStatus = window.lemchat?.onStatusChangedFromTray((status) => {
      void setSelfStatus(status, false);
    });

    const unsubFocus = window.lemchat?.onWindowFocusChange((focused) => {
      setWindowFocused(focused);
    });

    const unsubUpdate = window.lemchat?.onUpdateStatus?.((payload) => {
      setUpdateStatus(payload);
    });

    return () => {
      unsubNotif?.();
      unsubTrayStatus?.();
      unsubFocus?.();
      unsubUpdate?.();
    };
  }, [initializeApp, selectConversation, setSelfStatus, setWindowFocused, setUpdateStatus]);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden rounded-[14px] border border-white/15">
      <MeshBackground />
      <TitleBar />
      <NotificationToast />
      <NewConversationModal />
      <CallOverlay />
      <ProfileModal />

      <AnimatePresence>
        {updateStatus.status === 'downloaded' && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass-panel glass-surface fixed left-1/2 top-12 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full px-4 py-2 text-xs ring-1 ring-[#22C55E]/50"
          >
            <DownloadCloud className="h-4 w-4 text-[#22C55E]" />
            <span className="font-medium text-emerald-950 dark:text-white">
              SkellyTalk {updateStatus.version ? `v${updateStatus.version}` : ''} is ready to install
            </span>
            <button
              onClick={installUpdate}
              className="rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981] px-3 py-1 text-[11px] font-bold text-white shadow-lem-glow-sm hover:brightness-110"
            >
              Restart &amp; Update
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {!session ? (
        <AuthScreen />
      ) : (
        <main className="relative z-10 flex min-h-0 flex-1 gap-3 px-3 pb-3">
          <NavRail />
          {activeTab !== 'settings' && <ConversationSidebar />}
          {activeTab === 'settings' ? <SettingsView /> : <ChatArea />}
        </main>
      )}
    </div>
  );
};

export default App;
