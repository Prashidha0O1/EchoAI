
import speech_recognition as sr

def live_speech_to_text():
    r = sr.Recognizer()
    # Adjust for ambient noise for better accuracy
    with sr.Microphone() as source:
        print("Calibrating for ambient noise...")
        r.adjust_for_ambient_noise(source, duration=1)
        print("Say something!")

        while True:
            try:
                audio = r.listen(source)

                # Recognize speech using Google Speech Recognition
                text = r.recognize_google(audio)
                print(f"You said: {text}")

                # Store the recognized text in a file
                with open("transcribed_speech.txt", "a") as f:
                    f.write(text + "\n")
                print("Text saved to transcribed_speech.txt")

            except sr.UnknownValueError:
                print("Google Speech Recognition could not understand audio")
            except sr.RequestError as e:
                print(f"Could not request results from Google Speech Recognition service; {e}")
            except KeyboardInterrupt:
                print("Stopping live transcription.")
                break

if __name__ == "__main__":
    live_speech_to_text()
