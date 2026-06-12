with open('C:/Users/msgok/OneDrive/Desktop/Project/Hermes/agentic-os/server.py', 'r') as f:
    content = f.read()

# The issue is in the jarvis_wake_word_setup function return dict.
# The current structure has:
# return {
#     "wake_word": ...,
#     "providers": { ... },
# },
#     "current_config": { ... }
# With an extra closing brace

# Find and replace the entire return dict correctly
old = """    return {
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
    }"""

new = """    return {
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
        },
        "current_config": {
            "wake_word": wake_word,
            "sensitivity": 0.5,
        }
    }"""

if old in content:
    content = content.replace(old, new)
    with open('C:/Users/msgok/OneDrive/Desktop/Project/Hermes/agentic-os/server.py', 'w') as f:
        f.write(content)
    print("Fixed successfully!")
else:
    print("Pattern not found!")
    # Try to find what's there
    import re
    match = re.search(r'return \{.*?current_config': content, re.DOTALL)
    if match:
        print("Found similar pattern:")
        print(match.group(0)[:500])