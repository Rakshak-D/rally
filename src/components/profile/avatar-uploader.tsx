"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type KeyboardEvent, type PointerEvent } from "react";

import { MemberAvatar } from "@/components/dashboard/member-avatar";
import { Icon } from "@/components/ui/icons";
import { showToast } from "@/components/ui/toast";
import { updateAvatarAction, removeAvatarAction } from "@/lib/workspace/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const VIEWPORT_SIZE = 240;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type Dimensions = { width: number; height: number };
type CropOffset = { x: number; y: number };

export function AvatarUploader({
  userId,
  displayName,
  avatarPath,
}: {
  userId: string;
  displayName: string;
  avatarPath: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offset: CropOffset } | null>(null);
  const [currentPath, setCurrentPath] = useState(avatarPath);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const scale = dimensions ? VIEWPORT_SIZE / Math.min(dimensions.width, dimensions.height) * zoom : 1;
  const imageWidth = dimensions ? dimensions.width * scale : VIEWPORT_SIZE;
  const imageHeight = dimensions ? dimensions.height * scale : VIEWPORT_SIZE;

  function clampOffset(value: CropOffset, nextZoom = zoom): CropOffset {
    if (!dimensions) return value;
    const nextScale = VIEWPORT_SIZE / Math.min(dimensions.width, dimensions.height) * nextZoom;
    const width = dimensions.width * nextScale;
    const height = dimensions.height * nextScale;
    return {
      x: Math.max(VIEWPORT_SIZE - width, Math.min(0, value.x)),
      y: Math.max(VIEWPORT_SIZE - height, Math.min(0, value.y)),
    };
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setError(null);
    setStatus(null);
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("Choose a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Choose an image smaller than 2 MB.");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setDimensions(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleImageLoad() {
    const image = imageRef.current;
    if (!image) return;
    const nextDimensions = { width: image.naturalWidth, height: image.naturalHeight };
    setDimensions(nextDimensions);
    const baseScale = VIEWPORT_SIZE / Math.min(nextDimensions.width, nextDimensions.height);
    setOffset({
      x: (VIEWPORT_SIZE - nextDimensions.width * baseScale) / 2,
      y: (VIEWPORT_SIZE - nextDimensions.height * baseScale) / 2,
    });
  }

  function moveCrop(deltaX: number, deltaY: number) {
    setOffset((value) => clampOffset({ x: value.x + deltaX, y: value.y + deltaY }));
  }

  function handleZoomChange(value: number) {
    setZoom(value);
    setOffset((current) => clampOffset(current, value));
  }

  function beginDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dimensions || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offset };
  }

  function handleDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset(clampOffset({
      x: drag.offset.x + event.clientX - drag.x,
      y: drag.offset.y + event.clientY - drag.y,
    }));
  }

  function handleCropKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keyMoves: Record<string, CropOffset> = {
      ArrowLeft: { x: -8, y: 0 },
      ArrowRight: { x: 8, y: 0 },
      ArrowUp: { x: 0, y: -8 },
      ArrowDown: { x: 0, y: 8 },
    };
    const delta = keyMoves[event.key];
    if (!delta) return;
    event.preventDefault();
    moveCrop(delta.x, delta.y);
  }

  async function savePhoto() {
    const image = imageRef.current;
    if (!image || !dimensions) {
      setError("Wait for the photo preview to finish loading.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("This browser could not prepare the photo.");
      return;
    }
    const sourceSide = Math.min(dimensions.width, dimensions.height) / zoom;
    context.drawImage(
      image,
      -offset.x / scale,
      -offset.y / scale,
      sourceSide,
      sourceSide,
      0,
      0,
      256,
      256,
    );
    const encoded = await encodeCanvas(canvas);
    if (!encoded) {
      setError("This browser could not prepare the photo.");
      return;
    }
    if (encoded.blob.size > MAX_UPLOAD_BYTES) {
      setError("The prepared photo is larger than 2 MB. Zoom in or choose a simpler image.");
      return;
    }

    setError(null);
    setStatus("Uploading your photo…");
    startTransition(async () => {
      try {
        const path = userId + "/avatar." + encoded.extension;
        const client = createSupabaseBrowserClient();
        const { error: uploadError } = await client.storage.from("avatars").upload(path, encoded.blob, {
          cacheControl: "3600",
          contentType: encoded.blob.type,
          upsert: true,
        });
        if (uploadError) {
          setStatus(null);
          setError("Your photo could not be uploaded. Check your connection and try again.");
          return;
        }
        const result = await updateAvatarAction(path);
        if (result.kind === "error") {
          setStatus(null);
          setError(result.message);
          return;
        }
        setCurrentPath(path);
        setPreviewUrl(null);
        setDimensions(null);
        setStatus(null);
        showToast(result.message);
      } catch {
        setStatus(null);
        setError("Your photo could not be saved. Try again in a moment.");
      }
    });
  }

  function removePhoto() {
    setError(null);
    setStatus("Removing your photo…");
    startTransition(async () => {
      try {
        const result = await removeAvatarAction();
        if (result.kind === "error") {
          setStatus(null);
          setError(result.message);
          return;
        }
        setCurrentPath(null);
        setStatus(null);
        showToast(result.message);
      } catch {
        setStatus(null);
        setError("Your photo could not be removed. Try again in a moment.");
      }
    });
  }

  return (
    <section className="avatar-uploader" aria-label="Profile photo">
      <div className="avatar-uploader-current">
        <MemberAvatar name={displayName} userId={userId} src={currentPath} size="xl" />
        <div><strong>{currentPath ? "Your profile photo" : "Your initials"}</strong><span>Shown to people in your workspaces.</span></div>
      </div>

      {previewUrl ? (
        <div className="avatar-editor">
          <p className="avatar-editor-title">Adjust your photo</p>
          <p className="avatar-editor-instructions">Drag to position. Use arrow keys or the move buttons for finer adjustments.</p>
          <div
            className="avatar-crop-viewport"
            role="group"
            aria-label="Photo crop area. Use the arrow keys to move the image."
            tabIndex={0}
            onKeyDown={handleCropKeyDown}
            onPointerDown={beginDrag}
            onPointerMove={handleDrag}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
          >
            {/* Native img is required here because the cropper reads this local blob into canvas. */}
            <img
              ref={imageRef}
              src={previewUrl}
              width={imageWidth}
              height={imageHeight}
              alt=""
              draggable={false}
              onLoad={handleImageLoad}
              style={{ width: imageWidth, height: imageHeight, left: offset.x, top: offset.y }}
            />
            <span className="avatar-crop-outline" aria-hidden="true" />
          </div>
          <label className="avatar-zoom-label" htmlFor="avatar-zoom">Zoom photo</label>
          <input
            id="avatar-zoom"
            className="avatar-zoom-range"
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(event) => handleZoomChange(Number(event.currentTarget.value))}
          />
          <div className="avatar-crop-moves" aria-label="Photo position controls">
            <button className="button button--secondary" type="button" onClick={() => moveCrop(0, -12)} disabled={!dimensions}>Move up</button>
            <button className="button button--secondary" type="button" onClick={() => moveCrop(12, 0)} disabled={!dimensions}>Move right</button>
            <button className="button button--secondary" type="button" onClick={() => moveCrop(12, 0)} disabled={!dimensions}>Move left</button>
            <button className="button button--secondary" type="button" onClick={() => moveCrop(0, 12)} disabled={!dimensions}>Move down</button>
          </div>
          <div className="avatar-uploader-actions">
            <button className="button button--primary" type="button" onClick={savePhoto} disabled={pending || !dimensions}>Save photo</button>
            <button className="button button--ghost" type="button" onClick={() => { setPreviewUrl(null); setDimensions(null); setError(null); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="avatar-uploader-actions">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Choose profile photo"
            onChange={handleFileChange}
          />
          <button className="button button--secondary" type="button" onClick={() => fileInputRef.current?.click()} disabled={pending}>
            <Icon name="camera" size={18} /> {currentPath ? "Change photo" : "Add a photo"}
          </button>
          {currentPath && <button className="button button--ghost" type="button" onClick={removePhoto} disabled={pending}>Remove photo</button>}
        </div>
      )}

      {pending && <progress className="avatar-upload-progress" aria-label="Saving profile photo" />}
      {error && <p className="form-message form-message--error" role="alert">{error}</p>}
      {status && <p className="field-hint" role="status">{status}</p>}
      <p className="field-hint">PNG, JPEG, or WebP. Source images up to 2 MB. Your photo is cropped to a square before upload.</p>
    </section>
  );
}

async function encodeCanvas(canvas: HTMLCanvasElement): Promise<{ blob: Blob; extension: "webp" | "jpg" } | null> {
  const webp = await canvasToBlob(canvas, "image/webp");
  if (webp?.type === "image/webp") return { blob: webp, extension: "webp" };
  const jpeg = await canvasToBlob(canvas, "image/jpeg");
  return jpeg?.type === "image/jpeg" ? { blob: jpeg, extension: "jpg" } : null;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.86));
}
