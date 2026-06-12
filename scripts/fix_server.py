# Read the file
with open("C:/Users/msgok/OneDrive/Desktop/Project/Hermes/agentic-os/server.py", "r") as f:
    lines = f.readlines()

# Fix lines 2000-2024 (1-indexed)
# The return dict should end with all keys at the same level
# Find the return statement in jarvis_wake_word_setup function
in_function = False
in_return = False
return_start = -1
return_end = -1

for i, line in enumerate(lines):
    if "async def jarvis_wake_word_setup():" in line:
        in_function = True
    elif in_function and "return {" in line:
        return_start = i
        in_return = True
    elif in_return and line.strip() == "}" and not line.startswith("        "):
        # This is the end of the return dict (at function body indent level)
        return_end = i
        break
    elif in_return and line.strip() == "# ─── Jarvis Daily Briefing Scheduler ───":
        # Hit the next function
        return_end = i
        break

print(f"Function start: {return_start}")
print(f"Return dict end: {return_end}")

# The correct structure: all keys in return dict at 8 spaces, no intermediate closing braces
# Replace lines from return_start to return_end-1
new_return = '''    return {
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
    }'''

new_lines = new_return.split('\n')
# Add newline to each
new_lines = [l + '\n' for l in new_lines]

# Replace
lines[return_start:return_end] = new_lines

# Write back
with open("C:/Users/msgok/OneDrive/Desktop/Project/Hermes/agentic-os/server.py", "w") as f:
    f.writelines(lines)

print("Fixed!")