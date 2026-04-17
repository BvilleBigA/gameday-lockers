export const SCENE_LAYOUT_VERSION = 1 as const;

export type LayoutTemplateId = "gameday-classic" | "boxout-broadcast" | "boxout-marquee";

export type TextAlign = "left" | "center" | "right";

/** Positions are % of the 16×9 frame; font size is % of frame height (use with cqh in container). */
export type SceneTextLayer = {
  content: string;
  xPct: number;
  yPct: number;
  fontSizePct: number;
  maxWidthPct: number;
  align: TextAlign;
};

export type SceneLayoutState = {
  v: typeof SCENE_LAYOUT_VERSION;
  templateId: LayoutTemplateId;
  headline: SceneTextLayer;
  subhead: SceneTextLayer;
  tagline: SceneTextLayer;
  showBroadcastFrame: boolean;
  showVignette: boolean;
  showGoldRule: boolean;
};

export const TEMPLATE_META: Record<
  LayoutTemplateId,
  { label: string; description: string }
> = {
  "gameday-classic": {
    label: "Gameday classic",
    description: "Inset plate, gold accents — default locker nameplate look.",
  },
  "boxout-broadcast": {
    label: "Boxout broadcast",
    description: "Sports lower-third bar, angled panels, high-energy TV graphic.",
  },
  "boxout-marquee": {
    label: "Boxout marquee",
    description: "Center-stage headline stack for arena-style reveals.",
  },
};

export const TEMPLATE_IDS: LayoutTemplateId[] = [
  "gameday-classic",
  "boxout-broadcast",
  "boxout-marquee",
];

function layer(
  content: string,
  defaults: Partial<SceneTextLayer> & Pick<SceneTextLayer, "xPct" | "yPct" | "fontSizePct">
): SceneTextLayer {
  return {
    content,
    maxWidthPct: 88,
    align: "left",
    ...defaults,
  };
}

export function defaultLayoutForTemplate(
  templateId: LayoutTemplateId,
  sceneName: string
): SceneLayoutState {
  const name = sceneName.trim() || "Scene";
  switch (templateId) {
    case "boxout-broadcast":
      return {
        v: SCENE_LAYOUT_VERSION,
        templateId,
        showBroadcastFrame: true,
        showVignette: true,
        showGoldRule: false,
        headline: layer(name.toUpperCase(), {
          xPct: 4,
          yPct: 74,
          fontSizePct: 6.2,
          maxWidthPct: 72,
          align: "left",
        }),
        subhead: layer("LOCKER ROOM", {
          xPct: 4,
          yPct: 69,
          fontSizePct: 2.1,
          maxWidthPct: 45,
          align: "left",
        }),
        tagline: layer("", {
          xPct: 4,
          yPct: 86,
          fontSizePct: 1.5,
          maxWidthPct: 88,
          align: "left",
        }),
      };
    case "boxout-marquee":
      return {
        v: SCENE_LAYOUT_VERSION,
        templateId,
        showBroadcastFrame: false,
        showVignette: true,
        showGoldRule: true,
        headline: layer(name.toUpperCase(), {
          xPct: 50,
          yPct: 40,
          fontSizePct: 8.5,
          maxWidthPct: 92,
          align: "center",
        }),
        subhead: layer("", {
          xPct: 50,
          yPct: 54,
          fontSizePct: 2.8,
          maxWidthPct: 78,
          align: "center",
        }),
        tagline: layer("", {
          xPct: 50,
          yPct: 61,
          fontSizePct: 1.8,
          maxWidthPct: 55,
          align: "center",
        }),
      };
    case "gameday-classic":
    default:
      return {
        v: SCENE_LAYOUT_VERSION,
        templateId: "gameday-classic",
        showBroadcastFrame: true,
        showVignette: true,
        showGoldRule: true,
        headline: layer(name, {
          xPct: 7,
          yPct: 71,
          fontSizePct: 6.8,
          maxWidthPct: 86,
          align: "left",
        }),
        subhead: layer("Gameday Lockers", {
          xPct: 6,
          yPct: 8,
          fontSizePct: 1.15,
          maxWidthPct: 42,
          align: "left",
        }),
        tagline: layer("Digital locker nameplates", {
          xPct: 6,
          yPct: 11.5,
          fontSizePct: 2.2,
          maxWidthPct: 42,
          align: "left",
        }),
      };
  }
}

export function parseSceneLayout(raw: string | null | undefined, sceneName: string): SceneLayoutState {
  if (!raw || raw === "{}") {
    return defaultLayoutForTemplate("gameday-classic", sceneName);
  }
  try {
    const o = JSON.parse(raw) as Partial<SceneLayoutState> & { templateId?: string };
    const tid = o.templateId;
    const valid: LayoutTemplateId =
      tid === "boxout-broadcast" || tid === "boxout-marquee"
        ? tid
        : tid === "gameday-classic" || tid === "shield-classic"
          ? "gameday-classic"
          : "gameday-classic";
    const base = defaultLayoutForTemplate(valid, sceneName);
    if (o.v !== SCENE_LAYOUT_VERSION) {
      return base;
    }
    const mergeLayer = (key: "headline" | "subhead" | "tagline"): SceneTextLayer => {
      const patch = o[key];
      if (!patch || typeof patch !== "object") return base[key];
      return { ...base[key], ...patch };
    };
    return {
      v: SCENE_LAYOUT_VERSION,
      templateId: valid,
      showBroadcastFrame: typeof o.showBroadcastFrame === "boolean" ? o.showBroadcastFrame : base.showBroadcastFrame,
      showVignette: typeof o.showVignette === "boolean" ? o.showVignette : base.showVignette,
      showGoldRule: typeof o.showGoldRule === "boolean" ? o.showGoldRule : base.showGoldRule,
      headline: mergeLayer("headline"),
      subhead: mergeLayer("subhead"),
      tagline: mergeLayer("tagline"),
    };
  } catch {
    return defaultLayoutForTemplate("gameday-classic", sceneName);
  }
}

export function serializeSceneLayout(layout: SceneLayoutState): string {
  return JSON.stringify(layout);
}

export type LayerKey = "headline" | "subhead" | "tagline";
