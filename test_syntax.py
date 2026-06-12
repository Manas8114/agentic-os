import ast
code = '''
@app.get("/api/jarvis/wake-word/setup")
async def jarvis_wake_word_setup():
    config = load_jarvis_config()
    wake_word = config.get("wake_word", "jarvis")
    
    return {
        "wake_word": wake_word,
        "providers": {
            "porcupine": {
                "name": "Picovoice Porcupine",
                "description": "Cross-platform wake word engine with WebAssembly support",
                "setup": [
                    "1. Sign up at https://console.picovoice.ai/",
                    "2. Create a custom wake word or use built-in ones",
                    "3. Get your AccessKey",
                    "4. Add PORCUPINE_ACCESS_KEY to environment variables",
                    "5. Install @picovoice/porcupine-web-react or similar for browser",
                ],
            },
        },
        "snowboy": {
            "name": "Snowboy (Legacy)",
            "description": "Alternative wake word engine (deprecated but functional)",
            "note": "Snowboy is deprecated. Consider Porcupine for new implementations."
        }
    },
    "current_config": {
        "wake_word": wake_word,
        "sensitivity": 0.5,
    }
'''
try:
    ast.parse(code)
    print('OK')
except SyntaxError as e:
    print(f'SyntaxError: {e}')