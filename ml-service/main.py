from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GridSearchCV
import cv2
import math
import random
import logging
import io
import os
import pandas as pd
from typing import Optional, List
from PIL import Image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("greencoins-ml")

# ──────────────────────────────────────────────
# PART 1: SVM Plant Name Identification
# Based on: AayushG159/Plant-Leaf-Identification
# Features: shape + color + texture
# ──────────────────────────────────────────────

# Per-species synthetic feature profiles:
# [aspect_ratio, circularity, mean_R, mean_G, mean_B, texture_contrast, texture_entropy]
SVM_SPECIES_PROFILES = {
    "oak":         [1.4, 0.6, 80,  120, 60,  0.8, 3.5],
    "pine":        [3.5, 0.3, 70,  110, 50,  0.5, 2.8],
    "maple":       [1.0, 0.7, 90,  130, 55,  0.9, 3.8],
    "bamboo":      [4.0, 0.2, 75,  125, 45,  0.4, 2.5],
    "eucalyptus":  [2.5, 0.4, 78,  118, 52,  0.6, 3.0],
    "mangrove":    [1.6, 0.6, 72,  115, 58,  0.7, 3.2],
    "teak":        [1.2, 0.7, 85,  125, 62,  0.9, 3.6],
    "neem":        [2.0, 0.5, 75,  120, 55,  0.6, 3.1],
    "banyan":      [1.1, 0.8, 82,  122, 60,  0.8, 3.4],
    "tulip_poplar":[1.3, 0.7, 88,  128, 58,  0.7, 3.3],
    "mango":       [2.2, 0.5, 80,  118, 52,  0.7, 3.2],
    "banana":      [2.8, 0.4, 85,  135, 50,  0.5, 2.9],
    "apple":       [1.2, 0.7, 88,  125, 60,  0.8, 3.5],
    "guava":       [1.8, 0.6, 78,  120, 55,  0.7, 3.1],
    "papaya":      [1.5, 0.6, 82,  130, 55,  0.6, 3.0],
    "pomegranate": [1.9, 0.6, 76,  118, 58,  0.7, 3.2],
    "cherry":      [1.1, 0.8, 90,  128, 62,  0.8, 3.5],
    "peach":       [1.3, 0.7, 88,  125, 60,  0.8, 3.4],
    "lemon":       [1.7, 0.6, 82,  120, 52,  0.7, 3.2],
    "grape":       [1.0, 0.9, 78,  122, 58,  0.9, 3.6],
    "olive":       [2.5, 0.4, 72,  112, 50,  0.5, 2.9],
    "coffee":      [1.6, 0.6, 78,  118, 55,  0.7, 3.1],
    "tea":         [2.0, 0.5, 74,  115, 52,  0.6, 3.0],
    "jamun":       [1.4, 0.7, 80,  118, 58,  0.7, 3.2],
    "chiku":       [1.8, 0.6, 78,  120, 55,  0.7, 3.1],
    "sugarcane":   [5.0, 0.2, 72,  128, 42,  0.4, 2.5],
    "cassava":     [1.2, 0.7, 80,  122, 55,  0.6, 3.0],
    "tomato":      [1.3, 0.7, 95,  125, 55,  0.8, 3.3],
    "potato":      [1.5, 0.6, 80,  118, 52,  0.7, 3.1],
    "corn":        [4.5, 0.2, 75,  130, 45,  0.4, 2.6],
    "rice":        [5.0, 0.2, 72,  125, 42,  0.4, 2.4],
    "wheat":       [4.8, 0.2, 70,  122, 40,  0.4, 2.4],
    "cotton":      [1.2, 0.8, 85,  125, 58,  0.8, 3.4],
    "soyabean":    [1.0, 0.9, 82,  128, 55,  0.8, 3.5],
    "groundnut":   [1.1, 0.8, 80,  122, 55,  0.7, 3.3],
    "pea":         [1.2, 0.8, 78,  125, 52,  0.7, 3.2],
    "gram":        [1.1, 0.8, 78,  120, 52,  0.7, 3.2],
    "cucumber":    [2.0, 0.5, 82,  128, 50,  0.6, 3.0],
    "brinjal":     [1.4, 0.7, 78,  118, 55,  0.7, 3.1],
    "cauliflower": [1.0, 0.9, 80,  122, 55,  0.8, 3.4],
    "cabbage":     [1.0, 0.9, 78,  120, 52,  0.8, 3.3],
    "onion":       [3.0, 0.3, 72,  115, 48,  0.5, 2.8],
    "garlic":      [4.0, 0.2, 70,  112, 45,  0.4, 2.6],
    "ginger":      [3.5, 0.3, 75,  118, 48,  0.5, 2.8],
    "chilli":      [3.0, 0.3, 80,  120, 50,  0.6, 2.9],
    "capsicum":    [1.5, 0.6, 82,  122, 52,  0.7, 3.1],
    "tobacco":     [1.8, 0.6, 80,  120, 55,  0.7, 3.2],
    "sunflower":   [1.2, 0.8, 88,  128, 58,  0.8, 3.5],
    "rose":        [1.5, 0.6, 92,  120, 62,  0.9, 3.6],
    "ornamental":  [1.3, 0.7, 85,  125, 58,  0.8, 3.4],
    "raspberry":   [1.2, 0.8, 90,  122, 60,  0.8, 3.5],
    "strawberry":  [1.0, 0.9, 92,  125, 62,  0.8, 3.5],
    "blueberry":   [1.1, 0.8, 78,  118, 58,  0.7, 3.2],
    "cardamom":    [3.0, 0.3, 72,  118, 48,  0.5, 2.8],
    "castor":      [1.2, 0.8, 80,  122, 55,  0.7, 3.3],
    "weed":        [2.0, 0.5, 68,  108, 45,  0.5, 2.7],
}

def extract_leaf_features(image_bytes: bytes) -> np.ndarray:
    """Extract shape + color + texture features from leaf image."""
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return np.zeros(7)
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # --- shape features ---
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        aspect_ratio, circularity = 2.0, 0.5
        if contours:
            cnt = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(cnt)
            area = cv2.contourArea(cnt)
            perimeter = cv2.arcLength(cnt, True)
            aspect_ratio = h / max(1, w)
            circularity = (4 * math.pi * area / max(1, perimeter ** 2)) if perimeter > 0 else 0.5
        # --- color features ---
        mean_r = float(np.mean(img_rgb[:, :, 0]))
        mean_g = float(np.mean(img_rgb[:, :, 1]))
        mean_b = float(np.mean(img_rgb[:, :, 2]))
        # --- texture features (GLCM via skimage) ---
        try:
            from skimage.feature import graycomatrix, graycoprops
            glcm = graycomatrix(gray, distances=[1], angles=[0], levels=256, symmetric=True, normed=True)
            contrast = float(graycoprops(glcm, 'contrast')[0, 0])
            entropy_val = float(-np.sum(glcm * np.log2(glcm + 1e-10)))
        except Exception:
            contrast, entropy_val = 0.5, 3.0
        return np.array([aspect_ratio, circularity, mean_r, mean_g, mean_b, contrast, entropy_val])
    except Exception as e:
        logger.error(f"Feature extraction error: {e}")
        return np.zeros(7)


