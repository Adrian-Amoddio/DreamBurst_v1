import base64
import io
import math
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image
from sklearn.cluster import KMeans
from skimage.color import rgb2lab, lab2rgb, rgb2xyz


# ---------- helpers: IO / color utilities ----------

def _dataurl_to_rgb_array(data_url: str) -> np.ndarray:
    """Decode base64 data URL -> float RGB array in [0,1], shape (H,W,3)."""
    if "," in data_url:
        b64 = data_url.split(",", 1)[1]
    else:
        b64 = data_url
    img_bytes = base64.b64decode(b64)
    im = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    im.thumbnail((256, 256), Image.LANCZOS)  # speed, keep structure
    arr = np.asarray(im, dtype=np.float32) / 255.0
    return arr


def _rgb01_to_hex(rgb01):
    r, g, b = (np.clip(np.round(np.array(rgb01) * 255), 0, 255)).astype(int).tolist()
    return f"#{r:02X}{g:02X}{b:02X}"


def _rgb_to_hsl_tuple(rgb01):
    r, g, b = [x for x in rgb01]
    mx, mn = max(r, g, b), min(r, g, b)
    l = (mx + mn) / 2.0
    if mx == mn:
        h = s = 0.0
    else:
        d = mx - mn
        s = d / (2.0 - mx - mn) if l > 0.5 else d / (mx + mn)
        if mx == r:
            h = (g - b) / d + (6 if g < b else 0)
        elif mx == g:
            h = (b - r) / d + 2
        else:
            h = (r - g) / d + 4
        h /= 6.0
    return (round(h * 360), round(s * 100), round(l * 100))


def _lab_to_lch(lab):
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.sqrt(a * a + b * b)
    H = (np.degrees(np.arctan2(b, a)) + 360.0) % 360.0
    return np.stack([L, C, H], axis=-1)


def _lab_to_hex_hsl(lab_color: np.ndarray):
    rgb = np.clip(lab2rgb(lab_color.reshape(1, 1, 3))[0, 0, :], 0, 1)
    hexv = _rgb01_to_hex(rgb)
    h, s, l = _rgb_to_hsl_tuple(rgb)
    return hexv, f"{h},{s}%,{l}%", _lab_to_lch(lab_color.reshape(1, 3))[0].round(1).tolist()


# ---------- palette role selection ----------

def _choose_roles_from_clusters(labs: np.ndarray,
                                labels: np.ndarray,
                                k: int) -> Dict[str, np.ndarray]:
    roles = {}
    centers, sizes = [], []
    for cid in range(k):
        pick = labs[labels == cid]
        if len(pick) == 0:
            centers.append(np.array([50, 0, 0], dtype=np.float32))
            sizes.append(0)
            continue
        centers.append(np.mean(pick, axis=0))
        sizes.append(len(pick))
    centers, sizes = np.array(centers), np.array(sizes)

    lch_centers = _lab_to_lch(centers)
    weights = sizes * (1.0 + (lch_centers[:, 1] / (lch_centers[:, 1].max() + 1e-6)))
    primary_idx = int(np.argmax(weights))
    primary = centers[primary_idx]

    p_hue = _lab_to_lch(primary.reshape(1, 3))[0, 2]
    hue_diff = np.abs(((lch_centers[:, 2] - p_hue + 180) % 360) - 180)
    hue_diff[primary_idx] = 999
    analogous_candidates = np.where(hue_diff < 30)[0]
    if len(analogous_candidates) == 0:
        secondary_idx = int(np.argmin(hue_diff))
    else:
        secondary_idx = int(max(analogous_candidates, key=lambda i: sizes[i]))
    secondary = centers[secondary_idx]

    comp_gap = np.abs(((lch_centers[:, 2] - ((p_hue + 180) % 360) + 180) % 360) - 180)
    comp_candidates = np.where(comp_gap < 25)[0]
    if len(comp_candidates) == 0:
        mask = np.ones(k, dtype=bool)
        mask[[primary_idx, secondary_idx]] = False
        far_idx = np.argmax(hue_diff[mask])
        accent_idx = np.arange(k)[mask][far_idx]
    else:
        accent_idx = int(max(comp_candidates, key=lambda i: sizes[i]))
    accent = centers[accent_idx]

    roles["primary"] = primary
    roles["secondary"] = secondary
    roles["accent"] = accent
    return roles


def _pick_neutrals_from_all(lch_all: np.ndarray):
    lowC = lch_all[lch_all[:, 1] < 8]
    if len(lowC) < 100:
        lowC = lch_all[lch_all[:, 1] < 12]
    if len(lowC) == 0:
        return np.array([92, 4, 90]), np.array([12, 2, 0])  # fallback LCH
    Ls = lowC[:, 0]
    light = lowC[Ls >= np.percentile(Ls, 85)][0]
    dark = lowC[Ls <= np.percentile(Ls, 15)][0]
    return light, dark


# ---------- “look” metrics ----------

