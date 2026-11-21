import { create } from 'zustand';

export type Language = 'en' | 'es' | 'fr' | 'de' | 'pt';

export const LANGUAGES: Array<{ id: Language; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'pt', label: 'Português' },
];

const en = {
  'nav.chats': 'Chats',
  'nav.groups': 'Groups',
  'nav.mentions': 'Mentions',
  'nav.settings': 'Settings',
  'sidebar.messages': 'Messages',
  'sidebar.search': 'Search SkellyTalk...',
  'sidebar.pinned': 'Pinned',
  'sidebar.conversations': 'Conversations',
  'sidebar.allConversations': 'All Conversations',
  'sidebar.archived': 'Archived',
  'sidebar.archive': 'Archive conversation',
  'sidebar.unarchive': 'Unarchive conversation',
  'sidebar.pin': 'Pin conversation',
  'sidebar.unpin': 'Unpin',
  'sidebar.noMatches': 'No matches found',
  'sidebar.noConversations': 'No conversations yet',
  'sidebar.tryDifferent': 'Try a different name or keyword.',
  'sidebar.createHint': 'Create a group or start a direct message.',
  'chat.loadOlder': 'Load older messages',
  'chat.loading': 'Loading…',
  'chat.search': 'Search in conversation',
  'chat.export': 'Export conversation as text',
  'chat.voiceCall': 'Start Voice Call',
  'chat.videoCall': 'Start Video Call',
  'chat.noMatch': 'No messages match your search.',
  'msg.reply': 'Reply',
  'msg.react': 'Add reaction',
  'msg.forward': 'Forward message',
  'msg.forwardTo': 'Forward to',
  'msg.forwarded': 'Forwarded',
  'msg.pin': 'Pin message',
  'msg.unpin': 'Unpin message',
  'msg.edit': 'Edit message',
  'msg.delete': 'Delete message',
  'msg.deleted': 'This message was deleted',
  'msg.save': 'Save',
  'msg.cancel': 'Cancel',
  'settings.language': 'Language',
  'settings.languageInfo': 'Changes the language of menus, buttons and labels.',
  'error.title': 'Something went wrong',
  'error.body': 'SkellyTalk hit an unexpected error. Your messages are safe — reload to continue.',
  'error.reload': 'Reload app',
  'share.title': 'Share your screen',
  'share.subtitle': 'Choose a screen or window to share',
  'share.screens': 'Screens',
  'share.windows': 'Windows',
  'share.audio': 'Also share computer audio',
  'share.start': 'Share',
  'share.cancel': 'Cancel',
  'share.empty': 'Nothing to share here',
  'share.preview': 'Live preview',
  'msg.forwardedFrom': 'Forwarded from',
  'settings.languageSection': 'Language',
  'settings.languageSectionDesc': 'Choose the language of menus and labels',
} as const;

export type TranslationKey = keyof typeof en;
type Dict = Record<TranslationKey, string>;

