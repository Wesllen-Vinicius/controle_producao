import React, { createContext, useContext } from 'react';
export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => <>{children}</>;
export const useTheme = () => ({ colorScheme: 'dark' as const });
