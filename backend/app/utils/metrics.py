"""Utilities for transparent calculation of influencer engagement metrics."""

from typing import Optional, Tuple


def calculate_engagement_rate(
    avg_likes: Optional[float],
    avg_comments: Optional[float],
    avg_views: Optional[float]
) -> Tuple[Optional[float], str]:
    """Calculates estimated engagement rate percentage using the transparent formula.

    Formula:
        Engagement Rate = ((Average Likes + Average Comments) / Average Views) * 100

    Returns:
        (rate_percentage, formula_string)
        rate_percentage is None if average views are 0 or missing.
    """
    formula = "((avg_likes + avg_comments) / avg_views) * 100"

    if avg_views is None or avg_views <= 0:
        return None, formula

    likes = avg_likes or 0.0
    comments = avg_comments or 0.0
    rate = ((likes + comments) / avg_views) * 100.0

    # Round to 2 decimal places for clean reporting
    return round(rate, 2), formula
