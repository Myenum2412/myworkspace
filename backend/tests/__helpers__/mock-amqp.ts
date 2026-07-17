import { EventEmitter } from "events";

interface Message {
  content: Buffer;
  properties: Record<string, unknown>;
  fields: Record<string, unknown>;
}

export class MockChannel extends EventEmitter {
  private queues: Map<string, Message[]> = new Map();
  private exchanges: Set<string> = new Set();
  private consumers: Map<string, (msg: Message) => Promise<void>> = new Map();
  public prefetchCount = 0;

  async assertQueue(queue: string, _opts?: Record<string, unknown>) {
    if (!this.queues.has(queue)) this.queues.set(queue, []);
    return { queue, messageCount: 0, consumerCount: 0 };
  }

  async assertExchange(exchange: string, _type: string, _opts?: Record<string, unknown>) {
    this.exchanges.add(exchange);
    return { exchange };
  }

  async bindQueue(_queue: string, _exchange: string, _pattern: string) {
    return;
  }

  publish(exchange: string, routingKey: string, content: Buffer, _opts?: Record<string, unknown>): boolean {
    const msg: Message = {
      content,
      properties: _opts || {},
      fields: { exchange, routingKey },
    };
    const key = `${exchange}:${routingKey}`;
    if (!this.queues.has(key)) this.queues.set(key, []);
    this.queues.get(key)!.push(msg);
    return true;
  }

  sendToQueue(queue: string, content: Buffer, _opts?: Record<string, unknown>): boolean {
    const msg: Message = {
      content,
      properties: _opts || {},
      fields: { exchange: "", routingKey: queue },
    };
    if (!this.queues.has(queue)) this.queues.set(queue, []);
    this.queues.get(queue)!.push(msg);
    return true;
  }

  async consume(queue: string, handler: (msg: Message) => Promise<void>, _opts?: Record<string, unknown>) {
    this.consumers.set(queue, handler);
    const msgs = this.queues.get(queue) || [];
    for (const msg of msgs) {
      await handler(msg);
    }
    return { consumerTag: `tag-${queue}` };
  }

  ack(_msg: Message): void {}

  nack(_msg: Message, _allUpTo?: boolean, _requeue?: boolean): void {}

  async checkQueue(queue: string) {
    const msgs = this.queues.get(queue) || [];
    return { queue, messageCount: msgs.length, consumerCount: this.consumers.has(queue) ? 1 : 0 };
  }

  prefetch(count: number) {
    this.prefetchCount = count;
  }

  async close() {
    this.queues.clear();
    this.consumers.clear();
  }

  getPublishedMessages(queue: string): Message[] {
    return this.queues.get(queue) || [];
  }

  clearQueue(queue: string) {
    this.queues.set(queue, []);
  }
}

export class MockConnection extends EventEmitter {
  private _channel: MockChannel;

  constructor() {
    super();
    this._channel = new MockChannel();
  }

  async createChannel(): Promise<MockChannel> {
    return this._channel;
  }

  async close() {
    await this._channel.close();
    this.emit("close");
  }

  get channel(): MockChannel {
    return this._channel;
  }
}
