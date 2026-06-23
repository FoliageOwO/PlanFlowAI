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
}): Promise<number> {
  await LocalNotifications.schedule({
    notifications: [
      {
        id: reminder.id,
        title: reminder.title,
        body: reminder.content,
        schedule: { at: new Date(reminder.remindAt) },
        sound: 'default',
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
    const reminders: Array<{ id: number; title: string; content: string; remindAt: string }> = res.data || res;
    for (const reminder of reminders) {
      await scheduleReminder(reminder);
    }
    await http.post('/reminders/local-sync');
  } catch {
    // Silently fail – backend may not be available yet
  }
}
