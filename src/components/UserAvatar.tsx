import React from 'react';
import defaultUserIcon from '../assets/default-user-icon.png';

export type AvatarMode = 'letter' | 'icon' | 'image';

export interface AvatarSpec {
  mode: AvatarMode;
  bg: string;
  url?: string;
  letter?: string;
}

export const AVATAR_BG_PRESETS: Array<{ id: string; label: string; value: string }> = [
  { id: 'theme', label: 'Theme Default', value: 'theme' },
  { id: 'blue', label: 'Blue', value: '#2563EB' },
  { id: 'green', label: 'Green', value: '#16A34A' },
  { id: 'red', label: 'Red', value: '#DC2626' },
  { id: 'purple', label: 'Purple', value: '#7C3AED' },
  { id: 'orange', label: 'Orange', value: '#EA580C' },
  { id: 'teal', label: 'Teal', value: '#0D9488' },
  { id: 'pink', label: 'Pink', value: '#DB2777' },
  { id: 'black', label: 'Black', value: '#18181B' },
  { id: 'gray', label: 'Gray', value: '#71717A' },
];

export function parseAvatarSpec(avatar?: string, name?: string): AvatarSpec {
  const firstLetter = ((name ?? '').trim().charAt(0) || 'U').toUpperCase();
  const raw = (avatar ?? '').trim();

  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as Partial<AvatarSpec>;
      return {
        mode: parsed.mode ?? 'letter',
        bg: parsed.bg ?? 'theme',
        url: parsed.url,
        letter: (parsed.letter || firstLetter).trim().charAt(0).toUpperCase() || 'U',
      };
    } catch {
      // Fall through to legacy string handling
    }
  }

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:image/')
  ) {
    return {
      mode: 'image',
      bg: 'theme',
      url: raw,
      letter: firstLetter,
    };
  }

  if (raw === 'icon') {
    return {
      mode: 'icon',
      bg: 'theme',
      letter: firstLetter,
    };
  }

  const resolvedLetter =
    ((name ?? '').trim().charAt(0) || raw.charAt(0) || 'U').toUpperCase();

  return {
    mode: 'letter',
    bg: 'theme',
    letter: resolvedLetter,
  };
}

export function serializeAvatarSpec(spec: AvatarSpec): string {
  return JSON.stringify({
    mode: spec.mode,
    bg: spec.bg || 'theme',
    ...(spec.url ? { url: spec.url } : {}),
    ...(spec.letter ? { letter: spec.letter.trim().charAt(0).toUpperCase() } : {}),
  });
}

export function isImageAvatar(avatar?: string): boolean {
  const spec = parseAvatarSpec(avatar);
  return spec.mode === 'image' && Boolean(spec.url);
}

interface UserAvatarProps {
  avatar: string;
  name?: string;
  className?: string;
  textClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name = 'User',
  className = 'h-10 w-10 rounded-2xl',
  textClassName = 'text-xs font-bold',
}) => {
  const spec = parseAvatarSpec(avatar, name);
  const customBgStyle: React.CSSProperties | undefined =
    spec.bg && spec.bg !== 'theme'
      ? { backgroundColor: spec.bg, backgroundImage: 'none', color: '#ffffff' }
      : undefined;

  if (spec.mode === 'image' && spec.url) {
    return (
      <div
        style={customBgStyle}
        className={`relative overflow-hidden ${className}`}
      >
        <img
          src={spec.url}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (spec.mode === 'icon') {
    return (
      <div
        style={customBgStyle}
        className={`relative flex items-end justify-center overflow-hidden ${className}`}
      >
        <img
          src={defaultUserIcon}
          alt={name}
          className="h-[78%] w-[78%] object-contain"
        />
      </div>
    );
  }

  return (
    <div
      style={customBgStyle}
      className={`flex items-center justify-center overflow-hidden ${className}`}
    >
      <span className={textClassName}>{spec.letter}</span>
    </div>
  );
};
