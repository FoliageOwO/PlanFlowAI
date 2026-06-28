import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative } from './platformService';
import http from './api';

export async function requestPermission(): Promise<boolean> {
  if (!isNative()) return false;
  const perm = await LocalNotifications.requestPermissions();
  return perm.display === 'granted';
}

export async function scheduleReminder(reminder: {
  id: number;
  title: string;
  content: string;
  remindAt: string;
  taskId?: number | string | null;
}): Promise<number> {
  await LocalNotifications.schedule({
    notifications: [
      {
        id: reminder.id,
        title: reminder.title,
        body: reminder.content,
        schedule: { at: new Date(reminder.remindAt) },
        sound: 'default',
        extra: { taskId: reminder.taskId ? String(reminder.taskId) : undefined },
      },
    ],
  });
  return reminder.id;
}

export async function cancelReminder(notificationId: number) {
  await LocalNotifications.cancel({
    notifications: [{ id: notificationId }],
  });
}

export async function syncReminders() {
  if (!isNative()) return;
  try {
    const res: any = await http.get('/reminders/pending-local');
    const reminders: Array<{ id: number; title: string; content: string; remindAt: string; taskId?: number | string | null }> = res.data || res;
    const items: Array<{ reminderId: number; localNotificationId: string; syncStatus: string }> = [];
    for (const reminder of reminders) {
      const localNotificationId = await scheduleReminder(reminder);
      items.push({
        reminderId: reminder.id,
        localNotificationId: String(localNotificationId),
        syncStatus: 'SYNCED',
      });
    }
    await http.post('/reminders/local-sync', {
      deviceId: getDeviceId(),
      items,
    });
  } catch {
    // Silently fail – backend may not be available yet
  }
}

function getDeviceId(): string {
  const key = 'planflow-device-id';
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
}
