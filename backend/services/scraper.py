
import logging
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class WebScraper:
    """Service to scrape and clean text from URLs."""

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
    }

    @classmethod
    async def fetch_text(cls, url: str) -> str:
        """Fetch URL and return cleaned text content."""
        if not url.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")

        async with httpx.AsyncClient(follow_redirects=True, timeout=12.0) as client:
            try:
                response = await client.get(url, headers=cls.HEADERS)
                response.raise_for_status()
                html = response.text
                return cls._clean_html(html)
            except (httpx.HTTPError, Exception) as e:
                logger.error(f"Failed to fetch vacancy URL {url}: {e}")
                # HH.ru and others might block bots. We should propagate this as a user-friendly error.
                raise ValueError(f"Failed to fetch URL (site may block bots): {str(e)}")

    @classmethod
    def _clean_html(cls, html: str) -> str:
        """Use BeautifulSoup to extract readable text, removing boilerplate."""
        soup = BeautifulSoup(html, "lxml")

        # Remove irrelevant tags
        for tag in soup(["script", "style", "nav", "footer", "header", "iframe", "svg", "noscript"]):
            tag.decompose()

        # Specific cleanup for common job sites keywords in classes/ids
        # (Very basic heuristic to reduce noise)
        for tag in soup.find_all(True):
            attrs = str(tag.attrs).lower()
            if any(x in attrs for x in ["cookie", "banner", "popup", "sidebar", "ad-", "related-"]):
                tag.decompose()

        text = soup.get_text(separator="\n")

        # Normalize whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = "\n".join(chunk for chunk in chunks if chunk)
        
        # Limit length to avoid blowing up LLM context
        return text[:30000]