const es: Dict = {
  'nav.chats': 'Chats',
  'nav.groups': 'Grupos',
  'nav.mentions': 'Menciones',
  'nav.settings': 'Ajustes',
  'sidebar.messages': 'Mensajes',
  'sidebar.search': 'Buscar en SkellyTalk...',
  'sidebar.pinned': 'Fijados',
  'sidebar.conversations': 'Conversaciones',
  'sidebar.allConversations': 'Todas las conversaciones',
  'sidebar.archived': 'Archivadas',
  'sidebar.archive': 'Archivar conversación',
  'sidebar.unarchive': 'Desarchivar conversación',
  'sidebar.pin': 'Fijar conversación',
  'sidebar.unpin': 'Desfijar',
  'sidebar.noMatches': 'Sin resultados',
  'sidebar.noConversations': 'Aún no hay conversaciones',
  'sidebar.tryDifferent': 'Prueba con otro nombre o palabra.',
  'sidebar.createHint': 'Crea un grupo o inicia un mensaje directo.',
  'chat.loadOlder': 'Cargar mensajes anteriores',
  'chat.loading': 'Cargando…',
  'chat.search': 'Buscar en la conversación',
  'chat.export': 'Exportar conversación como texto',
  'chat.voiceCall': 'Iniciar llamada de voz',
  'chat.videoCall': 'Iniciar videollamada',
  'chat.noMatch': 'Ningún mensaje coincide con tu búsqueda.',
  'msg.reply': 'Responder',
  'msg.react': 'Añadir reacción',
  'msg.forward': 'Reenviar mensaje',
  'msg.forwardTo': 'Reenviar a',
  'msg.forwarded': 'Reenviado',
  'msg.pin': 'Fijar mensaje',
  'msg.unpin': 'Desfijar mensaje',
  'msg.edit': 'Editar mensaje',
  'msg.delete': 'Eliminar mensaje',
  'msg.deleted': 'Este mensaje fue eliminado',
  'msg.save': 'Guardar',
  'msg.cancel': 'Cancelar',
  'settings.language': 'Idioma',
  'settings.languageInfo': 'Cambia el idioma de menús, botones y etiquetas.',
  'error.title': 'Algo salió mal',
  'error.body': 'SkellyTalk encontró un error inesperado. Tus mensajes están a salvo: recarga para continuar.',
  'error.reload': 'Recargar app',
  'share.title': 'Compartir pantalla',
  'share.subtitle': 'Elige una pantalla o ventana para compartir',
  'share.screens': 'Pantallas',
  'share.windows': 'Ventanas',
  'share.audio': 'Compartir también el audio del equipo',
  'share.start': 'Compartir',
  'share.cancel': 'Cancelar',
  'share.empty': 'No hay nada que compartir aquí',
  'share.preview': 'Vista previa en vivo',
  'msg.forwardedFrom': 'Reenviado de',
  'settings.languageSection': 'Idioma',
  'settings.languageSectionDesc': 'Elige el idioma de menús y etiquetas',
};

const fr: Dict = {
  'nav.chats': 'Discussions',
  'nav.groups': 'Groupes',
  'nav.mentions': 'Mentions',
  'nav.settings': 'Paramètres',
  'sidebar.messages': 'Messages',
  'sidebar.search': 'Rechercher dans SkellyTalk...',
  'sidebar.pinned': 'Épinglées',
  'sidebar.conversations': 'Conversations',
  'sidebar.allConversations': 'Toutes les conversations',
  'sidebar.archived': 'Archivées',
  'sidebar.archive': 'Archiver la conversation',
  'sidebar.unarchive': 'Désarchiver la conversation',
  'sidebar.pin': 'Épingler la conversation',
  'sidebar.unpin': 'Désépingler',
  'sidebar.noMatches': 'Aucun résultat',
  'sidebar.noConversations': 'Aucune conversation pour le moment',
  'sidebar.tryDifferent': 'Essayez un autre nom ou mot-clé.',
  'sidebar.createHint': 'Créez un groupe ou démarrez un message direct.',
  'chat.loadOlder': 'Charger les messages précédents',
  'chat.loading': 'Chargement…',
  'chat.search': 'Rechercher dans la conversation',
  'chat.export': 'Exporter la conversation en texte',
  'chat.voiceCall': 'Démarrer un appel vocal',
  'chat.videoCall': 'Démarrer un appel vidéo',
  'chat.noMatch': 'Aucun message ne correspond à votre recherche.',
  'msg.reply': 'Répondre',
  'msg.react': 'Ajouter une réaction',
  'msg.forward': 'Transférer le message',
  'msg.forwardTo': 'Transférer à',
  'msg.forwarded': 'Transféré',
  'msg.pin': 'Épingler le message',
  'msg.unpin': 'Désépingler le message',
  'msg.edit': 'Modifier le message',
  'msg.delete': 'Supprimer le message',
  'msg.deleted': 'Ce message a été supprimé',
  'msg.save': 'Enregistrer',
  'msg.cancel': 'Annuler',
  'settings.language': 'Langue',
  'settings.languageInfo': 'Change la langue des menus, boutons et libellés.',
  'error.title': 'Une erreur est survenue',
  'error.body': 'SkellyTalk a rencontré une erreur inattendue. Vos messages sont en sécurité — rechargez pour continuer.',
  'error.reload': "Recharger l'app",
  'share.title': 'Partager votre écran',
  'share.subtitle': 'Choisissez un écran ou une fenêtre à partager',
  'share.screens': 'Écrans',
  'share.windows': 'Fenêtres',
  'share.audio': "Partager aussi le son de l'ordinateur",
  'share.start': 'Partager',
  'share.cancel': 'Annuler',
  'share.empty': 'Rien à partager ici',
  'share.preview': 'Aperçu en direct',
  'msg.forwardedFrom': 'Transféré de',
  'settings.languageSection': 'Langue',
  'settings.languageSectionDesc': 'Choisissez la langue des menus et libellés',
};

