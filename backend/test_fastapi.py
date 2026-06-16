from fastapi import FastAPI
from pydantic import BaseModel
from deep_translator import GoogleTranslator

app = FastAPI()

class RequestTranslate(BaseModel):
    names: list[str]

@app.post("/api/translate")
def translate_names(request: RequestTranslate):
    en_translator = GoogleTranslator(source='auto', target='en')
    id_translator = GoogleTranslator(source='auto', target='id')
    translations = {}
    for name in request.names:
        translations[name] = {
            "id": id_translator.translate(name),
            "en": en_translator.translate(name)
        }
    return translations

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
