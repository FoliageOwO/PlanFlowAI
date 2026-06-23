import numpy as np
import cv2
from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_textline_orientation=True,
    lang='ch',
    ocr_version='PP-OCRv4',
)


def recognize(image_bytes: bytes) -> dict:
    """识别图片文字，返回 { success, text, lines }"""
    try:
        # bytes -> numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return {"success": False, "text": None, "lines": []}

        result = ocr.predict(img)

        lines = []
        texts = []
        for page in result:
            if page is None:
                continue
            rec_texts = page.get('rec_texts') or []
            rec_scores = page.get('rec_scores') or []
            for text, score in zip(rec_texts, rec_scores):
                lines.append({"text": text, "confidence": round(float(score), 4)})
                texts.append(text)

        return {
            "success": True,
            "text": "\n".join(texts),
            "lines": lines,
        }
    except Exception:
        return {"success": False, "text": None, "lines": []}
