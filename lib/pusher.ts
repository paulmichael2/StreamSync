import Pusher from 'pusher';

const appId   = process.env.PUSHER_APP_ID   || '';
const key     = process.env.PUSHER_KEY       || '';
const secret  = process.env.PUSHER_SECRET    || '';
const cluster = process.env.PUSHER_CLUSTER   || 'us2';

const hasPusher = !!(appId && key && secret);

// Real Pusher client when credentials are present; stub when they're not
// so the route doesn't crash at module-load time on deploys without Pusher env vars.
export const pusherServer = hasPusher
  ? new Pusher({ appId, key, secret, cluster, useTLS: true })
  : ({
      trigger: async () => { /* no-op */ },
    } as unknown as Pusher);
