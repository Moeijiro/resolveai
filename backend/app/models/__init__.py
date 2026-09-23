"""ORM models.

    User ──< KnowledgeBase ──< Article
         │               ├──< Conversation
         │               └──1 WidgetConfig
         └──< APIKey
"""

from app.models.api_key import APIKey
from app.models.article import Article
from app.models.conversation import Channel, Conversation, ConversationStatus
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.models.widget_config import WidgetConfig

__all__ = [
    "APIKey",
    "Article",
    "Channel",
    "Conversation",
    "ConversationStatus",
    "KnowledgeBase",
    "User",
    "WidgetConfig",
]
