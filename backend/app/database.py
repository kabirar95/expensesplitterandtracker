# ============================================================
# DATABASE — MongoDB connection using Beanie ODM
# ============================================================
# Beanie is an ODM (Object Document Mapper) for MongoDB.
# It lets you define Python classes that map to MongoDB collections,
# similar to how Django ORM or SQLAlchemy work for SQL databases.
# ============================================================

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config import settings
from app.models.user import User


async def init_db():
    """
    Initialize the database connection.
    
    Called once when the FastAPI app starts up.
    
    Motor = async MongoDB driver (lets us use await with DB operations)
    Beanie = ODM layer on top of Motor (lets us use Python classes for documents)
    """
    # Create the MongoDB client (connects to the database server)
    client = AsyncIOMotorClient(settings.mongodb_url)

    # Initialize Beanie with our document models
    # This tells Beanie which Python classes map to which MongoDB collections
    await init_beanie(
        database=client[settings.database_name],
        document_models=[
            User,
            # We'll add more models here as we build them:
            # Group, Expense, PersonalExpense, Budget, Settlement, AIConversation
        ],
    )
