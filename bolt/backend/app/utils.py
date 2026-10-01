"""
Utility functions for processing media files
Detects ANY violation and categorizes into 6 types or "Other"
"""

import cv2
import os
import uuid
from collections import defaultdict
from typing import Tuple, List, Dict, Any, Iterable
from werkzeug.datastructures import FileStorage
from .detector import get_tracked_objects, detect_objects
from .violation_rules import ViolationDetector

ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp'}
ALLOWED_VIDEO_EXTENSIONS = {'.mp4', '.avi', '.mov', '.mkv'}
ALLOWED_EXTENSIONS = ALLOWED_IMAGE_EXTENSIONS | ALLOWED_VIDEO_EXTENSIONS
ALLOWED_MIME_PREFIXES = ("image/", "video/")
STRICT_RULES = {"No Helmet", "Using Mobile Phone While Riding"}


def _get_file_size(file: FileStorage) -> int:
    """Get file size without consuming stream."""
    if file.content_length is not None and int(file.content_length) > 0:
        return int(file.content_length)

    try:
        current_pos = file.stream.tell()
        file.stream.seek(0, os.SEEK_END)
        size = file.stream.tell()
        file.stream.seek(current_pos)
        return int(size)
    except Exception:
        return 0


def validate_media_file(file: FileStorage, max_size_bytes: int) -> Tuple[bool, str]:
    """Validate extension, MIME and size."""
    if not file or not file.filename:
        return False, "No file provided"

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, "Unsupported media format. Allowed: jpg, jpeg, png, bmp, mp4, avi, mov, mkv"

    mimetype = (file.mimetype or "").lower()
    if not any(mimetype.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
        return False, f"Unsupported MIME type: {mimetype or 'unknown'}"

    file_size = _get_file_size(file)
    if file_size <= 0:
        return False, "Uploaded file appears to be empty"
    if file_size > max_size_bytes:
        return False, f"File too large. Max allowed is {max_size_bytes // (1024 * 1024)} MB"

    return True, ""

def get_metadata(path: str) -> Dict[str, Any]:
    """Extract metadata from media file"""
    filename = os.path.basename(path)
    file_size = os.path.getsize(path) if os.path.exists(path) else 0
    
    metadata = {
        "filename": filename,
        "source": "Traffic Camera",
        "file_size_mb": round(file_size / (1024 * 1024), 2)
    }
    
    ext = os.path.splitext(path)[1].lower()
    if ext in ['.mp4', '.avi', '.mov', '.mkv']:
        cap = cv2.VideoCapture(path)
        if cap.isOpened():
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            metadata.update({
                "duration_sec": round(frame_count / fps, 2) if fps > 0 else 0,
                "fps": round(fps, 2),
                "frame_count": frame_count,
                "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            })
            cap.release()
    
    return metadata


def _draw_boxes(frame, detections: Iterable[List[int]]):
    annotated = frame.copy()
    for det in detections:
        if len(det) < 6:
            continue
        x, y, w, h, obj_id, cls = det
        cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 215, 255), 2)
        cv2.putText(
            annotated,
            f"id:{obj_id} c:{cls}",
            (x, max(10, y - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 215, 255),
            1,
            cv2.LINE_AA,
        )
    return annotated


def _save_snapshot(media_path: str, frame, detections: Iterable[List[int]]) -> str | None:
    if frame is None:
        return None

    out_dir = os.path.join(os.path.dirname(media_path), "evidence")
    os.makedirs(out_dir, exist_ok=True)
    name = f"evidence_{uuid.uuid4().hex}.jpg"
    out_path = os.path.join(out_dir, name)
    annotated = _draw_boxes(frame, detections)
    ok = cv2.imwrite(out_path, annotated)
    return out_path if ok else None


def _compute_detection_state(violations: List[str], confidence: float, config: Dict[str, Any]) -> str:
    if not violations:
        return "non_violated"

    default_threshold = float(config.get("DEFAULT_VIOLATION_CONFIDENCE_THRESHOLD", 0.88))
    strict_thresholds = config.get("STRICT_RULE_THRESHOLDS", {})

    if confidence < default_threshold:
        return "needs_manual_review"

    for violation in violations:
        if violation in STRICT_RULES:
            threshold = float(strict_thresholds.get(violation, default_threshold))
            if confidence < threshold:
                return "needs_manual_review"

    return "violated"


def process_media(path: str, config: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Process ANY media to detect ALL violations
    Returns mapped violations (6 types or Other)
    """
    ext = os.path.splitext(path)[1].lower()
    detector = ViolationDetector()
    cfg = config or {}
    detector.reset()

    if ext in ALLOWED_IMAGE_EXTENSIONS:
        return _process_image(path, detector, cfg)
    if ext in ALLOWED_VIDEO_EXTENSIONS:
        return _process_video(path, detector, cfg)

    return {
        "status": "invalid_input",
        "has_violation": False,
        "confidence_score": 0.0,
        "violations": [],
        "detection_state": "non_violated",
        "evidence_snapshot_path": None,
        "evidence_frame_index": None,
        "error_code": "UNSUPPORTED_MEDIA_FORMAT",
        "error": "Unsupported media format",
    }


def _process_image(path: str, detector: ViolationDetector, config: Dict[str, Any]) -> Dict[str, Any]:
    """Process single image - detect ALL violations"""
    frame = cv2.imread(path)
    if frame is None:
        return {
            "status": "invalid_input",
            "has_violation": False,
            "confidence_score": 0.0,
            "violations": [],
            "detection_state": "non_violated",
            "evidence_snapshot_path": None,
            "evidence_frame_index": None,
            "error_code": "IMAGE_READ_FAILED",
            "error": "Failed to read image",
        }

    h, w = frame.shape[:2]
    detector.is_video = False
    detector.frame_height = h
    detector.frame_width = w

    objs = detect_objects(frame)
    detector.analyze_scene(frame, objs)

    for obj in objs:
        detector.check_all_rules(obj, objs, h, w, current_frame=frame)

    all_violations = list(detector.get_final_violations())
    if all_violations:
        confidence = detector.calculate_confidence_score(all_violations)
        detection_state = _compute_detection_state(all_violations, confidence, config)
        snapshot = _save_snapshot(path, frame, objs)
        return {
            "status": "ok",
            "has_violation": True,
            "confidence_score": confidence,
            "violations": all_violations,
            "detection_state": detection_state,
            "evidence_snapshot_path": snapshot,
            "evidence_frame_index": 0,
            "error_code": None,
            "error": None,
        }

    return {
        "status": "ok",
        "has_violation": False,
        "confidence_score": 0.0,
        "violations": [],
        "detection_state": "non_violated",
        "evidence_snapshot_path": None,
        "evidence_frame_index": None,
        "error_code": None,
        "error": None,
    }


def _process_video(path: str, detector: ViolationDetector, config: Dict[str, Any]) -> Dict[str, Any]:
    """Process video - detect ALL violations across frames"""
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        return {
            "status": "invalid_input",
            "has_violation": False,
            "confidence_score": 0.0,
            "violations": [],
            "detection_state": "non_violated",
            "evidence_snapshot_path": None,
            "evidence_frame_index": None,
            "error_code": "VIDEO_OPEN_FAILED",
            "error": "Failed to open video",
        }

    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    detector.is_video = True
    detector.frame_height = frame_h
    detector.frame_width = frame_w
    detector.frame_rate = fps if fps > 0 else 30

    ret, first_frame = cap.read()
    if ret:
        first_frame_objs = get_tracked_objects(first_frame)
        detector.analyze_scene(first_frame, first_frame_objs)
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    frame_skip = max(1, frame_count // 45)
    frame_idx = 0
    violation_frame_count = 0
    violation_hits: Dict[str, int] = defaultdict(int)
    best_frame = None
    best_objs = []
    best_frame_idx = None
    best_hit_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_skip == 0 or violation_frame_count > 0:
            objs = get_tracked_objects(frame)
            frame_has_violation = False
            frame_violations = set()

            for obj in objs:
                has_violation, obj_violations = detector.check_all_rules(obj, objs, frame_h, frame_w, fps, frame)
                if has_violation:
                    frame_has_violation = True
                    frame_violations.update(obj_violations)

            for violation in frame_violations:
                violation_hits[violation] += 1

            if len(frame_violations) > best_hit_count:
                best_hit_count = len(frame_violations)
                best_frame = frame.copy()
                best_objs = list(objs)
                best_frame_idx = frame_idx

            if frame_has_violation:
                violation_frame_count += 5
                frame_skip = max(1, frame_count // 90)
            else:
                violation_frame_count = max(0, violation_frame_count - 1)

        frame_idx += 1

    cap.release()

    all_violations = list(detector.get_final_violations())
    min_frames = int(config.get("VIDEO_MIN_VIOLATION_FRAMES", 1))
    persistent_violations = [v for v in all_violations if violation_hits.get(v, 0) >= min_frames]

    if persistent_violations:
        confidence = detector.calculate_confidence_score(persistent_violations)
        detection_state = _compute_detection_state(persistent_violations, confidence, config)
        snapshot = _save_snapshot(path, best_frame, best_objs)
        return {
            "status": "ok",
            "has_violation": True,
            "confidence_score": confidence,
            "violations": persistent_violations,
            "detection_state": detection_state,
            "evidence_snapshot_path": snapshot,
            "evidence_frame_index": best_frame_idx,
            "error_code": None,
            "error": None,
        }

    if all_violations:
        # Violations observed but not persistent enough across frames.
        confidence = detector.calculate_confidence_score(all_violations)
        snapshot = _save_snapshot(path, best_frame, best_objs)
        return {
            "status": "ok",
            "has_violation": False,
            "confidence_score": confidence,
            "violations": all_violations,
            "detection_state": "needs_manual_review",
            "evidence_snapshot_path": snapshot,
            "evidence_frame_index": best_frame_idx,
            "error_code": "TEMPORAL_INSUFFICIENT",
            "error": None,
        }

    return {
        "status": "ok",
        "has_violation": False,
        "confidence_score": 0.0,
        "violations": [],
        "detection_state": "non_violated",
        "evidence_snapshot_path": None,
        "evidence_frame_index": None,
        "error_code": None,
        "error": None,
    }