const de: Dict = {
  'nav.chats': 'Chats',
  'nav.groups': 'Gruppen',
  'nav.mentions': 'Erwähnungen',
  'nav.settings': 'Einstellungen',
  'sidebar.messages': 'Nachrichten',
  'sidebar.search': 'SkellyTalk durchsuchen...',
  'sidebar.pinned': 'Angeheftet',
  'sidebar.conversations': 'Unterhaltungen',
  'sidebar.allConversations': 'Alle Unterhaltungen',
  'sidebar.archived': 'Archiviert',
  'sidebar.archive': 'Unterhaltung archivieren',
  'sidebar.unarchive': 'Unterhaltung wiederherstellen',
  'sidebar.pin': 'Unterhaltung anheften',
  'sidebar.unpin': 'Lösen',
  'sidebar.noMatches': 'Keine Treffer',
  'sidebar.noConversations': 'Noch keine Unterhaltungen',
  'sidebar.tryDifferent': 'Versuche einen anderen Namen oder Begriff.',
  'sidebar.createHint': 'Erstelle eine Gruppe oder starte eine Direktnachricht.',
  'chat.loadOlder': 'Ältere Nachrichten laden',
  'chat.loading': 'Wird geladen…',
  'chat.search': 'In Unterhaltung suchen',
  'chat.export': 'Unterhaltung als Text exportieren',
  'chat.voiceCall': 'Sprachanruf starten',
  'chat.videoCall': 'Videoanruf starten',
  'chat.noMatch': 'Keine Nachrichten entsprechen deiner Suche.',
  'msg.reply': 'Antworten',
  'msg.react': 'Reaktion hinzufügen',
  'msg.forward': 'Nachricht weiterleiten',
  'msg.forwardTo': 'Weiterleiten an',
  'msg.forwarded': 'Weitergeleitet',
  'msg.pin': 'Nachricht anheften',
  'msg.unpin': 'Nachricht lösen',
  'msg.edit': 'Nachricht bearbeiten',
  'msg.delete': 'Nachricht löschen',
  'msg.deleted': 'Diese Nachricht wurde gelöscht',
  'msg.save': 'Speichern',
  'msg.cancel': 'Abbrechen',
  'settings.language': 'Sprache',
  'settings.languageInfo': 'Ändert die Sprache von Menüs, Schaltflächen und Beschriftungen.',
  'error.title': 'Etwas ist schiefgelaufen',
  'error.body': 'SkellyTalk ist auf einen unerwarteten Fehler gestoßen. Deine Nachrichten sind sicher — lade neu, um fortzufahren.',
  'error.reload': 'App neu laden',
  'share.title': 'Bildschirm teilen',
  'share.subtitle': 'Wähle einen Bildschirm oder ein Fenster zum Teilen',
  'share.screens': 'Bildschirme',
  'share.windows': 'Fenster',
  'share.audio': 'Auch Computer-Audio teilen',
  'share.start': 'Teilen',
  'share.cancel': 'Abbrechen',
  'share.empty': 'Hier gibt es nichts zu teilen',
  'share.preview': 'Live-Vorschau',
  'msg.forwardedFrom': 'Weitergeleitet von',
  'settings.languageSection': 'Sprache',
  'settings.languageSectionDesc': 'Wähle die Sprache von Menüs und Beschriftungen',
};

