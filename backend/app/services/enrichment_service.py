"""Profile enrichment service extracting content themes and validating public contact channels."""

import re
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from backend.app.utils.email_extractor import extract_public_email_from_text, EMAIL_PATTERN

logger = logging.getLogger("edxso.service.enrichment")

TECH_THEME_TAXONOMY = {
    "Artificial Intelligence": ["ai", "artificial intelligence", "deep learning", "neural network"],
    "Generative AI & LLMs": ["llm", "generative ai", "chatgpt", "gpt-4", "claude", "gemini", "prompt engineering", "rag", "agents", "langchain"],
    "Machine Learning": ["machine learning", "ml", "scikit-learn", "data science", "pytorch", "tensorflow"],
    "Python Engineering": ["python", "fastapi", "django", "flask", "pandas", "numpy"],
    "Web Development": ["react", "typescript", "javascript", "full stack", "frontend", "backend", "nextjs", "node.js"],
    "DevOps & Cloud": ["docker", "kubernetes", "cloud", "aws", "gcp", "azure", "ci/cd", "linux"],
    "Coding Education": ["tutorial", "beginner", "learn to code", "coding", "software engineering", "programming", "course"]
}


class ProfileEnrichmentService:
    """Enriches influencer profiles with permitted public content themes and validated business contacts."""

    def enrich_profile(
        self,
        creator: Dict[str, Any],
        manual_email: Optional[str] = None,
        manual_email_source_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Enriches creator record with content themes and validated public contact email."""
        now = datetime.utcnow()
        current_enrichment = creator.get("enrichment", {})

        # 1. Content Themes Extraction from real title, description, and recent video uploads
        themes = self._extract_content_themes(creator)

        # 2. Public Contact Email Processing
        contact_email = current_enrichment.get("contact_email", "Not Found")
        verification_status = current_enrichment.get("email_verification_status", "none")
        source_url = current_enrichment.get("email_source_url")
        source_type = current_enrichment.get("email_source", "channel_description_or_links")

        if manual_email:
            # Handle manually reviewed contact email provided by operator
            clean_email = manual_email.strip().lower()
            if self.is_valid_email_syntax(clean_email):
                contact_email = clean_email
                verification_status = "manual_review"
                source_url = manual_email_source_url or creator.get("channel_url")
                source_type = "manual_business_contact_page"
            else:
                logger.warning("Attempted to set invalid email: %s. Keeping previous value.", manual_email)
        elif contact_email == "Not Found" or not contact_email:
            # Re-scan public description
            desc_text = creator.get("description", "")
            found_email = extract_public_email_from_text(desc_text)
            if found_email != "Not Found" and self.is_valid_email_syntax(found_email):
                contact_email = found_email
                verification_status = "unverified"
                source_url = creator.get("channel_url")
                source_type = "channel_description"
            else:
                contact_email = "Not Found"
                verification_status = "none"

        # Update enrichment payload preserving strict provenance and unavailability rules
        updated_enrichment = {
            "contact_email": contact_email,
            "email_source": source_type,
            "email_verification_status": verification_status,
            "email_source_url": source_url,
            "social_links": current_enrichment.get("social_links", {}),
            "content_themes": themes,
            "recent_video_titles": current_enrichment.get("recent_video_titles", []),
            "audience_demographics": "Unavailable",  # Explicit unavailability rule
            "enriched_at": now,
            "enrichment_source": "YouTube Public Snippet & Video Uploads Analysis",
            "last_verified_at": now if verification_status in ["verified", "manual_review"] else None
        }

        creator["enrichment"] = updated_enrichment
        creator["updated_at"] = now
        return creator

    def _extract_content_themes(self, creator: Dict[str, Any]) -> List[str]:
        """Extracts content categories based on real title, description, and recent video titles."""
        text_corpus = (
            f"{creator.get('title', '')} "
            f"{creator.get('description', '')} "
            f"{' '.join(creator.get('enrichment', {}).get('recent_video_titles', []))}"
        ).lower()

        detected_themes: List[str] = []
        for theme_label, keywords in TECH_THEME_TAXONOMY.items():
            if any(re.search(rf"\b{re.escape(kw)}\b", text_corpus) for kw in keywords):
                detected_themes.append(theme_label)

        # Default fallback theme if text is sparse
        if not detected_themes:
            detected_themes = ["Technology & Software Development"]

        return detected_themes

    @staticmethod
    def is_valid_email_syntax(email: Optional[str]) -> bool:
        """Validates standard email syntax preventing malformed or guessed strings."""
        if not email or email == "Not Found":
            return False
        return bool(EMAIL_PATTERN.match(email.strip()))


enrichment_service = ProfileEnrichmentService()
