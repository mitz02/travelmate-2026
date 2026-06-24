import admin from 'firebase-admin';
import { ensureFirebaseAdmin } from './firebase';
import { supabase } from './supabase.js';

export type NotificationType = 'service_purchase' | 'booking' | 'admin_alert' | 'system';

export const NotificationService = {
  /**
   * Sends a push notification via Firebase and stores it in the database.
   */
  async sendNotification(
    userId: string,
    title: string,
    body: string,
    type: NotificationType,
    data: Record<string, string> = {}
  ) {
    ensureFirebaseAdmin();
    try {
      const { data: notification, error: dbError } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          title,
          body,
          type,
          data,
          is_read: false
        }])
        .select()
        .single();

      if (dbError) {
        console.error('Failed to save notification to DB:', dbError);
      }

      const { data: tokens, error: tokenError } = await supabase
        .from('user_fcm_tokens')
        .select('token')
        .eq('user_id', userId);

      if (tokenError || !tokens || tokens.length === 0) {
        return notification;
      }

      const fcmTokens = tokens.map((t: any) => t.token);

      if (admin.apps.length > 0) {
        const message = {
          notification: { title, body },
          data: { type, ...data },
          tokens: fcmTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(fcmTokens[idx]);
            }
          });

          if (failedTokens.length > 0) {
            await supabase
              .from('user_fcm_tokens')
              .delete()
              .in('token', failedTokens);
          }
        }
      }

      return notification;
    } catch (err) {
      console.error('Error sending notification:', err);
      return null;
    }
  },

  async notifyAdmins(title: string, body: string, type: NotificationType, data: Record<string, string> = {}) {
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (!admins || admins.length === 0) return;

      await Promise.all(
        admins.map((adminUser: any) => this.sendNotification(adminUser.id, title, body, type, data))
      );
    } catch (err) {
      console.error('Error notifying admins:', err);
    }
  }
};
