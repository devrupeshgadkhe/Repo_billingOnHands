/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Digital Munimji Floating Assistant & Interactive Drawer
 * Dedicated 3D Munimji Avatar, Multilingual (मराठी | हिंदी | English),
 * 100% Electron-safe, and zero technical exposure.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  X,
  Volume2,
  VolumeX,
  Receipt,
  Tag,
  CheckCircle2,
  TrendingDown,
  RefreshCw
} from "lucide-react";
const munimji3DAvatar = "/munimji-3d.jpg";
import {
  sendMunimjiCommand,
  executeMunimjiAction,
  MunimjiResponse,
  MunimjiDisplayCard
} from "../services/munimjiClient";
import { DatabaseState, Invoice } from "../types";

export type MunimjiLang = "mr" | "hi" | "en";

interface ChatMessage {
  id: string;
  sender: "user" | "munimji";
  text: string;
  timestamp: string;
  cards?: MunimjiDisplayCard[];
  actionPayload?: any;
  isAudio?: boolean;
}

interface MunimjiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  dbState: DatabaseState | null;
  onRefreshDb: () => Promise<void>;
  onApplyBillToEditor?: (billData: any) => void;
  onOpenInvoice?: (invoice: Invoice) => void;
}

// Multilingual UI Translations (Marathi, Hindi, English)
const TRANSLATIONS: Record<MunimjiLang, {
  title: string;
  subtitle: string;
  statusOnline: string;
  floatingHint: string;
  floatingBtn: string;
  shortcutHint: string;
  welcomeMsg: string;
  inputPlaceholder: string;
  listeningNotice: string;
  speakingNotice: string;
  processing: string;
  speechVoiceLang: string;
  userLabel: string;
  userSpokenLabel: string;
  munimjiLabel: string;
  chips: Array<{ label: string; query: string }>;
  retail: string;
  wholesale: string;
  costPrice: string;
  bottomLine: string;
  floorNotice: string;
  margin: string;
  forBulk: string;
  stock: string;
  customer: string;
  cash: string;
  credit: string;
  totalAmount: string;
  applyToBill: string;
  directSavePrint: string;
  cheapestOption: string;
  itemCol: string;
  qtyCol: string;
  rateCol: string;
  totalCol: string;
}> = {
  mr: {
    title: "डिजिटल मुनीमजी",
    subtitle: "स्मार्ट व्हॉइस, भाव सल्लागार & बिझनेस गाईड",
    statusOnline: "हजर आहेत",
    floatingHint: "मुनीमजी हजर आहेत (Alt+M)",
    floatingBtn: "मुनीमजी",
    shortcutHint: "💡 शॉर्टकट: Alt + M ने मुनीमजी उघडा किंवा बंद करा",
    welcomeMsg: "राम राम मालक! मी तुमचा 'डिजिटल मुनीमजी'. सांगा काय सेवा करू? तुम्ही बोलून बिल बनवू शकता, वस्तूंचा चिल्लर-ठोक भाव विचारू शकता, किंवा स्वस्त सप्लायर शोधू शकता!",
    inputPlaceholder: "येथे लिहा किंवा माईक दाबून बोला...",
    listeningNotice: "ऐकत आहे... (बोलणे संपल्यावर लाल बटण दाबा)",
    speakingNotice: "तुम्ही बोलत रहा, मुनीमजी थेट ऐकत आहेत...",
    processing: "मुनीमजी हिशोब करत आहेत...",
    speechVoiceLang: "mr-IN",
    userLabel: "तुम्ही",
    userSpokenLabel: "🎙️ तुमचे बोलणे",
    munimjiLabel: "मुनीमजी",
    chips: [
      { label: "💡 साखरेचा काय भाव आहे?", query: "साखरेचा काय भाव आहे आणि चिल्लर काय देऊ?" },
      { label: "🧾 नवीन विक्री बिल बनवा", query: "राजेशला २ नग साखरेचे बिल बनव रोख" },
      { label: "⚖️ स्वस्त सप्लायर कोण?", query: "फॉर्च्युन तेल कोणाकडून स्वस्त पडेल? सप्लायर तुलना कर" },
      { label: "🔍 कुठे पाणी मुरतंय?", query: "दुकानात कुठे पाणी मुरतंय? उधारी आणि डेड स्टॉक रिपोर्ट दे" },
      { label: "🩺 सिस्टीम टेस्ट करा", query: "सॉफ्टवेअरमधील बिलिंग आणि जीएसटी कॅल्क्युलेशन टेस्ट कर" }
    ],
    retail: "चिल्लर विक्री (Retail)",
    wholesale: "ठोक विक्री (Wholesale)",
    costPrice: "आपली खरेदी किंमत:",
    bottomLine: "किमान मर्यादा:",
    floorNotice: "* ग्राहकाने कितीही घासाघीस केली तरी किमान मर्यादेच्या खाली विकू नका.",
    margin: "किमान नफा:",
    forBulk: "मोठ्या प्रमाणासाठी",
    stock: "स्टॉक:",
    customer: "ग्राहक / पार्टी:",
    cash: "रोख (Cash)",
    credit: "उधारी (Credit)",
    totalAmount: "एकूण रक्कम:",
    applyToBill: "पावतीमध्ये भरा",
    directSavePrint: "थेट सेव्ह & प्रिंट",
    cheapestOption: "स्वस्त पर्याय उपलब्ध",
    itemCol: "वस्तू",
    qtyCol: "प्रमाण",
    rateCol: "दर",
    totalCol: "एकूण"
  },
  hi: {
    title: "डिजिटल मुनीमजी",
    subtitle: "स्मार्ट वॉयस, भाव सलाहकार & व्यापार गाइड",
    statusOnline: "उपस्थित हैं",
    floatingHint: "मुनीमजी उपस्थित हैं (Alt+M)",
    floatingBtn: "मुनीमजी",
    shortcutHint: "💡 शॉर्टकट: Alt + M से मुनीमजी खोलें या बंद करें",
    welcomeMsg: "नमस्ते सेठजी! मैं आपका 'डिजिटल मुनीमजी' हूँ। बताइए क्या सेवा करूँ? आप बोलकर बिल बना सकते हैं, सामान का खुदरा-थोक भाव पूछ सकते हैं, या सस्ता सप्लायर खोज सकते हैं!",
    inputPlaceholder: "यहाँ लिखें या माइक दबाकर बोलें...",
    listeningNotice: "सुन रहा हूँ... (बोलना पूरा होने पर लाल बटन दबाएं)",
    speakingNotice: "आप बोलते रहें, मुनीमजी सीधे सुन रहे हैं...",
    processing: "मुनीमजी हिसाब कर रहे हैं...",
    speechVoiceLang: "hi-IN",
    userLabel: "आप",
    userSpokenLabel: "🎙️ आपकी आवाज़",
    munimjiLabel: "मुनीमजी",
    chips: [
      { label: "💡 शक्कर का क्या भाव है?", query: "शक्कर का क्या भाव है और खुदरा क्या बेचूं?" },
      { label: "🧾 नया बिक्री बिल बनाएं", query: "राजेश को 2 बोरी शक्कर का नकद बिल बनाओ" },
      { label: "⚖️ सस्ता सप्लायर कौन है?", query: "फॉर्च्यून तेल किससे सस्ता मिलेगा? सप्लायर तुलना करें" },
      { label: "🔍 नुकसान कहाँ है?", query: "व्यापार में नुकसान कहाँ है? उधारी और डेड स्टॉक रिपोर्ट दें" },
      { label: "🩺 सिस्टम टेस्ट करें", query: "सॉफ्टवेयर में बिलिंग और जीएसटी कैलकुलेशन टेस्ट करें" }
    ],
    retail: "खुदरा बिक्री (Retail)",
    wholesale: "थोक बिक्री (Wholesale)",
    costPrice: "हमारी खरीद कीमत:",
    bottomLine: "न्यूनतम सीमा:",
    floorNotice: "* ग्राहक से मोलभाव होने पर भी न्यूनतम सीमा से नीचे न बेचें।",
    margin: "न्यूनतम मुनाफा:",
    forBulk: "थोक मात्रा के लिए",
    stock: "स्टॉक:",
    customer: "ग्राहक / पार्टी:",
    cash: "नकद (Cash)",
    credit: "उधारी (Credit)",
    totalAmount: "कुल रकम:",
    applyToBill: "बिल में भरें",
    directSavePrint: "सीधे सेव व प्रिंट",
    cheapestOption: "सस्ता विकल्प उपलब्ध",
    itemCol: "सामान",
    qtyCol: "मात्रा",
    rateCol: "दर",
    totalCol: "कुल"
  },
  en: {
    title: "Digital Munimji",
    subtitle: "Smart Voice Assistant & Business Advisor",
    statusOnline: "Online & Ready",
    floatingHint: "Munimji is Online (Alt+M)",
    floatingBtn: "Munimji",
    shortcutHint: "💡 Shortcut: Press Alt + M to toggle Digital Munimji",
    welcomeMsg: "Namaste! I am your 'Digital Munimji'. How can I assist your business? You can dictate bills, ask for wholesale or retail prices, check business leaks, or compare suppliers!",
    inputPlaceholder: "Type command or press mic to speak...",
    listeningNotice: "Listening... (Click red mic when done speaking)",
    speakingNotice: "Speak clearly, Munimji is listening directly...",
    processing: "Munimji is processing calculation...",
    speechVoiceLang: "en-IN",
    userLabel: "You",
    userSpokenLabel: "🎙️ Voice Command",
    munimjiLabel: "Munimji",
    chips: [
      { label: "💡 Sugar price check", query: "What is the price of sugar and retail rate?" },
      { label: "🧾 Create Sales Bill", query: "Create cash sales bill for Rajesh with 2 boxes copper cable" },
      { label: "⚖️ Cheapest supplier", query: "Which supplier gives the cheapest oil? Compare suppliers" },
      { label: "🔍 Business leaks", query: "Where is the business leaking? Show overdue credit and dead stock" },
      { label: "🩺 Run System Test", query: "Test software billing and GST calculation module" }
    ],
    retail: "Retail Price",
    wholesale: "Wholesale Price",
    costPrice: "Cost / Purchase Price:",
    bottomLine: "Floor Price:",
    floorNotice: "* Never sell below the floor price during negotiations to avoid losses.",
    margin: "Profit Margin:",
    forBulk: "For bulk orders",
    stock: "Stock:",
    customer: "Customer / Party:",
    cash: "Cash Sale",
    credit: "Credit Sale",
    totalAmount: "Total Amount:",
    applyToBill: "Apply to Bill",
    directSavePrint: "Direct Save & Print",
    cheapestOption: "Best Deal Available",
    itemCol: "Item",
    qtyCol: "Qty",
    rateCol: "Rate",
    totalCol: "Total"
  }
};

