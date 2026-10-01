import os
from ultralytics import YOLO

# Initialize model
model = YOLO('yolov8n.pt') 

def get_tracked_objects(frame):
    """Detects and tracks objects. Returns: [x, y, w, h, id, cls]"""
    # persist=True is required for consistent ID tracking
    results = model.track(frame, persist=True, verbose=False)
    
    tracked_objs = []
    if results[0].boxes.id is not None:
        boxes = results[0].boxes.xywh.cpu().numpy()
        ids = results[0].boxes.id.cpu().numpy().astype(int)
        classes = results[0].boxes.cls.cpu().numpy().astype(int)
        
        for box, obj_id, cls in zip(boxes, ids, classes):
            x_c, y_c, w, h = box
            # Convert to top-left format
            tracked_objs.append([int(x_c - w/2), int(y_c - h/2), int(w), int(h), obj_id, cls])
    return tracked_objs

def get_metadata(path):
    return {"filename": os.path.basename(path), "source": "CCTV-Traffic-Stream"}