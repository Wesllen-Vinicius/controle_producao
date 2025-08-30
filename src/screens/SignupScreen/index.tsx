import React from 'react';
import {
  View,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../state/ThemeProvider';
import { useSignupForm } from './hooks/useSignupForm';

// Components
import SignupHeader from './components/SignupHeader';
import SignupForm from './components/SignupForm';
import TermsSection from './components/TermsSection';

export default function SignupScreen() {
  const { width } = useWindowDimensions();
  const { colors, spacing } = useTheme();
  const formData = useSignupForm();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SignupHeader width={width} />

            <LinearGradient colors={[colors.background, colors.background]} style={{ flex: 1 }}>
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.xl,
                  paddingBottom: spacing.lg,
                }}
              >
                <SignupForm
                  email={formData.email}
                  setEmail={formData.setEmail}
                  pass={formData.pass}
                  setPass={formData.setPass}
                  pass2={formData.pass2}
                  setPass2={formData.setPass2}
                  showPass={formData.showPass}
                  setShowPass={formData.setShowPass}
                  busy={formData.busy}
                  error={formData.error}
                  emailTouched={formData.emailTouched}
                  setEmailTouched={formData.setEmailTouched}
                  passwordTouched={formData.passwordTouched}
                  setPasswordTouched={formData.setPasswordTouched}
                  onSubmit={formData.handleSignup}
                  emailError={formData.emailError}
                  passwordError={formData.passwordError}
                  confirmPasswordError={formData.confirmPasswordError}
                />

                <TermsSection />
              </View>
            </LinearGradient>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}
