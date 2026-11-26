import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.pocketarcade',
  appName: '口袋街机',
  webDir: 'dist',
  appendUserAgent: 'PocketArcade',
  android: {
    backgroundColor: '#15101e',
    adjustMarginsForEdgeToEdge: 'auto',
  },
}

export default config
