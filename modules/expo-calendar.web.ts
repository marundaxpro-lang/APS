/**
 * Web stub for expo-calendar.
 * All calendar functions return safe defaults on web.
 */

export enum EntityTypes {
  EVENT = 'event',
  REMINDER = 'reminder',
}

export async function requestCalendarPermissionsAsync(): Promise<{ status: string }> {
  return { status: 'denied' };
}

export async function getCalendarsAsync(_entityType?: EntityTypes): Promise<any[]> {
  return [];
}

export async function createEventAsync(_calendarId: string, _details: object): Promise<string> {
  return '';
}

export async function getDefaultCalendarAsync(): Promise<any> {
  return null;
}
