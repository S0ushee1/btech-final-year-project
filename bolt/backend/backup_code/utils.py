def process_media(path):
    ext = os.path.splitext(path)[1].lower()
    all_detected_violations = set() # Use a set to store UNIQUE violations
    
    # --- Image Handling ---
    if ext in ['.jpg', '.jpeg', '.png']:
        frame = cv2.imread(path)
        h, w, _ = frame.shape
        objs = get_tracked_objects(frame)
        for obj in objs:
            is_v, v_type = check_all_rules(obj, objs, {}, h)
            if is_v:
                # Split the string (e.g., "No Helmet, Other") and add to set
                for v in v_type.split(", "):
                    all_detected_violations.add(v)
        
        if all_detected_violations:
            return True, 0.90, ", ".join(sorted(all_detected_violations))
        return False, 0.0, "Non-Violated"

    # --- Video Handling ---
    elif ext in ['.mp4', '.avi', '.mov']:
        cap = cv2.VideoCapture(path)
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        is_violation = False
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            
            objs = get_tracked_objects(frame)
            for obj in objs:
                o_id = obj[4]
                if o_id not in object_history: object_history[o_id] = []
                object_history[o_id].append((obj[0]+obj[2]//2, obj[1]+obj[3]//2))
                
                # Check rules
                violated, v_name = check_all_rules(obj, objs, object_history, frame_h)
                if violated:
                    is_violation = True
                    # Collect all violations found in this frame
                    for v in v_name.split(", "):
                        all_detected_violations.add(v)
            
            # REMOVED the 'break' here so it scans the WHOLE video
            
        cap.release()
        final_report = ", ".join(sorted(all_detected_violations)) if all_detected_violations else "Non-Violated"
        return is_violation, (0.92 if is_violation else 0.0), final_report

    return False, 0.0, "Unsupported Format"