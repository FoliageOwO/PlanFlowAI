import { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.planflow.app',
  appName: 'PlanFlow AI',
  webDir: 'dist',
  ...(serverUrl ? { server: { url: serverUrl, cleartext: true } } : {}),
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_icon', iconColor: '#1677ff' },
  },
};

export default config;
