import { cn } from "@/lib/utils";
import { CallAlertState, PhoneProps } from "@/types/dialerTypes";
import { UA, WebSocketInterface } from "jssip";
import type { EndEvent, RTCSession } from "jssip/lib/RTCSession";
import {
  ArrowRightLeft,
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

const KEYPAD_BUTTONS = [
  { digit: "1", sub: "" },
  { digit: "2", sub: "ABC" },
  { digit: "3", sub: "DEF" },
  { digit: "4", sub: "GHI" },
  { digit: "5", sub: "JKL" },
  { digit: "6", sub: "MNO" },
  { digit: "7", sub: "PQRS" },
  { digit: "8", sub: "TUV" },
  { digit: "9", sub: "WXYZ" },
  { digit: "+", sub: "" },
  { digit: "0", sub: "+" },
  { digit: "#", sub: "" }
];

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
  setIsSipConnected,
  className
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
      });
      sip.on("disconnected", () => {
        setIsSipConnected(false);
        setIsUserRegistered(false);
      });
      sip.on("registered", () => {
        setIsUserRegistered(true);
        setIsSipConnected(true);
      });
      sip.on("registrationFailed", () => {
        setIsUserRegistered(false);
        setIsSipConnected(true);
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

  const isIdle = Object.keys(callAlert).length === 0;

  return (
    <div
      className={cn("flex size-full flex-col justify-between p-4", className)}
    >
      <audio
        id="audioOnline"
        ref={phoneAudioRef}
        preload="auto"
        className="hidden"
      >
        <track kind="captions" />
      </audio>
      <audio preload="auto" ref={ringer} className="hidden">
        <source src="" type="audio/mpeg" />
        <track kind="captions" />
      </audio>

      <div className="flex flex-1 flex-col justify-center">
        {/* Dial screen (Outgoing ringing or Incoming call) */}
        {callAlert.status && callAlert.status !== "connected" && (
          <div className="flex h-full flex-col items-center justify-between gap-6 py-2">
            <section className="flex flex-col items-center">
              <div className="bg-primary/10 text-primary border-primary/20 relative flex size-28 items-center justify-center rounded-full border">
                <User size={48} />
                <div className="bg-primary/20 absolute inset-0 -z-10 animate-ping rounded-full opacity-40"></div>
                <div className="bg-primary/10 absolute -inset-2 -z-10 animate-pulse rounded-full"></div>
              </div>
              <p className="text-muted-foreground mt-4 text-center font-sans text-xs font-semibold tracking-wider uppercase">
                {callAlert.direction === "incoming" &&
                callAlert.status === "ringing"
                  ? "Incoming Call"
                  : "Dialing..."}
              </p>
              <p className="font-heading text-foreground mt-1 text-center text-2xl font-bold tracking-tight">
                {callAlert.phoneNumber}
              </p>
            </section>
            {callAlert.direction === "incoming" &&
            callAlert.status === "ringing" ? (
              <section className="flex w-full justify-around gap-4">
                <button
                  className="flex size-14 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 hover:bg-emerald-500 active:scale-95"
                  onClick={acceptHandle}
                  title="Accept Call"
                  type="button"
                >
                  <PhoneCall size={24} />
                </button>
                <button
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/30 flex size-14 cursor-pointer items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
                  onClick={rejectHandle}
                  title="Decline Call"
                  type="button"
                >
                  <PhoneOff size={24} />
                </button>
              </section>
            ) : (
              <button
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/30 flex size-14 cursor-pointer items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
                onClick={rejectHandle}
                type="button"
                title="End Call"
              >
                <PhoneOff size={24} />
              </button>
            )}
          </div>
        )}

        {/* Call connected screen */}
        {callAlert.status === "connected" && (
          <div className="flex h-full flex-col items-center justify-between gap-6 py-2">
            <section className="flex flex-col items-center">
              <div className="relative flex size-28 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <User size={48} />
                <div className="absolute -inset-2 -z-10 animate-pulse rounded-full bg-emerald-500/10"></div>
              </div>
              {/* Call duration */}
              <p className="text-muted-foreground mt-3 text-center font-mono text-sm font-medium tracking-widest">
                {callDuration}
              </p>
              <p className="font-heading text-foreground mt-1 text-center text-2xl font-bold tracking-tight">
                {callAlert.phoneNumber}
              </p>
            </section>

            <section className="flex w-full justify-around gap-2">
              {/* Hold Button */}
              <button
                className={`flex size-12 cursor-pointer items-center justify-center rounded-full transition-all active:scale-95 ${
                  callAlert.isHold
                    ? "border border-amber-500/40 bg-amber-500/20 text-amber-500 shadow-md"
                    : "border-border/80 bg-muted/60 text-foreground hover:bg-accent border dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/15"
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
                title={callAlert.isHold ? "Resume Call" : "Hold Call"}
                type="button"
              >
                {callAlert.isHold ? <Play size={20} /> : <Pause size={20} />}
              </button>

              {/* Mute button */}
              <button
                className={`flex size-12 cursor-pointer items-center justify-center rounded-full transition-all active:scale-95 ${
                  isMuted
                    ? "border-destructive/40 bg-destructive/20 text-destructive border shadow-md"
                    : "border-border/80 bg-muted/60 text-foreground hover:bg-accent border dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/15"
                }`}
                onClick={toggleMute}
                title={isMuted ? "Unmute" : "Mute"}
                type="button"
              >
                {isMuted ? <Mic size={20} /> : <MicOff size={20} />}
              </button>

              {/* Transfer Button */}
              <button
                className={`flex size-12 cursor-pointer items-center justify-center rounded-full transition-all active:scale-95 ${
                  isTransferVisible
                    ? "bg-primary text-primary-foreground shadow-primary/25 shadow-md"
                    : "border-border/80 bg-muted/60 text-foreground hover:bg-accent border dark:border-white/15 dark:bg-white/8 dark:text-white dark:hover:bg-white/15"
                }`}
                onClick={() => setIsTransferVisible(!isTransferVisible)}
                type="button"
                title="Transfer Call"
              >
                <ArrowRightLeft size={20} />
              </button>

              {/* Hangup Button */}
              <button
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-destructive/25 flex size-12 cursor-pointer items-center justify-center rounded-full shadow-md transition-all active:scale-95"
                onClick={rejectHandle}
                type="button"
                title="End Call"
              >
                <PhoneOff size={20} />
              </button>
            </section>

            {/* Transfer Input Field */}
            {isTransferVisible && (
              <div className="border-border/80 flex w-full flex-col items-center gap-3 rounded-xl border bg-black/5 p-3 shadow-inner dark:border-white/15 dark:bg-black/30">
                <input
                  className="border-border/80 text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/20 h-10 w-full rounded-lg border bg-white/70 px-3 text-sm transition-all outline-none focus:ring-2 dark:border-white/15 dark:bg-white/6 dark:text-white"
                  value={transferNumber}
                  placeholder="Enter Transfer Number..."
                  onChange={(e) => setTransferNumber(e.target.value)}
                />
                <button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 flex h-9 w-full cursor-pointer items-center justify-center rounded-lg text-sm font-medium shadow-sm transition-all active:scale-98"
                  onClick={() => transferCall(transferNumber)}
                  type="button"
                >
                  Transfer Call
                </button>
              </div>
            )}
          </div>
        )}
        {/* Dial pad */}
        {isIdle && (
          <section className="flex h-full flex-col items-center justify-between gap-5 py-1">
            {/* Phone Number Input */}
            <div className="border-border/80 focus-within:border-primary/60 focus-within:ring-primary/20 relative flex w-full items-center rounded-xl border bg-black/5 px-4 py-2 shadow-inner transition-all focus-within:ring-2 dark:border-white/15 dark:bg-black/40">
              <input
                className="text-foreground placeholder:text-muted-foreground/60 h-12 w-full bg-transparent text-center font-mono text-2xl font-bold tracking-widest outline-none dark:text-white"
                value={dialPhoneNumber}
                placeholder="Enter number"
                onChange={(e) => {
                  const onlyNumbers = e.target.value.replace(/[^0-9+]/g, "");
                  setDialPhoneNumber(onlyNumbers);
                }}
              />
              {dialPhoneNumber && (
                <button
                  type="button"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-3 flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors dark:hover:bg-white/15 dark:hover:text-white"
                  onClick={() => setDialPhoneNumber("")}
                  title="Clear"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-3.5">
              {KEYPAD_BUTTONS.map(({ digit, sub }) => (
                <button
                  key={digit}
                  type="button"
                  className="group border-border/80 bg-muted/50 hover:bg-primary/10 text-foreground hover:text-primary dark:hover:text-primary hover:border-primary/40 dark:hover:border-primary/50 flex size-15 cursor-pointer flex-col items-center justify-center rounded-full border shadow-xs transition-all duration-150 select-none hover:shadow-md focus:outline-none active:scale-95 sm:size-16 dark:border-white/15 dark:bg-white/[0.07] dark:text-white dark:hover:bg-white/[0.14]"
                  onClick={() => setDialPhoneNumber((prev) => prev + digit)}
                >
                  <span className="font-sans text-2xl leading-none font-bold transition-transform group-hover:scale-105">
                    {digit}
                  </span>
                  {sub ? (
                    <span className="text-muted-foreground group-hover:text-primary dark:group-hover:text-primary mt-0.5 text-[9.5px] font-semibold tracking-widest transition-colors">
                      {sub}
                    </span>
                  ) : (
                    <span className="h-3.5" />
                  )}
                </button>
              ))}
            </div>

            {/* Dial Button */}
            <button
              className="flex h-13 w-36 cursor-pointer items-center justify-center gap-2.5 rounded-full bg-linear-to-r from-emerald-600 to-emerald-500 font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all duration-150 hover:scale-105 hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/50 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              onClick={dialPhoneNumberHandle}
              type="button"
              disabled={!dialPhoneNumber}
              title="Dial"
            >
              <PhoneCall size={20} className="fill-white/20" />
              <span className="text-base tracking-wide">Dial</span>
            </button>
          </section>
        )}
      </div>
    </div>
  );
};

export default Phone;
