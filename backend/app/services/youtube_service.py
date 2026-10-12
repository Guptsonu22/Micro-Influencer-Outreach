"""Official YouTube Data API v3 discovery service with batching, quota tracking, and metric sampling."""

import asyncio
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
import httpx
from backend.app.core.config import settings
from backend.app.core.exceptions import QuotaExceededError
from backend.app.utils.email_extractor import extract_public_email_from_text
from backend.app.utils.metrics import calculate_engagement_rate

logger = logging.getLogger("edxso.service.youtube")

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


class YouTubeDiscoveryService:
    """Manages YouTube Data API v3 interactions, quota budgets, batching, and profile hydration."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.YOUTUBE_API_KEY
        self.timeout = httpx.Timeout(connect=10.0, read=25.0, write=10.0, pool=30.0)

    async def execute_discovery_run(
        self,
        queries: List[str],
        target_count: int = 50,
        max_quota_budget: int = 2500,
        min_subscribers: int = 5000,
        max_subscribers: int = 100000,
        region_code: str = "US",
        use_demo_mode: bool = False
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Executes full discovery pipeline across multiple queries.

        Returns:
            Tuple of (discovered_creator_records, discovery_summary_dict)
        """
        # If demo mode explicitly requested, generate clearly-segregated synthetic records
        if use_demo_mode:
            logger.info("Executing discovery in DEMO MODE with synthetic records.")
            creators = self.generate_synthetic_demo_records(count=target_count)
            summary = {
                "total_search_results": target_count * 2,
                "unique_channels_found": len(creators),
                "qualifying_channels": len([c for c in creators if c["classification"]["is_qualified"]]),
                "rejected_channels": len([c for c in creators if not c["classification"]["is_qualified"]]),
                "quota_units_used": 0,
                "api_requests_count": 0,
                "rejection_breakdown": {
                    "too_few_subscribers": 5,
                    "too_many_subscribers": 5,
                    "hidden_subscribers": 0,
                    "insufficient_activity": 0
                },
                "api_errors": [],
                "continuation_instructions": "Demo mode completed. Run without use_demo_mode to perform real YouTube API search."
            }
            return creators, summary

        if not self.api_key:
            raise ValueError(
                "YouTube API key is missing. Configure YOUTUBE_API_KEY in your .env file or enable use_demo_mode."
            )

        summary: Dict[str, Any] = {
            "total_search_results": 0,
            "unique_channels_found": 0,
            "qualifying_channels": 0,
            "rejected_channels": 0,
            "quota_units_used": 0,
            "api_requests_count": 0,
            "rejection_breakdown": {
                "too_few_subscribers": 0,
                "too_many_subscribers": 0,
                "hidden_subscribers": 0,
                "insufficient_activity": 0
            },
            "api_errors": [],
            "continuation_instructions": None
        }

        discovered_channel_ids: Set[str] = set()
        channel_candidates: List[str] = []
        all_processed_creators: List[Dict[str, Any]] = []

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            # Step 1: Collect channel IDs across the search queries
            for query in queries:
                if len(discovered_channel_ids) >= target_count * 3:
                    break
                if summary["quota_units_used"] + 100 > max_quota_budget:
                    summary["continuation_instructions"] = (
                        f"Quota budget ({max_quota_budget} units) reached during search. "
                        f"Increase max_quota_budget to continue discovering more channels."
                    )
                    break

                page_token: Optional[str] = None
                # Search up to 2 pages per query to balance diversity and quota
                for _ in range(2):
                    if summary["quota_units_used"] + 100 > max_quota_budget:
                        break

                    search_result, quota_cost, error = await self._search_youtube(
                        client=client,
                        query=query,
                        region_code=region_code,
                        page_token=page_token
                    )
                    summary["quota_units_used"] += quota_cost
                    summary["api_requests_count"] += 1

                    if error:
                        summary["api_errors"].append(f"Query '{query}': {error}")
                        if "quota" in error.lower() or "403" in error:
                            summary["continuation_instructions"] = (
                                "YouTube Data API daily quota exceeded. Discovery paused with partial results."
                            )
                            return all_processed_creators, summary
                        break

                    items = search_result.get("items", [])
                    summary["total_search_results"] += len(items)

                    for item in items:
                        channel_id = item.get("snippet", {}).get("channelId")
                        if channel_id and channel_id not in discovered_channel_ids:
                            discovered_channel_ids.add(channel_id)
                            channel_candidates.append(channel_id)

                    page_token = search_result.get("nextPageToken")
                    if not page_token:
                        break

            summary["unique_channels_found"] = len(channel_candidates)

            # Step 2: Hydrate channels in batches of up to 50 (channels.list costs 1 quota unit per 50 channels!)
            batch_size = 50
            for i in range(0, len(channel_candidates), batch_size):
                if summary["quota_units_used"] + 1 > max_quota_budget:
                    summary["continuation_instructions"] = "Quota budget reached during channel details hydration."
                    break

                batch_ids = channel_candidates[i: i + batch_size]
                channels_data, quota_cost, error = await self._fetch_channels_batch(client, batch_ids)
                summary["quota_units_used"] += quota_cost
                summary["api_requests_count"] += 1

                if error:
                    summary["api_errors"].append(f"Channel batch fetch error: {error}")
                    continue

                for ch in channels_data.get("items", []):
                    ch_id = ch.get("id")
                    snippet = ch.get("snippet", {})
                    statistics = ch.get("statistics", {})
                    content_details = ch.get("contentDetails", {})

                    # Extract public stats
                    hidden_subs = statistics.get("hiddenSubscriberCount", False)
                    sub_count_raw = statistics.get("subscriberCount")
                    sub_count = int(sub_count_raw) if (sub_count_raw is not None and not hidden_subs) else None

                    video_count_raw = statistics.get("videoCount")
                    video_count = int(video_count_raw) if video_count_raw is not None else None

                    view_count_raw = statistics.get("viewCount")
                    view_count = int(view_count_raw) if view_count_raw is not None else None

                    # Extract public contacts via compliant bio text regex
                    desc_text = snippet.get("description", "")
                    contact_email = extract_public_email_from_text(desc_text)

                    # Step 3: Check micro-influencer qualification thresholds
                    is_qualified = False
                    reasons = []
                    fit_score = 50

                    if hidden_subs:
                        summary["rejected_channels"] += 1
                        summary["rejection_breakdown"]["hidden_subscribers"] += 1
                        reasons.append("Rejected: Subscriber count is hidden by channel.")
                    elif sub_count is None:
                        summary["rejected_channels"] += 1
                        summary["rejection_breakdown"]["hidden_subscribers"] += 1
                        reasons.append("Rejected: Subscriber count is unavailable.")
                    elif sub_count < min_subscribers:
                        summary["rejected_channels"] += 1
                        summary["rejection_breakdown"]["too_few_subscribers"] += 1
                        reasons.append(f"Rejected: Subscriber count ({sub_count:,}) is below {min_subscribers:,} threshold.")
                    elif sub_count > max_subscribers:
                        summary["rejected_channels"] += 1
                        summary["rejection_breakdown"]["too_many_subscribers"] += 1
                        reasons.append(f"Rejected: Subscriber count ({sub_count:,}) exceeds {max_subscribers:,} micro-influencer threshold.")
                    else:
                        is_qualified = True
                        summary["qualifying_channels"] += 1
                        reasons.append(f"Qualified: Subscriber count ({sub_count:,}) within micro-influencer target band [{min_subscribers:,} - {max_subscribers:,}].")

                    # Step 4: Sample recent upload metrics if qualified and quota budget permits
                    uploads_playlist_id = content_details.get("relatedPlaylists", {}).get("uploads")
                    metrics_sample = {
                        "sample_size": 0,
                        "avg_views": None,
                        "avg_likes": None,
                        "avg_comments": None,
                        "engagement_rate": None,
                        "video_titles": []
                    }

                    if is_qualified and uploads_playlist_id and (summary["quota_units_used"] + 2 <= max_quota_budget):
                        sampled_metrics, sample_quota, sample_error = await self._sample_recent_videos(
                            client=client,
                            playlist_id=uploads_playlist_id,
                            max_videos=10
                        )
                        summary["quota_units_used"] += sample_quota
                        summary["api_requests_count"] += (1 if sample_quota > 0 else 0)
                        if sampled_metrics:
                            metrics_sample = sampled_metrics
                            if metrics_sample.get("engagement_rate"):
                                reasons.append(f"Sampled estimated engagement rate: {metrics_sample['engagement_rate']}%.")
                                fit_score = min(100, 60 + int(metrics_sample['engagement_rate'] * 5))

                    now = datetime.utcnow()
                    creator_record = {
                        "channel_id": ch_id,
                        "title": snippet.get("title", "Unknown Creator"),
                        "custom_url": snippet.get("customUrl", "Unavailable"),
                        "channel_url": f"https://www.youtube.com/channel/{ch_id}",
                        "source_url": f"https://www.youtube.com/channel/{ch_id}",
                        "source_name": "YouTube Data API v3",
                        "description": desc_text,
                        "published_at": snippet.get("publishedAt", "Unknown"),
                        "country": snippet.get("country", "Unknown"),
                        "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url")
                            or snippet.get("thumbnails", {}).get("default", {}).get("url"),
                        "metrics": {
                            "subscriber_count": sub_count,
                            "is_subscriber_count_hidden": hidden_subs,
                            "video_count": video_count,
                            "view_count": view_count,
                            "recent_video_sample_size": metrics_sample["sample_size"],
                            "avg_recent_views": metrics_sample["avg_views"],
                            "avg_recent_likes": metrics_sample["avg_likes"],
                            "avg_recent_comments": metrics_sample["avg_comments"],
                            "estimated_engagement_rate": metrics_sample["engagement_rate"],
                            "engagement_formula_used": "((avg_likes + avg_comments) / avg_views) * 100",
                            "metric_timestamp": now
                        },
                        "enrichment": {
                            "contact_email": contact_email,
                            "email_source": "channel_description_or_links",
                            "social_links": {},
                            "content_themes": ["Technology", "Artificial Intelligence", "Coding"],
                            "recent_video_titles": metrics_sample["video_titles"],
                            "audience_demographics": "Unavailable",
                            "enriched_at": now
                        },
                        "classification": {
                            "is_qualified": is_qualified,
                            "fit_score": fit_score if is_qualified else 0,
                            "niche": "Technology & Artificial Intelligence",
                            "reasons": reasons,
                            "evaluated_at": now
                        },
                        "outreach": {
                            "email_subject": None,
                            "email_body": None,
                            "instagram_dm": None,
                            "generated_at": None,
                            "status": "draft",
                            "is_simulation": True,
                            "error_message": None
                        },
                        "is_synthetic": False,
                        "source_api": "YouTube Data API v3",
                        "retrieved_at": now,
                        "collected_at": now,
                        "updated_at": now
                    }

                    all_processed_creators.append(creator_record)

                    # Stop if we hit the requested target count of qualifying micro-influencers
                    if summary["qualifying_channels"] >= target_count:
                        break

                if summary["qualifying_channels"] >= target_count:
                    break

        if summary["qualifying_channels"] < target_count and not summary["continuation_instructions"]:
            summary["continuation_instructions"] = (
                f"Discovered {summary['qualifying_channels']} qualifying micro-influencers out of {target_count} target. "
                f"To expand results, add additional keyword queries or increase the search page limit."
            )

        return all_processed_creators, summary

    # -------------------------------------------------------------
    # Internal API Helpers with Cost Tracking
    # -------------------------------------------------------------

    async def _search_youtube(
        self,
        client: httpx.AsyncClient,
        query: str,
        region_code: str = "US",
        page_token: Optional[str] = None
    ) -> Tuple[Dict[str, Any], int, Optional[str]]:
        """Calls search.list endpoint. Consumes 100 quota units."""
        params = {
            "key": self.api_key,
            "part": "snippet",
            "q": query,
            "type": "video",  # Video search finds active creators publishing tutorials
            "maxResults": 50,
            "regionCode": region_code
        }
        if page_token:
            params["pageToken"] = page_token

        try:
            res = await client.get(f"{YOUTUBE_API_BASE}/search", params=params)
            if res.status_code == 200:
                return res.json(), 100, None
            elif res.status_code == 403:
                err_body = res.json().get("error", {}).get("message", "Quota Exceeded")
                return {}, 0, f"YouTube Quota Exceeded (403): {err_body}"
            else:
                return {}, 100, f"HTTP {res.status_code}: {res.text}"
        except Exception as exc:
            return {}, 0, f"Connection error: {str(exc)}"

    async def _fetch_channels_batch(
        self,
        client: httpx.AsyncClient,
        channel_ids: List[str]
    ) -> Tuple[Dict[str, Any], int, Optional[str]]:
        """Calls channels.list in a single batch of up to 50 IDs. Consumes 1 quota unit."""
        if not channel_ids:
            return {}, 0, None

        params = {
            "key": self.api_key,
            "part": "snippet,statistics,contentDetails",
            "id": ",".join(channel_ids),
            "maxResults": len(channel_ids)
        }

        try:
            res = await client.get(f"{YOUTUBE_API_BASE}/channels", params=params)
            if res.status_code == 200:
                return res.json(), 1, None
            else:
                return {}, 1, f"HTTP {res.status_code}: {res.text}"
        except Exception as exc:
            return {}, 0, f"Connection error: {str(exc)}"

    async def _sample_recent_videos(
        self,
        client: httpx.AsyncClient,
        playlist_id: str,
        max_videos: int = 10
    ) -> Tuple[Optional[Dict[str, Any]], int, Optional[str]]:
        """Samples recent videos from channel upload playlist and calculates engagement rate.

        Consumes 1 unit for playlistItems + 1 unit for videos.list = 2 quota units.
        """
        quota_used = 0
        try:
            # 1. Get recent video IDs from uploads playlist (1 unit)
            res_pl = await client.get(
                f"{YOUTUBE_API_BASE}/playlistItems",
                params={
                    "key": self.api_key,
                    "part": "snippet,contentDetails",
                    "playlistId": playlist_id,
                    "maxResults": max_videos
                }
            )
            quota_used += 1
            if res_pl.status_code != 200:
                return None, quota_used, f"PlaylistItems HTTP {res_pl.status_code}"

            pl_data = res_pl.json()
            items = pl_data.get("items", [])
            if not items:
                return None, quota_used, None

            video_ids = [item.get("contentDetails", {}).get("videoId") for item in items if item.get("contentDetails", {}).get("videoId")]
            video_titles = [item.get("snippet", {}).get("title", "") for item in items[:5]]

            if not video_ids:
                return None, quota_used, None

            # 2. Get video statistics (1 unit)
            res_vid = await client.get(
                f"{YOUTUBE_API_BASE}/videos",
                params={
                    "key": self.api_key,
                    "part": "statistics",
                    "id": ",".join(video_ids)
                }
            )
            quota_used += 1
            if res_vid.status_code != 200:
                return None, quota_used, f"Videos HTTP {res_vid.status_code}"

            vid_items = res_vid.json().get("items", [])
            if not vid_items:
                return None, quota_used, None

            total_views = 0
            total_likes = 0
            total_comments = 0
            count = len(vid_items)

            for v in vid_items:
                stats = v.get("statistics", {})
                total_views += int(stats.get("viewCount", 0))
                total_likes += int(stats.get("likeCount", 0))
                total_comments += int(stats.get("commentCount", 0))

            avg_views = total_views / count if count > 0 else 0.0
            avg_likes = total_likes / count if count > 0 else 0.0
            avg_comments = total_comments / count if count > 0 else 0.0

            eng_rate, _ = calculate_engagement_rate(avg_likes, avg_comments, avg_views)

            return {
                "sample_size": count,
                "avg_views": round(avg_views, 1),
                "avg_likes": round(avg_likes, 1),
                "avg_comments": round(avg_comments, 1),
                "engagement_rate": eng_rate,
                "video_titles": video_titles
            }, quota_used, None

        except Exception as exc:
            return None, quota_used, str(exc)

    # -------------------------------------------------------------
    # Explicit Synthetic Demo Generator (Offline Demonstration)
    # -------------------------------------------------------------

    def generate_synthetic_demo_records(self, count: int = 50) -> List[Dict[str, Any]]:
        """Generates synthetic records strictly labeled with is_synthetic=True for offline demonstration.

        Never mixed with real YouTube records.
        """
        demo_channels = [
            ("DevBytes AI", "devbytes_ai", 24500, 3.8, ["Python", "FastAPI", "OpenAI"], "contact@devbytes.ai"),
            ("Code With Sarah", "codewithsarah", 45000, 4.2, ["Machine Learning", "PyTorch"], "sarah.collab@gmail.com"),
            ("ML Foundations", "mlfoundations", 12800, 2.9, ["Data Science", "Scikit-Learn"], "Not Found"),
            ("Generative Devs", "gen_devs", 68000, 5.1, ["LangChain", "LLMs", "RAG"], "partners@gendevs.io"),
            ("Python Craft", "pythoncraft", 18200, 3.4, ["Python 3.12", "Django"], "Not Found"),
            ("Neural Nuggets", "neuralnuggets", 89000, 2.5, ["Deep Learning", "TensorFlow"], "collab@neuralnuggets.com"),
            ("Full Stack Flow", "fullstackflow", 32000, 4.6, ["React", "TypeScript", "Node.js"], "Not Found"),
            ("AI Systems Eng", "aisystemseng", 54000, 3.9, ["MLOps", "Docker", "Kubernetes"], "info@aisystemseng.com"),
            ("Algo Academy", "algoacademy", 78000, 2.1, ["Algorithms", "LeetCode"], "Not Found"),
            ("Prompt Engineering 101", "prompteng101", 15500, 6.2, ["Gemini", "Claude", "ChatGPT"], "hello@prompteng.dev"),
        ]

        now = datetime.utcnow()
        records: List[Dict[str, Any]] = []

        for idx in range(count):
            base_name, handle, base_subs, base_eng, themes, email = demo_channels[idx % len(demo_channels)]
            variation = (idx // len(demo_channels)) + 1
            channel_name = f"{base_name} {variation}" if variation > 1 else base_name
            channel_handle = f"@{handle}_{variation}" if variation > 1 else f"@{handle}"
            subs = min(98000, base_subs + (idx * 1150))
            is_qualified = 5000 <= subs <= 100000

            records.append({
                "channel_id": f"UC_SYNTHETIC_{idx + 1:04d}",
                "title": channel_name,
                "custom_url": channel_handle,
                "channel_url": f"https://www.youtube.com/channel/UC_SYNTHETIC_{idx + 1:04d}",
                "source_url": f"https://www.youtube.com/channel/UC_SYNTHETIC_{idx + 1:04d}",
                "source_name": "Synthetic Demo Generator",
                "description": f"Tutorials on {', '.join(themes)}. Building modern software and AI pipelines.",
                "published_at": "2023-01-15T12:00:00Z",
                "country": "US",
                "thumbnail_url": f"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&fit=crop",
                "metrics": {
                    "subscriber_count": subs,
                    "is_subscriber_count_hidden": False,
                    "video_count": 45 + idx,
                    "view_count": subs * 35,
                    "recent_video_sample_size": 10,
                    "avg_recent_views": float(subs // 5),
                    "avg_recent_likes": float(subs // 120),
                    "avg_recent_comments": float(subs // 600),
                    "estimated_engagement_rate": base_eng,
                    "engagement_formula_used": "((avg_likes + avg_comments) / avg_views) * 100",
                    "metric_timestamp": now
                },
                "enrichment": {
                    "contact_email": email if email != "Not Found" else "Not Found",
                    "email_source": "channel_description_or_links" if email != "Not Found" else "Not Found",
                    "social_links": {
                        "instagram": f"https://instagram.com/{handle}",
                        "twitter": f"https://x.com/{handle}"
                    },
                    "content_themes": themes,
                    "recent_video_titles": [
                        f"Building Full-Stack AI with {themes[0]}",
                        f"Complete 2026 Guide to {themes[-1]}"
                    ],
                    "audience_demographics": "Unavailable",
                    "enriched_at": now
                },
                "classification": {
                    "is_qualified": is_qualified,
                    "fit_score": 85 if is_qualified else 0,
                    "niche": "Technology & Artificial Intelligence",
                    "reasons": [
                        f"Synthetic demo record: subscriber count ({subs:,}) in micro band.",
                        f"Synthetic estimated engagement rate: {base_eng}%."
                    ],
                    "evaluated_at": now
                },
                "outreach": {
                    "email_subject": None,
                    "email_body": None,
                    "instagram_dm": None,
                    "generated_at": None,
                    "status": "draft",
                    "is_simulation": True,
                    "error_message": None
                },
                "is_synthetic": True,  # STRICT PROVENANCE: DEMO DATA
                "source_api": "Synthetic Demo Generator",
                "retrieved_at": now,
                "collected_at": now,
                "updated_at": now
            })

        return records


youtube_service = YouTubeDiscoveryService()
