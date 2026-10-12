"""Mock LLM provider strictly for tests and explicitly labeled demo execution."""

import json
from typing import Optional
from backend.app.services.llm.base import BaseLLMProvider


class MockLLMProvider(BaseLLMProvider):
    """Generates synthetic personalization drafts for automated testing and demo environments."""

    provider_name: str = "mock"
    model_name: str = "mock-personalizer-v1"
    is_mock: bool = True

    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2
    ) -> str:
        """Returns compliant structured JSON conforming to exact word-count constraints."""
        # Carefully crafted response:
        # Email: 75 words (within 60-90 words requirement)
        # DM: 22 words (within 15-30 words requirement)
        sample_response = {
            "email_subject": "EDXSO Collaboration: Next-Gen Developer & AI Tooling",
            "email_body": (
                "Hi there! I have been following your insightful content and tutorials on modern software engineering "
                "and AI development. At EDXSO, we are launching an interactive developer platform designed to accelerate "
                "coding workflows and AI workflows. We would love to sponsor a dedicated walkthrough on your channel, "
                "providing full premium platform access for your community alongside a competitive creator sponsorship fee. "
                "Let us know if you would be open to exploring this collaboration."
            ),
            "instagram_dm": (
                "Hey! Loved your recent AI engineering content. Would you be open to collaborating with EDXSO on our upcoming developer platform?"
            ),
            "personalization_evidence": {
                "creator_name_used": "Creator",
                "recent_video_referenced": None,
                "content_themes_used": ["AI Development", "Software Engineering"],
                "niche_used": "Technology & Artificial Intelligence"
            },
            "warnings": [
                "Mock generation: produced by local deterministic provider for testing/demo."
            ]
        }
        return json.dumps(sample_response)
