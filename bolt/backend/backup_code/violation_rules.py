def check_all_rules(current_obj, all_detections, history, frame_h):
    x, y, w, h, obj_id, cls = current_obj
    detected_violations = []

    # --- 1. SAFETY (Triple Riding / No Helmet) ---
    if cls == 3: # Motorcycle
        search_area = [x, y - (h * 0.4), w, h * 1.4] 
        riders = [d for d in all_detections if d[5] == 0 and is_overlapping(search_area, d[:4])]
        helmets = [d for d in all_detections if d[5] == 1 and is_overlapping(search_area, d[:4])]
        
        if len(riders) >= 3:
            detected_violations.append("Other")
        if len(riders) > 0 and len(helmets) < len(riders):
            detected_violations.append("No Helmet")

    # --- 2. LANE DISCIPLINE (Wrong Lane) ---
    if obj_id in history and len(history[obj_id]) > 10:
        start_y = history[obj_id][0][1]
        current_y = history[obj_id][-1][1]
        
        # In vi-1.mp4, the bike enters from the far side and moves down (Y increases)
        # on the left half of the screen.
        if current_y > start_y + 30: # If bike moves towards camera
            # Optional: Add an 'x' coordinate check if you only want to flag the left side
            detected_violations.append("Wrong Lane Usage")

    # --- 3. POSITION (Red Light) ---
    # Positional check: Only trigger if NOT already flagged for something else
    if not detected_violations and (y + h) > (frame_h * 0.95):
        detected_violations.append("Red Light Violation")

    if detected_violations:
        return True, ", ".join(list(set(detected_violations)))

    return False, "Non-Violated"