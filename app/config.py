from dotenv import load_dotenv
import os

load_dotenv("settings.env")
SECRET_KEY = os.environ["JWT_SECRET_KEY"]
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
