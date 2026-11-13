import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.couplechaos.app',
  appName: 'Couple Chaos',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SocialLogin: {
      providers: { google: true, apple: true, facebook: false, twitter: false },
      logLevel: 1,
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#07060A',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#07060A',
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#07060A',
  },
  ios: {
    backgroundColor: '#07060A',
    contentInset: 'never',
    scrollEnabled: false,
  },
};

export default config;
