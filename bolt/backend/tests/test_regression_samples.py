from pathlib import Path
import pytest

from app.utils import process_media


PROJECT_ROOT = Path(__file__).resolve().parents[3]
SAMPLES_DIR = PROJECT_ROOT / "image-video" / "violated"


def _sample_path(name: str) -> str:
    path = SAMPLES_DIR / name
    if not path.exists():
        pytest.skip(f"Sample file not found: {path}")
    return str(path)


@pytest.mark.slow
def test_regression_image_1():
    result = process_media(_sample_path("im-1.jpg"))
    assert result["status"] == "ok"
    assert "Triple Riding" in result["violations"]
    assert "No Helmet" in result["violations"]


@pytest.mark.slow
def test_regression_image_2():
    result = process_media(_sample_path("im-2.jpg"))
    assert result["status"] == "ok"
    assert "Zebra Crossing Obstruction" in result["violations"]
    assert "No Helmet" in result["violations"]


@pytest.mark.slow
def test_regression_image_3():
    result = process_media(_sample_path("im-3.jpg"))
    assert result["status"] == "ok"
    assert "Wrong Lane Usage" in result["violations"]


@pytest.mark.slow
def test_regression_video_1():
    result = process_media(_sample_path("vi-1.mp4"))
    assert result["status"] == "ok"
    assert "Wrong Lane Usage" in result["violations"]
    assert "Reckless/Dangerous Driving" in result["violations"]


@pytest.mark.slow
@pytest.mark.xfail(reason="Mobile-phone detection is heuristic without dedicated model training.")
def test_regression_video_2_mobile_phone_expected():
    result = process_media(_sample_path("vi-2.mp4"))
    assert result["status"] == "ok"
    assert "Using Mobile Phone While Riding" in result["violations"]
    assert "Reckless/Dangerous Driving" in result["violations"]
