"""Brand-fit filtering and classification engine for Technology & AI micro-influencers."""

import logging
from typing import Any, Dict, List, Optional, Tuple
from backend.app.schemas.campaign import FilterCriteria
from backend.app.schemas.influencer import CriterionResult, InfluencerClassificationSchema

logger = logging.getLogger("edxso.service.filter")

TECH_AI_KEYWORD_TAXONOMY = {
    "core_ai": [
        "artificial intelligence", "machine learning", "deep learning", "neural network",
        "generative ai", "genai", "llm", "large language model", "chatgpt", "gpt",
        "gemini", "claude", "langchain", "prompt engineering", "rag", "agents",
        "computer vision", "nlp", "transformers", "pytorch", "tensorflow", "scikit-learn"
    ],
    "software_eng": [
        "python", "coding", "software engineering", "programming", "developer", "fastapi",
        "django", "react", "typescript", "javascript", "full stack", "backend",
        "algorithms", "data structures", "system design", "docker", "kubernetes",
        "cloud computing", "aws", "gcp", "azure", "devops", "github", "api"
    ],
    "education": [
        "tutorial", "course", "learn to code", "tips", "project", "guide",
        "beginner", "roadmap", "tech career"
    ]
}


class FilterClassificationService:
    """Evaluates influencers across separate criteria: Niche, Followers, Engagement, and Contact."""

    def evaluate_influencer(
        self,
        creator: Dict[str, Any],
        criteria: Optional[FilterCriteria] = None
    ) -> InfluencerClassificationSchema:
        """Evaluates a single creator against brand-fit rules without altering source code.

        Classifies into: 'pass', 'fail', or 'needs_review'.
        """
        rules = criteria or FilterCriteria()

        # 1. Evaluate Niche Relevance (Technology & AI)
        niche_result = self._evaluate_niche_relevance(creator, rules)

        # 2. Evaluate Follower/Subscriber Count
        follower_result = self._evaluate_followers(creator, rules)

        # 3. Evaluate Engagement Proxy
        engagement_result = self._evaluate_engagement(creator, rules)

        # 4. Evaluate Contact Availability
        contact_result = self._evaluate_contact(creator, rules)

        # Compute overall decision:
        # - Fail if any mandatory criterion fails
        # - Needs Review if no failures, but at least one criterion needs review
        # - Pass if all pass
        has_failure = any(
            cr.status == "fail"
            for cr in [niche_result, follower_result, engagement_result, contact_result]
        )
        has_review = any(
            cr.status == "needs_review"
            for cr in [niche_result, follower_result, engagement_result, contact_result]
        )

        if has_failure:
            decision = "fail"
        elif has_review:
            decision = "needs_review"
        else:
            decision = "pass"

        # Fit score calculation (0 - 100)
        niche_score = niche_result.score or 0
        fit_score = self._compute_overall_fit_score(
            niche_score=niche_score,
            follower_status=follower_result.status,
            engagement_status=engagement_result.status,
            contact_status=contact_result.status
        )

        reasons = [
            f"Niche: {niche_result.reason}",
            f"Followers: {follower_result.reason}",
            f"Engagement: {engagement_result.reason}",
            f"Contact: {contact_result.reason}"
        ]

        return InfluencerClassificationSchema(
            decision=decision,
            is_qualified=(decision == "pass"),
            fit_score=fit_score,
            niche="Technology & Artificial Intelligence",
            reasons=reasons,
            niche_relevance=niche_result,
            follower_count=follower_result,
            engagement=engagement_result,
            contact_availability=contact_result
        )

    def _evaluate_niche_relevance(
        self,
        creator: Dict[str, Any],
        rules: FilterCriteria
    ) -> CriterionResult:
        """Evaluates content alignment with the Technology & Artificial Intelligence vertical."""
        title = creator.get("title", "").lower()
        desc = creator.get("description", "").lower()
        themes = " ".join(creator.get("enrichment", {}).get("content_themes", [])).lower()
        recent_vids = " ".join(creator.get("enrichment", {}).get("recent_video_titles", [])).lower()

        searchable_text = f"{title} {desc} {themes} {recent_vids}"

        matched_ai = [k for k in TECH_AI_KEYWORD_TAXONOMY["core_ai"] if k in searchable_text]
        matched_se = [k for k in TECH_AI_KEYWORD_TAXONOMY["software_eng"] if k in searchable_text]
        matched_edu = [k for k in TECH_AI_KEYWORD_TAXONOMY["education"] if k in searchable_text]

        total_matches = len(matched_ai) + len(matched_se) + len(matched_edu)
        score = min(100, (len(matched_ai) * 15) + (len(matched_se) * 10) + (len(matched_edu) * 5))

        if score >= 40 or len(matched_ai) >= 2 or (len(matched_ai) >= 1 and len(matched_se) >= 1):
            top_terms = (matched_ai + matched_se)[:4]
            return CriterionResult(
                status="pass",
                score=score,
                reason=f"Strong Tech/AI alignment (Score: {score}/100, Matches: {', '.join(top_terms)})"
            )
        elif score >= 15 or total_matches >= 1:
            return CriterionResult(
                status="needs_review",
                score=score,
                reason=f"Moderate Tech alignment (Score: {score}/100), manual topic review recommended."
            )
        else:
            return CriterionResult(
                status="fail",
                score=score,
                reason="Low relevance: Minimal Technology or Artificial Intelligence content detected."
            )

    def _evaluate_followers(
        self,
        creator: Dict[str, Any],
        rules: FilterCriteria
    ) -> CriterionResult:
        """Evaluates subscriber count against target micro-influencer boundaries."""
        metrics = creator.get("metrics", {})
        is_hidden = metrics.get("is_subscriber_count_hidden", False)
        sub_count = metrics.get("subscriber_count")

        if is_hidden:
            return CriterionResult(
                status="fail",
                reason="Subscriber count is hidden by the channel creator."
            )

        if sub_count is None:
            return CriterionResult(
                status="fail",
                reason="Subscriber count is missing or unavailable from source."
            )

        if sub_count < rules.min_subscribers:
            return CriterionResult(
                status="fail",
                reason=f"Subscriber count ({sub_count:,}) is below the {rules.min_subscribers:,} minimum."
            )

        if sub_count > rules.max_subscribers:
            return CriterionResult(
                status="fail",
                reason=f"Subscriber count ({sub_count:,}) exceeds the {rules.max_subscribers:,} micro-influencer ceiling."
            )

        return CriterionResult(
            status="pass",
            score=100,
            reason=f"Subscriber count ({sub_count:,}) is within target band [{rules.min_subscribers:,} - {rules.max_subscribers:,}]."
        )

    def _evaluate_engagement(
        self,
        creator: Dict[str, Any],
        rules: FilterCriteria
    ) -> CriterionResult:
        """Evaluates engagement rate proxy without unfairly rejecting records with missing optional metrics."""
        metrics = creator.get("metrics", {})
        eng_rate = metrics.get("estimated_engagement_rate")

        if eng_rate is None:
            # Do NOT reject a creator solely because an optional engagement metric is unavailable
            return CriterionResult(
                status="needs_review",
                reason="Recent engagement data unavailable from public statistics; flagged for review but not rejected."
            )

        if eng_rate >= rules.min_engagement_rate:
            return CriterionResult(
                status="pass",
                score=min(100, int(eng_rate * 20)),
                reason=f"Estimated engagement rate ({eng_rate}%) meets or exceeds the {rules.min_engagement_rate}% threshold."
            )
        else:
            return CriterionResult(
                status="needs_review",
                score=max(0, int(eng_rate * 15)),
                reason=f"Estimated engagement rate ({eng_rate}%) is below the {rules.min_engagement_rate}% target; flagged for review."
            )

    def _evaluate_contact(
        self,
        creator: Dict[str, Any],
        rules: FilterCriteria
    ) -> CriterionResult:
        """Evaluates public contact email presence and verification status."""
        enrichment = creator.get("enrichment", {})
        email = enrichment.get("contact_email", "Not Found")
        status_val = enrichment.get("email_verification_status", "unverified")

        if email != "Not Found" and "@" in email:
            return CriterionResult(
                status="pass",
                score=100,
                reason=f"Public contact email available: {email} (status: {status_val})."
            )

        if rules.require_contact_email:
            return CriterionResult(
                status="fail",
                reason="Contact email is missing ('Not Found') and marked mandatory by campaign settings."
            )

        return CriterionResult(
            status="needs_review",
            score=50,
            reason="Contact email 'Not Found'; alternative social outreach or manual inquiry required."
        )

    def _compute_overall_fit_score(
        self,
        niche_score: int,
        follower_status: str,
        engagement_status: str,
        contact_status: str
    ) -> int:
        """Calculates a weighted brand-fit score (0-100)."""
        base = niche_score * 0.50
        follower_points = 25 if follower_status == "pass" else 0
        engagement_points = 15 if engagement_status == "pass" else (8 if engagement_status == "needs_review" else 0)
        contact_points = 10 if contact_status == "pass" else 5

        total = int(base + follower_points + engagement_points + contact_points)
        return min(100, max(0, total))


filter_service = FilterClassificationService()
