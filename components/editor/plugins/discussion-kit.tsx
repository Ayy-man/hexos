'use client';

import type { TComment } from '@/components/ui/comment';

import { createPlatePlugin } from 'platejs/react';

import { BlockDiscussion } from '@/components/ui/block-discussion';

export type TDiscussion = {
  id: string;
  comments: TComment[];
  createdAt: Date | string;
  isResolved: boolean;
  userId: string;
  documentContent?: string;
};

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${seed}`;

export type DiscussionUser = {
  id: string;
  name: string;
  avatarUrl?: string;
};

// Create discussion plugin with dynamic user and initial discussions
export const createDiscussionPlugin = (
  currentUser?: DiscussionUser,
  initialDiscussions?: TDiscussion[]
) => {
  const userId = currentUser?.id || 'anonymous';
  const userName = currentUser?.name || 'Anonymous';
  const userAvatar = currentUser?.avatarUrl || avatarUrl(userId);

  // Start with empty discussions, or use provided initial data
  const discussions: TDiscussion[] = initialDiscussions || [];

  const usersData: Record<
    string,
    { id: string; avatarUrl: string; name: string; hue?: number }
  > = {
    [userId]: {
      id: userId,
      avatarUrl: userAvatar,
      name: userName,
    },
  };

  return createPlatePlugin({
    key: 'discussion',
    options: {
      currentUserId: userId,
      discussions,
      users: usersData,
    },
  })
    .configure({
      render: { aboveNodes: BlockDiscussion },
    })
    .extendSelectors(({ getOption }) => ({
      currentUser: () => getOption('users')[getOption('currentUserId')],
      user: (id: string) => getOption('users')[id] || {
        id,
        name: id,
        avatarUrl: avatarUrl(id),
      },
    }));
};

// Default plugin for backwards compatibility (uses anonymous, empty discussions)
export const discussionPlugin = createDiscussionPlugin();

export const DiscussionKit = [discussionPlugin];

// Factory to create kit with current user and initial discussions
export const createDiscussionKit = (
  currentUser?: DiscussionUser,
  initialDiscussions?: TDiscussion[]
) => [createDiscussionPlugin(currentUser, initialDiscussions)];
