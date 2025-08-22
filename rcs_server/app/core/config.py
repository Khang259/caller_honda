from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SERVER_2_ENDPOINT: AnyHttpUrl = "http://192.168.1.36:1836/submit-data"
    FIRST_RESPONSE_DELAY: int = 5  # seconds
    SECOND_RESPONSE_DELAY: int = 5  # seconds
    ThIRD_RESPONSE_DELAY: int = 5  # seconds

settings = Settings()