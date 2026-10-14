/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  Video,
  VideoOff,
  RefreshCw,
  X,
  Check,
  RotateCcw,
  Upload,
  Sparkles,
  AlertCircle,
  ScanLine,
  Maximize2
} from "lucide-react";

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, base64: string) => void;
  title?: string;
  description?: string;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = "थेट कॅमेऱ्याने बिल स्कॅन करा (Live Camera Scan)",
  description = "बिलाचा किंवा वस्तूंच्या यादीचा स्पष्ट फोटो कॅमेरासमोर धरा आणि कॅप्चर करा."
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isLoadingCamera, setIsLoadingCamera] = useState<boolean>(true);
  const [isShutterActive, setIsShutterActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop active media stream tracks
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      setStream(null);
    }
  }, [stream]);

  // Start webcam / camera stream with ideal high-resolution for OCR
  const startCamera = useCallback(async (deviceId?: string) => {
    setIsLoadingCamera(true);
    setCameraError(null);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("तुमच्या ब्राउझर किंवा डिव्हाइसमध्ये वेबकॅम सपोर्ट उपलब्ध नाही.");
      }

      // Constraints prioritizing 1080p document clarity
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }
          : {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 }
            }
      };

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        // Fallback to basic video constraints if high resolution fails on basic webcams
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: deviceId ? { deviceId: { exact: deviceId } } : true
        });
      }

      setStream(mediaStream);

      // Enumerate available video inputs
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
        setDevices(videoDevices);
        if (!deviceId && videoDevices.length > 0) {
          const currentTrack = mediaStream.getVideoTracks()[0];
          const settings = currentTrack?.getSettings();
          if (settings?.deviceId) {
            setSelectedDeviceId(settings.deviceId);
          }
        }
      } catch (enumErr) {
        console.warn("Could not enumerate video devices:", enumErr);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let msg = "कॅमेरा सुरू करताना अडचण आली.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "कॅमेरा वापरण्याची परवानगी नाकारली आहे. कृपया कॅमेरा ॲक्सेस अलाऊ (Allow) करा.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "कोणताही कॅमेरा सापडला नाही. कृपया वेबकॅम जोडलेला असल्याची खात्री करा किंवा फाईल अपलोड पर्याय वापरा.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        msg = "कॅमेरा दुसऱ्या ॲप्लिकेशनमध्ये वापरला जात आहे. कृपया इतर ॲप्स बंद करून पुन्हा प्रयत्न करा.";
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
    } finally {
      setIsLoadingCamera(false);
    }
  }, [stopStream]);

  // Connect stream to video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((playErr) => {
        console.warn("Video play error:", playErr);
      });
    }
  }, [stream]);

  // Trigger camera on open, cleanup on close
  useEffect(() => {
    if (isOpen) {
      setCapturedImage(null);
      setCapturedFile(null);
      startCamera();
    } else {
      stopStream();
      setCapturedImage(null);
      setCapturedFile(null);
    }

    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  if (!isOpen) return null;

  // Capture current video frame to high-resolution JPEG
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Trigger shutter flash animation
    setIsShutterActive(true);
    setTimeout(() => setIsShutterActive(false), 200);

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedImage(base64Data);

    // Convert to File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `camera_scan_${Date.now()}.jpg`, { type: "image/jpeg" });
          setCapturedFile(file);
        }
      },
      "image/jpeg",
      0.95
    );
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    if (!stream) {
      startCamera(selectedDeviceId);
    }
  };

  // Confirm capture and forward to parent
  const handleConfirmCapture = () => {
    if (!capturedImage) return;

    const rawBase64 = capturedImage.includes(",") ? capturedImage.split(",")[1] : capturedImage;
    const file = capturedFile || new File([], `camera_scan_${Date.now()}.jpg`, { type: "image/jpeg" });

    stopStream();
    onCapture(file, rawBase64);
    onClose();
  };

  // Handle fallback file upload
  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const fullBase64 = event.target?.result as string;
      const rawBase64 = fullBase64.includes(",") ? fullBase64.split(",")[1] : fullBase64;
      stopStream();
      onCapture(file, rawBase64);
      onClose();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 text-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono rounded-full font-bold">
                  AI OCR Scanner
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="बंद करा (Close)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport / Captured Image Preview */}
        <div className="relative w-full h-[420px] bg-black flex items-center justify-center overflow-hidden select-none shrink-0">
          
          {/* Shutter Animation Overlay */}
          {isShutterActive && (
            <div className="absolute inset-0 bg-white z-40 animate-fade-out" />
          )}

          {/* Captured Preview Mode */}
          {capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage}
                alt="Captured Bill Preview"
                className="h-full w-full object-contain rounded-lg shadow-md"
              />
              <div className="absolute top-3 left-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>फोटो कॅप्चर झाला (Snapshot Ready)</span>
              </div>
            </div>
          ) : (
            /* Live Camera Stream Mode */
            <div className="relative w-full h-full flex items-center justify-center">
              {isLoadingCamera && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 gap-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <span className="text-xs font-bold text-slate-300">कॅमेरा सुरू होत आहे...</span>
                </div>
              )}

              {cameraError ? (
                <div className="p-6 text-center max-w-md space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                    <VideoOff className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-rose-300">कॅमेरा उघडता आला नाही</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">{cameraError}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => startCamera(selectedDeviceId)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>पुन्हा प्रयत्न करा</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>फोटो फाईल निवडा</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Document Alignment & Corner Target Overlay */}
                  <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-emerald-400/50 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                    {/* Corner Markers */}
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                      <div className="w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                    </div>

                    <div className="flex flex-col items-center gap-1.5 bg-slate-950/60 backdrop-blur-xs border border-slate-700/50 px-3 py-1.5 rounded-full mx-auto text-[11px] text-emerald-300 font-semibold shadow-lg">
                      <ScanLine className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>बिल किंवा पावती चौकटीत सरळ ठेवा</span>
                    </div>

                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                      <div className="w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Hidden Canvas for High-Resolution Snapshot Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden Fallback File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFallbackFile}
            className="hidden"
          />
        </div>

        {/* Footer & Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Device Switcher (if multiple cameras available) */}
          <div className="flex items-center gap-2">
            {devices.length > 1 && !capturedImage && (
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedDeviceId(newId);
                  startCamera(newId);
                }}
                className="bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-emerald-500 cursor-pointer"
                title="कॅमेरा बदला (Switch Camera)"
              >
                {devices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    📷 {device.label || `कॅमेरा ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            {!capturedImage && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="गॅलरी / फाईलमधून फोटो निवडा"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>फाईलमधून निवडा</span>
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 ml-auto">
            {capturedImage ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>पुन्हा फोटो घ्या (Retake)</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCapture}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>हा फोटो वापरा व स्कॅन करा (Use Photo)</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isLoadingCamera || Boolean(cameraError)}
                onClick={handleCaptureSnapshot}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition cursor-pointer scale-100 hover:scale-102 active:scale-98"
              >
                <Camera className="w-4 h-4 text-emerald-200" />
                <span>फोटो काढा (Capture Bill)</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default CameraScannerModal;
