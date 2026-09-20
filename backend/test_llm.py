import json
import asyncio
from google import genai
import os
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

prompt = """
        You are an AI infrastructure project monitoring assistant for the Government of India.
        Analyze the following What-If simulation parameters for a Highways project:
        - Original Cost: ₹3500Cr
        - Revised Cost: ₹4500Cr
        - Expenditure Disbursed: ₹2000Cr (44.4%)
        - Physical Progress: 42%
        - Timeline Slippage: 18 Months
        
        Model Risk Predictions:
        - Cost Overrun Probability: 71.7%
        - Delay Probability: 99.0%
        
        Provide three things in a strictly formatted JSON output:
        {
            "top_inferred_factor": "A single sentence (max 20 words) explaining the primary driver of the risk.",
            "recommended_action": "A highly prescriptive, authoritative action step (max 30 words) for a government officer.",
            "ai_overview": "A short 2 sentence overview of the simulated scenario."
        }
        
        Respond ONLY with raw valid JSON. Do not include markdown blocks like ```json.
        """
response = gemini_client.models.generate_content(
    model='gemini-2.5-flash',
    contents=prompt,
)
print("Raw Response:", response.text)
text = response.text.replace('```json', '').replace('```', '').strip()
data = json.loads(text)
print("Parsed JSON:", data)
