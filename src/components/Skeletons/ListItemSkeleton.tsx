import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';
import CardSkeleton from './CardSkeleton';

interface ListItemSkeletonProps {
  showAvatar?: boolean;
  showSubtitle?: boolean;
  showRightElement?: boolean;
  avatarSize?: number;
}

export default function ListItemSkeleton({
  showAvatar = true,
  showSubtitle = true,
  showRightElement = true,
  avatarSize = 40,
}: ListItemSkeletonProps) {
  const { spacing } = useTheme();

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.md,
    }}>
      {showAvatar && (
        <CardSkeleton 
          width={avatarSize} 
          height={avatarSize} 
          borderRadius={avatarSize / 2} 
        />
      )}
      
      <View style={{ flex: 1, gap: spacing.xs }}>
        <CardSkeleton width="70%" height={16} />
        {showSubtitle && (
          <CardSkeleton width="45%" height={12} />
        )}
      </View>

      {showRightElement && (
        <CardSkeleton width={60} height={20} />
      )}
    </View>
  );
}