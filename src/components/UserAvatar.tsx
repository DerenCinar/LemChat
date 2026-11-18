import React from 'react';

interface UserAvatarProps {
  avatar: string;
  name?: string;
  className?: string;
  textClassName?: string;
}

export function isImageAvatar(avatar?: string): boolean {
  if (!avatar) return false;
  return (
    avatar.startsWith('http://') ||
    avatar.startsWith('https://') ||
    avatar.startsWith('data:image/')
  );
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatar,
  name = 'User',
  className = 'h-10 w-10 rounded-2xl',
  textClassName = 'text-xs font-bold',
}) => {
  if (isImageAvatar(avatar)) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`object-cover ${className}`}
      />
    );
  }

  const initials = (avatar || name.slice(0, 2)).slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex items-center justify-center ${className} ${textClassName}`}
    >
      {initials}
    </div>
  );
};
