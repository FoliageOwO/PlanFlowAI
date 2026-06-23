import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.planflow.app',
  appName: 'PlanFlow AI',
  webDir: 'dist',
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_icon', iconColor: '#1677ff' },
  },
};

export default config;
