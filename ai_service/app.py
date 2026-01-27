from flask import Flask, request, jsonify
from ultralytics import YOLO
import os
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load YOLOv8 model (using nano for speed)
# It will download automatically on first run if not present
try:
    model = YOLO("yolov8n.pt") 
    logger.info("YOLOv8 model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load YOLOv8 model: {e}")
    raise e

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "civicflo-ai"}), 200

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({"error": "No image part"}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and allowed_file(file.filename):
        # Save temp file for processing
        temp_path = os.path.join("temp_upload.jpg")
        file.save(temp_path)
        
        try:
            # Run inference
            results = model(temp_path)
            
            # Process results
            # taking the highest confidence detection
            best_detection = None
            highest_conf = 0.0
            
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    class_name = model.names[cls]
                    
                    if conf > highest_conf:
                        highest_conf = conf
                        best_detection = {
                            "class": class_name,
                            "confidence": conf,
                            "valid": True # logic for civic validity happens here or in backend
                        }
            
            # Cleanup
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
            if best_detection:
                # Add civic context logic (simplified for demo)
                # In a real app, we'd have a specific list of "civic" classes
                # For demo, we'll map common COCO classes to civic issues if they match loosely
                # or just pass them through.
                
                # Mapping COCO classes to Civic context for the demo
                civic_map = {
                    "car": "illegal_parking",
                    "truck": "garbage_truck",
                    "traffic light": "broken_traffic_light",
                    "bench": "broken_bench",
                    "bottle": "litter",
                    "cup": "litter",
                }
                
                if best_detection["class"] in civic_map:
                     best_detection["civic_issue"] = civic_map[best_detection["class"]]
                else:
                     best_detection["civic_issue"] = "uncategorized_issue"

                return jsonify(best_detection)
            else:
                return jsonify({
                    "valid": False,
                    "reason": "No object detected with sufficient confidence"
                })

        except Exception as e:
            logger.error(f"Prediction error: {e}")
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return jsonify({"error": str(e)}), 500
            
    return jsonify({"error": "Invalid file type"}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
