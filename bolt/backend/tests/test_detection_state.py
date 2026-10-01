from app.utils import _compute_detection_state


def test_compute_detection_state_non_violated():
    cfg = {
        "DEFAULT_VIOLATION_CONFIDENCE_THRESHOLD": 0.88,
        "STRICT_RULE_THRESHOLDS": {
            "No Helmet": 0.93,
            "Using Mobile Phone While Riding": 0.95,
        },
    }
    state = _compute_detection_state([], 0.0, cfg)
    assert state == "non_violated"


def test_compute_detection_state_manual_review_for_low_confidence():
    cfg = {
        "DEFAULT_VIOLATION_CONFIDENCE_THRESHOLD": 0.88,
        "STRICT_RULE_THRESHOLDS": {
            "No Helmet": 0.93,
        },
    }
    state = _compute_detection_state(["Wrong Lane Usage"], 0.86, cfg)
    assert state == "needs_manual_review"


def test_compute_detection_state_manual_review_for_strict_rule():
    cfg = {
        "DEFAULT_VIOLATION_CONFIDENCE_THRESHOLD": 0.88,
        "STRICT_RULE_THRESHOLDS": {
            "No Helmet": 0.93,
        },
    }
    state = _compute_detection_state(["No Helmet"], 0.90, cfg)
    assert state == "needs_manual_review"


def test_compute_detection_state_violated():
    cfg = {
        "DEFAULT_VIOLATION_CONFIDENCE_THRESHOLD": 0.88,
        "STRICT_RULE_THRESHOLDS": {
            "No Helmet": 0.93,
        },
    }
    state = _compute_detection_state(["Wrong Lane Usage"], 0.91, cfg)
    assert state == "violated"
