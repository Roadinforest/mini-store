import { prisma } from '@/db/prisma';
import { CartItem } from '@/types';
import { getRedisClient } from './client';

const RESERVATION_TTL_SECONDS = 15 * 60;

type StockDeltaItem = {
  productId: string;
  qty: number;
};

type ReserveResult =
  | { success: true; token: string }
  | { success: false; reason: 'OUT_OF_STOCK' | 'REDIS_UNAVAILABLE' | 'UNKNOWN'; message: string };

function getStockKey(productId: string) {
  return `stock:product:${productId}`;
}

function getReservationKey(token: string) {
  return `order:reservation:${token}`;
}

function getOrderReservationMapKey(orderId: string) {
  return `order:reservation:map:${orderId}`;
}

async function ensureStockCache(items: Pick<CartItem, 'productId'>[]) {
  const redis = await getRedisClient();
  if (!redis) return false;

  // 1. 批量查询 Redis 库存
  const productIds = [...new Set(items.map((item) => item.productId))];
  const keys = productIds.map(getStockKey);
  const values = await redis.mGet(keys);

  // 2. 对于 Redis 中不存在的库存数据，从数据库加载并写入 Redis
  const missingIds = productIds.filter((_, index) => values[index] === null);
  if (missingIds.length === 0) return true;

  const products = await prisma.product.findMany({
    where: { id: { in: missingIds } },
    select: { id: true, stock: true },
  });

  // 3. 将缺失的库存数据写入 Redis，使用 NX 选项避免覆盖已有数据
  const stockById = new Map(products.map((product) => [product.id, product.stock]));

  for (const productId of missingIds) {
    const stock = stockById.get(productId) ?? 0;
    await redis.setNX(getStockKey(productId), String(stock));
  }

  return true;
}

export async function reserveOrderStock(items: CartItem[], token: string): Promise<ReserveResult> {
  const redis = await getRedisClient();
  if (!redis) {
    return {
      success: false,
      reason: 'REDIS_UNAVAILABLE',
      message: 'Redis unavailable, fallback to database stock flow',
    };
  }

  const ready = await ensureStockCache(items);
  if (!ready) {
    return {
      success: false,
      reason: 'UNKNOWN',
      message: 'Failed to warm stock cache',
    };
  }

  const stockKeys = items.map((item) => getStockKey(item.productId));
  const reservationKey = getReservationKey(token);
  const keys = [...stockKeys, reservationKey];

  const luaScript = `

    local reservationKey = KEYS[#KEYS]  -- 最后一个 Key 是预扣记录 Key
    local ttlSeconds = tonumber(ARGV[1]) -- 第一个 ARGV 是 TTL

    -- 1. 检查是否重复预扣（幂等性）
    if redis.call('EXISTS', reservationKey) == 1 then
    return {2}  -- 状态码 2:重复预扣，视为成功
    end

    -- 2. 遍历检查所有商品库存是否充足
    for i = 1, (#KEYS - 1) do
    local needQty = tonumber(ARGV[i + 1])
    local current = tonumber(redis.call('GET', KEYS[i]) or '-1')
    if current < needQty then
        return {0, i, current}  -- 状态码 0:库存不足，返回商品索引
    end
    end

    -- 3. 批量扣减库存
    for i = 1, (#KEYS - 1) do
    local needQty = tonumber(ARGV[i + 1])
    redis.call('DECRBY', KEYS[i], needQty)
    end

    -- 4. 设置预扣记录（标记预扣成功）
    redis.call('SET', reservationKey, 'reserved', 'EX', ttlSeconds)
    return {1}  -- 状态码 1:预扣成功


  `;

  const response = (await redis.eval(luaScript, {
    keys,
    arguments: [String(RESERVATION_TTL_SECONDS), ...items.map((item) => String(item.qty))],
  })) as unknown[];

  const code = Number(response?.[0]);

  if (code === 1 || code === 2) {
    return { success: true, token };
  }

  if (code === 0) {
    const productIndex = Number(response[1]) - 1;
    const fallbackIndex = productIndex < 0 ? 0 : productIndex;
    const productId = items[fallbackIndex]?.productId;

    return {
      success: false,
      reason: 'OUT_OF_STOCK',
      message: productId
        ? `Product(${productId}) stock is insufficient`
        : 'Stock is insufficient',
    };
  }

  return {
    success: false,
    reason: 'UNKNOWN',
    message: 'Unknown reservation result',
  };
}

export async function releaseReservedStock(items: StockDeltaItem[], token: string) {
  const redis = await getRedisClient();
  if (!redis) return;

  const reservationKey = getReservationKey(token);

  // 1. 检查预扣记录是否存在，避免重复释放导致库存错误
  const exists = await redis.exists(reservationKey);
  if (!exists) return;

  // 2. 批量增加库存并删除预扣记录
  const pipeline = redis.multi();
  for (const item of items) {
    pipeline.incrBy(getStockKey(item.productId), item.qty);
  }
  pipeline.del(reservationKey);
  await pipeline.exec();
}

export async function releaseOrderReservation(orderId: string, items: StockDeltaItem[]) {
  const redis = await getRedisClient();
  if (!redis) return;

  const mapKey = getOrderReservationMapKey(orderId);
  const token = await redis.get(mapKey);

  if (!token) {
    await redis.del(mapKey);
    return;
  }

  const reservationKey = getReservationKey(token);
  const exists = await redis.exists(reservationKey);

  if (!exists) {
    await redis.del(mapKey);
    return;
  }

  const pipeline = redis.multi();
  for (const item of items) {
    pipeline.incrBy(getStockKey(item.productId), item.qty);
  }
  pipeline.del(reservationKey);
  pipeline.del(mapKey);
  await pipeline.exec();
}

export async function bindReservationToOrder(orderId: string, token: string) {
  const redis = await getRedisClient();
  if (!redis) return;

  await redis.set(getOrderReservationMapKey(orderId), token, {
    EX: RESERVATION_TTL_SECONDS,
  });
}

export async function consumeOrderReservation(orderId: string) {
  const redis = await getRedisClient();
  if (!redis) return;

  const mapKey = getOrderReservationMapKey(orderId);
  const token = await redis.get(mapKey);

  if (!token) {
    return;
  }

  await redis.multi().del(mapKey).del(getReservationKey(token)).exec();
}
