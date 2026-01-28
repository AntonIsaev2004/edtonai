from backend.ai.base import AIProvider
from backend.ai.deepseek import DeepSeekProvider

from backend.core.config import settings

def get_ai_provider() -> AIProvider:
    """Factory to get the configured AI provider instance."""
    provider_name = settings.ai_provider.lower()
    
    if provider_name != "deepseek":
         raise ValueError(f"Only 'deepseek' provider is supported, got: {provider_name}")
    
    return DeepSeekProvider()