export default function MunimjiDrawer({
  isOpen,
  onClose,
  onOpen,
  dbState,
  onRefreshDb,
  onApplyBillToEditor,
  onOpenInvoice
}: MunimjiDrawerProps) {
  // Selected Language (mr | hi | en)
  const [language, setLanguage] = useState<MunimjiLang>(() => {
    return (localStorage.getItem("munimji_lang") as MunimjiLang) || "mr";
  });

  const t = TRANSLATIONS[language];

  // Voice & Chat State
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome_1",
      sender: "munimji",
      text: TRANSLATIONS[(localStorage.getItem("munimji_lang") as MunimjiLang) || "mr"].welcomeMsg,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);

  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSpeechEnabled, setVoiceSpeechEnabled] = useState(true);
  const [liveInterimText, setLiveInterimText] = useState("");
  const [audioVolume, setAudioVolume] = useState(0);
  const [micPermissionError, setMicPermissionError] = useState(false);

  // References for MediaRecorder & Audio Context (Electron-Safe Native Recording)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const munimjiAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing, liveInterimText]);

  // Keyboard shortcut (Alt + M to toggle Munimji)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === "m") || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "m")) {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onOpen]);

  // Handle language switch
  const handleSelectLanguage = (newLang: MunimjiLang) => {
    setLanguage(newLang);
    localStorage.setItem("munimji_lang", newLang);
    // Add brief transition message in selected language
    setMessages(prev => [
      ...prev,
      {
        id: "lang_" + Date.now(),
        sender: "munimji",
        text: TRANSLATIONS[newLang].welcomeMsg,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);
  };

  const stopMunimjiVoice = () => {
    const audio = munimjiAudioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    } catch {}
    munimjiAudioRef.current = null;
  };

  /**
   * Play Gemini TTS generated natural human speech audio output.
   */
  const playMunimjiVoice = (audioBase64?: string, audioMimeType?: string) => {
    if (!voiceSpeechEnabled || !audioBase64) return;
    stopMunimjiVoice();
    try {
      const mime = audioMimeType || "audio/wav";
      const audio = new Audio(`data:${mime};base64,${audioBase64}`);
      munimjiAudioRef.current = audio;
      audio.onended = () => {
        if (munimjiAudioRef.current === audio) munimjiAudioRef.current = null;
      };
      audio.play().catch(err => console.warn("[Digital Munimji Audio Notice]:", err));
    } catch (err) {
      console.warn("[Digital Munimji Audio Playback Error]:", err);
      munimjiAudioRef.current = null;
    }
  };

  /**
   * START ELECTRON-SAFE NATIVE AUDIO RECORDING (MediaRecorder)
   */
  const startRecording = async () => {
    try {
      console.info("🎙️ [VOICE]: Starting microphone diagnostics...", {
        isElectron: Boolean((window as any).electronAPI?.isElectron),
        origin: window.location.origin,
        secureContext: window.isSecureContext,
        mediaDevicesAvailable: Boolean(navigator.mediaDevices),
        getUserMediaAvailable: Boolean(navigator.mediaDevices?.getUserMedia),
        mediaRecorderAvailable: typeof MediaRecorder !== "undefined"
      });
      setMicPermissionError(false);
      setLiveInterimText("");

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone capture is unavailable in this Electron page. The app must load from a trusted local origin.");
      }

      try {
        if (navigator.permissions?.query) {
          const permission = await navigator.permissions.query({ name: "microphone" as PermissionName });
          console.info("🎙️ [VOICE]: Browser microphone permission state:", permission.state);
        }
      } catch (permissionErr) {
        console.info("🎙️ [VOICE]: Permission-state query unavailable in Electron:", permissionErr);
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (advancedErr) {
        console.warn("⚠️ [VOICE WARNING]: Advanced audio constraints failed, trying basic audio stream...", advancedErr);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      console.info("✅ [VOICE]: Microphone stream acquired successfully!", stream.id);
      setIsRecording(true);

      // Visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioVolume(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }
      } catch (e) {
        console.warn("Audio visualizer notice:", e);
      }

      // MediaRecorder
      audioChunksRef.current = [];
      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/wav", ""];
      let selectedMime = "";
      for (const m of mimeTypes) {
        if (m === "" || (MediaRecorder as any).isTypeSupported?.(m)) {
          selectedMime = m;
          break;
        }
      }

      console.info("🎙️ [VOICE]: Selected recording mimeType:", selectedMime || "default");

      const recorder = selectedMime ? new MediaRecorder(stream, { mimeType: selectedMime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.info("🎙️ [VOICE]: Audio chunk captured, size:", event.data.size, "bytes");
        }
      };

      recorder.start(100);
      console.info("🎙️ [VOICE]: MediaRecorder started with 100ms timeslice.");
    } catch (err: any) {
      console.error("❌ [VOICE ERROR]: Failed to access microphone:", {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        origin: window.location.origin,
        secureContext: window.isSecureContext,
        electron: Boolean((window as any).electronAPI?.isElectron)
      });
      setIsRecording(false);
      setMicPermissionError(true);
    }
  };

  /**
   * STOP RECORDING AND SEND AUDIO TO GEMINI API
   */
  const stopRecording = () => {
    console.info("🎙️ [VOICE]: Stopping recording...");
    setIsRecording(false);
    setAudioVolume(0);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        if ((recorder as any).requestData) {
          (recorder as any).requestData();
        }
      } catch {}

      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach(tr => tr.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        audioChunksRef.current = [];

        console.info("🎙️ [VOICE]: Final recorded audio blob created. Total size:", audioBlob.size, "bytes");

        if (audioBlob.size > 0) {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string)?.split(",")[1];
            if (base64Data) {
              const previewText = language === "en"
                ? "🎙️ Voice Audio Command"
                : (language === "hi" ? "🎙️ ऑडियो आदेश" : "🎙️ ऑडिओ आवाज आदेश");
              console.info("🎙️ [VOICE]: Audio payload ready; Gemini will perform speech recognition and command understanding.");
              await handleProcessCommand({
                audioBase64: base64Data,
                mimeType: audioBlob.type || "audio/webm",
                userSpokenPreview: previewText
              });
            } else {
              console.warn("⚠️ [VOICE WARNING]: Failed to extract base64 from audio blob.");
            }
            setLiveInterimText("");
          };
        } else {
          console.warn("⚠️ [VOICE WARNING]: Captured audio blob was empty (0 bytes).");
        }
      };
      recorder.stop();
    }
  };

  /**
   * Process command (Voice Audio or Text)
   */
  const handleProcessCommand = async (params: {
    text?: string;
    audioBase64?: string;
    mimeType?: string;
    userSpokenPreview?: string;
  }) => {
    const userText = params.text || params.userSpokenPreview || (language === "en" ? "🎙️ Voice Audio Command" : "🎙️ ऑडिओ आवाज आदेश");
    
    // Add user message to UI immediately with exact recognized text
    const userMsgId = "user_" + Date.now();
    setMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        sender: "user",
        text: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isAudio: Boolean(params.audioBase64)
      }
    ]);

    setIsProcessing(true);

    try {
      const response: MunimjiResponse = await sendMunimjiCommand({
        text: params.text,
        audioBase64: params.audioBase64,
        mimeType: params.mimeType,
        language
      });

      // If server returned refined transcript, update the user bubble
      if (response.userTranscript && response.userTranscript.trim()) {
        const refined = response.userTranscript.trim();
        setMessages(prev => prev.map(m => m.id === userMsgId ? { ...m, text: refined } : m));
      }

      // Add Munimji's response to UI
      const munimjiMsgId = "munimji_" + Date.now();
      setMessages(prev => [
        ...prev,
        {
          id: munimjiMsgId,
          sender: "munimji",
          text: response.replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          cards: response.displayCards,
          actionPayload: response.actionPayload
        }
      ]);

      if (response.audioBase64) {
        playMunimjiVoice(response.audioBase64, response.audioMimeType);
      }
    } catch (err: any) {
      console.error("Munimji processing error:", err);
      const errMsgId = "err_" + Date.now();
      setMessages(prev => [
        ...prev,
        {
          id: errMsgId,
          sender: "munimji",
          text: (language === "en" ? "Sorry Sir, could not process request: " : "क्षमस्व मालक, आदेश समजताना अडचण आली: ") + (err.message || ""),
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Submit text input
   */
  const handleSubmitText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    const txt = inputText.trim();
    setInputText("");
    handleProcessCommand({ text: txt });
  };

  /**
   * Execute Action: Direct Save & Print or Apply to Bill
   */
  const handleExecuteCardAction = async (actionType: string, payload: any) => {
    try {
      setIsProcessing(true);
      const result = await executeMunimjiAction(actionType, payload);
      await onRefreshDb();

      setMessages(prev => [
        ...prev,
        {
          id: "act_" + Date.now(),
          sender: "munimji",
          text: `✅ ${result.message || (language === "en" ? "Action completed!" : "काम पूर्ण झाले!")}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);

      if (result.invoice && onOpenInvoice) {
        onOpenInvoice(result.invoice);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: "err_act_" + Date.now(),
          sender: "munimji",
          text: `❌ ${(language === "en" ? "Action failed: " : "कृती पूर्ण करताना अडचण आली: ")} ${err.message || ""}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* 1. FLOATING LAUNCHER BUTTON WITH 3D MUNIMJI CLIPART */}
      <div className="fixed bottom-5 right-6 z-40 flex items-center gap-2 select-none print:hidden">
        {!isOpen && (
          <div className="hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-amber-200 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
            <span>{t.floatingHint}</span>
          </div>
        )}

        <button
          onClick={() => {
            if (isOpen) {
              onClose();
            } else {
              onOpen();
            }
          }}
          className={`relative p-1.5 sm:p-2 rounded-2xl shadow-2xl transition-all duration-300 flex items-center justify-center group ${
            isOpen
              ? "bg-slate-800 text-white hover:bg-slate-900"
              : isRecording
              ? "bg-rose-600 ring-8 ring-rose-200 scale-110 animate-bounce"
              : "bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 hover:scale-105 hover:shadow-amber-500/40"
          }`}
          title={t.floatingHint}
        >
          {isOpen ? (
            <div className="w-12 h-12 flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </div>
          ) : isRecording ? (
            <div className="w-12 h-12 flex items-center justify-center">
              <Mic className="w-7 h-7 text-white animate-pulse" />
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <img
                src={munimji3DAvatar}
                alt="3D Munimji"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform"
              />
              <span className="text-sm font-extrabold text-white pr-2 tracking-wide hidden sm:inline-block">
                {t.floatingBtn}
              </span>
            </div>
          )}

          {/* Active status pip */}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
            </span>
          )}
        </button>
      </div>

      {/* 2. SLIDE-OVER MUNIMJI DRAWER */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-50 shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out print:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-800 text-white px-5 py-3.5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            {/* 3D Clipart Avatar in Header */}
            <img
              src={munimji3DAvatar}
              alt="Digital Munimji 3D"
              className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-300/80 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-wide">{t.title}</h3>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  {t.statusOnline}
                </span>
              </div>
              <p className="text-xs text-amber-200/90 font-medium">
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Selector (मराठी | हिंदी | English) */}
            <div className="flex items-center bg-black/25 rounded-lg p-0.5 border border-white/10 text-[11px] font-bold">
              <button
                onClick={() => handleSelectLanguage("mr")}
                className={`px-1.5 py-1 rounded transition-colors ${
                  language === "mr" ? "bg-amber-500 text-white shadow-xs" : "text-amber-100/70 hover:text-white"
                }`}
                title="मराठी भाषा निवडा"
              >
                मराठी
              </button>
              <button
                onClick={() => handleSelectLanguage("hi")}
                className={`px-1.5 py-1 rounded transition-colors ${
                  language === "hi" ? "bg-amber-500 text-white shadow-xs" : "text-amber-100/70 hover:text-white"
                }`}
                title="हिंदी भाषा चुनें"
              >
                हिंदी
              </button>
              <button
                onClick={() => handleSelectLanguage("en")}
                className={`px-1.5 py-1 rounded transition-colors ${
                  language === "en" ? "bg-amber-500 text-white shadow-xs" : "text-amber-100/70 hover:text-white"
                }`}
                title="Select English"
              >
                EN
              </button>
            </div>

            {/* Voice Mute/Unmute */}
            <button
              onClick={() => {
                if (voiceSpeechEnabled) {
                  stopMunimjiVoice();
                }
                setVoiceSpeechEnabled(!voiceSpeechEnabled);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                voiceSpeechEnabled ? "bg-amber-500/40 text-amber-100 hover:bg-amber-500/60" : "bg-white/10 text-slate-400"
              }`}
              title={voiceSpeechEnabled ? "Audio speech is ON (click to mute)" : "Audio speech is muted (click to unmute)"}
            >
              {voiceSpeechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close Drawer */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors ml-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Microphone Permission Notice Banner */}
        {micPermissionError && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 shadow-sm flex items-start gap-2.5">
            <div className="p-1 rounded-full bg-amber-200 text-amber-800 shrink-0 mt-0.5">
              <MicOff className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="font-bold mb-1">
                {language === "en" ? "Microphone Permission Required" : (language === "hi" ? "माइक अनुमति आवश्यक है" : "मायक्रोफोन परवानगी आवश्यक आहे")}
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed mb-2">
                {language === "en"
                  ? "Microphone access is blocked. Please allow microphone access for this desktop application in Windows Privacy & Security settings."
                  : (language === "hi"
                    ? "माइक एक्सेस ब्लॉक है। कृपया विंडोज गोपनीयता और सुरक्षा सेटिंग्स (Windows Privacy & Security Settings) में इस डेस्कटॉप ऐप के लिए माइक एक्सेस की अनुमति दें।"
                    : "मायक्रोफोन ॲक्सेस ब्लॉक झाला आहे. कृपया विंडोज प्रायव्हसी आणि सिक्युरिटी सेटिंग्ज (Windows Privacy & Security Settings) मध्ये या डेस्कटॉप ॲपसाठी मायक्रोफोनला परवानगी द्या.")}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMicPermissionError(false);
                    startRecording();
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] transition-colors"
                >
                  {language === "en" ? "Retry Mic" : (language === "hi" ? "पुनः प्रयास करें" : "पुन्हा प्रयत्न करा")}
                </button>
                <button
                  type="button"
                  onClick={() => setMicPermissionError(false)}
                  className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-[10px] transition-colors"
                >
                  {language === "en" ? "Dismiss" : (language === "hi" ? "बंद करें" : "कळाले")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/70">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-start gap-2 max-w-[90%]">
                {msg.sender === "munimji" && (
                  <img
                    src={munimji3DAvatar}
                    alt="Munimji"
                    className="w-7 h-7 rounded-lg object-cover border border-amber-300 shadow-xs shrink-0 mt-0.5"
                  />
                )}

                <div
                  className={`rounded-2xl px-4 py-3 shadow-xs ${
                    msg.sender === "user"
                      ? "bg-amber-600 text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-none"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className={`text-[10px] font-bold ${msg.sender === "user" ? "text-amber-200" : "text-amber-800"}`}>
                      {msg.sender === "user" ? (msg.isAudio ? t.userSpokenLabel : t.userLabel) : t.munimjiLabel}
                    </span>
                    <span className={`text-[10px] ${msg.sender === "user" ? "text-amber-200" : "text-slate-400"}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>

              {/* Render Interactive Display Cards */}
              {msg.cards && msg.cards.length > 0 && (
                <div className="w-full mt-2 space-y-2.5 pl-9">
                  {msg.cards.map((card, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-md hover:border-amber-300 transition-all text-slate-800"
                    >
                      {/* Card: MINI-BILL */}
                      {card.type === "mini_bill" && (
                        <div>
                          <div className="flex items-center justify-between border-b pb-2 mb-2">
                            <div className="flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-amber-600" />
                              <span className="font-bold text-sm text-slate-900">{card.title}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              card.data?.paymentMode === "cash" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {card.data?.paymentMode === "cash" ? t.cash : t.credit}
                            </span>
                          </div>

                          <div className="text-xs text-slate-600 mb-2">
                            <span className="font-semibold text-slate-800">{t.customer} </span>
                            {card.data?.customerName || t.cash}
                          </div>

                          <div className="border rounded-lg overflow-hidden mb-3">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                  <th className="p-1.5 text-left">{t.itemCol}</th>
                                  <th className="p-1.5 text-right">{t.qtyCol}</th>
                                  <th className="p-1.5 text-right">{t.rateCol}</th>
                                  <th className="p-1.5 text-right">{t.totalCol}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-medium">
                                {card.data?.items?.map((it: any, i: number) => (
                                  <tr key={i}>
                                    <td className="p-1.5 text-slate-800">{it.name}</td>
                                    <td className="p-1.5 text-right">{it.quantity} {it.unit || (language === "en" ? "PCS" : "नग")}</td>
                                    <td className="p-1.5 text-right">₹{it.price}</td>
                                    <td className="p-1.5 text-right font-bold text-slate-900">
                                      ₹{((it.quantity || 1) * (it.price || 0)).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t text-sm font-extrabold text-slate-900 mb-3">
                            <span>{t.totalAmount}</span>
                            <span className="text-amber-700 text-base">₹{card.data?.totalAmount || 0}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {onApplyBillToEditor && (
                              <button
                                onClick={() => {
                                  onApplyBillToEditor(card.data);
                                  onClose();
                                }}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>{t.applyToBill}</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleExecuteCardAction("CREATE_SALES_INVOICE", card.data)}
                              className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t.directSavePrint}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Card: PRICE GUIDE */}
                      {card.type === "price_guide" && (
                        <div>
                          <div className="flex items-center justify-between border-b pb-2 mb-2.5">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-emerald-600" />
                              <span className="font-bold text-sm text-slate-900">{card.title}</span>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {t.stock} {card.data?.stockOnHand ?? "-"} {card.data?.unit || (language === "en" ? "PCS" : "नग")}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                              <div className="text-[10px] text-emerald-800 font-bold uppercase">{t.retail}</div>
                              <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                                ₹{card.data?.retailPrice ?? "N/A"}
                              </div>
                              <div className="text-[10px] text-emerald-600">{t.margin} {card.data?.retailMargin || "25%"}</div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                              <div className="text-[10px] text-blue-800 font-bold uppercase">{t.wholesale}</div>
                              <div className="text-base font-extrabold text-blue-700 mt-0.5">
                                ₹{card.data?.wholesalePrice ?? "N/A"}
                              </div>
                              <div className="text-[10px] text-blue-600">{t.forBulk}</div>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">
                              {t.costPrice} <strong className="text-slate-900">₹{card.data?.purchasePrice ?? "N/A"}</strong>
                            </span>
                            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {t.bottomLine} ₹{card.data?.bottomLinePrice ?? "N/A"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 italic mt-1.5">
                            {t.floorNotice}
                          </p>
                        </div>
                      )}

                      {/* Card: SUPPLIER COMPARISON */}
                      {card.type === "supplier_comparison" && (
                        <div>
                          <div className="flex items-center justify-between border-b pb-2 mb-2">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-emerald-600" />
                              <span className="font-bold text-sm text-slate-900">{card.title}</span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              {t.cheapestOption}
                            </span>
                          </div>

                          <div className="space-y-1.5 mb-2">
                            {card.data?.suppliers?.map((sup: any, sIdx: number) => (
                              <div
                                key={sIdx}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                                  sup.isCheapest
                                    ? "bg-emerald-50/80 border-emerald-300 font-semibold text-emerald-950"
                                    : "bg-slate-50 border-slate-200 text-slate-700"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span>{sup.name}</span>
                                    {sup.isCheapest && (
                                      <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-extrabold">
                                        BEST
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{sup.lastPurchaseDate}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-extrabold text-sm">₹{sup.rate}</div>
                                  {sup.difference && (
                                    <div className="text-[10px] text-rose-600">+{sup.difference}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          {card.data?.recommendation && (
                            <p className="text-xs text-emerald-800 font-medium bg-emerald-50 p-2 rounded border border-emerald-200">
                              💡 {card.data?.recommendation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Card: LEAKAGE / TEST */}
                      {(card.type === "leakage_report" || card.type === "test_report") && (
                        <div>
                          <div className="flex items-center justify-between border-b pb-2 mb-2">
                            <span className="font-bold text-sm text-slate-900">{card.title}</span>
                            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {language === "en" ? "Verified" : "तपासणी अहवाल"}
                            </span>
                          </div>
                          <div className="text-xs text-slate-700 space-y-1">
                            {card.data?.points?.map((pt: string, pIdx: number) => (
                              <div key={pIdx} className="flex items-start gap-1.5">
                                <span className="text-amber-500 font-bold">•</span>
                                <span>{pt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Live Subtitle while recording */}
          {isRecording && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-2xl p-3 shadow-sm animate-pulse">
              <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white shrink-0">
                <Mic className="w-4 h-4 animate-bounce" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between text-[11px] font-bold text-rose-600 mb-1">
                  <span>{t.listeningNotice}</span>
                  <span className="font-mono">{audioVolume}%</span>
                </div>
                <div className="text-xs text-slate-800 font-medium">
                  {liveInterimText || t.speakingNotice}
                </div>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && !isRecording && (
            <div className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm w-fit">
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
              <span className="text-xs font-bold text-slate-700">
                {t.processing}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input & Microphone Controls */}
        <div className="p-3.5 bg-white border-t border-slate-200">
          <form onSubmit={handleSubmitText} className="flex items-center gap-2">
            {/* ELECTRON-PROOF VOICE RECORDING BUTTON */}
            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              }}
              className={`p-3 rounded-xl transition-all shadow-md flex items-center justify-center shrink-0 ${
                isRecording
                  ? "bg-rose-600 text-white ring-4 ring-rose-200 animate-pulse scale-105"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
              title={isRecording ? "Stop recording" : "Start speaking"}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Text Input */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isRecording ? t.listeningNotice : t.inputPlaceholder}
              disabled={isRecording || isProcessing}
              className="flex-1 bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 outline-none transition-all"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing || isRecording}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white disabled:text-slate-400 transition-colors shrink-0 shadow-sm"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 px-1 font-medium">
            <span>{t.shortcutHint}</span>
            <span className="text-amber-800 font-bold uppercase">{language}</span>
          </div>
        </div>
      </div>
    </>
  );
}
