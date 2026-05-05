import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.iguatama.iguanews',
  appName: 'IguaNews',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // App carrega o site ao vivo — atualizações no Vercel refletem
    // automaticamente no app sem precisar gerar novo APK.
    url: 'https://iguanews.vercel.app',
    cleartext: false,
  },
  android: {
    buildOptions: {
      keystorePath: 'release.keystore',
      keystoreAlias: 'iguanews',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#FAFAF7',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
}

export default config
