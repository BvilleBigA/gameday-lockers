"use client";

import type { LayerKey, SceneLayoutState, SceneTextLayer } from "@/lib/scene-layout";

type SceneVisual = {
  name: string;
  backgroundUrl: string;
  themeColor: string;
  mediaKind: string;
  layout: SceneLayoutState;
};

type Props = {
  scene: SceneVisual;
  /** Shown in template chrome (ignored when `mediaOnly`) */
  sourceLabel?: string;
  /** TV / live screen: full-bleed image or video only — no gradients, frames, or text layers */
  mediaOnly?: boolean;
  /** Editor: highlight layer + allow selection */
  editMode?: boolean;
  selectedLayer?: LayerKey | null;
  onSelectLayer?: (key: LayerKey | null) => void;
  /** When dragging in editor, parent handles move */
  onLayerPointerDown?: (key: LayerKey, e: React.PointerEvent) => void;
  /** Thumbnail grids: do not autoplay video */
  videoPaused?: boolean;
  /** TV / full-bleed: largest 16×9 canvas that fits in the viewport (scales down with the window) */
  fillViewport?: boolean;
  className?: string;
};

function layerTransform(align: SceneTextLayer["align"]) {
  if (align === "center") return "translateX(-50%)";
  if (align === "right") return "translateX(-100%)";
  return "none";
}

function TextLayerView({
  layerKey,
  layer: L,
  accent,
  editMode,
  selected,
  onSelectLayer,
  onLayerPointerDown,
}: {
  layerKey: LayerKey;
  layer: SceneTextLayer;
  accent: string;
  editMode?: boolean;
  selected?: boolean;
  onSelectLayer?: (key: LayerKey | null) => void;
  onLayerPointerDown?: (key: LayerKey, e: React.PointerEvent) => void;
}) {
  const hasContent = L.content.trim().length > 0;
  if (!hasContent && !editMode) return null;

  return (
    <div
      role={editMode ? "button" : undefined}
      tabIndex={editMode ? 0 : undefined}
      className={`absolute z-20 font-gdl-display font-bold uppercase tracking-wide text-[var(--gdl-text)] ${
        editMode ? "cursor-grab touch-none outline-none active:cursor-grabbing" : "pointer-events-none"
      } ${selected ? "ring-2 ring-[#52A88E] ring-offset-2 ring-offset-black/40" : ""}`}
      style={{
        left: `${L.xPct}%`,
        top: `${L.yPct}%`,
        width: `${L.maxWidthPct}%`,
        transform: layerTransform(L.align),
        textAlign: L.align,
        fontSize: `${L.fontSizePct}cqh`,
        lineHeight: 1.08,
        textShadow: `0 0.15em 0.8em rgba(0,0,0,0.85), 0 0 1.2em ${accent}44`,
      }}
      onClick={
        editMode
          ? (e) => {
              e.stopPropagation();
              onSelectLayer?.(layerKey);
            }
          : undefined
      }
      onPointerDown={
        editMode && onLayerPointerDown
          ? (e) => {
              e.stopPropagation();
              onSelectLayer?.(layerKey);
              onLayerPointerDown(layerKey, e);
            }
          : undefined
      }
    >
      <span className="block break-words">{hasContent ? L.content : editMode ? "…" : ""}</span>
    </div>
  );
}