def _build_svm_training_data(n_per_class: int = 200):
    species_list = list(SVM_SPECIES_PROFILES.keys())
    X, y = [], []
    rng = np.random.RandomState(42)
    for sp in species_list:
        profile = np.array(SVM_SPECIES_PROFILES[sp], dtype=float)
        for _ in range(n_per_class):
            noise = rng.normal(0, 0.08, len(profile))
            sample = profile * (1 + noise)
            sample = np.clip(sample, 0.01, None)
            X.append(sample)
            y.append(sp)
    return np.array(X), np.array(y)


logger.info("Training SVM plant name identification model...")
_svm_le = LabelEncoder()
_X_svm, _y_svm = _build_svm_training_data()
_y_svm_enc = _svm_le.fit_transform(_y_svm)
svm_name_pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('svm', SVC(kernel='rbf', C=10, gamma='scale', probability=True, random_state=42))
])
svm_name_pipeline.fit(_X_svm, _y_svm_enc)
_svm_train_acc = svm_name_pipeline.score(_X_svm, _y_svm_enc)
logger.info(f"SVM name model trained — accuracy: {_svm_train_acc:.3f} ({len(_X_svm)} samples, {len(_svm_le.classes_)} species)")


def identify_species_svm(image_bytes: bytes) -> dict:
    """Part 1: SVM-based plant name identification from leaf features."""
    features = extract_leaf_features(image_bytes).reshape(1, -1)
    probs = svm_name_pipeline.predict_proba(features)[0]
    pred_idx = int(np.argmax(probs))
    confidence = float(probs[pred_idx])
    species = _svm_le.inverse_transform([pred_idx])[0]
    top3_indices = np.argsort(probs)[::-1][:3]
    top3 = [
        {"species": _svm_le.inverse_transform([i])[0], "confidence": round(float(probs[i]), 4)}
        for i in top3_indices
    ]
    return {
        "detected": True,
        "species": species,
        "confidence": round(confidence, 4),
        "method": "svm_leaf_features",
        "top3_candidates": top3,
        "feature_vector": {"aspect_ratio": round(float(features[0][0]), 3),
                           "circularity": round(float(features[0][1]), 3),
                           "mean_rgb": [round(float(features[0][2]), 1),
                                        round(float(features[0][3]), 1),
                                        round(float(features[0][4]), 1)]},
    }


# ──────────────────────────────────────────────
# PART 2: RandomForest Plant Health Prediction
# Based on: sulaniishara/plant-health-prediction-with-ml
# Features: color ratios + texture → health score 0-100
# ──────────────────────────────────────────────

def extract_health_features(image_bytes: bytes) -> np.ndarray:
    """Extract 9 health-related features from plant image."""
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return np.array([0.5, 0.1, 0.05, 0.3, 0.05, 0.5, 3.0, 0.5, 0.5])
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        total = img.shape[0] * img.shape[1]
        green_mask = cv2.inRange(hsv, np.array([35, 40, 40]), np.array([85, 255, 255]))
        dark_green_mask = cv2.inRange(hsv, np.array([40, 80, 50]), np.array([70, 255, 200]))
        yellow_mask = cv2.inRange(hsv, np.array([15, 40, 40]), np.array([35, 255, 255]))
        brown_mask = cv2.inRange(hsv, np.array([5, 40, 20]), np.array([20, 200, 150]))
        plant_pixels = max(1, cv2.countNonZero(green_mask) + cv2.countNonZero(dark_green_mask)
                           + cv2.countNonZero(yellow_mask) + cv2.countNonZero(brown_mask))
        green_ratio = cv2.countNonZero(green_mask) / plant_pixels
        dark_green_ratio = cv2.countNonZero(dark_green_mask) / plant_pixels
        yellow_ratio = cv2.countNonZero(yellow_mask) / plant_pixels
        brown_ratio = cv2.countNonZero(brown_mask) / plant_pixels
        coverage = plant_pixels / total
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = cv2.countNonZero(edges) / total
        sat_mean = float(np.mean(hsv[:, :, 1])) / 255.0
        val_mean = float(np.mean(hsv[:, :, 2])) / 255.0
        try:
            from skimage.feature import graycomatrix, graycoprops
            glcm = graycomatrix(gray, distances=[1], angles=[0], levels=256, symmetric=True, normed=True)
            glcm_contrast = float(graycoprops(glcm, 'contrast')[0, 0]) / 100.0
            glcm_entropy = float(-np.sum(glcm * np.log2(glcm + 1e-10))) / 10.0
        except Exception:
            glcm_contrast, glcm_entropy = 0.5, 0.3
        return np.array([green_ratio, dark_green_ratio, yellow_ratio, brown_ratio,
                         coverage, edge_density, sat_mean, val_mean, glcm_contrast])
    except Exception as e:
        logger.error(f"Health feature extraction error: {e}")
        return np.array([0.5, 0.1, 0.05, 0.05, 0.3, 0.05, 0.5, 0.5, 0.3])


