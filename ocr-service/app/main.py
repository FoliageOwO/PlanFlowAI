from fastapi import FastAPI, UploadFile, File
from app.schemas import OCRResponse, HealthResponse, LineResult
from app.ocr_service import recognize

app = FastAPI(title="OCR Service")


@app.get("/health", response_model=HealthResponse)
def health():
    return {"status": "ok"}


@app.post("/ocr/image", response_model=OCRResponse)
async def ocr_image(file: UploadFile = File(...)):
    contents = await file.read()
    result = recognize(contents)
    if not result["success"]:
        return OCRResponse(success=False)
    return OCRResponse(
        success=True,
        text=result["text"],
        lines=[LineResult(**ln) for ln in result["lines"]],
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
