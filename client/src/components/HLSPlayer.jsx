import { useEffect, useRef, useState } from "react";
import { getStoredAuth } from "../utils/authStorage";

const isHlsSource = (src) => src?.includes(".m3u8");

export default function HLSPlayer({
  src,
  poster,
  resumeTime = 0,
  onProgress,
  onEnded,
  onError
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const hasResumedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reportProgress = (eventType) => {
    const player = videoRef.current;
    if (!player || !onProgress) {
      return;
    }

    onProgress({
      currentTime: player.currentTime || 0,
      duration: Number.isFinite(player.duration) ? player.duration : 0,
      eventType
    });
  };

  useEffect(() => {
    const player = videoRef.current;

    if (!player || !src) {
      setLoading(false);
      setError("Video source is missing.");
      onError?.("Video source is missing.");
      return undefined;
    }

    setLoading(true);
    setError("");
    hasResumedRef.current = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!isHlsSource(src)) {
      player.src = src;
      setLoading(false);
      return undefined;
    }

    if (player.canPlayType("application/vnd.apple.mpegurl")) {
      player.src = src;
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const setupHls = async () => {
      const { default: Hls } = await import("hls.js");

      if (cancelled) {
        return;
      }

      if (!Hls.isSupported()) {
        const message = "This browser cannot play HLS video.";
        setError(message);
        setLoading(false);
        onError?.(message);
        return;
      }

      const hls = new Hls({
        xhrSetup: (xhr) => {
          const { accessToken } = getStoredAuth();
          if (accessToken) {
            xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
          }
        }
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(player);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (!data.fatal) {
          return;
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }

        const message = "HLS playback failed.";
        setError(message);
        setLoading(false);
        onError?.(message);
        hls.destroy();
      });
    };

    setupHls().catch(() => {
      const message = "Unable to load HLS player.";
      setError(message);
      setLoading(false);
      onError?.(message);
    });

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      player.removeAttribute("src");
      player.load();
    };
  }, [src]);

  const handleLoadedMetadata = () => {
    const player = videoRef.current;
    setLoading(false);

    if (
      player &&
      resumeTime > 0 &&
      !hasResumedRef.current &&
      Number.isFinite(player.duration)
    ) {
      player.currentTime = Math.min(resumeTime, Math.max(player.duration - 1, 0));
      hasResumedRef.current = true;
    }
  };

  const handleEnded = () => {
    reportProgress("ended");
    onEnded?.();
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-sm text-white">
          Loading video...
        </div>
      )}

      <video
        ref={videoRef}
        controls
        poster={poster}
        className="h-full w-full"
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={() => setLoading(false)}
        onTimeUpdate={() => reportProgress("timeupdate")}
        onPause={() => reportProgress("pause")}
        onEnded={handleEnded}
        onError={() => {
          const message = "Video playback failed.";
          setError(message);
          setLoading(false);
          onError?.(message);
        }}
      >
        Your browser does not support this video format.
      </video>

      {error && (
        <div className="border-t border-rose-900/40 bg-rose-950 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}
