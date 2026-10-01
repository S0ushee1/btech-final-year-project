from ultralytics import YOLO

model = YOLO("yolov8n.pt")
metrics = model.val(data="dataset/data.yaml", split="val")

print("mAP50-95:", metrics.box.map)
print("mAP50:", metrics.box.map50)
print("Mean Precision:", metrics.box.mp)
print("Mean Recall:", metrics.box.mr)

print("\nPer-class mAP50:")
for i, name in enumerate(model.names.values()):
    print(f"{name}: {metrics.box.ap50[i]:.3f}")