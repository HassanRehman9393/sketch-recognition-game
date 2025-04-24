"""
Route registration module
Imports and registers all route blueprints with the Flask app
"""

def register_routes(app):
    """Register all route blueprints with the app"""
    try:
        from app.api.recognition_routes import recognition_bp
        
        app.register_blueprint(recognition_bp)
        
        # Log registered routes
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append(f"{rule.endpoint}: {rule.rule}")
        
        app.logger.info(f"Registered routes:")
        for route in routes:
            app.logger.info(f"  - {route}")
    except Exception as e:
        app.logger.error(f"Error registering routes: {e}")