def _xy_from_rgb01(rgb01: np.ndarray) -> np.ndarray:
    """RGB01 -> XYZ -> xy chromaticity per pixel."""
    xyz = rgb2xyz(rgb01.reshape(-1, 1, 3)).reshape(-1, 3)
    X, Y, Z = xyz[:, 0], xyz[:, 1], xyz[:, 2]
    denom = (X + Y + Z + 1e-8)
    x = X / denom
    y = Y / denom
    return np.stack([x, y], axis=-1)


def _estimate_cct_from_xy(xy: np.ndarray) -> float:
    """McCamy’s approximation (good 2850–6500K-ish)."""
    x, y = float(np.mean(xy[:, 0])), float(np.mean(xy[:, 1]))
    n = (x - 0.3320) / (y - 0.1858 + 1e-8)
    cct = -449.0 * n**3 + 3525.0 * n**2 - 6823.3 * n + 5520.33
    return max(1000.0, min(25000.0, cct))


def _estimate_tint_from_lab_neutrals(lab_neutral: np.ndarray) -> float:
    """
    Simple, robust tint proxy from a* on low-chroma pixels:
    >0 = magenta/red shift, <0 = green shift. Return as small float.
    """
    if len(lab_neutral) == 0:
        return 0.0
    a_mean = float(np.mean(lab_neutral[:, 1]))
    # scale to a gentle ~[-0.01, 0.01] range typical for duv intuition
    return float(np.clip(a_mean / 100.0, -0.02, 0.02))


def _luminance_Y(rgb01: np.ndarray) -> np.ndarray:
    """Relative luminance proxy from XYZ.Y."""
    xyz = rgb2xyz(rgb01.reshape(-1, 1, 3)).reshape(-1, 3)
    return xyz[:, 1]  # Y


def _tonal_key_and_range_stops(Y: np.ndarray) -> Tuple[str, float, str]:
    Y = np.clip(Y, 1e-6, 1.0)
    p5, p50, p95 = np.percentile(Y, [5, 50, 95])
    dyn = float(np.log2((p95) / (p5)))
    if p50 < 0.25:
        key = "low-key"
    elif p50 > 0.60:
        key = "high-key"
    else:
        key = "mid-key"
    if   dyn < 4.0: contrast = "low"
    elif dyn < 6.0: contrast = "medium"
    else:           contrast = "high"
    return key, dyn, contrast


def _key_fill_ratio(Y: np.ndarray) -> Tuple[str, float]:
    """Cluster luminance into two groups; compute ratio & stops."""
    if len(Y) < 1000:
        return "—", 0.0
    km = KMeans(n_clusters=2, n_init=6, random_state=42)
    labels = km.fit_predict(Y.reshape(-1, 1))
    m0 = float(np.mean(Y[labels == 0]))
    m1 = float(np.mean(Y[labels == 1]))
    hi, lo = (m0, m1) if m0 >= m1 else (m1, m0)
    ratio = max(1.0, hi / (lo + 1e-8))
    stops = float(np.log2(ratio))
    # format like "4:1"
    pretty = f"{ratio:.1f}:1".replace(".0", "")
    return pretty, stops


def _cool_warm_balance_from_hue(lch_all: np.ndarray) -> Dict[str, int]:
    """
    Very lightweight proxy:
    warm hues ≈ [330..360] U [0..60]; cool ≈ [180..300]
    """
    H = lch_all[:, 2]
    warm = np.logical_or((H <= 60), (H >= 330))
    cool = np.logical_and(H >= 180, H <= 300)
    warm_pct = int(round(100 * warm.sum() / max(1, len(H))))
    cool_pct = int(round(100 * cool.sum() / max(1, len(H))))
    # keep total <= 100 by clipping; remainder is “neutral/mid”
    if warm_pct + cool_pct > 100:
        scale = 100.0 / (warm_pct + cool_pct)
        warm_pct = int(round(warm_pct * scale))
        cool_pct = int(round(cool_pct * scale))
    return {"coolPct": cool_pct, "warmPct": warm_pct}


# ---------- main API ----------

