from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://ironden:ironden_pass@localhost:5432/ironden"
    KEYCLOAK_URL: str = "http://localhost:8080"
    OLLAMA_URL: str = "http://192.168.1.14:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"
    KEYCLOAK_REALM: str = "ironden"
    KEYCLOAK_CLIENT_ID: str = "ironden-app"
    CORS_ORIGINS: str = "http://localhost:3000"
    SHOW_MOCK_DATA: bool = False

    @property
    def keycloak_certs_url(self) -> str:
        return (
            f"{self.KEYCLOAK_URL}/realms/{self.KEYCLOAK_REALM}"
            "/protocol/openid-connect/certs"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
