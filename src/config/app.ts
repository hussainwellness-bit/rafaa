// App configuration — change the name and tagline here and it updates everywhere
export const APP_CONFIG = {
  name: 'RafaaTech',
  nameArabic: 'رفعتك',
  tagline: 'Elevate Your Performance',
  version: '1.0.0',
} as const

export type AppConfig = typeof APP_CONFIG
