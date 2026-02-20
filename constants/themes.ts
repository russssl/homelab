export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
    background: string;
    surface: string;
    surfaceLight: string;
    surfaceHover: string;
    border: string;
    borderLight: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentDark: string;
    accentLight: string;
    running: string;
    stopped: string;
    paused: string;
    warning: string;
    created: string;
    info: string;
    danger: string;
    dangerBg: string;
    successBg: string;
    warningBg: string;
    infoBg: string;
    white: string;
    black: string;
    overlay: string;
    cardGradientStart: string;
    cardGradientEnd: string;
    statusBarStyle: 'light' | 'dark';
}

export const darkTheme: ThemeColors = {
    background: '#0D1117',
    surface: '#161B22',
    surfaceLight: '#1C2333',
    surfaceHover: '#222D3D',
    border: '#30363D',
    borderLight: '#3D444D',
    text: '#E6EDF3',
    textSecondary: '#8B949E',
    textMuted: '#6E7681',
    accent: '#00D4AA',
    accentDark: '#00A884',
    accentLight: '#00E5BB',
    running: '#3FB950',
    stopped: '#F85149',
    paused: '#D29922',
    warning: '#D29922',
    created: '#58A6FF',
    info: '#58A6FF',
    danger: '#F85149',
    dangerBg: '#2D1315',
    successBg: '#0D2818',
    warningBg: '#2D2300',
    infoBg: '#0D1D30',
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0,0,0,0.6)',
    cardGradientStart: '#161B22',
    cardGradientEnd: '#1C2333',
    statusBarStyle: 'light',
};

export const lightTheme: ThemeColors = {
    background: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceLight: '#F0F1F3',
    surfaceHover: '#E8EAED',
    border: '#D8DCE0',
    borderLight: '#E4E8EC',
    text: '#1A1D21',
    textSecondary: '#5C6370',
    textMuted: '#8E96A0',
    accent: '#00A884',
    accentDark: '#008C6E',
    accentLight: '#00C49A',
    running: '#2DA44E',
    stopped: '#CF222E',
    paused: '#BF8700',
    warning: '#BF8700',
    created: '#0969DA',
    info: '#0969DA',
    danger: '#CF222E',
    dangerBg: '#FFEBE9',
    successBg: '#DAFBE1',
    warningBg: '#FFF8C5',
    infoBg: '#DDF4FF',
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0,0,0,0.3)',
    cardGradientStart: '#FFFFFF',
    cardGradientEnd: '#F5F6F8',
    statusBarStyle: 'dark',
};

