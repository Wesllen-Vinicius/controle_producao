import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Pressable,
  TextInput,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

import { supabase } from '../services/supabase';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';
import { useNavigation } from '@react-navigation/native';

/* ===== extras do app.json (redirect, suporte) ===== */
function getExtra<T = any>(key: string, fallback?: T): T | undefined {
  const extra = (Constants.expoConfig as any)?.extra ?? (Constants.manifest as any)?.extra ?? {};
  return (extra?.[key] as T) ?? fallback;
}
const RESET_REDIRECT_URL = getExtra<string>('resetRedirectUrl');
const SUPPORT_EMAIL = getExtra<string>('supportEmail', 'suporte@exemplo.com');

export default function PasswordResetScreen() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const emailRef = useRef<TextInput>(null);

  const h = useHaptics();
  const { colors, spacing, typography, radius, theme } = useTheme();

  // Enhanced animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const formTranslateY = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Smooth entrance animation
    Animated.stagger(150, [
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 600, 
        useNativeDriver: true 
      }),
      Animated.spring(iconScale, { 
        toValue: 1, 
        useNativeDriver: true, 
        stiffness: 100, 
        damping: 10 
      }),
      Animated.timing(formTranslateY, { 
        toValue: 0, 
        duration: 400, 
        useNativeDriver: true 
      })
    ]).start();

    // Icon pulse animation
    const pulseIcon = () => {
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true
        })
      ]).start(() => {
        setTimeout(pulseIcon, 3000);
      });
    };
    pulseIcon();
  }, []);

  const doShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateButtonPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.98, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateSuccess = useCallback(() => {
    Animated.sequence([
      Animated.timing(successAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const contentWidth = useMemo(() => Math.min(width - 48, 400), [width]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { 
          flex: 1 
        },
        gradient: {
          flex: 1,
        },
        content: {
          flex: 1,
          paddingHorizontal: 24,
          justifyContent: 'center',
          alignItems: 'center',
        },
        formContainer: {
          width: contentWidth,
          alignSelf: 'center',
        },
        header: {
          alignItems: 'center',
          marginBottom: 48,
        },
        iconContainer: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          borderWidth: 3,
          borderColor: colors.primary,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
            },
            android: {
              elevation: 4,
            },
          }),
        },
        appName: {
          fontSize: 24,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.5,
          marginBottom: 4,
        },
        subtitle: {
          fontSize: 14,
          fontWeight: '500',
          color: colors.muted,
          letterSpacing: 0.2,
        },
        form: {
          gap: 20,
        },
        inputContainer: {
          gap: 16,
        },
        infoContainer: {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: 16,
          gap: 8,
        },
        infoText: {
          fontSize: 13,
          color: colors.muted,
          textAlign: 'center',
          lineHeight: 18,
        },
        errorContainer: {
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          borderWidth: 1,
          borderRadius: radius.md,
          padding: 12,
          marginTop: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
        errorText: {
          color: colors.danger,
          fontSize: 13,
          fontWeight: '600',
          textAlign: 'center',
          flex: 1,
        },
        buttonContainer: {
          marginTop: 8,
        },
        buttonWrapper: {
          position: 'relative',
        },
        successOverlay: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.md,
        },
        footer: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 24,
          paddingTop: 16,
        },
        link: {
          color: colors.primary,
          fontSize: 14,
          fontWeight: '600',
        },
        // Success state styles
        successContainer: {
          alignItems: 'center',
          gap: 20,
        },
        successIconContainer: {
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.success + '15',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.success + '30',
        },
        successTitle: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.text,
          textAlign: 'center',
        },
        emailBadge: {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: radius.lg,
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        emailBadgeText: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.text,
        },
        successDescription: {
          fontSize: 14,
          color: colors.muted,
          textAlign: 'center',
          lineHeight: 20,
        },
        buttonRow: {
          flexDirection: 'row',
          gap: 12,
          width: '100%',
        },
        buttonHalf: {
          flex: 1,
        },
        divider: {
          height: 1,
          backgroundColor: colors.line,
          opacity: 0.6,
          marginVertical: 8,
        },
        supportText: {
          fontSize: 12,
          color: colors.muted,
          textAlign: 'center',
          lineHeight: 16,
        },
        supportLink: {
          color: colors.primary,
          fontWeight: '600',
        },
      }),
    [colors, spacing, contentWidth, radius]
  );

  // Enhanced validation
  const validateEmail = (emailText: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailText) && emailText.length <= 254;
  };

  const emailOk = useMemo(() => validateEmail(email), [email]);
  const emailValid = !emailTouched || emailOk;

  // Touch handler
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (!emailTouched && text.length > 0) {
      setEmailTouched(true);
    }
  };

  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [email]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Masked email for success screen
  const maskedEmail = useMemo(() => {
    if (!emailOk) return email;
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    const mask = user.length <= 2 ? user[0] + '***' : user[0] + '***' + user.slice(-1);
    return `${mask}@${domain}`;
  }, [email, emailOk]);

  const openMailApp = useCallback(async () => {
    try {
      const url = 'mailto:';
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert('Abrir e-mail', 'Não foi possível abrir o app de e-mail.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Abrir e-mail', 'Não foi possível abrir o app de e-mail.');
    }
  }, []);

  const handleReset = useCallback(async () => {
    Keyboard.dismiss();

    if (!emailOk) {
      h.warning();
      setError('Por favor, insira um e-mail válido.');
      doShake();
      emailRef.current?.focus();
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const opts: any = RESET_REDIRECT_URL ? { redirectTo: RESET_REDIRECT_URL } : undefined;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), opts);
      
      if (err) throw err;

      animateSuccess();
      h.success();
      setSent(true);
      setCooldown(30); // 30s cooldown
    } catch (e: any) {
      h.error();
      
      let friendlyMessage = 'Erro ao enviar e-mail. Tente novamente.';
      
      if (/email not found/i.test(e.message)) {
        friendlyMessage = 'E-mail não encontrado. Verifique se está correto.';
      } else if (/rate limit/i.test(e.message)) {
        friendlyMessage = 'Muitas tentativas. Tente novamente em alguns minutos.';
      }

      setError(friendlyMessage);
      doShake();
    } finally {
      setBusy(false);
    }
  }, [email, emailOk, h, doShake]);

  const resend = useCallback(() => {
    if (cooldown > 0 || busy) return;
    handleReset();
  }, [cooldown, busy, handleReset]);

  const renderInitialForm = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <Animated.View style={[
          styles.iconContainer,
          { 
            transform: [{ scale: iconScale }]
          }
        ]}>
          <MaterialCommunityIcons 
            name="key-variant" 
            size={40} 
            color={colors.primary}
            accessibilityLabel="Ícone de recuperar senha" 
          />
        </Animated.View>
        <Text style={styles.appName}>Recuperar Senha</Text>
        <Text style={styles.subtitle}>Digite seu e-mail abaixo</Text>
      </View>

      {/* Form */}
      <Animated.View style={[
        styles.form,
        { transform: [{ translateY: formTranslateY }] }
      ]}>
        <View style={styles.inputContainer}>
          <Input
            ref={emailRef}
            label="E-mail"
            value={email}
            onChangeText={handleEmailChange}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={handleReset}
            editable={!busy}
            maxLength={254}
            error={!emailValid ? 'Digite um e-mail válido (exemplo@dominio.com)' : undefined}
            leftIcon={
              <MaterialCommunityIcons 
                name="email-outline" 
                size={20} 
                color={
                  !emailTouched || email.length === 0 ? colors.muted :
                  emailValid ? colors.success : colors.danger
                } 
              />
            }
          />
        </View>

        <View style={styles.infoContainer}>
          <MaterialCommunityIcons 
            name="information-outline" 
            size={20} 
            color={colors.primary} 
            style={{ alignSelf: 'center' }}
          />
          <Text style={styles.infoText}>
            Enviaremos um link para você redefinir sua senha. Verifique também a caixa de spam.
          </Text>
        </View>

        {!!error && (
          <View 
            style={styles.errorContainer}
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            <MaterialCommunityIcons 
              name="alert-circle" 
              size={16} 
              color={colors.danger} 
              style={{ marginRight: 8 }}
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <Animated.View style={[
            styles.buttonWrapper,
            { transform: [{ scale: buttonScale }] }
          ]}>
            <Button
              title={busy ? 'Enviando...' : 'Enviar link de recuperação'}
              onPress={() => {
                animateButtonPress();
                setTimeout(handleReset, 100);
              }}
              loading={busy}
              disabled={!email.length || busy}
              variant={emailOk ? 'primary' : 'tonal'}
              full
              leftIcon={
                busy ? (
                  <ActivityIndicator size="small" color={emailOk ? "white" : "#666"} />
                ) : (
                  <MaterialCommunityIcons 
                    name="send" 
                    size={18} 
                    color={emailOk ? "white" : "#666"}
                  />
                )
              }
              accessibilityLabel={busy ? 'Enviando e-mail, aguarde' : 'Enviar link de recuperação'}
            />
          
            {/* Success overlay animation */}
            <Animated.View 
              style={[
                styles.successOverlay,
                {
                  opacity: successAnim,
                  transform: [{ scale: successAnim }],
                }
              ]}
              pointerEvents="none"
            >
              <MaterialCommunityIcons name="check-circle" size={32} color={colors.success} />
            </Animated.View>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <Pressable 
            disabled={busy} 
            onPress={() => nav.navigate('Login')}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Voltar para o login"
            accessibilityHint="Toque para voltar à tela de login"
            accessibilityState={{ disabled: busy }}
          >
            <Text style={styles.link}>Voltar para o login</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );

  const renderSuccessForm = () => (
    <>
      {/* Success Header */}
      <View style={styles.header}>
        <Animated.View style={[
          styles.successIconContainer,
          { 
            transform: [{ scale: iconScale }]
          }
        ]}>
          <MaterialCommunityIcons 
            name="email-check-outline" 
            size={40} 
            color={colors.success}
            accessibilityLabel="E-mail enviado com sucesso" 
          />
        </Animated.View>
        <Text style={styles.successTitle}>Verifique seu e-mail</Text>
      </View>

      {/* Success Content */}
      <Animated.View style={[
        styles.successContainer,
        { transform: [{ translateY: formTranslateY }] }
      ]}>
        <View style={styles.emailBadge}>
          <Text style={styles.emailBadgeText}>{maskedEmail}</Text>
        </View>

        <Text style={styles.successDescription}>
          Enviamos um link para redefinir sua senha. Abra seu e-mail e siga as instruções.
        </Text>

        <View style={styles.buttonRow}>
          <View style={styles.buttonHalf}>
            <Button 
              title="Abrir e-mail" 
              variant="tonal" 
              onPress={openMailApp}
              leftIcon={
                <MaterialCommunityIcons name="email-open-outline" size={16} color={colors.primary} />
              }
            />
          </View>
          <View style={styles.buttonHalf}>
            <Button
              title={cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Reenviar'}
              onPress={resend}
              disabled={cooldown > 0 || busy}
              loading={busy}
              leftIcon={
                cooldown > 0 || busy ? undefined : (
                  <MaterialCommunityIcons name="refresh" size={16} color="white" />
                )
              }
            />
          </View>
        </View>

        <Pressable 
          onPress={() => setSent(false)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          accessibilityRole="button"
          accessibilityLabel="Trocar e-mail"
        >
          <Text style={styles.link}>Trocar e-mail</Text>
        </Pressable>

        <View style={styles.divider} />

        <Text style={styles.supportText}>
          Precisa de ajuda? Escreva para{' '}
          <Text style={styles.supportLink}>{SUPPORT_EMAIL}</Text>
        </Text>
      </Animated.View>
    </>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          colors.background, 
          colors.background + 'F0',
          colors.surface + 'E0',
          colors.background
        ]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.2, 0.8, 1]}
      >
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
      >
        <TouchableWithoutFeedback 
          onPress={Keyboard.dismiss} 
          accessible={false}
          style={{ flex: 1 }}
        >
          <View style={styles.content}>
            <Animated.View style={[
              styles.formContainer,
              { 
                opacity: fadeAnim,
                transform: [{ translateX: shakeAnim }]
              }
            ]}>
              {!sent ? renderInitialForm() : renderSuccessForm()}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}