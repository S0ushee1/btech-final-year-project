import os
from pathlib import Path
import numpy as np
from ultralytics import YOLO

# Initialize model
_DEFAULT_MODEL_PATH = Path(__file__).resolve().parent.parent / "yolov8n.pt"
model = YOLO(os.getenv("MODEL_PATH", _DEFAULT_MODEL_PATH.as_posix()))


def _to_detection_list(results, fallback_ids=True):
    """Normalize YOLO output to [x, y, w, h, id, cls]."""
    if not results or results[0].boxes is None or len(results[0].boxes) == 0:
        return []

    boxes = results[0].boxes.xywh.cpu().numpy()
    classes = results[0].boxes.cls.cpu().numpy().astype(int)

    if results[0].boxes.id is not None:
        ids = results[0].boxes.id.cpu().numpy().astype(int)
    elif fallback_ids:
        ids = np.arange(1, len(boxes) + 1)
    else:
        return []

    detections = []
    for box, obj_id, cls in zip(boxes, ids, classes):
        x_c, y_c, w, h = box
        detections.append([int(x_c - w / 2), int(y_c - h / 2), int(w), int(h), int(obj_id), int(cls)])

    return detections


def detect_objects(frame):
    """Detect objects with higher resolution and lower confidence for small objects."""
    # imgsz=1280 dramatically improves small object detection (like cell phones and distant riders)
    results = model.predict(frame, verbose=False, conf=0.15, iou=0.45, imgsz=1280)
    detections = _to_detection_list(results, fallback_ids=True)
    return detections


def get_tracked_objects(frame):
    """Detects and tracks objects with enhanced resolution."""
    results = model.track(frame, persist=True, verbose=False, conf=0.15, iou=0.45, imgsz=1280)
    return _to_detection_list(results, fallback_ids=True)


def get_metadata(path):
    return {"filename": os.path.basename(path), "source": "CCTV-Traffic-Stream"}