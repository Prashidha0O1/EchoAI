import sounddevice as sd
import numpy as np
import whisper
import queue
import threading
import pyttsx3

# Audio parameters
samplerate = 16000  # samples per second
chunk_size = 1024   # number of frames per buffer
channels = 1        # mono

audio_queue = queue.Queue()
STOP_STREAM = threading.Event()

# Initialize the TTS engine
engine = pyttsx3.init()

def callback(indata, frames, time, status):
    if status:
        print(status)
    audio_queue.put(indata.copy())

def transcribe_audio():
    model = whisper.load_model("base")
    audio_buffer = []
    print("Whisper model loaded. Waiting for audio...")

    while not STOP_STREAM.is_set():
        try:
            chunk = audio_queue.get(timeout=1)  # Get audio chunk with a timeout
            audio_buffer.append(chunk)

            # Process audio every few chunks or after a certain duration
            if len(audio_buffer) * chunk_size >= samplerate * 3:  # Process every 3 seconds of audio
                full_audio = np.concatenate(audio_buffer)
                audio_buffer = [] # Clear the buffer

                print("Transcribing buffered audio...")
                result = model.transcribe(full_audio, fp16=False) # fp16=False for CPU
                transcribed_text = result['text']
                print(f"Transcription: {transcribed_text}")

                # Placeholder for your custom model
                response_text = process_text_with_model(transcribed_text)
                print(f"Model Response: {response_text}")

                # Speak the response
                engine.say(response_text)
                engine.runAndWait()

        except queue.Empty:
            continue
        except Exception as e:
            print(f"Error in transcription thread: {e}")
            break

def process_text_with_model(text):
    """Placeholder function for your custom NLU/model."""
    print(f"Text sent to model: {text}")
    return "This is a placeholder response from my model."

print("Starting audio stream...")

# Start transcription thread
transcription_thread = threading.Thread(target=transcribe_audio)
transcription_thread.start()

with sd.InputStream(samplerate=samplerate, blocksize=chunk_size, channels=channels, callback=callback):
    print("Press Ctrl+C to stop the recording...")
    try:
        while True:
            sd.sleep(1000)
    except KeyboardInterrupt:
        print("\nStopping audio stream.")
    finally:
        STOP_STREAM.set() # Signal the transcription thread to stop
        transcription_thread.join() # Wait for the transcription thread to finish
        print("Audio stream and transcription stopped.")
