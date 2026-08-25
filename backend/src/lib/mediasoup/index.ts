import { createWorker } from "mediasoup";
import type {
  Consumer,
  DtlsParameters,
  Producer,
  Router,
  RtpCapabilities,
  RtpParameters,
  WebRtcTransport,
  Worker,
} from "mediasoup/types";
import { env } from "../../config/env.js";
import { logger } from "../logger/index.js";

/** Public info about a remote producer, broadcast to other participants. */
export interface ProducerInfo {
  producerId: string;
  peerId: string;
  name: string;
  kind: "audio" | "video";
  app: string; // "mic" | "cam" | "screen"
}

/** Per-call router state. */
interface CallRoomState {
  router: Router;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}

const RTC_MEDIA_CODECS = [
  { kind: "audio" as const, mimeType: "audio/opus", clockRate: 48000, channels: 2 },
  {
    kind: "video" as const,
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: { "x-google-start-bitrate": 1000 },
  },
  {
    kind: "video" as const,
    mimeType: "video/VP9",
    clockRate: 90000,
    parameters: { "x-google-start-bitrate": 1000 },
  },
  {
    kind: "video" as const,
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "level-asymmetry-allowed": 1,
      "profile-level-id": "42e01f",
      "x-google-start-bitrate": 1000,
    },
  },
];

/**
 * Lazily-created mediasoup SFU for media calls. One worker per process, one
 * Router per call, one WebRtcTransport per participant (shared for send+recv).
 * All signaling flows over Socket.IO `sfu:*` events (see src/lib/socketio).
 */
class MediaServer {
  private worker: Worker | null = null;
  private workerPromise: Promise<Worker | null> | null = null;
  private routers = new Map<string, Router>();
  private rooms = new Map<string, CallRoomState>();
  private transports = new Map<string, WebRtcTransport>();

  get isReady(): boolean {
    return this.worker !== null && !this.worker.closed;
  }

  /** Create the mediasoup worker (idempotent, single-flight). Returns false when disabled. */
  ensureWorker(): Promise<boolean> {
    if (!env.MEDIASOUP_ENABLED) return Promise.resolve(false);
    if (this.worker && !this.worker.closed) return Promise.resolve(true);
    if (this.workerPromise) return this.workerPromise.then(() => this.isReady);
    this.workerPromise = (async (): Promise<Worker | null> => {
      const worker = await createWorker({
        logLevel: env.MEDIASOUP_WORKER_LOG_LEVEL as "debug" | "warn" | "error",
        rtcMinPort: env.MEDIASOUP_RTC_MIN_PORT,
        rtcMaxPort: env.MEDIASOUP_RTC_MAX_PORT,
      });
      worker.on("died", () => {
        logger.error({ pid: worker.pid }, "mediasoup worker died");
        if (this.worker === worker) {
          this.worker = null;
          this.routers.clear();
          this.rooms.clear();
          this.transports.clear();
        }
      });
      this.worker = worker;
      logger.info(
        {
          pid: worker.pid,
          rtcRange: `${env.MEDIASOUP_RTC_MIN_PORT}-${env.MEDIASOUP_RTC_MAX_PORT}`,
        },
        "mediasoup worker started",
      );
      return worker;
    })();
    return this.workerPromise
      .then(() => this.isReady)
      .finally(() => {
        this.workerPromise = null;
      });
  }

  private async getRouter(callId: string): Promise<Router> {
    const existing = this.routers.get(callId);
    if (existing && !existing.closed) return existing;
    await this.ensureWorker();
    if (!this.worker) throw new Error("mediasoup SFU is not available");
    const router = await this.worker.createRouter({ mediaCodecs: RTC_MEDIA_CODECS });
    this.routers.set(callId, router);
    return router;
  }

  private getRoom(callId: string): CallRoomState {
    let state = this.rooms.get(callId);
    const router = this.routers.get(callId);
    if (!state) {
      state = { router: router as Router, producers: new Map(), consumers: new Map() };
      this.rooms.set(callId, state);
    }
    return state;
  }

  private getTransport(callId: string, transportId: string): WebRtcTransport {
    const transport = this.transports.get(transportId);
    if (!transport || transport.closed) throw new Error("Transport not found");
    if ((transport.appData as { callId?: string }).callId !== callId) {
      throw new Error("Transport does not belong to this call");
    }
    return transport;
  }

  /** Router RTP capabilities used to instantiate a mediasoup-client Device. */
  async getRouterRtpCapabilities(callId: string): Promise<RtpCapabilities> {
    const router = await this.getRouter(callId);
    return router.rtpCapabilities;
  }

