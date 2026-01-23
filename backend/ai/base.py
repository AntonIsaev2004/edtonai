from abc import ABC, abstractmethod
from typing import Any, Optional


class AIProvider(ABC):
    """Abstract AI provider capable of returning JSON responses."""

    @abstractmethod
    async def generate_json(self, prompt: str, prompt_name: Optional[str] = None) -> dict[str, Any]:
        """Generate a JSON dictionary for the given prompt."""
        raise NotImplementedError