def _build_health_training_data(n_samples: int = 3000):
    """Generate synthetic health training data."""
    rng = np.random.RandomState(42)
    X, y = [], []
    # Healthy (70-100): high green, low yellow/brown, low edge
    for _ in range(n_samples // 3):
        score = rng.uniform(70, 100)
        gr = rng.uniform(0.55, 0.85); dgr = rng.uniform(0.2, 0.5)
        yr = rng.uniform(0.0, 0.1); br = rng.uniform(0.0, 0.05)
        cov = rng.uniform(0.3, 0.8); ed = rng.uniform(0.01, 0.08)
        s = rng.uniform(0.5, 0.9); v = rng.uniform(0.5, 0.9)
        gc = rng.uniform(0.01, 0.15)
        X.append([gr, dgr, yr, br, cov, ed, s, v, gc]); y.append(score)
    # Stressed (30-70): moderate green, notable yellow
    for _ in range(n_samples // 3):
        score = rng.uniform(30, 70)
        gr = rng.uniform(0.25, 0.55); dgr = rng.uniform(0.05, 0.2)
        yr = rng.uniform(0.1, 0.35); br = rng.uniform(0.05, 0.2)
        cov = rng.uniform(0.2, 0.6); ed = rng.uniform(0.05, 0.15)
        s = rng.uniform(0.3, 0.6); v = rng.uniform(0.4, 0.7)
        gc = rng.uniform(0.15, 0.4)
        X.append([gr, dgr, yr, br, cov, ed, s, v, gc]); y.append(score)
    # Dying (10-30): low green, high brown/edge
    for _ in range(n_samples // 3):
        score = rng.uniform(10, 30)
        gr = rng.uniform(0.05, 0.25); dgr = rng.uniform(0.0, 0.05)
        yr = rng.uniform(0.15, 0.3); br = rng.uniform(0.2, 0.5)
        cov = rng.uniform(0.1, 0.4); ed = rng.uniform(0.1, 0.25)
        s = rng.uniform(0.1, 0.35); v = rng.uniform(0.2, 0.5)
        gc = rng.uniform(0.3, 0.7)
        X.append([gr, dgr, yr, br, cov, ed, s, v, gc]); y.append(score)
    return np.array(X), np.array(y)


logger.info("Training RandomForest plant health prediction model...")
_X_health, _y_health = _build_health_training_data()
health_rf_model = RandomForestRegressor(n_estimators=150, max_depth=12, random_state=42, n_jobs=-1)
health_rf_model.fit(_X_health, _y_health)
_rf_r2 = health_rf_model.score(_X_health, _y_health)
logger.info(f"RF health model trained — R² score: {_rf_r2:.3f} ({len(_X_health)} samples)")


def predict_health_rf(image_bytes: bytes) -> dict:
    """Part 2: RandomForest-based plant health prediction."""
    features = extract_health_features(image_bytes)
    health_score = float(health_rf_model.predict(features.reshape(1, -1))[0])
    health_score = max(10.0, min(100.0, round(health_score)))
    # Determine health band
    bands = [(10, 20), (20, 30), (30, 50), (50, 70), (70, 85), (85, 100)]
    band_label = "85-100"
    for lo, hi in bands:
        if lo <= health_score < hi:
            band_label = f"{lo}-{hi}"
            break
    return {
        "health_score": int(health_score),
        "health_band": band_label,
        "method": "random_forest_regressor",
        "features": {
            "green_ratio": round(float(features[0]), 3),
            "dark_green_ratio": round(float(features[1]), 3),
            "yellow_ratio": round(float(features[2]), 3),
            "brown_ratio": round(float(features[3]), 3),
            "plant_coverage": round(float(features[4]), 3),
            "edge_density": round(float(features[5]), 4),
            "saturation_mean": round(float(features[6]), 3),
            "value_mean": round(float(features[7]), 3),
            "glcm_contrast": round(float(features[8]), 3),
        },
    }


# ──────────────────────────────────────────────
# PART 3: CSV-based Carbon Lookup
# plant_carbon_data.csv: species × health_band → carbon
# ──────────────────────────────────────────────

_CSV_PATH = os.path.join(os.path.dirname(__file__), "plant_carbon_data.csv")
try:
    _carbon_df = pd.read_csv(_CSV_PATH)
    logger.info(f"Loaded plant_carbon_data.csv — {len(_carbon_df)} rows, {_carbon_df['species'].nunique()} species")
except Exception as e:
    logger.error(f"Failed to load plant_carbon_data.csv: {e}")
    _carbon_df = pd.DataFrame(columns=["species", "health_band_min", "health_band_max",
                                        "carbon_per_year_kg", "price_per_kg_inr", "carbon_units_per_day"])


def lookup_carbon_from_csv(species: str, health_score: int) -> dict:
    """Part 3: Look up carbon sequestration from CSV by species + health score."""
    df = _carbon_df
    # Filter by species
    sp_df = df[df["species"] == species]
    if sp_df.empty:
        # Try partial match
        sp_df = df[df["species"].str.contains(species, case=False, na=False)]
    if sp_df.empty:
        # Fallback to oak
        sp_df = df[df["species"] == "oak"]
        species = "oak"
    # Match health band
    row = sp_df[(sp_df["health_band_min"] <= health_score) & (sp_df["health_band_max"] > health_score)]
    if row.empty:
        # Nearest band
        row = sp_df.iloc[(sp_df["health_band_min"] - health_score).abs().argsort()[:1]]
    row = row.iloc[0]
    carbon_per_year = float(row["carbon_per_year_kg"])
    price_per_kg = float(row["price_per_kg_inr"])
    units_per_day = float(row["carbon_units_per_day"])
    carbon_per_day = round(carbon_per_year / 365.0, 4)
    price_per_day = round(carbon_per_day * price_per_kg, 2)
    return {
        "species": species,
        "health_score": health_score,
        "health_band": f"{int(row['health_band_min'])}-{int(row['health_band_max'])}",
        "carbon_per_year_kg": carbon_per_year,
        "carbon_per_day_kg": carbon_per_day,
        "price_per_kg_inr": price_per_kg,
        "carbon_units_per_day": units_per_day,
        "price_per_day_inr": price_per_day,
        "source": "plant_carbon_data.csv",
        "note": f"A {species} at {int(row['health_band_min'])}-{int(row['health_band_max'])}% health sequesters {carbon_per_year} kg CO₂/year",
    }

app = FastAPI(title="GreenCoins ML Service", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ──────────────────────────────────────────────
# YOLOv8s Plant Leaf Detection Model
# ──────────────────────────────────────────────
leaf_model = None

YOLO_SPECIES = [
    'ginger', 'banana', 'tobacco', 'ornamental', 'rose', 'soyabean', 'papaya',
    'garlic', 'raspberry', 'mango', 'cotton', 'corn', 'pomegranate', 'strawberry',
    'blueberry', 'brinjal', 'potato', 'wheat', 'olive', 'rice', 'lemon', 'cabbage',
    'guava', 'chilli', 'capsicum', 'sunflower', 'cherry', 'cassava', 'apple', 'tea',
    'sugarcane', 'groundnut', 'weed', 'peach', 'coffee', 'cauliflower', 'tomato',
    'onion', 'gram', 'chiku', 'jamun', 'castor', 'pea', 'cucumber', 'grape', 'cardamom'
]

def load_leaf_model():
    """Load the YOLOv8s leaf detection model from HuggingFace."""
    global leaf_model
    if leaf_model is not None:
        return leaf_model
    try:
        from ultralyticsplus import YOLO
        logger.info("Loading YOLOv8s plant leaf model from HuggingFace...")
        leaf_model = YOLO('foduucom/plant-leaf-detection-and-classification')
        leaf_model.overrides['conf'] = 0.25
        leaf_model.overrides['iou'] = 0.45
        leaf_model.overrides['agnostic_nms'] = False
        leaf_model.overrides['max_det'] = 1000
        logger.info("YOLOv8s leaf model loaded successfully.")
        return leaf_model
    except Exception as e:
        logger.error(f"Failed to load YOLOv8s model: {e}")
        return None

# ──────────────────────────────────────────────
# Comprehensive Plant Carbon Database
# Maps both YOLO species + forestry species
# ──────────────────────────────────────────────
PLANT_DATA = {
    # Forestry / large trees
    "oak":          {"carbon_per_year": 22.0, "growth_rate": "slow",   "lifespan_years": 200, "avg_health": 85, "height_max_m": 25, "biomass_a": 0.15,  "biomass_b": 2.3},
    "pine":         {"carbon_per_year": 16.0, "growth_rate": "medium", "lifespan_years": 100, "avg_health": 78, "height_max_m": 30, "biomass_a": 0.10,  "biomass_b": 2.2},
    "maple":        {"carbon_per_year": 18.0, "growth_rate": "medium", "lifespan_years": 130, "avg_health": 80, "height_max_m": 20, "biomass_a": 0.12,  "biomass_b": 2.3},
    "bamboo":       {"carbon_per_year": 35.0, "growth_rate": "fast",   "lifespan_years":  25, "avg_health": 90, "height_max_m": 20, "biomass_a": 0.05,  "biomass_b": 2.5},
    "eucalyptus":   {"carbon_per_year": 25.0, "growth_rate": "fast",   "lifespan_years":  50, "avg_health": 82, "height_max_m": 30, "biomass_a": 0.08,  "biomass_b": 2.4},
    "mangrove":     {"carbon_per_year": 30.0, "growth_rate": "medium", "lifespan_years": 100, "avg_health": 88, "height_max_m": 15, "biomass_a": 0.18,  "biomass_b": 2.1},
    "teak":         {"carbon_per_year": 20.0, "growth_rate": "slow",   "lifespan_years": 150, "avg_health": 83, "height_max_m": 30, "biomass_a": 0.12,  "biomass_b": 2.3},
    "neem":         {"carbon_per_year": 15.0, "growth_rate": "medium", "lifespan_years": 200, "avg_health": 86, "height_max_m": 20, "biomass_a": 0.11,  "biomass_b": 2.2},
    "banyan":       {"carbon_per_year": 28.0, "growth_rate": "slow",   "lifespan_years": 500, "avg_health": 92, "height_max_m": 25, "biomass_a": 0.20,  "biomass_b": 2.1},
    "tulip_poplar": {"carbon_per_year": 24.0, "growth_rate": "fast",   "lifespan_years": 200, "avg_health": 79, "height_max_m": 35, "biomass_a": 0.09,  "biomass_b": 2.4},
    # YOLO model species (crops/fruits/plants)
    "mango":        {"carbon_per_year": 20.0, "growth_rate": "medium", "lifespan_years": 100, "avg_health": 85, "height_max_m": 15, "biomass_a": 0.14,  "biomass_b": 2.2},
    "banana":       {"carbon_per_year": 8.0,  "growth_rate": "fast",   "lifespan_years":   6, "avg_health": 80, "height_max_m":  6, "biomass_a": 0.04,  "biomass_b": 2.6},
    "apple":        {"carbon_per_year": 18.0, "growth_rate": "medium", "lifespan_years":  80, "avg_health": 82, "height_max_m": 10, "biomass_a": 0.12,  "biomass_b": 2.3},
    "guava":        {"carbon_per_year": 12.0, "growth_rate": "medium", "lifespan_years":  40, "avg_health": 83, "height_max_m":  8, "biomass_a": 0.10,  "biomass_b": 2.2},
    "papaya":       {"carbon_per_year": 6.0,  "growth_rate": "fast",   "lifespan_years":   4, "avg_health": 75, "height_max_m": 10, "biomass_a": 0.03,  "biomass_b": 2.5},
    "pomegranate":  {"carbon_per_year": 10.0, "growth_rate": "medium", "lifespan_years":  50, "avg_health": 80, "height_max_m":  6, "biomass_a": 0.08,  "biomass_b": 2.3},
    "cherry":       {"carbon_per_year": 14.0, "growth_rate": "medium", "lifespan_years":  30, "avg_health": 78, "height_max_m": 10, "biomass_a": 0.10,  "biomass_b": 2.3},
    "peach":        {"carbon_per_year": 12.0, "growth_rate": "medium", "lifespan_years":  20, "avg_health": 76, "height_max_m":  8, "biomass_a": 0.09,  "biomass_b": 2.3},
    "lemon":        {"carbon_per_year": 10.0, "growth_rate": "medium", "lifespan_years":  50, "avg_health": 80, "height_max_m":  6, "biomass_a": 0.08,  "biomass_b": 2.2},
    "grape":        {"carbon_per_year": 5.0,  "growth_rate": "fast",   "lifespan_years":  30, "avg_health": 75, "height_max_m":  3, "biomass_a": 0.02,  "biomass_b": 2.0},
    "olive":        {"carbon_per_year": 15.0, "growth_rate": "slow",   "lifespan_years": 500, "avg_health": 88, "height_max_m": 10, "biomass_a": 0.13,  "biomass_b": 2.1},
    "coffee":       {"carbon_per_year": 8.0,  "growth_rate": "medium", "lifespan_years":  25, "avg_health": 80, "height_max_m":  5, "biomass_a": 0.06,  "biomass_b": 2.2},
    "tea":          {"carbon_per_year": 5.0,  "growth_rate": "slow",   "lifespan_years":  50, "avg_health": 82, "height_max_m":  3, "biomass_a": 0.04,  "biomass_b": 2.1},
    "jamun":        {"carbon_per_year": 18.0, "growth_rate": "medium", "lifespan_years": 100, "avg_health": 85, "height_max_m": 15, "biomass_a": 0.13,  "biomass_b": 2.2},
    "chiku":        {"carbon_per_year": 12.0, "growth_rate": "medium", "lifespan_years":  40, "avg_health": 80, "height_max_m": 10, "biomass_a": 0.09,  "biomass_b": 2.2},
    "sugarcane":    {"carbon_per_year": 15.0, "growth_rate": "fast",   "lifespan_years":   2, "avg_health": 78, "height_max_m":  5, "biomass_a": 0.03,  "biomass_b": 2.6},
    "cassava":      {"carbon_per_year": 4.0,  "growth_rate": "fast",   "lifespan_years":   2, "avg_health": 75, "height_max_m":  3, "biomass_a": 0.02,  "biomass_b": 2.5},
    # Short crops and herbs
    "tomato":       {"carbon_per_year": 2.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 72, "height_max_m":  2, "biomass_a": 0.01,  "biomass_b": 2.5},
    "potato":       {"carbon_per_year": 1.5,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 70, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.4},
    "corn":         {"carbon_per_year": 5.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 78, "height_max_m":  3, "biomass_a": 0.02,  "biomass_b": 2.5},
    "rice":         {"carbon_per_year": 3.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 75, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.4},
    "wheat":        {"carbon_per_year": 3.5,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 76, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.4},
    "cotton":       {"carbon_per_year": 4.0,  "growth_rate": "medium", "lifespan_years":   1, "avg_health": 74, "height_max_m":  2, "biomass_a": 0.02,  "biomass_b": 2.4},
    "soyabean":     {"carbon_per_year": 3.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 75, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.4},
    "groundnut":    {"carbon_per_year": 2.5,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 74, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.3},
    "pea":          {"carbon_per_year": 2.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 73, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.3},
    "gram":         {"carbon_per_year": 2.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 73, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.3},
    "cucumber":     {"carbon_per_year": 2.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 72, "height_max_m":  2, "biomass_a": 0.01,  "biomass_b": 2.4},
    "brinjal":      {"carbon_per_year": 2.5,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 73, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.3},
    "cauliflower":  {"carbon_per_year": 2.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 72, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.3},
    "cabbage":      {"carbon_per_year": 2.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 72, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.3},
    "onion":        {"carbon_per_year": 1.5,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 70, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.2},
    "garlic":       {"carbon_per_year": 1.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 70, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.2},
    "ginger":       {"carbon_per_year": 2.0,  "growth_rate": "medium", "lifespan_years":   1, "avg_health": 74, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.3},
    "chilli":       {"carbon_per_year": 2.5,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 73, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.3},
    "capsicum":     {"carbon_per_year": 2.5,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 73, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.3},
    "tobacco":      {"carbon_per_year": 3.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 72, "height_max_m":  2, "biomass_a": 0.01,  "biomass_b": 2.4},
    "sunflower":    {"carbon_per_year": 3.5,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 76, "height_max_m":  3, "biomass_a": 0.02,  "biomass_b": 2.4},
    "rose":         {"carbon_per_year": 2.0,  "growth_rate": "medium", "lifespan_years":   5, "avg_health": 75, "height_max_m":  2, "biomass_a": 0.01,  "biomass_b": 2.3},
    "ornamental":   {"carbon_per_year": 3.0,  "growth_rate": "medium", "lifespan_years":  10, "avg_health": 76, "height_max_m":  3, "biomass_a": 0.02,  "biomass_b": 2.3},
    "raspberry":    {"carbon_per_year": 3.0,  "growth_rate": "fast",   "lifespan_years":   3, "avg_health": 74, "height_max_m":  2, "biomass_a": 0.01,  "biomass_b": 2.3},
    "strawberry":   {"carbon_per_year": 1.5,  "growth_rate": "fast",   "lifespan_years":   3, "avg_health": 73, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.2},
    "blueberry":    {"carbon_per_year": 3.0,  "growth_rate": "medium", "lifespan_years":  10, "avg_health": 76, "height_max_m":  2, "biomass_a": 0.01,  "biomass_b": 2.3},
    "cardamom":     {"carbon_per_year": 4.0,  "growth_rate": "medium", "lifespan_years":  10, "avg_health": 78, "height_max_m":  4, "biomass_a": 0.03,  "biomass_b": 2.3},
    "castor":       {"carbon_per_year": 5.0,  "growth_rate": "fast",   "lifespan_years":   5, "avg_health": 76, "height_max_m":  5, "biomass_a": 0.03,  "biomass_b": 2.4},
    "weed":         {"carbon_per_year": 1.0,  "growth_rate": "fast",   "lifespan_years":   1, "avg_health": 60, "height_max_m":  1, "biomass_a": 0.01,  "biomass_b": 2.0},
}

SPECIES_LIST = list(PLANT_DATA.keys())

# ──────────────────────────────────────────────
# Pollutant absorbability table (kept for backward compat)
# ──────────────────────────────────────────────
POLLUTANT_ABSORBABILITY = {
    "CO2": "Yes", "SO2": "Partial", "NOx": "Partial", "CO": "No",
    "VOCs": "Yes", "NH3": "Partial", "N2O": "No", "O3": "Partial",
}

PRICE_PER_KG = 100  # ₹ per kg CO2
UNITS_PER_KG = 1

# ──────────────────────────────────────────────
# Fallback RandomForest model (text-based)
# ──────────────────────────────────────────────
FALLBACK_SPECIES = ["oak", "pine", "maple", "bamboo", "eucalyptus", "mangrove", "teak", "neem", "banyan", "tulip_poplar"]
label_encoder = LabelEncoder()
label_encoder.fit(FALLBACK_SPECIES)

def _generate_training_data(n_per_class: int = 200):
    species_profiles = {
        "oak": [6.0, 40, 20, 15, 0.8], "pine": [2.0, 25, 25, 8, 0.6],
        "maple": [8.0, 30, 18, 12, 0.5], "bamboo": [3.0, 5, 15, 3, 0.2],
        "eucalyptus": [5.0, 35, 30, 10, 0.7], "mangrove": [4.0, 20, 10, 18, 0.9],
        "teak": [7.0, 45, 25, 14, 0.75], "neem": [3.5, 28, 15, 11, 0.55],
        "banyan": [5.5, 60, 22, 25, 0.85], "tulip_poplar": [9.0, 38, 28, 13, 0.4],
    }
    X, y = [], []
    for species, profile in species_profiles.items():
        for _ in range(n_per_class):
            noise = np.random.normal(0, 0.15, len(profile))
            features = np.array(profile) * (1 + noise)
            features = np.clip(features, 0.1, None)
            X.append(features)
            y.append(species)
    return np.array(X), np.array(y)

logger.info("Training fallback species classification model...")
X_train, y_train = _generate_training_data()
y_encoded = label_encoder.transform(y_train)
species_model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=10)
species_model.fit(X_train, y_encoded)
train_acc = species_model.score(X_train, y_encoded)
logger.info(f"Fallback model trained — accuracy: {train_acc:.3f} ({len(X_train)} samples)")


# ══════════════════════════════════════════════
# CORE ANALYSIS ENGINES
# ══════════════════════════════════════════════

def identify_species_from_leaf(image_bytes: bytes) -> dict:
    """Use YOLOv8s model to detect plant species from leaf image."""
    model = load_leaf_model()
    if model is None:
        return {"detected": False, "species": "unknown", "confidence": 0.0, "method": "none", "error": "Model not available"}

    try:
        # Convert bytes to PIL Image for YOLO
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Run YOLO inference
        results = model.predict(pil_image)

        if results and len(results) > 0 and results[0].boxes is not None and len(results[0].boxes) > 0:
            boxes = results[0].boxes
            # Get the detection with highest confidence
            best_idx = int(boxes.conf.argmax())
            confidence = float(boxes.conf[best_idx])
            class_id = int(boxes.cls[best_idx])

            # Map class ID to species name
            class_names = results[0].names
            species_raw = class_names.get(class_id, "unknown").lower().strip()

            # Normalize known misspellings from the model
            name_map = {
                "ornamaental": "ornamental", "pomgernate": "pomegranate",
                "gauava": "guava", "capcicum": "capsicum",
            }
            species = name_map.get(species_raw, species_raw)

            # Get bounding box info
            bbox = boxes.xyxy[best_idx].tolist()

            return {
                "detected": True,
                "species": species,
                "confidence": round(confidence, 4),
                "class_id": class_id,
                "bbox": [round(v, 1) for v in bbox],
                "total_detections": len(boxes),
                "method": "yolov8s_leaf_detection",
            }
        else:
            return {"detected": False, "species": "unknown", "confidence": 0.0, "method": "yolov8s_leaf_detection", "error": "No leaves detected"}

    except Exception as e:
        logger.error(f"Leaf detection error: {e}")
        return {"detected": False, "species": "unknown", "confidence": 0.0, "method": "yolov8s_leaf_detection", "error": str(e)}


def analyze_plant_health(image_bytes: bytes) -> dict:
    """
    Analyze plant health from image using OpenCV HSV color analysis.
    Returns health score 0-100 based on green vs yellow/brown ratio.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"health_score": 70, "method": "default", "error": "Could not decode image"}

        # Convert to HSV for color analysis
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        total_pixels = img.shape[0] * img.shape[1]

        # Define color ranges
        # Healthy green: H=35-85, S=40-255, V=40-255
        green_lower = np.array([35, 40, 40])
        green_upper = np.array([85, 255, 255])
        green_mask = cv2.inRange(hsv, green_lower, green_upper)
        green_pixels = cv2.countNonZero(green_mask)

        # Dark green (very healthy): H=40-70, S=80-255, V=50-200
        dark_green_lower = np.array([40, 80, 50])
        dark_green_upper = np.array([70, 255, 200])
        dark_green_mask = cv2.inRange(hsv, dark_green_lower, dark_green_upper)
        dark_green_pixels = cv2.countNonZero(dark_green_mask)

        # Yellow/stressed: H=15-35, S=40-255, V=40-255
        yellow_lower = np.array([15, 40, 40])
        yellow_upper = np.array([35, 255, 255])
        yellow_mask = cv2.inRange(hsv, yellow_lower, yellow_upper)
        yellow_pixels = cv2.countNonZero(yellow_mask)

        # Brown/dead: H=5-20, S=40-200, V=20-150
        brown_lower = np.array([5, 40, 20])
        brown_upper = np.array([20, 200, 150])
        brown_mask = cv2.inRange(hsv, brown_lower, brown_upper)
        brown_pixels = cv2.countNonZero(brown_mask)

        # Calculate ratios
        plant_pixels = green_pixels + yellow_pixels + brown_pixels + dark_green_pixels
        if plant_pixels == 0:
            return {"health_score": 65, "method": "opencv_hsv", "note": "No plant pixels detected, using default"}

        green_ratio = (green_pixels + dark_green_pixels) / plant_pixels
        yellow_ratio = yellow_pixels / plant_pixels
        brown_ratio = brown_pixels / plant_pixels

        # Health score calculation
        # Green contributes positively, yellow/brown negatively
        health_score = (green_ratio * 100) - (yellow_ratio * 30) - (brown_ratio * 50)
        # Bonus for deep green (very healthy)
        deep_green_bonus = min(15, (dark_green_pixels / max(1, plant_pixels)) * 40)
        health_score += deep_green_bonus
        health_score = max(10, min(100, round(health_score)))

        # Edge detection for leaf damage
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_density = cv2.countNonZero(edges) / total_pixels
        # Very high edge density may indicate damage/spots
        if edge_density > 0.15:
            damage_penalty = min(15, (edge_density - 0.15) * 100)
            health_score = max(10, health_score - round(damage_penalty))

        return {
            "health_score": health_score,
            "green_ratio": round(green_ratio, 3),
            "yellow_ratio": round(yellow_ratio, 3),
            "brown_ratio": round(brown_ratio, 3),
            "edge_density": round(edge_density, 4),
            "plant_pixel_coverage": round(plant_pixels / total_pixels, 3),
            "method": "opencv_hsv_analysis",
        }

    except Exception as e:
        logger.error(f"Health analysis error: {e}")
        return {"health_score": 65, "method": "default", "error": str(e)}


def estimate_height_from_image(image_bytes: bytes) -> dict:
    """
    Estimate plant/tree height from full plant image using OpenCV contour analysis.
    Uses the proportion of the plant in the frame + image dimensions for approximation.
    """
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"estimated_height_m": 2.0, "method": "default", "error": "Could not decode image"}

        img_height, img_width = img.shape[:2]

        # Convert to HSV and create plant mask (greens + browns for trunk)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Green mask (canopy)
        green_lower = np.array([25, 30, 30])
        green_upper = np.array([95, 255, 255])
        green_mask = cv2.inRange(hsv, green_lower, green_upper)

        # Brown mask (trunk/bark)
        brown_lower = np.array([5, 30, 20])
        brown_upper = np.array([25, 200, 180])
        brown_mask = cv2.inRange(hsv, brown_lower, brown_upper)

        # Combine masks
        plant_mask = cv2.bitwise_or(green_mask, brown_mask)

        # Morphological ops to clean up
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        plant_mask = cv2.morphologyEx(plant_mask, cv2.MORPH_CLOSE, kernel)
        plant_mask = cv2.morphologyEx(plant_mask, cv2.MORPH_OPEN, kernel)

        # Find contours
        contours, _ = cv2.findContours(plant_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            return {"estimated_height_m": 2.0, "height_confidence": "low", "method": "default",
                    "note": "No plant contour found"}

        # Get largest contour (assumed to be the plant)
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)

        # Plant height as proportion of image
        height_ratio = h / img_height
        width_ratio = w / img_width

        # Estimate real-world height
        # Assumption: typical phone photo from 3-5m away
        # If plant takes up most of the frame, it's large
        # Use a heuristic calibration:
        #   height_ratio ~1.0 → plant is ~3-5m (fills frame)
        #   height_ratio ~0.5 → plant is ~1-2m
        #   height_ratio ~0.3 → plant is ~0.5-1m
        # Base assumption: camera captures ~5m vertical at typical distance
        assumed_fov_height_m = 5.0
        estimated_height_m = round(height_ratio * assumed_fov_height_m, 2)

        # Clamp to reasonable range
        estimated_height_m = max(0.1, min(30.0, estimated_height_m))

        # Confidence based on how much of frame is plant
        area_ratio = cv2.contourArea(largest_contour) / (img_height * img_width)
        if area_ratio > 0.15 and height_ratio > 0.3:
            confidence = "high"
        elif area_ratio > 0.05:
            confidence = "medium"
        else:
            confidence = "low"

        # Aspect ratio can indicate tree vs shrub
        aspect = h / max(1, w)
        plant_form = "tree" if aspect > 1.5 else ("shrub" if aspect > 0.8 else "ground_cover")

        return {
            "estimated_height_m": estimated_height_m,
            "height_confidence": confidence,
            "height_ratio_in_frame": round(height_ratio, 3),
            "width_ratio_in_frame": round(width_ratio, 3),
            "area_ratio": round(area_ratio, 4),
            "plant_form": plant_form,
            "aspect_ratio": round(aspect, 2),
            "bounding_box": {"x": x, "y": y, "width": w, "height": h},
            "image_dimensions": {"width": img_width, "height": img_height},
            "method": "opencv_contour_analysis",
        }

    except Exception as e:
        logger.error(f"Height estimation error: {e}")
        return {"estimated_height_m": 2.0, "height_confidence": "low", "method": "default", "error": str(e)}


def calculate_carbon_from_analysis(species: str, height_m: float, health_score: int, quantity: int = 1) -> dict:
    """
    Calculate carbon sequestration using species data, estimated height, and health.
    Uses allometric biomass equations: biomass = a × height^b
    Carbon = ~50% of dry biomass
    """
    data = PLANT_DATA.get(species, PLANT_DATA.get("oak"))

    base_carbon = data["carbon_per_year"]
    height_max = data["height_max_m"]
    a = data["biomass_a"]
    b = data["biomass_b"]

    # Allometric biomass (kg dry matter)
    biomass_kg = a * (height_m ** b)

    # Growth stage factor (height relative to max)
    growth_fraction = min(1.0, height_m / max(0.1, height_max))
    # Young plants absorb proportionally less
    growth_factor = math.log(1 + growth_fraction * 5) / math.log(6)

    # Health factor: healthy plants sequester more
    health_factor = health_score / 100.0

    # Carbon sequestration (kg CO2 per year)
    carbon_per_year_actual = base_carbon * growth_factor * health_factor * quantity
    carbon_per_day_kg = carbon_per_year_actual / 365.0

    # Min / Max range (±20% based on environmental conditions)
    carbon_min_per_year = round(carbon_per_year_actual * 0.8, 2)
    carbon_max_per_year = round(carbon_per_year_actual * 1.2, 2)
    carbon_min_per_day = round(carbon_min_per_year / 365.0, 4)
    carbon_max_per_day = round(carbon_max_per_year / 365.0, 4)

    # Pricing: 1 kg CO2 = 1 unit = ₹100
    price_per_day = round(carbon_per_day_kg * PRICE_PER_KG, 2)
    price_min = round(carbon_min_per_day * PRICE_PER_KG, 2)
    price_max = round(carbon_max_per_day * PRICE_PER_KG, 2)

    # Carbon points (scaled for UI)
    carbon_points = max(1, round(carbon_per_day_kg * 100))

    # Credit score (0-10)
    height_score = min(10, (height_m / max(0.1, height_max)) * 10)
    health_s = health_score / 10.0
    carbon_score = min(10, carbon_per_day_kg / 0.03 * 3.3)
    credit_score = round((height_score + health_s + carbon_score) / 3.0, 1)
    credit_score = min(10.0, max(0.0, credit_score))

    # Estimated age from height using growth rate
    growth_rates = {"fast": 0.8, "medium": 0.5, "slow": 0.3}  # meters per year approx
    growth_speed = growth_rates.get(data["growth_rate"], 0.5)
    estimated_age = round(height_m / max(0.01, growth_speed), 1)

    return {
        "species": species,
        "plant_name": species.replace("_", " ").title(),
        "estimated_height_m": height_m,
        "estimated_age_years": estimated_age,
        "plant_age_years": estimated_age,
        "plant_health": health_score,
        "biomass_kg": round(biomass_kg, 2),
        "carbon_per_day_kg": round(carbon_per_day_kg, 4),
        "carbon_per_year_kg": round(carbon_per_year_actual, 2),
        "carbon_min_per_day_kg": carbon_min_per_day,
        "carbon_max_per_day_kg": carbon_max_per_day,
        "carbon_min_per_year_kg": carbon_min_per_year,
        "carbon_max_per_year_kg": carbon_max_per_year,
        "carbon_value": round(carbon_per_year_actual, 2),
        "carbon_points": carbon_points,
        "carbon_units": round(carbon_per_day_kg, 2),
        "price_inr": price_per_day,
        "price_min_inr": price_min,
        "price_max_inr": price_max,
        "price_per_kg": PRICE_PER_KG,
        "credit_score": credit_score,
        "growth_rate": data["growth_rate"],
        "growth_stage": "seedling" if growth_fraction < 0.2 else ("young" if growth_fraction < 0.5 else ("mature" if growth_fraction < 0.8 else "full_grown")),
        "estimated_lifetime_carbon_kg": round(base_carbon * data["lifespan_years"], 2),
    }


# ══════════════════════════════════════════════
# API ENDPOINTS
# ══════════════════════════════════════════════

# ──── NEW PRIMARY ENDPOINT ────

@app.post("/analyze-plant")
async def analyze_plant(
    plant_name: str = Form(""),
    leaf_image: Optional[UploadFile] = File(None),
    plant_image: Optional[UploadFile] = File(None),
    quantity: int = Form(1),
):
    """
    3-Part Plant Analysis Pipeline:
    PART 1 → Leaf image: YOLOv8s (primary) OR SVM on shape/color/texture features → plant name
    PART 2 → Plant image: RandomForest Regressor on 9 HSV+texture features → health score 0-100
    PART 3 → CSV lookup: species + health_band → carbon_per_year_kg from plant_carbon_data.csv
    """
    result = {}
    leaf_bytes = None
    plant_bytes = None

    if leaf_image:
        leaf_bytes = await leaf_image.read()
    if plant_image:
        plant_bytes = await plant_image.read()

    # ═══════════════════════════════════════════════
    # PART 1: Plant Name Identification
    # Primary: YOLOv8s · Fallback/Validator: SVM
    # ═══════════════════════════════════════════════
    yolo_result = {"detected": False, "species": "unknown", "confidence": 0.0, "method": "yolo_skipped"}
    svm_result  = {"detected": False, "species": "unknown", "confidence": 0.0, "method": "svm_skipped"}

    if leaf_bytes:
        # Try YOLO first
        yolo_result = identify_species_from_leaf(leaf_bytes)
        # Always run SVM for comparison / fallback
        svm_result  = identify_species_svm(leaf_bytes)
        logger.info(f"YOLO: {yolo_result.get('species')} ({yolo_result.get('confidence', 0):.2f}) | "
                    f"SVM: {svm_result.get('species')} ({svm_result.get('confidence', 0):.2f})")

    # ─────────────────────────────────────────────────────────────
    # Priority for final species (most reliable first):
    #  1. YOLO (high confidence ≥ 0.4) — trained on real leaf data
    #  2. User-provided name (typed by user) — if it's a known species
    #  3. User-provided name via text fallback — partial match
    #  4. SVM result — only if HIGH confidence (≥ 0.5) and no other signal
    #  5. Default (oak)
    #
    # NOTE: SVM is trained on SYNTHETIC data, so it should NOT override
    # a user-typed name. It only helps when there is NO other signal.
    # ─────────────────────────────────────────────────────────────
    user_name    = plant_name.lower().strip().replace(" ", "_") if plant_name else ""
    yolo_species = yolo_result.get("species", "unknown")
    svm_species  = svm_result.get("species", "unknown")
    yolo_conf    = yolo_result.get("confidence", 0.0)
    svm_conf     = svm_result.get("confidence", 0.0)

    if yolo_species != "unknown" and yolo_conf >= 0.4:
        # YOLO is a real trained model — trust it when confident
        final_species = yolo_species
        name_method   = "yolov8s_primary"
    elif user_name and user_name in PLANT_DATA:
        # User typed a known plant name — trust them
        final_species = user_name
        name_method   = "user_provided"
    elif user_name:
        # User typed something — try to match it to known species
        matched = _text_species_fallback(user_name)
        final_species = matched
        name_method   = "text_match_user_input"
    elif svm_species != "unknown" and svm_conf >= 0.5:
        # No user name; high-confidence SVM from leaf image features
        final_species = svm_species
        name_method   = "svm_high_confidence"
    elif leaf_bytes and svm_species != "unknown":
        # Low-confidence SVM — report it but note uncertainty
        final_species = svm_species
        name_method   = "svm_low_confidence"
    else:
        final_species = "oak"
        name_method   = "default"

    # Name cross-check
    name_match = False
    name_match_details = "No user name provided"
    if user_name:
        if user_name == final_species or user_name in final_species or final_species in user_name:
            name_match = True
            name_match_details = f"'{plant_name}' matches identified species '{final_species}'"
        else:
            name_match_details = f"'{plant_name}' does NOT match identified species '{final_species}'"

    result["species_identification"] = {
        "final_species": final_species,
        "selected_method": name_method,
        "yolo_result":  yolo_result,
        "svm_result":   svm_result,
        "user_provided_name": plant_name,
        "name_match": name_match,
        "name_match_details": name_match_details,
        "detected": final_species != "oak" or name_method != "default",
        "species": final_species,
        "confidence": round(max(yolo_conf, svm_result.get("confidence", 0.0)), 4),
    }

    # ═══════════════════════════════════════════════
    # PART 2: Plant Health Prediction
    # RandomForest Regressor on 9 image features
    # ═══════════════════════════════════════════════
    image_for_health = plant_bytes or leaf_bytes
    if image_for_health:
        health_result = predict_health_rf(image_for_health)
        # Also run legacy OpenCV analysis for height
        height_result = estimate_height_from_image(image_for_health)
        logger.info(f"RF Health: {health_result['health_score']} (band {health_result['health_band']})")
    else:
        # No image: use species average
        default_health = PLANT_DATA.get(final_species, {}).get("avg_health", 70)
        health_result  = {
            "health_score": default_health, "health_band": "70-85",
            "method": "database_default",
        }
        height_result  = {"estimated_height_m": 2.0, "method": "default"}

    result["health_analysis"] = health_result
    result["height_estimation"] = height_result

    # ═══════════════════════════════════════════════
    # PART 3: CSV Carbon Lookup
    # plant_carbon_data.csv: species × health_band
    # ═══════════════════════════════════════════════
    health_score = health_result["health_score"]
    csv_lookup = lookup_carbon_from_csv(final_species, health_score)
    result["carbon_lookup"] = csv_lookup
    logger.info(f"CSV lookup → {final_species} @ health {health_score}: {csv_lookup['carbon_per_year_kg']} kg CO₂/yr")

    # Also run allometric carbon analysis for backward compat
    carbon = calculate_carbon_from_analysis(
        species=final_species,
        height_m=height_result.get("estimated_height_m", 2.0),
        health_score=health_score,
        quantity=quantity,
    )
    result["carbon_analysis"] = carbon

    # Flat backward-compatible fields (use CSV lookup values as primary source)
    result.update({
        "species": final_species,
        "plant_name": final_species.replace("_", " ").title(),
        "plant_health": health_score,
        "plant_age_years": carbon["estimated_age_years"],
        "carbon_per_day_kg": csv_lookup["carbon_per_day_kg"],
        "carbon_per_year_kg": csv_lookup["carbon_per_year_kg"],
        "carbon_value": csv_lookup["carbon_per_year_kg"],
        "carbon_points": max(1, round(csv_lookup["carbon_per_day_kg"] * 100)),
        "carbon_units": csv_lookup["carbon_units_per_day"],
        "price_inr": csv_lookup["price_per_day_inr"],
        "credit_score": carbon["credit_score"],
        "confidence": result["species_identification"]["confidence"],
        "health_band": csv_lookup["health_band"],
        "carbon_note": csv_lookup["note"],
        "model": "svm_leaf_features + random_forest_health + csv_lookup",
        "input": plant_name or "image_upload",
    })

    logger.info(f"Pipeline complete: species={final_species}, health={health_score}, "
                f"carbon={csv_lookup['carbon_per_year_kg']} kg/yr (CSV), method={name_method}")
    return result


# ──── BACKWARD-COMPATIBLE ENDPOINTS ────

def _text_species_fallback(text: str) -> str:
    """Fallback text-based species detection using RandomForest."""
    text_lower = text.lower().replace(" ", "_")
    # Direct match in PLANT_DATA
    for sp in SPECIES_LIST:
        if sp in text_lower or text_lower in sp:
            return sp
    # Use the trained RF model
    seed = sum(ord(c) * (i + 1) for i, c in enumerate(text_lower))
    rng = np.random.RandomState(seed)
    features = rng.uniform(2, 10, size=5).reshape(1, -1)
    probs = species_model.predict_proba(features)[0]
    pred_idx = np.argmax(probs)
    return label_encoder.inverse_transform([pred_idx])[0]


def _estimate_age_from_text(text: str) -> float:
    text_lower = text.lower()
    import re
    age_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:year|yr|y)', text_lower)
    if age_match:
        return float(age_match.group(1))
    month_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:month|mo)', text_lower)
    if month_match:
        return float(month_match.group(1)) / 12.0
    if any(w in text_lower for w in ['sapling', 'seedling', 'young', 'new', 'baby']):
        return 1.0
    if any(w in text_lower for w in ['mature', 'old', 'large', 'big', 'tall']):
        return 15.0
    if any(w in text_lower for w in ['medium', 'growing']):
        return 5.0
    return 3.0


class PlantPredictionRequest(BaseModel):
    plant_details: Optional[str] = "general plant"
    image_url: Optional[str] = ""

class CarbonCalculationRequest(BaseModel):
    species: str
    age_years: Optional[float] = 5.0
    quantity: Optional[int] = 1
    area_sqm: Optional[float] = 10.0

class PollutionRow(BaseModel):
    Year: int
    Pollutant_Gas_Name: str
    Pollutant_Total_tons: float
    Manufactured_Product: str

class PollutionAnalysisRequest(BaseModel):
    data: List[PollutionRow]


@app.post("/predict-plant")
async def predict_plant(request: PlantPredictionRequest):
    """Backward-compatible: predict plant species from text description."""
    details = request.plant_details or "general plant"
    species = _text_species_fallback(details)
    age = _estimate_age_from_text(details)
    data = PLANT_DATA.get(species, PLANT_DATA["oak"])

    health = max(10, min(100, data["avg_health"] + random.randint(-10, 10)))
    carbon = calculate_carbon_from_analysis(species, age * 0.5, health)  # rough height from age
    carbon["confidence"] = 0.85
    carbon["model"] = "RandomForestClassifier_fallback"
    carbon["input"] = details
    logger.info(f"Text prediction: '{details}' → {species}")
    return carbon


@app.post("/calculate-carbon")
async def calculate_carbon(request: CarbonCalculationRequest):
    """Backward-compatible: calculate carbon value for known species."""
    species = request.species.lower().replace(" ", "_")
    if species not in PLANT_DATA:
        species = _text_species_fallback(species)

    data = PLANT_DATA.get(species, PLANT_DATA["oak"])
    growth_rates = {"fast": 0.8, "medium": 0.5, "slow": 0.3}
    height_est = (request.age_years or 5.0) * growth_rates.get(data["growth_rate"], 0.5)
    health = data["avg_health"]

    result = calculate_carbon_from_analysis(species, height_est, health, request.quantity or 1)
    result["confidence"] = 1.0
    result["area_sqm"] = request.area_sqm
    result["density_factor"] = round(min(1.0, (request.area_sqm or 10) / max(1, request.quantity or 1) / 5), 2)
    return result


@app.post("/analyze-pollution")
async def analyze_pollution(request: PollutionAnalysisRequest):
    """Analyze industry pollution CSV data and validate pollutant absorbability."""
    if not request.data or len(request.data) == 0:
        raise HTTPException(status_code=400, detail="No pollution data provided")

    total_tons = 0.0
    breakdown = []
    has_absorbable = False
    all_non_absorbable = True

    for row in request.data:
        gas = row.Pollutant_Gas_Name.strip().upper()
        gas_key = gas
        for k in POLLUTANT_ABSORBABILITY:
            if k.upper() == gas:
                gas_key = k
                break

        absorbability = POLLUTANT_ABSORBABILITY.get(gas_key, "Unknown")
        if absorbability in ("Yes", "Partial"):
            has_absorbable = True
            all_non_absorbable = False
        elif absorbability == "Unknown":
            all_non_absorbable = False

        total_tons += row.Pollutant_Total_tons
        breakdown.append({
            "year": row.Year, "pollutant": gas_key, "tons": row.Pollutant_Total_tons,
            "product": row.Manufactured_Product, "absorbable": absorbability,
        })

    can_register = has_absorbable or not all_non_absorbable
    total_kg = total_tons * 1000
    total_units_needed = round(total_kg)
    total_cost_inr = round(total_kg * PRICE_PER_KG, 2)

    return {
        "can_register": can_register,
        "total_pollution_tons": round(total_tons, 2),
        "total_pollution_kg": round(total_kg, 2),
        "carbon_units_needed": total_units_needed,
        "estimated_cost_inr": total_cost_inr,
        "breakdown": breakdown,
        "absorbability_table": POLLUTANT_ABSORBABILITY,
        "message": "Registration approved — your pollutants can be offset by plants."
            if can_register else
            "Registration denied — your pollutants (CO, N2O) cannot be absorbed by plants.",
    }


@app.get("/health")
async def health():
    yolo_loaded = leaf_model is not None
    return {
        "status": "ok",
        "service": "greencoins-ml",
        "version": "4.0.0",
        "pipeline": {
            "part1_name_identification": {
                "primary_model": "YOLOv8s (foduucom/plant-leaf-detection-and-classification)",
                "yolo_loaded": yolo_loaded,
                "fallback_model": "SVM RBF kernel on shape+color+texture features",
                "svm_species_count": len(SVM_SPECIES_PROFILES),
                "svm_train_accuracy": round(_svm_train_acc, 3),
            },
            "part2_health_prediction": {
                "model": "RandomForestRegressor (150 trees, max_depth=12)",
                "feature_count": 9,
                "features": "green/dark-green/yellow/brown ratios, coverage, edge_density, saturation, value, GLCM",
                "train_r2_score": round(_rf_r2, 3),
                "train_samples": len(_X_health),
                "health_range": "0-100",
            },
            "part3_carbon_lookup": {
                "source": "plant_carbon_data.csv",
                "csv_rows": len(_carbon_df),
                "csv_species": int(_carbon_df["species"].nunique()) if len(_carbon_df) > 0 else 0,
                "health_bands": ["10-20", "20-30", "30-50", "50-70", "70-85", "85-100"],
            },
        },
        "species_count": len(SPECIES_LIST),
        "pricing": "1 kg CO2 = 1 unit = Rs.100",
    }


@app.get("/species")
async def list_species():
    return {"species": SPECIES_LIST, "details": PLANT_DATA, "yolo_species": YOLO_SPECIES}


@app.get("/pollutant-table")
async def pollutant_table():
    return {"absorbability": POLLUTANT_ABSORBABILITY}
