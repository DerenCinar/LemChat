import React, { useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
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
import { AppLockScreen } from './components/AppLockScreen';
import { LiquidGlassLayer } from './components/LiquidGlassLayer';
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
  const reduceMotion = useChatStore((s) => s.liquidGlass.reduceMotion);
  const alertFlashSeq = useChatStore((s) => s.alertFlashSeq);
  const activePopupId = useChatStore((s) => s.activePopupId);
  const closeAllPopups = useChatStore((s) => s.closeAllPopups);

  useEffect(() => {
    if (!activePopupId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAllPopups();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePopupId, closeAllPopups]);

  useEffect(() => {
    void initializeApp();

    const unsubNotif = window.lemchat?.onNotificationClicked((conversationId) => {
      if (conversationId === 'lemchat-update') {
        useChatStore.getState().setActiveTab('settings');
      } else {
        void selectConversation(conversationId);
      }
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
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
      <div className="relative flex h-[100dvh] w-screen flex-col overflow-hidden md:rounded-[14px] md:border md:border-white/15">
        <MeshBackground />
        <TitleBar />
        <NotificationToast />
        <NewConversationModal />
        <CallOverlay />
        <ProfileModal />
        <AttachmentViewer />
        <AppLockScreen />

        <AnimatePresence>
          {alertFlashSeq > 0 && (
            <motion.div
              key={`alert-flash-${alertFlashSeq}`}
              aria-hidden
              initial={{ opacity: 0.75 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="pointer-events-none fixed inset-0 z-[250] rounded-[14px] ring-4 ring-inset ring-[#22C55E]/80 shadow-[inset_0_0_48px_rgba(34,197,94,0.45)]"
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {updateStatus.status === 'installing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-[#090F0C]/88 backdrop-blur-2xl"
            >
              <motion.div
                initial={{ scale: 0.94, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                className="glass-panel glass-surface relative mx-4 flex w-full max-w-sm flex-col items-center rounded-3xl px-8 py-10 text-center ring-1 ring-[#22C55E]/35"
              >
                <LiquidGlassLayer variant="modal" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#10B981] text-white shadow-lem-glow"
              >
                <DownloadCloud className="h-6 w-6" />
              </motion.div>
              <h2 className="text-lg font-bold text-emerald-950 dark:text-white">
                Applying update...
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-950/80 dark:text-emerald-50/90">
                SkellyTalk will close briefly, install the update, and reopen. Please wait.
              </p>
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
            className={`min-h-0 min-w-0 flex-1 overflow-hidden ${
              activeTab === 'settings' || mobileChatOpen ? 'flex' : 'hidden md:flex'
            }`}
          >
            {activeTab === 'settings' ? <SettingsView /> : <ChatArea />}
          </div>
        </main>
      )}
      </div>
    </MotionConfig>
  );
};

export default App;
