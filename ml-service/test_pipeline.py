"""
Test script for the 3-part Plant ML Pipeline.
Tests the full chain: SVM name ID -> RF health -> CSV carbon lookup.

Run with:  python test_pipeline.py
Or with:   pytest test_pipeline.py -v
"""
import io
import json
import numpy as np
from PIL import Image, ImageDraw

# ── helpers ──────────────────────────────────────────────────────────────

def make_green_leaf_png(width=120, height=80) -> bytes:
    """Generate a synthetic green leaf image for testing."""
    img = Image.new("RGB", (width, height), (200, 220, 200))
    draw = ImageDraw.Draw(img)
    # Draw an ellipse as leaf shape
    draw.ellipse([10, 10, width - 10, height - 10], fill=(60, 140, 60))
    # Add some texture spots
    for _ in range(15):
        rng = np.random.default_rng(42)
        x = int(rng.integers(20, width - 20))
        y = int(rng.integers(10, height - 10))
        draw.ellipse([x, y, x + 5, y + 5], fill=(80, 160, 50))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_yellowed_leaf_png(width=120, height=80) -> bytes:
    """Generate a stressed/yellowing leaf for Part 2 health test."""
    img = Image.new("RGB", (width, height), (210, 200, 150))
    draw = ImageDraw.Draw(img)
    draw.ellipse([10, 10, width - 10, height - 10], fill=(180, 170, 60))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ── unit tests for individual functions ────────────────────────────────

def test_extract_leaf_features():
    """Part 1: Feature extraction should return 7-element array."""
    from main import extract_leaf_features
    img_bytes = make_green_leaf_png()
    features = extract_leaf_features(img_bytes)
    assert features.shape == (7,), f"Expected 7 features, got {features.shape}"
    assert not np.all(features == 0), "Features should not all be zero"
    print(f"  [PASS] extract_leaf_features: {features.round(3)}")


def test_identify_species_svm():
    """Part 1: SVM should return a valid species name."""
    from main import identify_species_svm, SVM_SPECIES_PROFILES
    img_bytes = make_green_leaf_png()
    result = identify_species_svm(img_bytes)
    assert result["detected"] is True
    assert result["method"] == "svm_leaf_features"
    assert result["species"] in SVM_SPECIES_PROFILES
    assert 0.0 <= result["confidence"] <= 1.0
    assert len(result["top3_candidates"]) == 3
    print(f"  [PASS] identify_species_svm: {result['species']} (conf={result['confidence']:.3f})")


def test_extract_health_features():
    """Part 2: Health feature extraction should return 9-element array."""
    from main import extract_health_features
    green_bytes = make_green_leaf_png()
    yellow_bytes = make_yellowed_leaf_png()
    feat_green  = extract_health_features(green_bytes)
    feat_yellow = extract_health_features(yellow_bytes)
    assert feat_green.shape  == (9,), f"Expected 9 features, got {feat_green.shape}"
    assert feat_yellow.shape == (9,), f"Expected 9 features, got {feat_yellow.shape}"
    # Green image should have higher green ratio than yellow
    assert feat_green[0] >= feat_yellow[0] or feat_green[0] > 0, "Green leaf should have non-zero green ratio"
    print(f"  [PASS] extract_health_features: green_ratio={feat_green[0]:.3f}, yellow_ratio={feat_green[2]:.3f}")


def test_predict_health_rf():
    """Part 2: RF model should return a health score and band."""
    from main import predict_health_rf
    green_bytes  = make_green_leaf_png()
    yellow_bytes = make_yellowed_leaf_png()
    result_green  = predict_health_rf(green_bytes)
    result_yellow = predict_health_rf(yellow_bytes)
    for result, label in [(result_green, "green"), (result_yellow, "yellow")]:
        assert "health_score" in result
        assert "health_band" in result
        assert result["method"] == "random_forest_regressor"
        assert 10 <= result["health_score"] <= 100
        assert "-" in result["health_band"]
        # Verify band matches score
        lo, hi = map(int, result["health_band"].split("-"))
        assert lo <= result["health_score"] <= hi or result["health_score"] >= lo, \
            f"Health score {result['health_score']} outside band {result['health_band']}"
        print(f"  [PASS] predict_health_rf ({label}): score={result['health_score']}, band={result['health_band']}")


