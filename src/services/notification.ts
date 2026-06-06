import admin from 'firebase-admin';
import { config } from '../config/index.js';
import { supabase } from './supabase.js';

// Initialize Firebase Admin if credentials are provided
if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    console.log('Firebase Admin initialized for push notifications.');
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err);
  }
}

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
    try {
      // 1. Store in the database for the Notification Center
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

      // 2. Fetch user FCM tokens
      const { data: tokens, error: tokenError } = await supabase
        .from('user_fcm_tokens')
        .select('token')
        .eq('user_id', userId);

      if (tokenError || !tokens || tokens.length === 0) {
        // User has no registered devices, just return silently
        return notification;
      }

      const fcmTokens = tokens.map((t: any) => t.token);

      // 3. Send Push via Firebase Admin
      if (admin.apps.length > 0) {
        const message = {
          notification: {
            title,
            body,
          },
          data: {
            type,
            ...data,
          },
          tokens: fcmTokens,
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        
        // Handle failed tokens (e.g. uninstalled app)
        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(fcmTokens[idx]);
            }
          });
          
          if (failedTokens.length > 0) {
            // Cleanup invalid tokens
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
      // We don't throw here to avoid failing the main business logic (e.g. booking flow)
      return null;
    }
  },

  /**
   * Helper to send notification to all Admins
   */
  async notifyAdmins(title: string, body: string, type: NotificationType, data: Record<string, string> = {}) {
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (!admins || admins.length === 0) return;

      // Send to each admin in parallel
      await Promise.all(
        admins.map(admin => this.sendNotification(admin.id, title, body, type, data))
      );
    } catch (err) {
      console.error('Error notifying admins:', err);
    }
  }
};
