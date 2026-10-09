import * as Notifications from "expo-notifications";
import { planInfo } from "./db";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// One weekly reminder per day of the active phase. Everything runs on the
// phone; nothing goes through a push server.
export async function syncReminders() {
  const plan = planInfo();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!plan || !plan.reminders) return { scheduled: 0, allowed: true };
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return { scheduled: 0, allowed: false };
  const [hour, minute] = parseTime(plan.reminderTime);
  for (const day of plan.days) {
    const names = day.routines.map((routine) => routine.name).join(" + ");
    await Notifications.scheduleNotificationAsync({
      content: {
        title: day.title,
        body: [day.body, names ? `Routine: ${names}.` : ""].filter(Boolean).join(" "),
        data: { routine: day.routines[0]?.id || null },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day.weekday + 1,
        hour,
        minute,
      },
    });
  }
  return { scheduled: plan.days.length, allowed: true };
}

export function parseTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return [7, 30];
  const hour = Math.min(Number(match[1]), 23);
  const minute = Math.min(Number(match[2]), 59);
  return [hour, minute];
}

export function addTapListener(onRoutine) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const routine = response.notification.request.content.data?.routine;
    if (routine) onRoutine(routine);
  });
  return () => subscription.remove();
}
