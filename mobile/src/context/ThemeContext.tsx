import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'blue' | 'red' | 'purple' | 'galaxy';
export type ModeType = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  background: string;
  card: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  mode: ModeType;
  setMode: (m: ModeType) => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const palettes: Record<ThemeType, Record<ModeType, ThemeColors>> = {
  blue: {
    dark: {
      primary: '#3b82f6',
      background: '#0b0e14',
      card: '#1c2230',
      surface: '#121620',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      border: '#283144',
    },
    light: {
      primary: '#007aff',
      background: '#fafafc',
      card: '#ffffff',
      surface: '#f1f3f7',
      text: '#0f131a',
      textMuted: '#64748b',
      border: '#e2e8f0',
    },
  },
  red: {
    dark: {
      primary: '#ef4444',
      background: '#151212',
      card: '#282424',
      surface: '#1c1919',
      text: '#faf9f9',
      textMuted: '#a8a29e',
      border: '#383333',
    },
    light: {
      primary: '#dc2626',
      background: '#faf9f9',
      card: '#ffffff',
      surface: '#f3f1f1',
      text: '#1c1919',
      textMuted: '#78716c',
      border: '#e7e5e4',
    },
  },
  purple: {
    dark: {
      primary: '#a78bfa',
      background: '#0d0b14',
      card: '#201b33',
      surface: '#151221',
      text: '#f5f3ff',
      textMuted: '#c084fc',
      border: '#2e264f',
    },
    light: {
      primary: '#7c3aed',
      background: '#fbfaff',
      card: '#ffffff',
      surface: '#f3f0fa',
      text: '#1e1b4b',
      textMuted: '#6b21a8',
      border: '#e9e3f5',
    },
  },
  galaxy: {
    dark: {
      primary: '#f472b6',
      background: '#0c0a12',
      card: '#1d172e',
      surface: '#141021',
      text: '#fdf2f8',
      textMuted: '#f472b6',
      border: '#2f1e47',
    },
    light: {
      primary: '#db2777',
      background: '#fdfbfd',
      card: '#ffffff',
      surface: '#faeef4',
      text: '#3d0a21',
      textMuted: '#be185d',
      border: '#f3d5e4',
    },
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>('blue');
  const [mode, setModeState] = useState<ModeType>('dark');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load persisted theme/mode
    Promise.all([
      AsyncStorage.getItem('theme'),
      AsyncStorage.getItem('mode'),
    ]).then(([savedTheme, savedMode]) => {
      if (savedTheme) setThemeState(savedTheme as ThemeType);
      if (savedMode) setModeState(savedMode as ModeType);
      setLoading(false);
    });
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    setThemeState(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  const setMode = async (newMode: ModeType) => {
    setModeState(newMode);
    await AsyncStorage.setItem('mode', newMode);
  };

  const colors = palettes[theme][mode];

  if (loading) return null;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
