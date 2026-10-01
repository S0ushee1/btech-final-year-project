from flask import Blueprint, request, jsonify
from .models import db, ViolationReport
from .utils import process_media, get_metadata
import os

main_bp = Blueprint('main', __name__)

@main_bp.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file"}), 400
    
    file = request.files['file']
    path = os.path.join('uploads', file.filename)
    file.save(path)
    
    # Extract Metadata for mobile reporting
    timestamp = get_metadata(path)
    
    # Run AI Analysis
    is_v, score, v_type = process_media(path)
    
    if is_v:
        new_report = ViolationReport(
            violation_type=v_type,
            evidence_path=path,
            confidence_score=score,
            status="Pending Review"
        )
        db.session.add(new_report)
        db.session.commit()
        return jsonify({"message": "Violation detected!", "type": v_type, "time": timestamp}), 201
    
    return jsonify({"message": "No violation found"}), 200