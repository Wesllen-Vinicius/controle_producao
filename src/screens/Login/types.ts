// src/screens/Login/types.ts
import { RefObject } from 'react';
import { TextInput } from 'react-native';

export type SavedCredentials = {
  email: string;
  password: string;
};

export type ValidationState = {
  emailOk: boolean;
  passOk: boolean;
  formOk: boolean;
  emailValid: boolean;
  passwordValid: boolean;
};

// Corrigindo o tipo da Ref para aceitar null na inicialização
export type LoginRefs = {
  emailRef: RefObject<TextInput | null>;
  passRef: RefObject<TextInput | null>;
};