async def extract_palette(image_base64: str) -> dict:
    """
    Smart palette + look metrics.
    """
    rgb = _dataurl_to_rgb_array(image_base64)  # (H,W,3) in [0,1]
    H, W, _ = rgb.shape
    flat_rgb = rgb.reshape(-1, 3)

    # sample ~20k pixels for speed
    N = flat_rgb.shape[0]
    idx = np.random.choice(N, min(20000, N), replace=False)
    sample_rgb = flat_rgb[idx]

    # LAB/LCH for analysis
    lab = rgb2lab(sample_rgb.reshape(-1, 1, 3)).reshape(-1, 3)
    lch = _lab_to_lch(lab)

    # ----- palette colors -----
    chroma = lch[:, 1]
    vivid_mask = chroma >= max(12.0, np.percentile(chroma, 50))
    vivid_lab = lab[vivid_mask]
    if len(vivid_lab) < 300:
        vivid_mask = chroma >= 8.0
        vivid_lab = lab[vivid_mask]

    if len(vivid_lab) < 50:
        centers = np.array([
            np.median(vivid_lab, axis=0) if len(vivid_lab) else np.array([50, 0, 0]),
            np.percentile(vivid_lab, 80, axis=0) if len(vivid_lab) else np.array([60, 0, 0]),
            np.percentile(vivid_lab, 20, axis=0) if len(vivid_lab) else np.array([40, 0, 0]),
        ])
        labels = np.argmin(np.linalg.norm(vivid_lab[:, None, :] - centers[None, :, :], axis=2), axis=1) if len(vivid_lab) else np.array([])
        k = centers.shape[0]
    else:
        kmeans = KMeans(n_clusters=min(5, max(3, len(vivid_lab) // 1000)), n_init=6, random_state=42)
        labels = kmeans.fit_predict(vivid_lab)
        centers = kmeans.cluster_centers_
        k = centers.shape[0]

    roles_lab = _choose_roles_from_clusters(vivid_lab, labels, k)

    # neutrals from all pixels
    all_lab = rgb2lab(flat_rgb.reshape(-1, 1, 3)).reshape(-1, 3)
    all_lch = _lab_to_lch(all_lab)
    neutral_light_lch, neutral_dark_lch = _pick_neutrals_from_all(all_lch)

    def lch_to_lab(lch_vec):
        L, C, Hh = lch_vec
        a = C * math.cos(math.radians(Hh))
        b = C * math.sin(math.radians(Hh))
        return np.array([L, a, b], dtype=np.float32)

    roles_lab["neutralLight"] = lch_to_lab(neutral_light_lch)
    roles_lab["neutralDark"]  = lch_to_lab(neutral_dark_lch)

    order = ["primary", "secondary", "accent", "neutralLight", "neutralDark"]
    palette: List[Dict] = []
    for role in order:
        hexv, hsl, lch_list = _lab_to_hex_hsl(roles_lab[role])
        palette.append({"role": role, "hex": hexv, "hsl": hsl, "lch": lch_list, "note": ""})

    # ----- contrast sample -----
    def rel_luminance(rgb01):
        def f(c): return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
        r, g, b = [f(x) for x in rgb01]; return 0.2126*r + 0.7152*g + 0.0722*b

    def contrast(hex1, hex2):
        def hex_to_rgb01(hx): return np.array([int(hx[1:3],16), int(hx[3:5],16), int(hx[5:7],16)]) / 255.0
        L1, L2 = rel_luminance(hex_to_rgb01(hex1)), rel_luminance(hex_to_rgb01(hex2))
        Lh, Ld = (L1, L2) if L1 >= L2 else (L2, L1)
        return round((Lh + 0.05) / (Ld + 0.05), 2)

    hex_primary = palette[0]["hex"]
    hex_light   = palette[3]["hex"]
    hex_dark    = palette[4]["hex"]
    contrast_matrix = {
        "primary_vs_neutralLight": contrast(hex_primary, hex_light),
        "primary_vs_neutralDark":  contrast(hex_primary, hex_dark),
        "neutralDark_vs_neutralLight": contrast(hex_dark, hex_light),
    }

    # ----- look metrics -----
    # near-neutrals for WB estimation
    neutral_mask = all_lch[:, 1] < 6.0
    neutrals_lab = all_lab[neutral_mask]
    neutrals_rgb = sample_rgb[neutral_mask[:len(sample_rgb)]] if np.any(neutral_mask) else sample_rgb

    xy = _xy_from_rgb01(neutrals_rgb if len(neutrals_rgb) else sample_rgb)
    cct = float(_estimate_cct_from_xy(xy))
    tint = float(_estimate_tint_from_lab_neutrals(neutrals_lab))
    mired_shift = int(round((1e6 / max(1.0, cct)) - (1e6 / 6500.0)))  # vs D65

    # exposure-ish stats
    Y = _luminance_Y(sample_rgb)
    tonal_key, dyn_range, contrast_bucket = _tonal_key_and_range_stops(Y)
    key_fill, key_fill_stops = _key_fill_ratio(Y)

    # cool/warm hue split
    cool_warm = _cool_warm_balance_from_hue(all_lch)

    look = {
        "whiteBalance": {
            "cct": int(round(cct)),
            "tintApprox": round(tint, 4),     # +magenta / -green (duv-ish proxy)
            "miredShiftFromD65": mired_shift  # + = CTO-ish, - = CTB-ish
        },
        "exposure": {
            "tonalKey": tonal_key,
            "dynamicRangeStops": round(dyn_range, 2),
            "globalContrast": contrast_bucket,
            "keyFillRatio": key_fill,
            "keyFillStops": round(key_fill_stops, 2)
        },
        "coolWarmBalance": cool_warm,
        "recipes": {
            "aputure": {
                "key":  {"cct": int(round(cct)), "intensityPct": 100},
                "fill": {"cct": int(round(cct)), "intensityPct": 25 if key_fill_stops >= 2 else 40},
                "rim":  {"cct": int(round(min(9000, cct + 400)))}
            },
            "cg": {
                "envTintHex": hex_light,
                "keyCct": int(round(cct)),
                "exposureEv": -0.7 if tonal_key == "low-key" else (0.0 if tonal_key == "mid-key" else +0.3)
            }
        }
    }

    return {
        "palette": palette,
        "harmony": "complementary/analogous",
        "contrastMatrix": contrast_matrix,
        "look": look
    }
