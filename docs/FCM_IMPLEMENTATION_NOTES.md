# Firebase HTTP v1 Implementation Notes

The notification function uses the Firebase Cloud Messaging HTTP v1 endpoint with a short-lived OAuth 2.0 access token minted from an Edge Function secret that contains the Firebase service-account JSON. The client never receives this credential. The required OAuth scope is `https://www.googleapis.com/auth/firebase.messaging`, and messages are sent to `https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`.

For each device token, delivery is isolated so one failed token cannot prevent other devices from receiving a notification. A response identifying an `UNREGISTERED` registration or an invalid registration token is treated as terminal and deletes that token from `device_tokens`; other failures are recorded in the function response/logs without deleting the token.

## References

[1]: https://firebase.google.com/docs/cloud-messaging/send/v1-api "Send a message using FCM HTTP v1 API"
[2]: https://firebase.google.com/docs/cloud-messaging/error-codes "FCM Error Codes"
