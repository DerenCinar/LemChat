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
import { AttachmentViewer } from './components/AttachmentViewer';
import { useChatStore } from './store/useChatStore';

export const App: React.FC = () => {
  const activeTab = useChatStore((s) => s.activeTab);
  const mobileChatOpen = useChatStore((s) => s.mobileChatOpen);
  const session = useChatStore((s) => s.session);
  const initializeApp = useChatStore((s) => s.initializeApp);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const setSelfStatus = useChatStore((s) => s.setSelfStatus);
  const setWindowFocused = useChatStore((s) => s.setWindowFocused);
  const updateStatus = useChatStore((s) => s.updateStatus);
  const setUpdateStatus = useChatStore((s) => s.setUpdateStatus);

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
    <div className="relative flex h-[100dvh] w-screen flex-col overflow-hidden md:rounded-[14px] md:border md:border-white/15">
      <MeshBackground />
      <TitleBar />
      <NotificationToast />
      <NewConversationModal />
      <CallOverlay />
      <ProfileModal />
      <AttachmentViewer />

      <AnimatePresence>
        {(updateStatus.status === 'downloading' ||
          updateStatus.status === 'downloaded' ||
          updateStatus.status === 'installing') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#090F0C]/88 backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-panel glass-surface mx-4 flex w-full max-w-sm flex-col items-center rounded-3xl px-8 py-10 text-center ring-1 ring-[#22C55E]/35"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow"
              >
                <DownloadCloud className="h-6 w-6" />
              </motion.div>
              <h2 className="text-lg font-bold text-emerald-950 dark:text-white">
                {updateStatus.status === 'installing' ? 'Applying update...' : 'Updating SkellyTalk'}
              </h2>
              <p className="mt-2 text-xs text-emerald-800/70 dark:text-emerald-200/65">
                {updateStatus.version ? `Version ${updateStatus.version}` : 'Downloading the latest version'}
              </p>
              {updateStatus.status === 'downloading' && (
                <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#22C55E] to-[#10B981]"
                    animate={{ width: `${Math.max(4, updateStatus.progress ?? 0)}%` }}
                  />
                </div>
              )}
              {updateStatus.status === 'downloading' && (
                <p className="mt-2 text-[11px] font-semibold text-[#22C55E]">
                  {Math.round(updateStatus.progress ?? 0)}%
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!session ? (
        <AuthScreen />
      ) : (
        <main className="relative z-10 flex min-h-0 flex-1 flex-col gap-2 px-2 pb-2 md:flex-row md:gap-3 md:px-3 md:pb-3">
          <div
            className={`order-last shrink-0 md:order-first ${
              mobileChatOpen && activeTab !== 'settings' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <NavRail />
          </div>

          {activeTab !== 'settings' && (
            <div
              className={`min-h-0 ${
                !mobileChatOpen ? 'flex flex-1 md:flex-initial' : 'hidden md:flex'
              }`}
            >
              <ConversationSidebar />
            </div>
          )}

          <div
            className={`min-h-0 flex-1 ${
              activeTab === 'settings' || mobileChatOpen ? 'flex' : 'hidden md:flex'
            }`}
          >
            {activeTab === 'settings' ? <SettingsView /> : <ChatArea />}
          </div>
        </main>
      )}
    </div>
  );
};

export default App;
