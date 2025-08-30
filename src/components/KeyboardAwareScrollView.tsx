import React, { useRef, useEffect } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  Keyboard,
  Platform,
  findNodeHandle,
  KeyboardEvent,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  extraKeyboardSpace?: number;
  enableAutomaticScroll?: boolean;
}

export default function KeyboardAwareScrollView({
  children,
  extraKeyboardSpace = 20,
  enableAutomaticScroll = true,
  contentContainerStyle,
  ...props
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!enableAutomaticScroll || Platform.OS === 'ios') {
      // iOS já tem comportamento nativo decente
      return;
    }

    const keyboardDidShow = (event: KeyboardEvent) => {
      // Para Android, ajusta o scroll automaticamente
      setTimeout(() => {
        const currentlyFocusedInput = TextInput.State.currentlyFocusedInput();
        if (currentlyFocusedInput && scrollRef.current) {
          const reactTag = findNodeHandle(currentlyFocusedInput);
          if (reactTag) {
            currentlyFocusedInput.measure(
              (
                _x: number,
                _y: number,
                _width: number,
                height: number,
                _pageX: number,
                pageY: number
              ) => {
                const keyboardHeight = event.endCoordinates.height;
                const screenHeight = event.endCoordinates.screenY;
                const inputBottom = pageY + height;
                const visibleScreenHeight = screenHeight - insets.top;

                if (inputBottom > visibleScreenHeight - keyboardHeight) {
                  const scrollOffset =
                    inputBottom - (visibleScreenHeight - keyboardHeight) + extraKeyboardSpace;
                  scrollRef.current?.scrollTo({
                    y: scrollOffset,
                    animated: true,
                  });
                }
              }
            );
          }
        }
      }, 100);
    };

    const keyboardSubscription = Keyboard.addListener('keyboardDidShow', keyboardDidShow);

    return () => {
      keyboardSubscription?.remove();
    };
  }, [enableAutomaticScroll, extraKeyboardSpace, insets.top]);

  return (
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={[
        { paddingBottom: Platform.OS === 'android' ? extraKeyboardSpace : 0 },
        contentContainerStyle,
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
