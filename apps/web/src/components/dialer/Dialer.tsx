import { CallAlertState, PhoneProps } from "@/types/dialerTypes";
import { UA, WebSocketInterface } from "jssip";
import type { EndEvent, RTCSession } from "jssip/lib/RTCSession";
import {
  ArrowRightLeft,
  CircleX,
  Mic,
  MicOff,
  Pause,
  PhoneCall,
  PhoneOff,
  Play,
  User,
  X
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface SipHeader {
  raw: string;
}

interface SipRequest {
  call_id?: string;
  headers?: Record<string, SipHeader[]>;
}

interface RTCSessionInternal extends RTCSession {
  _request?: SipRequest;
}

interface NewRTCSessionEvent {
  originator: string;
  session: RTCSessionInternal;
  request?: SipRequest;
}

const Phone = ({
  id,
  userName,
  domain,
  password,
  port,
  setIsUserRegistered,
  setIsSipConnected
}: PhoneProps) => {
  // State declarations
  const [callAlert, setCallAlert] = useState<Partial<CallAlertState>>({});
  const [activeCall, setActiveCall] = useState<RTCSession | null>(null);
  const [queueCalls, setQueueCalls] = useState<RTCSession | null>(null);
  const [dialPhoneNumber, setDialPhoneNumber] = useState<string>("");
  const [isTransferVisible, setIsTransferVisible] = useState<boolean>(false);
  const [transferNumber, setTransferNumber] = useState<string>("");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState<string>("00:00");
  const [serverConnected, setServerConnected] = useState<boolean>(false);
  const [userConnected, setUserConnected] = useState<boolean>(false);

  // Refs
  const sipDialRef = useRef<UA | null>(null);
  const phoneAudioRef = useRef<HTMLAudioElement>(null);
  const ringer = useRef<HTMLAudioElement>(null);

  // Calculate call duration
  useEffect(() => {
    let durationInterval: ReturnType<typeof setInterval> | null = null;
    if (callStartTime) {
      durationInterval = setInterval(() => {
        const now = Date.now();
        const diffInSeconds = Math.floor((now - callStartTime) / 1000);
        const minutes = Math.floor(diffInSeconds / 60)
          .toString()
          .padStart(2, "0");
        const seconds = (diffInSeconds % 60).toString().padStart(2, "0");
        setCallDuration(`${minutes}:${seconds}`);
      }, 1000);
    }
    return () => {
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    };
  }, [callStartTime]);

  // Function to disconnect the call
  const callDisconnect = useCallback(() => {
    setActiveCall(null);
    setQueueCalls(null);
    setCallAlert({});
  }, []);

  // Handle call failed scenario
  const handleCallFailed = useCallback(
    (data: EndEvent, call: RTCSession) => {
      const raw = localStorage.getItem("liveCall");
      if (raw) {
        const currentCall = JSON.parse(raw) as Partial<CallAlertState>;
        const { originator, cause } = data;
        currentCall.hangupBy =
          originator === "remote"
            ? (call.remote_identity?.uri?.user ?? "")
            : String(id);
        currentCall.status = "call_failed";
        currentCall.cause = cause || "NO_ANSWER";
        localStorage.removeItem("liveCall");
        callDisconnect();
      }
    },
    [id, callDisconnect]
  );

  // Handle call end scenarios
  const handleCallEnd = useCallback(
    (data: EndEvent, call: RTCSession) => {
      const raw = localStorage.getItem("liveCall");
      if (raw) {
        const currentCall = JSON.parse(raw) as Partial<CallAlertState>;
        const { originator, cause } = data;
        currentCall.hangupBy =
          originator === "remote"
            ? (call.remote_identity?.uri?.user ?? "")
            : String(id);
        currentCall.status = "call_ended";
        currentCall.cause = cause || "ANSWER";
        localStorage.removeItem("liveCall");
        callDisconnect();
      }
    },
    [id, callDisconnect]
  );

  // Register WebRTC event handlers
  const registerWebrtcEvent = useCallback(
    (call: RTCSession) => {
      call.on("accepted", () => {
        setCallAlert((prevState) => ({
          ...prevState,
          status: "connected"
        }));
        setCallStartTime(Date.now());
      });
      call.on("failed", (data: EndEvent) => {
        handleCallFailed(data, call);
      });
      call.on("ended", (data: EndEvent) => {
        handleCallEnd(data, call);
      });
    },
    [handleCallFailed, handleCallEnd]
  );

  // Function to connect audio
  const connectAudio = useCallback(
    (call: RTCSession) => {
      if (phoneAudioRef.current) {
        call.connection.addEventListener("track", (event: RTCTrackEvent) => {
          if (event.track.kind === "audio" && event.streams[0]) {
            phoneAudioRef.current!.srcObject = event.streams[0];
            void phoneAudioRef.current!.play().catch(console.error);
          }
        });
      } else {
        callDisconnect();
      }
    },
    [callDisconnect]
  );

  const toggleMute = () => {
    if (activeCall) {
      if (isMuted) {
        activeCall.unmute({ audio: true });
        setIsMuted(false);
      } else {
        activeCall.mute({ audio: true });
        setIsMuted(true);
      }
    }
  };

  const transferCall = (targetURI: string) => {
    if (activeCall && targetURI) {
      const referCallable =
        activeCall.refer ??
        (activeCall as unknown as { sendRefer: typeof activeCall.refer })
          .sendRefer;
      referCallable.call(activeCall, `sip:${targetURI}@${domain}`, {
        eventHandlers: {
          succeeded: () => {
            setCallAlert((prevState) => ({
              ...prevState,
              status: "call_transferred",
              cause: "call_transferred"
            }));
            setIsTransferVisible(false);
            setTransferNumber("");
          },
          failed: () => {
            setCallAlert((prevState) => ({
              ...prevState,
              status: "transfer_failed",
              cause: "transfer_failed"
            }));
          }
        }
      });
    }
  };

  // Function to stop the ringtone
  const stopRing = () => {
    if (ringer.current) {
      ringer.current.currentTime = 0;
      ringer.current.pause();
    }
  };

  // Handle accept call
  const acceptHandle = () => {
    if (queueCalls) {
      stopRing();
      queueCalls.answer({
        mediaConstraints: {
          audio: true
        }
      });
      setCallAlert((prevState) => ({
        ...prevState,
        status: "connected",
        cause: "call_accepted"
      }));
      connectAudio(queueCalls);
    } else {
      callDisconnect();
    }
  };

  // Handle reject call
  const rejectHandle = () => {
    if (queueCalls) {
      queueCalls.terminate();
      setCallAlert((prevState) => ({
        ...prevState,
        hangupBy: id.toString()
      }));
      callDisconnect();
    } else {
      callDisconnect();
    }
  };

  // Handle dialing a phone number
  const callPhoneNumber = (phoneNumber: string) => {
    if (sipDialRef.current) {
      const options = {
        mediaConstraints: {
          audio: true
        }
      };
      try {
        sipDialRef.current.call(`sip:${phoneNumber}@${domain}`, options);
      } catch (error) {
        console.error("Error calling phone number:", error);
      }
    }
  };

  // Handle dialing event
  const dialPhoneNumberHandle = () => {
    callPhoneNumber(dialPhoneNumber);
  };

  // UseEffect to initialize SIP connection
  useEffect(() => {
    if (id && domain && password && port) {
      const configuration = {
        traceSip: true,
        register: true,
        hackIpInContact: true,
        hackWssInTransport: true,
        register_expires: 3600,
        displayName: userName,
        authorizationUser: id,
        wsServers: `wss://${domain}:${port}/ws`,
        rtcpMuxPolicy: "negotiate",
        uri: `sip:${id}@${domain}`,
        password: password
      };
      const socket = new WebSocketInterface(`wss://${domain}:${port}/ws`);
      const sip = new UA({ ...configuration, sockets: [socket] });
      sip.on("connected", () => {
        setIsSipConnected(true);
        setIsUserRegistered(false);
        setServerConnected(true);
        setUserConnected(false);
      });
      sip.on("disconnected", () => {
        setIsSipConnected(false);
        setIsUserRegistered(false);
        setServerConnected(false);
        setUserConnected(false);
      });
      sip.on("registered", () => {
        setIsUserRegistered(true);
        setIsSipConnected(true);
        setServerConnected(true);
        setUserConnected(true);
      });
      sip.on("registrationFailed", () => {
        setIsUserRegistered(false);
        setIsSipConnected(true);
        setServerConnected(true);
        setUserConnected(false);
      });
      sip.on("newRTCSession", (e: NewRTCSessionEvent) => {
        const { session: call } = e;
        const sessionId =
          call.direction === "incoming"
            ? (call._request?.headers?.["Sip-Caller-Id"]?.[0]?.raw ?? call.id)
            : (call._request?.call_id ?? call.id);
        const newCallAlert: Partial<CallAlertState> = {
          sessionId,
          phoneNumber: call.remote_identity?.uri?.user,
          direction: call.direction,
          cause: "",
          status: "ringing",
          hangupBy: "",
          userId: id,
          user_name: userName
        };
        if (call.direction === "incoming") {
          setCallAlert(newCallAlert);
        } else {
          setCallAlert(newCallAlert);
          connectAudio(call);
        }
        localStorage.setItem("liveCall", JSON.stringify(newCallAlert));
        setActiveCall(call);
        setQueueCalls(call);
        registerWebrtcEvent(call);
      });
      sip.start();
      sipDialRef.current = sip;
      return () => {
        sip.stop();
        sipDialRef.current = null;
      };
    }
  }, [
    id,
    domain,
    password,
    port,
    userName,
    connectAudio,
    registerWebrtcEvent,
    setIsSipConnected,
    setIsUserRegistered
  ]);

  const isNetworkAvailable = serverConnected && userConnected;
  const isIdle = Object.keys(callAlert).length === 0;

  return (
    <div className="z-10 h-full w-full">
      <audio
        id="audioOnline"
        ref={phoneAudioRef}
        preload="auto"
        style={{ width: "100%", height: "100px" }}
      >
        <track kind="captions" />
      </audio>
      <audio preload="auto" ref={ringer}>
        <source src="" type="audio/mpeg" />
        <track kind="captions" />
      </audio>
      <div className="flex h-112.5 flex-col justify-center p-6">
        {/* Dial screen */}
        {callAlert.status && callAlert.status !== "connected" && (
          <div className="flex h-full flex-col items-center justify-between gap-6">
            <section>
              <div className="relative flex size-44 items-center justify-center rounded-full">
                <User size={70} />
                <div className="bg-primary absolute inset-0 -z-10 flex size-44 animate-pulse items-center justify-center rounded-full"></div>
              </div>
              <p className="text-md mt-4 text-center">
                {callAlert.direction === "incoming" &&
                callAlert.status === "ringing"
                  ? "Incoming Call"
                  : "Dialing..."}
              </p>
              <p className="text-center text-xl font-bold">
                {callAlert.phoneNumber}
              </p>
            </section>
            {callAlert.direction === "incoming" &&
            callAlert.status === "ringing" ? (
              <section className="flex w-full justify-around">
                <button
                  className="flex size-12 items-center justify-center rounded-full bg-green-500 hover:bg-green-600"
                  onClick={acceptHandle}
                >
                  <PhoneCall size={24} />
                </button>
                <button
                  className="flex size-12 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
                  onClick={rejectHandle}
                >
                  <PhoneOff size={24} />
                </button>
              </section>
            ) : (
              <button
                className="flex size-12 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
                onClick={rejectHandle}
                type="button"
              >
                <PhoneOff size={24} />
              </button>
            )}
          </div>
        )}
        {/* Call connected */}
        {callAlert.status === "connected" && (
          <div className="flex h-full flex-col items-center justify-between gap-6">
            <section>
              <div className="relative flex size-44 items-center justify-center rounded-full">
                <User size={70} />
                <div className="bg-primary absolute inset-0 -z-10 flex size-44 animate-pulse items-center justify-center rounded-full"></div>
              </div>
              {/* Call duration */}
              <p className="mt-2 text-center text-lg font-semibold">
                {callDuration}
              </p>
              <p className="text-center text-xl font-bold">
                {callAlert.phoneNumber}
              </p>
            </section>
            <section className="flex w-full justify-around">
              <button
                className={`flex size-12 items-center justify-center rounded-full ${
                  callAlert.isHold
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-yellow-500 hover:bg-yellow-600"
                }`}
                onClick={() => {
                  setCallAlert((prevState) => ({
                    ...prevState,
                    isHold: !callAlert.isHold
                  }));
                  if (callAlert.isHold) {
                    activeCall?.unhold();
                  } else {
                    activeCall?.hold();
                  }
                }}
              >
                {callAlert.isHold ? <Play size={24} /> : <Pause size={24} />}
              </button>
              {/* Mute button */}
              <button
                className={`flex size-12 items-center justify-center rounded-full ${
                  isMuted
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-green-500 hover:bg-green-600"
                }`}
                onClick={toggleMute}
              >
                {isMuted ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              {/* Transfer Button */}
              <button
                className="flex size-12 items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600"
                onClick={() => setIsTransferVisible(!isTransferVisible)}
                type="button"
              >
                <ArrowRightLeft size={24} />
              </button>
              <button
                className="flex size-12 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
                onClick={rejectHandle}
                type="button"
              >
                <PhoneOff size={24} />
              </button>
            </section>
            {/* Transfer Input Field */}
            {isTransferVisible && (
              <div className="flex w-full flex-col items-center gap-4">
                <input
                  className="h-12 w-full rounded-md border border-gray-700 bg-transparent p-2 outline-none"
                  value={transferNumber}
                  placeholder="Enter Transfer Number"
                  onChange={(e) => setTransferNumber(e.target.value)}
                />
                <button
                  className="rounded-lg bg-green-500 px-4 py-2 hover:bg-green-600"
                  onClick={() => transferCall(transferNumber)}
                  type="button"
                >
                  Transfer Call
                </button>
              </div>
            )}
          </div>
        )}
        {/* Network status */}
        {!isNetworkAvailable && (
          <div className="flex size-full flex-col items-center justify-center">
            <CircleX size={50} className="text-red-500" />
            <p className="mt-4 text-2xl font-bold">Network Not Available!</p>
          </div>
        )}
        {/* Dial pad */}
        {isNetworkAvailable && isIdle && (
          <section className="flex h-full flex-col items-center justify-end gap-6">
            <div className="bg-primary flex w-full items-center rounded-xl border border-gray-700 px-4">
              <input
                className="h-12 w-full rounded-md bg-transparent outline-none disabled:cursor-not-allowed"
                value={dialPhoneNumber}
                disabled={!isNetworkAvailable}
                placeholder="Enter Phone Number"
                onChange={(e) => {
                  const onlyNumbers = e.target.value.replace(/[^0-9+]/g, "");
                  setDialPhoneNumber(onlyNumbers);
                }}
              />
              {dialPhoneNumber && (
                <X
                  size={25}
                  className="cursor-pointer hover:text-red-500"
                  onClick={() => {
                    setDialPhoneNumber("");
                  }}
                />
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "0", "#"].map(
                (digit) => (
                  <button
                    key={digit}
                    className="bg-primary rounded-full border border-gray-700 px-6 py-4 font-bold duration-300 ease-in-out hover:bg-blue-950 focus:outline-none"
                    onClick={() => setDialPhoneNumber((prev) => prev + digit)}
                  >
                    <p className="text-xl">{digit}</p>
                  </button>
                )
              )}
            </div>
            <button
              className="h-12 w-20 cursor-pointer rounded-xl bg-green-500 px-4 hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-900"
              onClick={dialPhoneNumberHandle}
              type="button"
              disabled={!isNetworkAvailable}
            >
              Dial
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

export default Phone;