  /** Create a WebRTC transport for a peer (shared for send and recv). */
  async createTransport(callId: string, peerId: string) {
    const router = await this.getRouter(callId);
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: env.MEDIASOUP_LISTEN_IP, announcedIp: env.MEDIASOUP_ANNOUNCED_IP }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1_000_000,
      appData: { peerId, callId },
    });
    this.transports.set(transport.id, transport);
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
    };
  }

  /** Connect a transport once DTLS parameters arrive from the client. */
  async connectTransport(
    callId: string,
    transportId: string,
    dtlsParameters: DtlsParameters,
  ): Promise<void> {
    const transport = this.getTransport(callId, transportId);
    await transport.connect({ dtlsParameters });
  }

  /**
   * Register a producer from the client-provided RTP parameters. Returns the
   * new producer id plus the pre-existing producers so the caller can wire up
   * consumers for each.
   */
  async produce(
    callId: string,
    transportId: string,
    peerId: string,
    name: string,
    app: string,
    kind: "audio" | "video",
    rtpParameters: RtpParameters,
  ): Promise<{ producerId: string; existing: ProducerInfo[] }> {
    const transport = this.getTransport(callId, transportId);
    const producer = await transport.produce({
      kind,
      rtpParameters,
      appData: { peerId, name, app },
    });
    const state = this.getRoom(callId);
    state.producers.set(producer.id, producer);

    const existing: ProducerInfo[] = [];
    for (const [id, p] of state.producers) {
      if (id === producer.id) continue;
      existing.push(toProducerInfo(p));
    }
    return { producerId: producer.id, existing };
  }

  /** Consume a remote producer (starts paused; client resumes after attach). */
  async consume(
    callId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
  ): Promise<{
    consumerId: string;
    producerId: string;
    kind: "audio" | "video";
    rtpParameters: RtpParameters;
  }> {
    const router = await this.getRouter(callId);
    const state = this.getRoom(callId);
    const transport = this.getTransport(callId, transportId);
    if (!state.producers.has(producerId)) throw new Error("Producer not found");
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error("Cannot consume producer with current router capabilities");
    }
    const consumer = await transport.consume({ producerId, rtpCapabilities, paused: true });
    state.consumers.set(consumer.id, consumer);
    return {
      consumerId: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  /** Resume a paused consumer once the client attaches the receiver stream. */
  async resumeConsumer(callId: string, consumerId: string): Promise<void> {
    const consumer = this.rooms.get(callId)?.consumers.get(consumerId);
    if (!consumer || consumer.closed) throw new Error("Consumer not found");
    await consumer.resume();
  }

  closeConsumer(callId: string, consumerId: string): void {
    this.rooms.get(callId)?.consumers.get(consumerId)?.close();
  }

  closeProducer(callId: string, producerId: string): void {
    this.rooms.get(callId)?.producers.get(producerId)?.close();
  }

  closeTransport(callId: string, transportId: string): void {
    this.getTransportOrNull(callId, transportId)?.close();
  }

  private getTransportOrNull(callId: string, transportId: string): WebRtcTransport | undefined {
    const transport = this.transports.get(transportId);
    if (!transport || (transport.appData as { callId?: string }).callId !== callId)
      return undefined;
    return transport;
  }

  /** Close everything owned by a peer (leave / disconnect). */
  closePeer(callId: string, peerId: string): void {
    for (const [id, transport] of this.transports) {
      if (
        (transport.appData as { callId?: string; peerId?: string }).callId === callId &&
        (transport.appData as { callId?: string; peerId?: string }).peerId === peerId
      ) {
        transport.close();
        this.transports.delete(id);
      }
    }
    const room = this.rooms.get(callId);
    if (room) {
      for (const [id, p] of room.producers) {
        if ((p.appData as { peerId?: string }).peerId === peerId) {
          p.close();
          room.producers.delete(id);
        }
      }
      for (const [id, c] of room.consumers) {
        if ((c.appData as { peerId?: string }).peerId === peerId) {
          c.close();
          room.consumers.delete(id);
        }
      }
    }
  }

  /** List current producers of a call (initial sync on join). */
  listProducers(callId: string): ProducerInfo[] {
    const room = this.rooms.get(callId);
    if (!room) return [];
    return [...room.producers.values()].map(toProducerInfo);
  }

  /** Release a call's router and all its media. */
  closeCall(callId: string): void {
    for (const [id, transport] of this.transports) {
      if ((transport.appData as { callId?: string }).callId === callId) {
        transport.close();
        this.transports.delete(id);
      }
    }
    const router = this.routers.get(callId);
    if (router && !router.closed) router.close();
    this.routers.delete(callId);
    this.rooms.delete(callId);
  }

  /** Graceful shutdown (SIGTERM / tests). */
  async close(): Promise<void> {
    for (const transport of this.transports.values()) {
      if (!transport.closed) transport.close();
    }
    this.transports.clear();
    for (const router of this.routers.values()) {
      if (!router.closed) router.close();
    }
    this.routers.clear();
    this.rooms.clear();
    if (this.worker && !this.worker.closed) {
      await this.worker.close();
      this.worker = null;
    }
  }
}

function toProducerInfo(p: Producer): ProducerInfo {
  const ad = p.appData as { peerId: string; name: string; app: string };
  return { producerId: p.id, peerId: ad.peerId, name: ad.name, kind: p.kind, app: ad.app };
}

export const mediaServer = new MediaServer();
