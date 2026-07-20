import { Schema, model, Document, Model } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";

export interface IStoredEvent extends Document {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  version: number;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
  causationId?: string;
  correlationId?: string;
  timestamp: Date;
}

const eventSchema = new Schema<IStoredEvent>({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true, index: true },
  aggregateType: { type: String, required: true, index: true },
  aggregateId: { type: String, required: true, index: true },
  version: { type: Number, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  causationId: { type: String },
  correlationId: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

eventSchema.index({ aggregateType: 1, aggregateId: 1, version: 1 }, { unique: true });
eventSchema.index({ causationId: 1 });
eventSchema.index({ correlationId: 1 });

export const EventStore = model<IStoredEvent>("EventStore", eventSchema);

export class EventSourcingRepository {
  constructor(
    private readonly aggregateType: string,
  ) {}

  async saveEvent(
    aggregateId: string,
    eventType: string,
    data: Record<string, unknown>,
    metadata: Record<string, unknown> = {},
  ): Promise<IStoredEvent> {
    const lastEvent = await EventStore.findOne(
      { aggregateType: this.aggregateType, aggregateId },
      { version: 1 },
      { sort: { version: -1 } },
    ).lean();

    const version = (lastEvent?.version || 0) + 1;
    const event = await EventStore.create({
      eventId: uuid(),
      eventType,
      aggregateType: this.aggregateType,
      aggregateId,
      version,
      data,
      metadata,
      timestamp: new Date(),
    });

    logger.debug({ eventId: event.eventId, aggregateId, eventType, version }, "Event stored");
    return event;
  }

  async getEvents(
    aggregateId: string,
    fromVersion = 0,
  ): Promise<any[]> {
    return EventStore.find({
      aggregateType: this.aggregateType,
      aggregateId,
      version: { $gt: fromVersion },
    })
      .sort({ version: 1 })
      .lean();
  }

  async getAggregateVersion(aggregateId: string): Promise<number> {
    const event = await EventStore.findOne(
      { aggregateType: this.aggregateType, aggregateId },
      { version: 1 },
      { sort: { version: -1 } },
    ).lean() as any;
    return event?.version || 0;
  }

  async replayEvents<T>(
    aggregateId: string,
    handlers: Record<string, (state: T, event: IStoredEvent) => T>,
    initialState: T,
  ): Promise<T> {
    const events = await this.getEvents(aggregateId);
    return events.reduce((state, event) => {
      const handler = handlers[event.eventType];
      return handler ? handler(state, event) : state;
    }, initialState);
  }

  async getEventsByType(
    eventType: string,
    limit = 100,
    skip = 0,
  ): Promise<any[]> {
    return EventStore.find({ eventType })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async getEventsByCorrelationId(correlationId: string): Promise<any[]> {
    return EventStore.find({ correlationId })
      .sort({ timestamp: 1 })
      .lean();
  }
}
