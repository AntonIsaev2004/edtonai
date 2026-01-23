"""Utility functions for text normalization and hashing."""

import hashlib
import re


def normalize_text(text: str) -> str:
    """Normalize text for consistent hashing.

    - Trim whitespace
    - Unify spaces (collapse multiple spaces/tabs to single space)
    - Remove repeated empty lines
    """
    # Trim
    text = text.strip()

    # Replace tabs with spaces
    text = text.replace("\t", " ")

    # Collapse multiple spaces to single
    text = re.sub(r" +", " ", text)

    # Collapse multiple newlines to single
    text = re.sub(r"\n\s*\n+", "\n\n", text)

    # Trim each line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    return text


def compute_hash(text: str) -> str:
    """Compute SHA256 hash of normalized text."""
    normalized = normalize_text(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
