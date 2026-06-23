import React, { useEffect } from 'react';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useNavigate } from 'react-router-dom';
import { requestPermission, syncReminders } from '../services/localNotificationService';
import { isNative } from '../services/platformService';

export default function CapacitorProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative()) return;

    // 1. Request notification permission and sync on first launch
    requestPermission().then((granted) => {
      if (granted) syncReminders();
    });

    // 2. Listen for app foreground → re-sync reminders
    let appStateHandler: { remove: () => void } | null = null;
    App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        syncReminders();
      }
    }).then((h) => {
      appStateHandler = h;
    });

    // 3. Listen for notification tap → navigate to task detail
    let notifHandler: { remove: () => void } | null = null;
    LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const taskId = event.notification.extra?.taskId;
      if (taskId) {
        navigate(`/tasks/${taskId}`);
      }
    }).then((h) => {
      notifHandler = h;
    });

    return () => {
      appStateHandler?.remove();
      notifHandler?.remove();
    };
  }, [navigate]);

  // Render nothing extra — just pass children through
  return <>{children}</>;
}
