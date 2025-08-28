// src/screens/Login/index.tsx
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { useTheme } from '../../state/ThemeProvider';
import LoginForm from './components/LoginForm';
import LoginHeader from './components/LoginHeader';
import { useLogin } from './hooks/useLogin';

export default function LoginScreen() {
    const { colors, scheme } = useTheme();
    const { state, setState, refs, validation, animations, handlers } = useLogin();

    const styles = StyleSheet.create({
        container: { flex: 1 },
        gradient: { flex: 1 },
        content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
        formContainer: { width: '100%', maxWidth: 400 },
    });

    return (
        <View style={styles.container}>
            <LinearGradient colors={[colors.background, colors.background + 'F0', colors.surface + 'E0', colors.background]} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} locations={[0, 0.2, 0.8, 1]}>
                <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        <View style={styles.content}>
                            <Animated.View style={[styles.formContainer, { opacity: animations.fadeAnim, transform: [{ translateX: animations.shakeAnim }] }]}>
                                <LoginHeader iconScale={animations.iconScale} />
                                <Animated.View style={{ transform: [{ translateY: animations.formTranslateY }] }}>
                                    <LoginForm
                                        state={state}
                                        setState={setState}
                                        refs={refs}
                                        validation={validation}
                                        handlers={handlers}
                                    />
                                </Animated.View>
                            </Animated.View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </LinearGradient>
        </View>
    );
}
