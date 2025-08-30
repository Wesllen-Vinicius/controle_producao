// src/screens/Login/hooks/useLogin.ts
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, TextInput } from 'react-native';
import { useHaptics } from '../../../hooks/useHaptics';
import * as LoginService from '../services';
import { LoginRefs, SavedCredentials, ValidationState } from '../types';

export function useLogin() {
  const nav = useNavigation();
  const h = useHaptics();

  const emailRef = useRef<TextInput>(null);
  const passRef = useRef<TextInput>(null);
  const refs: LoginRefs = { emailRef, passRef };

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<SavedCredentials | null>(null);

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.8)).current;
  const formTranslateY = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        useNativeDriver: true,
        stiffness: 100,
        damping: 10,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const initialize = async () => {
      const isSupported = await LoginService.checkBiometricSupport();
      setBiometricSupported(isSupported);
      const {
        email,
        credentials,
        rememberMe: shouldRemember,
      } = await LoginService.loadSavedCredentials(isSupported);
      setRememberMe(shouldRemember);
      if (email) setEmail(email);
      if (credentials) setSavedCredentials(credentials);
    };
    initialize();
  }, [fadeAnim, formTranslateY, iconScale]);

  useEffect(() => {
    if (error) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, pass]);

  const validation = useMemo((): ValidationState => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailOk = emailRegex.test(email) && email.length <= 254;
    const passOk = pass.length >= 6 && pass.length <= 128;
    return {
      emailOk,
      passOk,
      formOk: emailOk && passOk && !busy,
      emailValid: !emailTouched || emailOk,
      passwordValid: !passwordTouched || passOk,
    };
  }, [email, pass, busy, emailTouched, passwordTouched]);

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (!emailTouched) setEmailTouched(true);
  };
  const handlePasswordChange = (text: string) => {
    setPass(text);
    if (!passwordTouched) setPasswordTouched(true);
  };

  const doShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnim]);

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();
    if (!validation.emailOk) {
      h.warning();
      setError('Por favor, insira um e-mail válido.');
      doShake();
      return emailRef.current?.focus();
    }
    if (!validation.passOk) {
      h.warning();
      setError('A senha deve ter pelo menos 6 caracteres.');
      doShake();
      return passRef.current?.focus();
    }

    setBusy(true);
    try {
      await LoginService.handleEmailLogin(email, pass);
      const newCreds = await LoginService.saveOrClearCredentials(
        rememberMe,
        biometricSupported,
        email,
        pass
      );
      if (newCreds) setSavedCredentials(newCreds);
      h.success();
    } catch (e: unknown) {
      h.error();
      setError((e as Error).message);
      doShake();
    } finally {
      setBusy(false);
    }
  }, [email, pass, validation, rememberMe, biometricSupported, h, doShake]);

  const handleBiometricAuth = useCallback(async () => {
    if (!savedCredentials) return;
    setBusy(true);
    try {
      await LoginService.authenticateWithBiometrics(savedCredentials);
      h.success();
    } catch (error: unknown) {
      h.error();
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }, [savedCredentials, h]);

  return {
    state: {
      email,
      pass,
      showPass,
      busy,
      error,
      rememberMe,
      biometricSupported,
      savedCredentials,
    },
    setState: { setShowPass, setRememberMe },
    refs,
    validation,
    animations: { fadeAnim, iconScale, formTranslateY, shakeAnim },
    handlers: {
      handleEmailChange,
      handlePasswordChange,
      handleLogin,
      handleBiometricAuth,
      navigateTo: (screen: string) => nav.navigate(screen as never),
    },
  };
}
