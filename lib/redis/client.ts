import { createClient } from 'redis';

type MiniStoreRedisClient = ReturnType<typeof createClient>;

declare global {
  var __miniStoreRedisClient: MiniStoreRedisClient | undefined;
}

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return null;
  }

  const client = createClient({ url: redisUrl });

  client.on('error', (error) => {
    console.error('Redis client error:', error);
  });

  return client;
}

export async function getRedisClient() {
  if (globalThis.__miniStoreRedisClient) {
    if (!globalThis.__miniStoreRedisClient.isOpen) {
      await globalThis.__miniStoreRedisClient.connect();
    }

    return globalThis.__miniStoreRedisClient;
  }

  const client = createRedisClient();

  if (!client) {
    return null;
  }

  await client.connect();
  globalThis.__miniStoreRedisClient = client;

  return client;
}
