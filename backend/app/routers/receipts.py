# ============================================================
# RECEIPTS ROUTER — Smart Receipt OCR & Item Extraction
# ============================================================

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from app.models.user import UserProfile
from app.middleware.auth import get_current_user
from app.services.ai_service import parse_receipt_image

router = APIRouter(prefix="/api/receipts", tags=["Receipts"])


@router.post("/scan")
async def scan_receipt(
    file: UploadFile = File(...),
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Scans an uploaded receipt image or PDF using Google Gemini Vision.
    Extracts merchant, line items (item name, quantity, price),
    subtotal, taxes (CGST/SGST), service charge, discount, and grand total.
    """
    # Verify file type
    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "image/heic",
        "application/pdf",
    }

    content_type = file.content_type or "image/jpeg"
    if content_type not in allowed_types and not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.pdf')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a JPEG, PNG, WebP, or PDF receipt image."
        )

    try:
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:  # 10 MB limit
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds the 10 MB limit."
            )

        parsed_data = parse_receipt_image(contents, content_type)
        return {
            "success": True,
            "filename": file.filename,
            "data": parsed_data
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process receipt: {str(e)}"
        )
