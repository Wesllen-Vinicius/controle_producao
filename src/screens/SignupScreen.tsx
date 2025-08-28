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

/* ===== extra do app.json (links/redirect) ===== */
function getExtra<T = any>(key: string, fallback?: T): T | undefined {
  const extra = (Constants.expoConfig as any)?.extra ?? (Constants.manifest as any)?.extra ?? {};
  return (extra?.[key] as T) ?? fallback;
}
const TERMS_URL = getExtra<string>('termsUrl');
const PRIVACY_URL = getExtra<string>('privacyUrl');
const SIGNUP_REDIRECT_URL = getExtra<string>('signupRedirectUrl');

export default function SignupScreen() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const pass2Ref = useRef<TextInput>(null);

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
        strengthContainer: {
          backgroundColor: colors.surface,
          borderColor: colors.line,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: 12,
          gap: 8,
        },
        strengthBar: {
          height: 4,
          backgroundColor: colors.line,
          borderRadius: 2,
          overflow: 'hidden',
        },
        strengthFill: {
          height: '100%',
        },
        strengthText: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.muted,
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
        termsContainer: {
          marginTop: 12,
          marginBottom: 8,
        },
        termsText: {
          fontSize: 12,
          color: colors.muted,
          textAlign: 'center',
          lineHeight: 16,
        },
        termsLink: {
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

  const validatePassword = (passwordText: string) => {
    return passwordText.length >= 6 && passwordText.length <= 128;
  };

  const emailOk = useMemo(() => validateEmail(email), [email]);
  const passOk = useMemo(() => validatePassword(pass), [pass]);
  const matchOk = useMemo(() => pass.length > 0 && pass === pass2, [pass, pass2]);

  // Computed validation states
  const emailValid = !emailTouched || emailOk;
  const passwordValid = !passwordTouched || passOk;
  const confirmValid = !confirmTouched || matchOk;

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (pass.length === 0) return { score: 0, label: '', color: colors.muted };
    
    let score = 0;
    if (pass.length >= 6) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/\d/.test(pass) && /[^A-Za-z0-9]/.test(pass)) score++;
    
    const labels = ['Muito fraca', 'Fraca', 'Boa', 'Forte'];
    const colors_strength = ['#DC2626', '#F59E0B', '#3B82F6', '#22C55E'];
    
    return {
      score,
      label: labels[score] || '',
      color: colors_strength[score] || colors.muted,
      progress: (score + 1) / 4
    };
  }, [pass, colors.muted]);

  const hasContent = email.length > 0 && pass.length > 0 && pass2.length > 0;
  const formOk = useMemo(() => emailOk && passOk && matchOk && !busy, [emailOk, passOk, matchOk, busy]);

  // Touch handlers
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (!emailTouched && text.length > 0) {
      setEmailTouched(true);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPass(text);
    if (!passwordTouched && text.length > 0) {
      setPasswordTouched(true);
    }
  };

  const handleConfirmChange = (text: string) => {
    setPass2(text);
    if (!confirmTouched && text.length > 0) {
      setConfirmTouched(true);
    }
  };

  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [email, pass, pass2]);

  const handleSignup = useCallback(async () => {
    Keyboard.dismiss();

    if (!emailOk) {
      h.warning();
      setError('Por favor, insira um e-mail válido.');
      doShake();
      emailRef.current?.focus();
      return;
    }

    if (!passOk) {
      h.warning();
      setError('A senha deve ter pelo menos 6 caracteres.');
      doShake();
      passRef.current?.focus();
      return;
    }

    if (!matchOk) {
      h.warning();
      setError('As senhas não conferem.');
      doShake();
      pass2Ref.current?.focus();
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error: err } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: SIGNUP_REDIRECT_URL ? { emailRedirectTo: SIGNUP_REDIRECT_URL } : undefined,
      });

      if (err) throw err;
      
      animateSuccess();
      h.success();
      
      Alert.alert(
        'Conta criada!', 
        'Enviamos um e-mail de confirmação. Verifique sua caixa de entrada.',
        [{ text: 'OK', onPress: () => nav.navigate('Login') }]
      );
    } catch (e: any) {
      h.error();

      let friendlyMessage = 'Erro ao criar conta. Tente novamente.';

      if (/already|registered|exists/i.test(e.message)) {
        friendlyMessage = 'Este e-mail já está cadastrado. Tente fazer login.';
      } else if (/invalid email/i.test(e.message)) {
        friendlyMessage = 'E-mail inválido.';
      } else if (/password/i.test(e.message)) {
        friendlyMessage = 'Senha não atende aos critérios de segurança.';
      }

      setError(friendlyMessage);
      doShake();
    } finally {
      setBusy(false);
    }
  }, [email, pass, pass2, emailOk, passOk, matchOk, h, doShake, nav]);

  const openLink = useCallback(async (url?: string) => {
    if (!url) return;
    // You could implement link opening logic here
    Alert.alert('Link', `Abrir: ${url}`);
  }, []);

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
              {/* Header */}
              <View style={styles.header}>
                <Animated.View style={[
                  styles.iconContainer,
                  { 
                    transform: [{ scale: iconScale }]
                  }
                ]}>
                  <MaterialCommunityIcons 
                    name="account-plus" 
                    size={40} 
                    color={colors.primary}
                    accessibilityLabel="Ícone de criar conta" 
                  />
                </Animated.View>
                <Text style={styles.appName}>Criar Conta</Text>
                <Text style={styles.subtitle}>Preencha os dados abaixo</Text>
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
                    returnKeyType="next"
                    onSubmitEditing={() => passRef.current?.focus()}
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

                  <Input
                    ref={passRef}
                    label="Senha"
                    value={pass}
                    onChangeText={handlePasswordChange}
                    placeholder="Crie uma senha"
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    autoCorrect={false}
                    maxLength={128}
                    error={!passwordValid ? 'A senha deve ter pelo menos 6 caracteres' : undefined}
                    leftIcon={
                      <MaterialCommunityIcons 
                        name="lock-outline" 
                        size={20} 
                        color={
                          !passwordTouched || pass.length === 0 ? colors.muted :
                          passwordValid ? colors.success : colors.danger
                        } 
                      />
                    }
                    rightIcon={
                      <MaterialCommunityIcons
                        name={showPass ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.muted}
                      />
                    }
                    onPressRightIcon={() => setShowPass((s) => !s)}
                    returnKeyType="next"
                    onSubmitEditing={() => pass2Ref.current?.focus()}
                    editable={!busy}
                  />

                  {/* Password Strength Indicator */}
                  {pass.length > 0 && (
                    <View style={styles.strengthContainer}>
                      <View style={styles.strengthBar}>
                        <View 
                          style={[
                            styles.strengthFill,
                            { 
                              width: `${passwordStrength.progress * 100}%`,
                              backgroundColor: passwordStrength.color 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.strengthText}>
                        Força da senha: <Text style={{ color: passwordStrength.color }}>{passwordStrength.label}</Text>
                      </Text>
                    </View>
                  )}

                  <Input
                    ref={pass2Ref}
                    label="Confirmar senha"
                    value={pass2}
                    onChangeText={handleConfirmChange}
                    placeholder="Repita a senha"
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    autoCorrect={false}
                    maxLength={128}
                    error={!confirmValid ? 'As senhas não conferem' : undefined}
                    leftIcon={
                      <MaterialCommunityIcons 
                        name="lock-check-outline" 
                        size={20} 
                        color={
                          !confirmTouched || pass2.length === 0 ? colors.muted :
                          confirmValid ? colors.success : colors.danger
                        } 
                      />
                    }
                    returnKeyType="go"
                    onSubmitEditing={handleSignup}
                    editable={!busy}
                  />
                </View>

                {/* Terms */}
                <View style={styles.termsContainer}>
                  <Text style={styles.termsText}>
                    Ao criar a conta, você concorda com os{' '}
                    <Text style={styles.termsLink} onPress={() => openLink(TERMS_URL)}>
                      Termos de Uso
                    </Text>
                    {' '}e com a{' '}
                    <Text style={styles.termsLink} onPress={() => openLink(PRIVACY_URL)}>
                      Política de Privacidade
                    </Text>.
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
                      title={busy ? 'Criando conta...' : 'Criar conta'}
                      onPress={() => {
                        animateButtonPress();
                        setTimeout(handleSignup, 100);
                      }}
                      loading={busy}
                      disabled={!hasContent || busy}
                      variant={formOk ? 'primary' : 'tonal'}
                      full
                      leftIcon={
                        busy ? (
                          <ActivityIndicator size="small" color={formOk ? "white" : "#666"} />
                        ) : (
                          <MaterialCommunityIcons 
                            name="account-plus" 
                            size={18} 
                            color={formOk ? "white" : "#666"}
                          />
                        )
                      }
                      accessibilityLabel={busy ? 'Criando conta, aguarde' : 'Criar conta'}
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
                    accessibilityLabel="Já tem conta? Fazer login"
                    accessibilityHint="Toque para ir para a tela de login"
                    accessibilityState={{ disabled: busy }}
                  >
                    <Text style={styles.link}>Já tem conta? Entrar</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}