import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.skrepy.vscode',
  appName: 'Microsoft VS Code',
  webDir: 'dist',
  server: {
    url: 'http://127.0.0.1:1145',
    androidScheme: 'http',
    allowNavigation: ['*'],
    cleartext: true,
  },
}

export default config
