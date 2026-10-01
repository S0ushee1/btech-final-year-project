from enum import Enum


class ReportStatus(str, Enum):
    PENDING = "PENDING"
    AI_DETECTED = "AI_DETECTED"
    NEEDS_MANUAL_REVIEW = "NEEDS_MANUAL_REVIEW"
    NO_VIOLATION = "NO_VIOLATION"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


LEGACY_TO_STATUS = {
    "Pending Review": ReportStatus.AI_DETECTED.value,
    "Needs Manual Review": ReportStatus.NEEDS_MANUAL_REVIEW.value,
    "Confirmed/Fine Issued": ReportStatus.CONFIRMED.value,
    "Rejected": ReportStatus.REJECTED.value,
}


def normalize_status(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if value in ReportStatus._value2member_map_:
        return value
    return LEGACY_TO_STATUS.get(value)
