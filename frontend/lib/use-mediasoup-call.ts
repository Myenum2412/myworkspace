"use client";

import { Device, type types } from "mediasoup-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSocketIO } from "@/lib/socketio-client";

export type ProducerApp = "mic" | "cam" | "screen";

export interface SfuProducer {
  producerId: string;
  peerId: string;
  name: string;
  kind: "audio" | "video";
  app: ProducerApp;
}

interface Options {
  callId?: string;
  enabled?: boolean;
  mediaMode?: "video" | "audio";
  selfUserId?: string;
  selfName?: string;
  onError?: (message: string) => void;
}

interface ConsumerRecord {
  consumer: types.Consumer;
  producerId: string;
  peerId: string;
}

const MIC = "mic";
const CAM = "cam";
const SCREEN = "screen";

const _MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true },
  video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
};

const SCREEN_CONSTRAINTS: MediaStreamConstraints = {
  video: { frameRate: { ideal: 24 } },
  audio: false,
};

function _asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/**
 * SFU call engine backed by the backend mediasoup worker. Signaling runs over
 * the shared Socket.IO connection (`sfu:*` events). Each participant opens one
 * send transport and one recv transport; local tracks are produced onto the
 * router and every remote producer is consumed onto a per-peer MediaStream.
 */
export function useSfuCall(options: Options) {
  const {
    callId,
    enabled = false,
    mediaMode = "video",
    selfUserId,
    selfName = "",
    onError,
  } = options;

  const [connected, setConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mediaMode === "video");
  const [screenOn, setScreenOn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<types.Transport | null>(null);
  const recvTransportRef = useRef<types.Transport | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const producersRef = useRef<Map<ProducerApp, types.Producer>>(new Map());
  const consumersRef = useRef<Map<string, ConsumerRecord>>(new Map());
  const consumedProducersRef = useRef<Set<string>>(new Set());
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});
  const pendingProducersRef = useRef<SfuProducer[]>([]);

  const callIdRef = useRef(callId);
  const enabledRef = useRef(enabled);
  const mediaModeRef = useRef(mediaMode);
  const selfIdRef = useRef(selfUserId);
  const selfNameRef = useRef(selfName);
  const onErrorRef = useRef(onError);
  const micOnRef = useRef(true);
  const camOnRef = useRef(mediaMode === "video");
  const disposedRef = useRef(false);

  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);
  useEffect(() => {
    mediaModeRef.current = mediaMode;
  }, [mediaMode]);
  useEffect(() => {
    selfIdRef.current = selfUserId;
  }, [selfUserId]);
  useEffect(() => {
    selfNameRef.current = selfName;
  }, [selfName]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const reportError = useCallback((msg: string) => {
    setErrorMessage(msg);
    try {
      onErrorRef.current?.(msg);
    } catch {
      // ignore
    }
  }, []);

  const syncRemote = useCallback(() => {
    setRemoteStreams({ ...remoteStreamsRef.current });
  }, []);

  const deliverProducer = useCallback(
    async (p: SfuProducer) => {
      const call = callIdRef.current;
      const device = deviceRef.current;
      const recv = recvTransportRef.current;
      if (!call || !device || !recv || disposedRef.current) return;
      if (consumedProducersRef.current.has(p.producerId)) return;
      consumedProducersRef.current.add(p.producerId);

      getSocketIO().emit(
        "sfu:consume",
        {
          callId: call,
          transportId: recv.id,
          producerId: p.producerId,
          rtpCapabilities: device.rtpCapabilities,
        },
        async (res: any) => {
          if (disposedRef.current) return;
          const consumerId = res?.consumerId;
          const rtpParameters = res?.rtpParameters;
          const kind = res?.kind as "audio" | "video" | undefined;
          const recvTransport = recvTransportRef.current;
          if (!consumerId || !rtpParameters || !kind || !recvTransport) return;
          try {
            const consumer = await recvTransport.consume({
              id: consumerId,
              producerId: p.producerId,
              kind,
              rtpParameters,
            });
            if (disposedRef.current) {
              consumer.close();
              return;
            }
            consumersRef.current.set(consumerId, {
              consumer,
              producerId: p.producerId,
              peerId: p.peerId,
            });
            consumer.on("trackended", () => {
              consumersRef.current.delete(consumerId);
            });
            if (consumer.kind === "video" || consumer.kind === "audio") {
              let stream = remoteStreamsRef.current[p.peerId];
              if (!stream) {
                stream = new MediaStream();
                remoteStreamsRef.current[p.peerId] = stream;
                syncRemote();
              }
              stream.addTrack(consumer.track);
            }
            getSocketIO().emit("sfu:resume-consumer", { callId: call, consumerId });
          } catch (_err) {
            consumedProducersRef.current.delete(p.producerId);
            reportError("Could not receive remote media");
          }
        },
      );
    },
    [reportError, syncRemote],
  );

  const enqueueProducer = useCallback(
    (p: SfuProducer) => {
      if (consumedProducersRef.current.has(p.producerId)) return;
      if (!recvTransportRef.current) {
        pendingProducersRef.current.push(p);
        return;
      }
      void deliverProducer(p);
    },
    [deliverProducer],
  );

  const flushPending = useCallback(() => {
    const pending = pendingProducersRef.current.splice(0);
    for (const p of pending) enqueueProducer(p);
  }, [enqueueProducer]);

  /** Create/close a local producer for an app, wrapping the transport events. */
  const hookTransportHandlers = useCallback(
    (transport: types.Transport, direction: "send" | "recv") => {
      const call = callIdRef.current;

      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        getSocketIO().emit(
          "sfu:connect-transport",
          { callId: call, transportId: transport.id, dtlsParameters },
          (res: any) => {
            if (res?.error) errback(new Error(res.error));
            else callback();
          },
        );
      });

      transport.on("connectionstatechange", () => {
        if (direction === "recv") {
          const state = transport.connectionState;
          setConnected(state === "connected");
        }
      });

      if (direction === "send") {
        transport.on("produce", (event, callback, errback) => {
          const { kind, rtpParameters, appData } = event as {
            kind: "audio" | "video";
            rtpParameters: types.RtpParameters;
            appData?: { app?: ProducerApp; name?: string };
          };
          const app = appData?.app ?? "media";
          getSocketIO().emit(
            "sfu:produce",
            {
              callId: call,
              transportId: transport.id,
              kind,
              app,
              name: selfNameRef.current,
              rtpParameters,
            },
            (res: any) => {
              if (res?.error) return errback(new Error(res.error));
              callback({ id: res.producerId });
              for (const p of res.existing || []) enqueueProducer(p);
            },
          );
        });
      }
    },
    [enqueueProducer],
  );

  /** Produce a local track (replaces any existing producer for `app`). */
  const ensureProducer = useCallback(
    async (app: ProducerApp, track: MediaStreamTrack): Promise<boolean> => {
      const send = sendTransportRef.current;
      const call = callIdRef.current;
      if (!send || !call) return false;
      const existing = producersRef.current.get(app);
      if (existing && !existing.closed) {
        return true;
      }
      try {
        const producer = await send.produce({ track, appData: { app, name: selfNameRef.current } });
        producersRef.current.set(app, producer);
        producer.on("trackended", () => {
          if (producersRef.current.get(app) === producer) producersRef.current.delete(app);
        });
        return true;
      } catch (_err) {
        if (app === SCREEN) {
          setScreenOn(false);
        }
        return false;
      }
    },
    [],
  );

  const closeProducer = useCallback((app: ProducerApp) => {
    const producer = producersRef.current.get(app);
    if (producer && !producer.closed) producer.close();
    producersRef.current.delete(app);
  }, []);

  const toggleMic = useCallback(async () => {
    const next = !micOnRef.current;
    micOnRef.current = next;
    setMicOn(next);
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return next;
    if (next) await ensureProducer(MIC, track);
    else closeProducer(MIC);
    track.enabled = next;
    return next;
  }, [closeProducer, ensureProducer]);

  const toggleCam = useCallback(async () => {
    const next = !camOnRef.current;
    camOnRef.current = next;
    setCamOn(next);
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return next;
    if (next) await ensureProducer(CAM, track);
    else closeProducer(CAM);
    track.enabled = next;
    return next;
  }, [closeProducer, ensureProducer]);

  const toggleScreen = useCallback(async (): Promise<boolean> => {
    if (screenStreamRef.current) {
      for (const t of screenStreamRef.current.getTracks()) t.stop();
      screenStreamRef.current = null;
      closeProducer(SCREEN);
      setScreenStream(null);
      setScreenOn(false);
      return false;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia(SCREEN_CONSTRAINTS);
      if (disposedRef.current) {
        for (const t of displayStream.getTracks()) t.stop();
        return false;
      }
      screenStreamRef.current = displayStream;
      setScreenStream(displayStream);
      const track = displayStream.getVideoTracks()[0];
      if (track) {
        track.addEventListener("ended", () => {
          if (screenStreamRef.current === displayStream) screenStreamRef.current = null;
          closeProducer(SCREEN);
          setScreenStream(null);
          setScreenOn(false);
        });
        const ok = await ensureProducer(SCREEN, track);
        if (!ok) {
          for (const t of displayStream.getTracks()) t.stop();
          screenStreamRef.current = null;
          setScreenStream(null);
          return false;
        }
        setScreenOn(true);
      }
      return true;
    } catch {
      return false;
    }
  }, [closeProducer, ensureProducer]);

  useEffect(() => {
    if (!enabled || !callId || !selfUserId) return;
    let disposed = false;
    disposedRef.current = false;
    const socket = getSocketIO();

    const emit = <T = any>(event: string, payload: unknown): Promise<T> =>
      new Promise((resolve, reject) => {
        socket.emit(event, payload, (res: any) => {
          if (res?.error) reject(new Error(res.error));
          else resolve(res as T);
        });
      });

    socket.on("sfu:new-producer", (data: { producer?: SfuProducer }) => {
      const p = data?.producer;
      if (p && p.peerId !== selfIdRef.current) enqueueProducer(p);
    });

    socket.on("sfu:peer-left", (data: { peerId?: string }) => {
      const id = data?.peerId;
      if (!id) return;
      if (remoteStreamsRef.current[id]) {
        delete remoteStreamsRef.current[id];
        syncRemote();
      }
    });

    const start = async () => {
      try {
        const { rtpCapabilities } = await emit("sfu:get-rtp-capabilities", callId);
        const device = new Device();
        if (!device.canProduce("audio") && !device.canProduce("video")) {
          throw new Error("WebRTC is not supported in this browser");
        }
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        if (disposed) return;
        deviceRef.current = device;

        // Local media (mic first; camera only for video calls).
        if (!localStreamRef.current) {
          const wantsVideo = mediaModeRef.current === "video";
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: wantsVideo
              ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
              : false,
          });
          if (disposed) {
            for (const t of stream.getTracks()) t.stop();
            return;
          }
          localStreamRef.current = stream;
          setLocalStream(stream);
        }

        const sendParams = await emit("sfu:create-transport", callId);
        if (disposed) return;
        const send = device.createSendTransport(sendParams);
        hookTransportHandlers(send, "send");
        sendTransportRef.current = send;

        const recvParams = await emit("sfu:create-transport", callId);
        if (disposed) return;
        const recv = device.createRecvTransport(recvParams);
        hookTransportHandlers(recv, "recv");
        recvTransportRef.current = recv;

        await emit("sfu:join", { callId });
        if (disposed) return;

        // Produce our local media (mic + camera for video calls).
        await ensureProducer(MIC, localStreamRef.current.getAudioTracks()[0]);
        if (mediaModeRef.current === "video") {
          const camTrack = localStreamRef.current.getVideoTracks()[0];
          if (camTrack) await ensureProducer(CAM, camTrack);
        }

        // Sync: consume producers of people who were here before us.
        const list = await emit("sfu:list-producers", callId);
        const producers = (list?.producers || []) as SfuProducer[];
        for (const p of producers) {
          if (p.peerId !== selfIdRef.current) enqueueProducer(p);
        }
        flushPending();
      } catch (err) {
        if (!disposed) {
          const message =
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Microphone/camera permission was denied. Enable them in your browser to join."
              : err instanceof Error
                ? err.message
                : "Could not start the media connection.";
          reportError(message);
        }
      }
    };

    void start();

    return () => {
      disposed = true;
      disposedRef.current = true;
      socket.emit("sfu:leave", { callId });
      socket.off("sfu:new-producer");
      socket.off("sfu:peer-left");

      for (const consumer of consumersRef.current.values()) {
        try {
          consumer.consumer.close();
        } catch {
          // ignore
        }
      }
      consumersRef.current.clear();
      consumedProducersRef.current.clear();
      pendingProducersRef.current = [];

      for (const producer of producersRef.current.values()) {
        try {
          producer.close();
        } catch {
          // ignore
        }
      }
      producersRef.current.clear();

      try {
        sendTransportRef.current?.close();
        recvTransportRef.current?.close();
      } catch {
        // ignore
      }
      sendTransportRef.current = null;
      recvTransportRef.current = null;
      deviceRef.current = null;

      if (localStreamRef.current) {
        for (const t of localStreamRef.current.getTracks()) t.stop();
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        for (const t of screenStreamRef.current.getTracks()) t.stop();
        screenStreamRef.current = null;
      }
      remoteStreamsRef.current = {};
      setLocalStream(null);
      setScreenStream(null);
      syncRemote();
      setConnected(false);
      setErrorMessage(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enabled,
    callId,
    syncRemote,
    reportError,
    ensureProducer,
    selfUserId,
    hookTransportHandlers,
    flushPending,
    enqueueProducer,
  ]);

  const localPreviewRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  }, []);

  const screenPreviewRef = useCallback((el: HTMLVideoElement | null) => {
    if (el && screenStreamRef.current && el.srcObject !== screenStreamRef.current) {
      el.srcObject = screenStreamRef.current;
    }
  }, []);

  const remoteStreamRef = useCallback(
    (peerId: string) => (el: HTMLVideoElement | null) => {
      if (!el) return;
      const stream = remoteStreamsRef.current[peerId];
      if (stream && el.srcObject !== stream) el.srcObject = stream;
    },
    [],
  );

  const leaveCall = useCallback(() => {
    if (callIdRef.current) getSocketIO().emit("sfu:leave", { callId: callIdRef.current });
  }, []);

  return {
    connected,
    localStream,
    screenStream,
    remoteStreams,
    micOn,
    camOn,
    screenOn,
    errorMessage,
    localPreviewRef,
    screenPreviewRef,
    remoteStreamRef,
    toggleMic,
    toggleCam,
    toggleScreen,
    leaveCall,
  };
}
