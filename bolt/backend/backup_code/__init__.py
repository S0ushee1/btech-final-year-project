from flask import Flask
from flask_cors import CORS
import os
# Import the db object from models
from .models import db

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///traffic.db'
    app.config['UPLOAD_FOLDER'] = 'uploads'
    
    if not os.path.exists('uploads'):
        os.makedirs('uploads')
        
    CORS(app)
    
    # Initialize db with the app
    db.init_app(app)
    
    # Register Blueprints
    from .routes import main_bp
    app.register_blueprint(main_bp)
    
    with app.app_context():
        db.create_all()
        
    return app