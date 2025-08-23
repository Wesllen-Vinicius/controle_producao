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
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);

  const h = useHaptics();
  const { colors, spacing, typography, radius } = useTheme();

  // Animações simplificadas
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconRotation = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const formTranslateY = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

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

    // Rotação sutil e contínua do ícone
    const rotateIcon = () => {
      iconRotation.setValue(0);
      Animated.timing(iconRotation, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: true
      }).start(() => rotateIcon());
    };
    rotateIcon();
  }, []);

  const doShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const iconRotate = iconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const contentWidth = Math.min(width - 48, 400);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { 
          flex: 1, 
          backgroundColor: colors.background 
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
          backgroundColor: colors.primary + '10',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          borderWidth: 2,
          borderColor: colors.primary + '20',
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
          backgroundColor: colors.danger + '10',
          borderColor: colors.danger + '20',
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginTop: 8,
        },
        errorText: {
          color: colors.danger,
          fontSize: 13,
          fontWeight: '600',
          textAlign: 'center',
        },
        buttonContainer: {
          marginTop: 8,
        },
        footer: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 24,
          paddingTop: 16,
        },
        link: {
          color: colors.primary,
          fontSize: 14,
          fontWeight: '600',
        },
      }),
    [colors, spacing, contentWidth]
  );

  // Validação simples
  const emailOk = email.includes('@') && email.includes('.') && email.length > 5;
  const passOk = pass.length >= 6;
  const formOk = emailOk && passOk && !busy;

  useEffect(() => {
    if (error) setError(null);
  }, [email, pass, error]);

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
      }

      setError(friendlyMessage);
      doShake();
    } finally {
      setBusy(false);
    }
  }, [email, pass, emailOk, passOk, h, doShake]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                    transform: [
                      { scale: iconScale },
                      { rotate: iconRotate }
                    ] 
                  }
                ]}>
                  <MaterialCommunityIcons 
                    name="factory" 
                    size={40} 
                    color={colors.primary} 
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
                    onChangeText={(text) => setEmail(text.toLowerCase().trim())}
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => passRef.current?.focus()}
                    editable={!busy}
                    maxLength={254}
                  />

                  <Input
                    ref={passRef}
                    label="Senha"
                    value={pass}
                    onChangeText={setPass}
                    placeholder="Sua senha"
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    autoCorrect={false}
                    maxLength={128}
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

                {!!error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  <Button
                    title={busy ? 'Entrando...' : 'Entrar'}
                    onPress={handleLogin}
                    loading={busy}
                    disabled={!formOk}
                    full
                  />
                </View>

                <View style={styles.footer}>
                  <Pressable disabled={busy} onPress={() => nav.navigate('PasswordReset')}>
                    <Text style={styles.link}>Esqueci a senha</Text>
                  </Pressable>
                  <Pressable disabled={busy} onPress={() => nav.navigate('Signup')}>
                    <Text style={styles.link}>Criar conta</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}