const pt: Dict = {
  'nav.chats': 'Conversas',
  'nav.groups': 'Grupos',
  'nav.mentions': 'Menções',
  'nav.settings': 'Configurações',
  'sidebar.messages': 'Mensagens',
  'sidebar.search': 'Pesquisar no SkellyTalk...',
  'sidebar.pinned': 'Fixadas',
  'sidebar.conversations': 'Conversas',
  'sidebar.allConversations': 'Todas as conversas',
  'sidebar.archived': 'Arquivadas',
  'sidebar.archive': 'Arquivar conversa',
  'sidebar.unarchive': 'Desarquivar conversa',
  'sidebar.pin': 'Fixar conversa',
  'sidebar.unpin': 'Desafixar',
  'sidebar.noMatches': 'Nenhum resultado',
  'sidebar.noConversations': 'Ainda não há conversas',
  'sidebar.tryDifferent': 'Tente outro nome ou palavra-chave.',
  'sidebar.createHint': 'Crie um grupo ou inicie uma mensagem direta.',
  'chat.loadOlder': 'Carregar mensagens anteriores',
  'chat.loading': 'Carregando…',
  'chat.search': 'Pesquisar na conversa',
  'chat.export': 'Exportar conversa como texto',
  'chat.voiceCall': 'Iniciar chamada de voz',
  'chat.videoCall': 'Iniciar chamada de vídeo',
  'chat.noMatch': 'Nenhuma mensagem corresponde à sua pesquisa.',
  'msg.reply': 'Responder',
  'msg.react': 'Adicionar reação',
  'msg.forward': 'Encaminhar mensagem',
  'msg.forwardTo': 'Encaminhar para',
  'msg.forwarded': 'Encaminhada',
  'msg.pin': 'Fixar mensagem',
  'msg.unpin': 'Desafixar mensagem',
  'msg.edit': 'Editar mensagem',
  'msg.delete': 'Excluir mensagem',
  'msg.deleted': 'Esta mensagem foi excluída',
  'msg.save': 'Salvar',
  'msg.cancel': 'Cancelar',
  'settings.language': 'Idioma',
  'settings.languageInfo': 'Altera o idioma de menus, botões e rótulos.',
  'error.title': 'Algo deu errado',
  'error.body': 'O SkellyTalk encontrou um erro inesperado. Suas mensagens estão seguras — recarregue para continuar.',
  'error.reload': 'Recarregar app',
  'share.title': 'Compartilhar tela',
  'share.subtitle': 'Escolha uma tela ou janela para compartilhar',
  'share.screens': 'Telas',
  'share.windows': 'Janelas',
  'share.audio': 'Compartilhar também o áudio do computador',
  'share.start': 'Compartilhar',
  'share.cancel': 'Cancelar',
  'share.empty': 'Nada para compartilhar aqui',
  'share.preview': 'Pré-visualização ao vivo',
  'msg.forwardedFrom': 'Encaminhada de',
  'settings.languageSection': 'Idioma',
  'settings.languageSectionDesc': 'Escolha o idioma de menus e rótulos',
};

export const DICTIONARIES: Record<Language, Dict> = { en, es, fr, de, pt };

const STORAGE_KEY = 'skellytalk_language';

function isLanguage(v: unknown): v is Language {
  return typeof v === 'string' && v in DICTIONARIES;
}

export function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(saved)) return saved;
  } catch {
    // storage unavailable
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language?.slice(0, 2).toLowerCase() : 'en';
  return isLanguage(nav) ? nav : 'en';
}

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguage = create<LanguageState>((set) => ({
  language: detectLanguage(),
  setLanguage: (language) => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // storage unavailable
    }
    document.documentElement.lang = language;
    set({ language });
  },
}));

/** Translate outside React (e.g. class components). */
export function translate(
  key: TranslationKey,
  language: Language = useLanguage.getState().language
): string {
  return DICTIONARIES[language][key] ?? en[key];
}

/** Hook: returns a `t` function that re-renders when the language changes. */
export function useT(): (key: TranslationKey) => string {
  const language = useLanguage((s) => s.language);
  return (key) => translate(key, language);
}
