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
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

import { supabase } from '../services/supabase';
import { useHaptics } from '../hooks/useHaptics';
import { useTheme } from '../state/ThemeProvider';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{email: string, password: string} | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const h = useHaptics();
  const { colors, spacing, typography, radius } = useTheme();

  // Enhanced animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const formTranslateY = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const inputFocusAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animação de entrada suave
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

    // Pulso sutil do ícone (sem rotação contínua)
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
        setTimeout(pulseIcon, 3000); // Pausa antes do próximo pulso
      });
    };
    pulseIcon();

    // Initialize auth features
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // First check biometric support
        if (mounted) {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          const biometricAvailable = hasHardware && isEnrolled;
          setBiometricSupported(biometricAvailable);
          
          // Then load saved credentials with biometric info
          if (mounted) {
            await loadSavedCredentialsWithBiometric(biometricAvailable);
          }
        }
      } catch (error) {
        console.log('Auth initialization error:', error);
        setBiometricSupported(false);
      }
    };
    
    initializeAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  const checkBiometricSupport = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supported = hasHardware && isEnrolled;
      setBiometricSupported(supported);
      return supported;
    } catch (error) {
      setBiometricSupported(false);
      return false;
    }
  }, []);

  const loadSavedCredentials = useCallback(async () => {
    try {
      const remember = await AsyncStorage.getItem('rememberLogin');
      if (remember === 'true') {
        setRememberMe(true);
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        if (savedEmail) {
          setEmail(savedEmail);
          setEmailTouched(false);
        }
      }
    } catch (error) {
      console.log('Error loading saved credentials:', error);
    }
  }, []);

  const loadSavedCredentialsWithBiometric = useCallback(async (biometricAvailable: boolean) => {
    try {
      const remember = await AsyncStorage.getItem('rememberLogin');
      if (remember === 'true') {
        setRememberMe(true);
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        if (savedEmail) {
          setEmail(savedEmail);
          setEmailTouched(false);
          
          // Only load password if biometric is available
          if (biometricAvailable) {
            const savedPassword = await AsyncStorage.getItem('savedPassword');
            if (savedPassword) {
              console.log('Setting saved credentials for biometric auth');
              setSavedCredentials({ email: savedEmail, password: savedPassword });
            }
          }
        }
      }
    } catch (error) {
      console.log('Error loading saved credentials with biometric:', error);
    }
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

  const animateInputFocus = useCallback((focused: boolean) => {
    Animated.timing(inputFocusAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, []);

  // Remover rotação e usar apenas escala

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
        footer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 24,
          paddingTop: 16,
        },
        rememberContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 12,
          marginBottom: 8,
        },
        rememberText: {
          marginLeft: 8,
          fontSize: 14,
          fontWeight: '500',
          color: colors.text,
        },
        biometricButton: {
          alignItems: 'center',
          marginTop: 16,
        },
        biometricIcon: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
          borderWidth: 1,
          borderColor: colors.primary + '30',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            },
            android: {
              elevation: 2,
            },
          }),
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
        loadingContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
        loadingText: {
          marginLeft: 8,
          color: colors.primary,
          fontSize: 14,
          fontWeight: '600',
        },
        link: {
          color: colors.primary,
          fontSize: 14,
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
  const hasContent = email.length > 0 && pass.length > 0;
  const formOk = useMemo(() => emailOk && passOk && !busy, [emailOk, passOk, busy]);

  // Touch handlers for validation feedback
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

  // Computed validation states
  const emailValid = !emailTouched || emailOk;
  const passwordValid = !passwordTouched || passOk;

  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [email, pass]);

  // Debug effect to monitor state changes
  useEffect(() => {
    if (__DEV__) {
      console.log('LoginScreen state:', {
        biometricSupported,
        savedCredentials: savedCredentials ? 'exists' : 'null',
        rememberMe,
        email: email || 'empty'
      });
    }
  }, [biometricSupported, savedCredentials, rememberMe, email]);

  const saveCredentials = async () => {
    try {
      await AsyncStorage.setItem('rememberLogin', rememberMe.toString());
      if (rememberMe) {
        const cleanEmail = email.trim().toLowerCase();
        await AsyncStorage.setItem('savedEmail', cleanEmail);
        
        if (biometricSupported) {
          await AsyncStorage.setItem('savedPassword', pass);
          console.log('Credentials saved with biometric support');
          // Immediately set saved credentials for next login
          setSavedCredentials({ email: cleanEmail, password: pass });
        } else {
          // Remove password if biometric is not supported
          await AsyncStorage.removeItem('savedPassword');
          setSavedCredentials(null);
        }
      } else {
        await AsyncStorage.removeItem('savedEmail');
        await AsyncStorage.removeItem('savedPassword');
        setSavedCredentials(null);
      }
    } catch (error) {
      console.log('Error saving credentials:', error);
    }
  };

  const authenticateWithBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Faça login com sua digital ou Face ID',
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Usar senha',
      });

      if (result.success && savedCredentials) {
        setBusy(true);
        setError(null);
        
        const { error: err } = await supabase.auth.signInWithPassword({
          email: savedCredentials.email,
          password: savedCredentials.password
        });

        if (err) throw err;
        h.success();
      }
    } catch (error: any) {
      h.error();
      setError('Erro na autenticação biométrica. Tente usar sua senha.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = useCallback(async () => {
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

    setBusy(true);
    setError(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass
      });

      if (err) throw err;
      
      // Save credentials if remember me is enabled
      await saveCredentials();
      
      // Force refresh of saved credentials for biometric
      if (rememberMe && biometricSupported) {
        setTimeout(() => {
          setSavedCredentials({ 
            email: cleanEmail, 
            password: pass 
          });
        }, 100);
      }
      
      // Animate success
      animateSuccess();
      h.success();
    } catch (e: any) {
      h.error();

      let friendlyMessage = 'Erro ao fazer login. Tente novamente.';

      if (/invalid login credentials/i.test(e.message)) {
        friendlyMessage = 'E-mail ou senha incorretos.';
      } else if (/email not confirmed/i.test(e.message)) {
        friendlyMessage = 'Confirme seu e-mail antes de fazer login.';
      } else if (/too many requests/i.test(e.message)) {
        friendlyMessage = 'Muitas tentativas. Tente novamente em alguns minutos.';
      } else if (/network/i.test(e.message)) {
        friendlyMessage = 'Problema de conexão. Verifique sua internet.';
      }

      setError(friendlyMessage);
      doShake();
    } finally {
      setBusy(false);
    }
  }, [email, pass, emailOk, passOk, rememberMe, biometricSupported, h, doShake]);

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
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
              {/* Header minimalista */}
              <View style={styles.header}>
                <Animated.View style={[
                  styles.iconContainer,
                  { 
                    transform: [{ scale: iconScale }]
                  }
                ]}>
                  <MaterialCommunityIcons 
                    name="factory" 
                    size={40} 
                    color={colors.primary}
                    accessibilityLabel="Ícone da aplicação Controle de Produção" 
                  />
                </Animated.View>
                <Text style={styles.appName}>Controle de Produção</Text>
                <Text style={styles.subtitle}>Entre para continuar</Text>
              </View>

              {/* Form minimalista */}
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
                    placeholder="Sua senha"
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoComplete="current-password"
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
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    editable={!busy}
                  />
                </View>

                <View style={styles.rememberContainer}>
                  <Switch
                    value={rememberMe}
                    onValueChange={setRememberMe}
                    trackColor={{ 
                      false: colors.line, 
                      true: colors.primary + (Platform.OS === 'ios' ? '60' : '80')
                    }}
                    thumbColor={rememberMe ? colors.primary : '#ffffff'}
                    disabled={busy}
                    accessibilityLabel="Lembrar de mim"
                    accessibilityHint="Quando ativado, suas credenciais serão salvas para facilitar o próximo login"
                    accessibilityRole="switch"
                  />
                  <Pressable 
                    onPress={() => setRememberMe(!rememberMe)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Ativar ou desativar lembrar de mim"
                  >
                    <Text style={styles.rememberText}>Lembrar de mim</Text>
                  </Pressable>
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
                      title={busy ? 'Entrando...' : 'Entrar'}
                      onPress={() => {
                        animateButtonPress();
                        setTimeout(handleLogin, 100);
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
                            name="login" 
                            size={18} 
                            color={formOk ? "white" : "#666"}
                          />
                        )
                      }
                      accessibilityLabel={busy ? 'Fazendo login, aguarde' : 'Fazer login'}
                    />
                  </Animated.View>
                  
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
                </View>

                {/* Debug info - remove in production */}
                {__DEV__ && (
                  <View style={{ padding: 8, backgroundColor: 'rgba(255,0,0,0.1)', margin: 8, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: colors.text }}>Debug: Biometric: {biometricSupported ? 'YES' : 'NO'} | Credentials: {savedCredentials ? 'YES' : 'NO'}</Text>
                    <Text style={{ fontSize: 10, color: colors.text }}>Remember: {rememberMe ? 'YES' : 'NO'} | Email: {email || 'NONE'}</Text>
                  </View>
                )}
                
                {biometricSupported && savedCredentials && (
                  <Animated.View style={[styles.biometricButton, { opacity: fadeAnim }]}>
                    <Pressable
                      onPress={authenticateWithBiometrics}
                      disabled={busy}
                      style={({ pressed }) => [
                        styles.biometricIcon,
                        { transform: [{ scale: pressed ? 0.95 : 1 }] }
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Entrar com biometria"
                      accessibilityHint="Use sua digital ou Face ID para fazer login rapidamente"
                      accessibilityState={{ disabled: busy }}
                    >
                      <MaterialCommunityIcons
                        name="fingerprint"
                        size={24}
                        color={colors.primary}
                      />
                    </Pressable>
                    <Text style={[styles.subtitle, { fontSize: 12 }]}>Entrar com biometria</Text>
                  </Animated.View>
                )}

                <View style={styles.footer}>
                  <Pressable 
                    disabled={busy} 
                    onPress={() => nav.navigate('PasswordReset')}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    accessibilityRole="button"
                    accessibilityLabel="Esqueci a senha"
                    accessibilityHint="Toque para recuperar sua senha"
                    accessibilityState={{ disabled: busy }}
                  >
                    <Text style={styles.link}>Esqueci a senha</Text>
                  </Pressable>
                  <Pressable 
                    disabled={busy} 
                    onPress={() => nav.navigate('Signup')}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    accessibilityRole="button"
                    accessibilityLabel="Criar conta"
                    accessibilityHint="Toque para criar uma nova conta"
                    accessibilityState={{ disabled: busy }}
                  >
                    <Text style={styles.link}>Criar conta</Text>
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