import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';
import { AppIcon } from '../../utils/iconOptimizer';

export interface BreadcrumbItem {
  label: string;
  onPress?: () => void;
  icon?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
  maxItems?: number;
}

export default function Breadcrumbs({
  items,
  separator,
  showHome = true,
  maxItems = 4,
}: BreadcrumbsProps) {
  const { colors, spacing, typography } = useTheme();

  // Add home item if requested
  const allItems = showHome 
    ? [{ label: 'Início', icon: 'warehouse', onPress: () => {} }, ...items]
    : items;

  // Handle overflow with ellipsis
  let displayItems = allItems;
  if (allItems.length > maxItems) {
    displayItems = [
      allItems[0],
      { label: '...', onPress: undefined },
      ...allItems.slice(-maxItems + 2)
    ];
  }

  const defaultSeparator = (
    <AppIcon name="chevron-down" size={16} color={colors.muted} />
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        alignItems: 'center',
      }}
    >
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      }}>
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isClickable = item.onPress && !isLast;

          return (
            <React.Fragment key={index}>
              <Pressable
                onPress={isClickable ? item.onPress : undefined}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.xs,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm,
                  borderRadius: 4,
                  opacity: pressed ? 0.7 : 1,
                  backgroundColor: pressed && isClickable ? colors.primaryBackground : 'transparent',
                })}
                disabled={!isClickable}
              >
                {item.icon && (
                  <AppIcon
                    name={item.icon as any}
                    size={14}
                    color={isLast ? colors.text : colors.primary}
                  />
                )}
                <Text
                  style={[
                    typography.body,
                    {
                      fontSize: 14,
                      color: isLast ? colors.text : colors.primary,
                      fontWeight: isLast ? '600' : '400',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </Pressable>

              {!isLast && (
                <View style={{ opacity: 0.5 }}>
                  {separator || defaultSeparator}
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </ScrollView>
  );
}