import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';
import CardSkeleton from './CardSkeleton';

interface FormSkeletonProps {
  fieldCount?: number;
  showButtons?: boolean;
  buttonCount?: number;
}

export default function FormSkeleton({
  fieldCount = 4,
  showButtons = true,
  buttonCount = 2,
}: FormSkeletonProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Fields */}
      {Array.from({ length: fieldCount }).map((_, index) => (
        <View key={index} style={{ gap: spacing.xs }}>
          <CardSkeleton width="30%" height={12} />
          <CardSkeleton width="100%" height={44} />
        </View>
      ))}

      {/* Buttons */}
      {showButtons && (
        <View style={{ 
          flexDirection: 'row', 
          gap: spacing.md,
          marginTop: spacing.md 
        }}>
          {Array.from({ length: buttonCount }).map((_, index) => (
            <CardSkeleton 
              key={index}
              width={index === 0 ? '60%' : '38%'} 
              height={44} 
            />
          ))}
        </View>
      )}
    </View>
  );
}