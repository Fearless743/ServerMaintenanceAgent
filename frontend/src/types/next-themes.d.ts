declare module 'next-themes' {
  import { ReactNode } from 'react';

  export interface ThemeProviderProps {
    children: ReactNode;
    attribute?: string | string[];
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    forcedTheme?: string;
    storageKey?: string;
    themes?: string[];
    value?: Record<string, string>;
  }

  export function ThemeProvider(props: ThemeProviderProps): JSX.Element;

  export function useTheme(): {
    theme: string | undefined;
    setTheme: (theme: string) => void;
    forcedTheme: string | undefined;
    resolvedTheme: string | undefined;
    systemTheme: string | undefined;
    themes: string[];
  };
}

declare module 'next-themes/dist/types' {
  export type ThemeProviderProps = {
    children: React.ReactNode;
    attribute?: string | string[];
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
    forcedTheme?: string;
    storageKey?: string;
    themes?: string[];
    value?: Record<string, string>;
  };
}