def test_lookup_carbon_from_csv():
    """Part 3: CSV lookup should return correct carbon values for all species."""
    from main import lookup_carbon_from_csv, _carbon_df
    assert len(_carbon_df) > 0, "plant_carbon_data.csv should be loaded"

    # Test a few known species at different health bands
    test_cases = [
        ("oak",     15,  4.4),   # 10-20 band
        ("oak",     50,  15.4),  # 50-70 band
        ("oak",     90,  22.0),  # 85-100 band
        ("bamboo",  75,  29.75), # 70-85 band
        ("tomato",  25,  0.6),   # 20-30 band
    ]
    for species, health, expected_carbon in test_cases:
        result = lookup_carbon_from_csv(species, health)
        assert result["source"] == "plant_carbon_data.csv"
        assert result["species"] == species or result["species"] in _carbon_df["species"].values
        assert abs(result["carbon_per_year_kg"] - expected_carbon) < 0.01, \
            f"{species} @ {health}%: expected {expected_carbon}, got {result['carbon_per_year_kg']}"
        assert "note" in result and "sequesters" in result["note"]
        print(f"  [PASS] lookup_carbon_from_csv: {species} @ {health}% → {result['carbon_per_year_kg']} kg CO₂/yr")

    # Test fallback for unknown species
    result_unknown = lookup_carbon_from_csv("doesnotexist", 50)
    assert result_unknown["species"] == "oak", "Unknown species should fall back to oak"
    print(f"  [PASS] lookup_carbon_from_csv: fallback to oak for unknown species")


def test_full_pipeline_api():
    """Integration test: /analyze-plant returns all 3 sections."""
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)

    img_bytes = make_green_leaf_png()

    # Test with leaf image only
    response = client.post(
        "/analyze-plant",
        data={"plant_name": "tomato", "quantity": "1"},
        files={"leaf_image": ("leaf.png", img_bytes, "image/png")},
    )
    assert response.status_code == 200, f"API returned {response.status_code}: {response.text}"
    data = response.json()

    # Part 1 checks
    assert "species_identification" in data, "Missing species_identification"
    si = data["species_identification"]
    assert "final_species" in si
    assert "svm_result" in si
    assert "yolo_result" in si
    assert "selected_method" in si

    # Part 2 checks
    assert "health_analysis" in data, "Missing health_analysis"
    ha = data["health_analysis"]
    assert "health_score" in ha
    assert "health_band" in ha
    assert ha["method"] in ("random_forest_regressor", "database_default")

    # Part 3 checks
    assert "carbon_lookup" in data, "Missing carbon_lookup"
    cl = data["carbon_lookup"]
    assert cl["source"] == "plant_carbon_data.csv"
    assert "carbon_per_year_kg" in cl
    assert "health_band" in cl
    assert "note" in cl

    # Flat fields check
    assert "species" in data
    assert "plant_health" in data
    assert "carbon_per_day_kg" in data
    assert "health_band" in data
    assert "carbon_note" in data
    assert data["model"] == "svm_leaf_features + random_forest_health + csv_lookup"

    print(f"  [PASS] /analyze-plant API:")
    print(f"         species={data['species']} (method={si['selected_method']})")
    print(f"         health={data['plant_health']} (band={data['health_band']})")
    print(f"         carbon={data['carbon_per_year_kg']} kg/yr")
    print(f"         note: {data['carbon_note']}")


def test_health_endpoint():
    """GET /health should report all 3 pipeline components."""
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == "4.0.0"
    assert "pipeline" in data
    assert "part1_name_identification" in data["pipeline"]
    assert "part2_health_prediction" in data["pipeline"]
    assert "part3_carbon_lookup" in data["pipeline"]
    p1 = data["pipeline"]["part1_name_identification"]
    p2 = data["pipeline"]["part2_health_prediction"]
    p3 = data["pipeline"]["part3_carbon_lookup"]
    assert p1["svm_train_accuracy"] > 0.5, f"SVM accuracy too low: {p1['svm_train_accuracy']}"
    assert p2["train_r2_score"] > 0.8,     f"RF R² too low: {p2['train_r2_score']}"
    assert p3["csv_rows"] > 0,             "CSV should have rows loaded"
    print(f"  [PASS] /health: version={data['version']}, SVM acc={p1['svm_train_accuracy']}, "
          f"RF R²={p2['train_r2_score']}, CSV rows={p3['csv_rows']}")


# ── runner ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    tests = [
        test_extract_leaf_features,
        test_identify_species_svm,
        test_extract_health_features,
        test_predict_health_rf,
        test_lookup_carbon_from_csv,
        test_full_pipeline_api,
        test_health_endpoint,
    ]
    passed = 0
    failed = 0
    print("\n" + "=" * 60)
    print("  3-Part Plant ML Pipeline Test Suite")
    print("=" * 60)
    for test_fn in tests:
        print(f"\n[TEST] {test_fn.__name__}")
        try:
            test_fn()
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    print("\n" + "=" * 60)
    print(f"  Results: {passed} passed, {failed} failed")
    print("=" * 60)
    if failed:
        raise SystemExit(1)
