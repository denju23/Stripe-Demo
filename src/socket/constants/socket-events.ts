/**
 * Order / payment realtime notifications (not chat).
 * Mirror of FetchIt-style SOCKET_EVENTS — NestJS Stripe demo.
 */
export const SOCKET_EVENTS = {
  /** Server → user: order status changed (paid / failed / requires_payment) */
  ORDER_STATUS: 'orderStatusUpdated',

  /** Server → user: payment succeeded */
  PAYMENT_SUCCEEDED: 'paymentSucceeded',

  /** Server → user: payment failed */
  PAYMENT_FAILED: 'paymentFailed',

  /** Server → user: subscription created/updated/canceled */
  SUBSCRIPTION_UPDATED: 'subscriptionUpdated',

  /** Server → client: validation / unknown event / auth issues */
  SOCKET_ERROR: 'socketError',

  /** Client → server: keep presence alive (optional heartbeat) */
  HEARTBEAT: 'heartbeat',

  /** Client → server: demo inbound event (validated) */
  CLIENT_PING: 'clientPing',

  /** Server → client: reply to clientPing */
  CLIENT_PONG: 'clientPong',
} as const;

export type SocketEventName =
  (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** In-memory presence namespace (like CacheService "FetchIt") */
export const SOCKET_PRESENCE_NAMESPACE = 'StripeDemo';
