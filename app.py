from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
import sys
import os
import asyncio
import subprocess
from src.textSummarizer.pipeline.predicition_pipeline import PredictionPipeline

# Initialize FastAPI app
app = FastAPI(
    title="NLP Text Summarizer",
    description="AI-powered text summarization using Transformer models",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize Jinja2 templates
templates = Jinja2Templates(directory="templates")

# Pydantic models for request/response
class TextInput(BaseModel):
    text: str

class SummaryResponse(BaseModel):
    summary: str
    status: str = "success"

# Serve the main UI
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Training endpoint
@app.get("/train")
async def training():
    try:
        # Run training in background to avoid timeout
        process = subprocess.Popen(
            ["python", "main.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for process completion with timeout
        try:
            stdout, stderr = process.communicate(timeout=1800)  # 30 minutes timeout
            
            if process.returncode == 0:
                return JSONResponse({
                    "status": "success",
                    "message": "Training completed successfully!",
                    "details": "Model has been trained and saved to artifacts directory."
                })
            else:
                return JSONResponse(
                    status_code=400,
                    content={
                        "status": "error",
                        "message": "Training failed",
                        "details": stderr or "Unknown error occurred during training"
                    }
                )
        except subprocess.TimeoutExpired:
            process.kill()
            return JSONResponse(
                status_code=408,
                content={
                    "status": "error",
                    "message": "Training timed out",
                    "details": "Training took too long and was terminated"
                }
            )
            
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Training failed",
                "details": str(e)
            }
        )

# Prediction endpoint
@app.post("/predict", response_model=SummaryResponse)
async def predict_route(input_data: TextInput):
    try:
        if not input_data.text or not input_data.text.strip():
            raise HTTPException(
                status_code=400, 
                detail="Text input is required and cannot be empty"
            )
        
        # Validate text length
        if len(input_data.text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Text should be at least 50 characters long for better summarization"
            )
        
        # Initialize prediction pipeline
        obj = PredictionPipeline()
        summary = obj.predict(input_data.text.strip())
        
        return SummaryResponse(summary=summary, status="success")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating summary: {str(e)}"
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "NLP Text Summarizer is running"}

# API info endpoint
@app.get("/api/info")
async def api_info():
    return {
        "name": "NLP Text Summarizer API",
        "version": "1.0.0",
        "description": "AI-powered text summarization using T5 Transformer model",
        "endpoints": {
            "/": "Main UI interface",
            "/train": "Train the model",
            "/predict": "Generate text summary",
            "/health": "Health check",
            "/docs": "API documentation"
        }
    }
    

if __name__=="__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
