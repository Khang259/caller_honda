from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SERVER_2_ENDPOINT: AnyHttpUrl = "http://192.168.0.142:7000/ics/taskOrder/addTask"
    FIRST_RESPONSE_DELAY: int = 5  # seconds
    SECOND_RESPONSE_DELAY: int = 5  # seconds
    ThIRD_RESPONSE_DELAY: int = 5  # seconds

settings = Settings()