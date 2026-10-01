from app import create_app
import os

app = create_app()

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_ENV", "development") == "development"

    if debug:
        app.run(debug=True, host=host, port=port)
    else:
        from waitress import serve
        serve(app, host=host, port=port)