function TemplateChrome({
  layout,
  accent,
  sourceLabel,
}: {
  layout: SceneLayoutState;
  accent: string;
  sourceLabel: string;
}) {
  const { templateId, showBroadcastFrame, showVignette, showGoldRule } = layout;

  return (
    <>
      {showVignette ? <div className="gdl-vignette pointer-events-none absolute inset-0 z-[5]" /> : null}
      {showVignette ? (
        <div
          className="pointer-events-none absolute inset-0 z-[6] opacity-30"
          style={{
            background:
              "linear-gradient(180deg, rgba(6,6,7,0.85) 0%, transparent 35%, transparent 65%, rgba(6,6,7,0.95) 100%)",
          }}
        />
      ) : null}

      {templateId === "gameday-classic" && showBroadcastFrame ? (
        <>
          <div className="pointer-events-none absolute inset-3 z-[8] border border-[rgba(196,160,82,0.2)] md:inset-5 lg:inset-8" />
          <div className="pointer-events-none absolute inset-4 z-[8] border border-[rgba(196,160,82,0.08)] md:inset-6 lg:inset-10" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[10] px-[4%] pb-[5%] pt-[18%]">
            <div className="gdl-nameplate-outer relative mx-auto max-w-[90%] rounded-sm bg-[rgba(6,6,7,0.72)] px-[5%] py-[5.5%] backdrop-blur-md md:max-w-[85%]">
              <div
                className="absolute left-0 top-0 h-[0.35cqh] w-[12%] min-h-[3px] md:w-[14%]"
                style={{
                  background: `linear-gradient(90deg, ${accent}, transparent)`,
                }}
              />
              <div
                className="absolute bottom-0 right-0 h-[0.35cqh] w-[12%] min-h-[3px] md:w-[14%]"
                style={{
                  background: `linear-gradient(270deg, ${accent}, transparent)`,
                }}
              />
              <div className="pointer-events-none absolute left-[5%] top-[10%] z-[12]">
                <p className="font-gdl-display text-[1.1cqh] font-semibold uppercase tracking-[0.45em] text-[var(--gdl-muted)]">
                  {sourceLabel}
                </p>
              </div>
              {showGoldRule ? (
                <div className="pointer-events-none absolute bottom-[22%] left-[5%] z-[12] max-w-[48%]">
                  <div className="gdl-gold-rule h-[3px] w-full min-w-[120px]" />
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      {templateId === "boxout-broadcast" ? (
        <div className="pointer-events-none absolute inset-0 z-[8]">
          <div
            className="absolute bottom-0 left-0 right-0 h-[32%]"
            style={{
              background: `linear-gradient(180deg, transparent 0%, rgba(6,6,7,0.2) 25%, rgba(6,6,7,0.92) 100%)`,
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[26%]"
            style={{
              clipPath: "polygon(0 18%, 3% 12%, 100% 0, 100% 100%, 0 100%)",
              background: `linear-gradient(90deg, ${accent}cc 0%, rgba(6,6,7,0.96) 28%, rgba(6,6,7,0.98) 100%)`,
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.06), 0 -12px 40px rgba(0,0,0,0.5)`,
            }}
          />
          <div
            className="absolute bottom-[22%] left-0 h-[3.5%] w-[38%] min-h-[6px]"
            style={{
              background: `linear-gradient(90deg, ${accent}, transparent)`,
              clipPath: "polygon(0 0, 100% 0, 96% 100%, 0 100%)",
            }}
          />
          <div className="absolute bottom-[10%] right-[4%] h-[14%] w-[1.2%] min-w-[4px] rounded-full bg-white/10" />
          <div className="absolute bottom-[10%] right-[5.5%] h-[10%] w-[1.2%] min-w-[4px] rounded-full bg-white/6" />
        </div>
      ) : null}

      {templateId === "boxout-marquee" ? (
        <div className="pointer-events-none absolute inset-0 z-[8]">
          <div
            className="absolute left-1/2 top-[28%] h-[44%] w-[78%] -translate-x-1/2 rounded-lg opacity-[0.12]"
            style={{
              background: `radial-gradient(ellipse at center, ${accent} 0%, transparent 70%)`,
            }}
          />
          {showGoldRule ? (
            <div className="absolute left-1/2 top-[58%] w-[40%] min-w-[160px] -translate-x-1/2">
              <div className="gdl-gold-rule h-[3px] w-full" />
            </div>
          ) : null}
        </div>
      ) : null}

      {templateId !== "gameday-classic" ? (
        <div className="pointer-events-none absolute left-[4%] top-[4%] z-[18]">
          <span
            className="inline-block rounded bg-black/55 px-[0.6em] py-[0.25em] font-gdl-display font-bold uppercase tracking-[0.35em] text-[var(--gdl-gold)] backdrop-blur-sm"
            style={{ fontSize: `${1.05}cqh` }}
          >
            {sourceLabel}
          </span>
        </div>
      ) : null}
    </>
  );
}

export function SceneScreenView({
  scene,
  sourceLabel = "",
  mediaOnly = false,
  editMode,
  selectedLayer,
  onSelectLayer,
  onLayerPointerDown,
  videoPaused = false,
  fillViewport = false,
  className = "",
}: Props) {
  const { layout, themeColor, backgroundUrl, mediaKind } = scene;
  const accent = themeColor || "var(--gdl-gold)";
  const isVideo = mediaKind === "VIDEO";
  const plain = mediaOnly && !editMode;

  const canvasClass = fillViewport
    ? "relative aspect-video w-[min(100vw,calc(100dvh*16/9))] max-h-[100dvh] shrink-0 [container-type:size]"
    : "relative aspect-video w-full [container-type:size]";

  return (
    <div
      className={`gdl-screen-root relative overflow-hidden bg-black ${fillViewport ? "flex min-h-dvh w-full items-center justify-center" : "w-full rounded-lg"} ${className}`}
      onClick={editMode ? () => onSelectLayer?.(null) : undefined}
    >
      <div className={canvasClass}>
        {isVideo ? (
          <video
            key={backgroundUrl}
            className={
              plain
                ? "absolute inset-0 z-0 h-full w-full object-contain object-center"
                : "absolute inset-0 z-0 h-full w-full object-contain object-center"
            }
            src={backgroundUrl}
            autoPlay={!editMode && !videoPaused}
            muted
            loop={!editMode && !videoPaused}
            playsInline
          />
        ) : plain ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic scene URLs (uploads / external)
          <img
            src={backgroundUrl}
            alt=""
            className="absolute inset-0 z-0 h-full w-full object-contain object-center"
            draggable={false}
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic scene URLs (uploads / external) */}
            <img
              src={backgroundUrl}
              alt=""
              className="absolute inset-0 z-0 h-full w-full object-contain object-center"
              draggable={false}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{
                background: `linear-gradient(145deg, ${accent}55 0%, transparent 42%, rgba(6,6,7,0.5) 100%)`,
              }}
            />
          </>
        )}

        {plain ? null : (
          <>
            <TemplateChrome layout={layout} accent={accent} sourceLabel={sourceLabel} />

            <TextLayerView
              layerKey="subhead"
              layer={layout.subhead}
              accent={accent}
              editMode={editMode}
              selected={selectedLayer === "subhead"}
              onSelectLayer={onSelectLayer}
              onLayerPointerDown={onLayerPointerDown}
            />
            <TextLayerView
              layerKey="tagline"
              layer={layout.tagline}
              accent={accent}
              editMode={editMode}
              selected={selectedLayer === "tagline"}
              onSelectLayer={onSelectLayer}
              onLayerPointerDown={onLayerPointerDown}
            />
            <TextLayerView
              layerKey="headline"
              layer={layout.headline}
              accent={accent}
              editMode={editMode}
              selected={selectedLayer === "headline"}
              onSelectLayer={onSelectLayer}
              onLayerPointerDown={onLayerPointerDown}
            />
          </>
        )}
      </div>
    </div>
  );
}
