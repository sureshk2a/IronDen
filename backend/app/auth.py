"""Keycloak JWT verification dependency."""
import logging
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Simple in-process cache for JWKS (refreshed on failure)
_jwks_cache: Optional[dict] = None


async def _fetch_jwks() -> dict:
    global _jwks_cache
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(settings.keycloak_certs_url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        return _jwks_cache


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        return await _fetch_jwks()
    return _jwks_cache


async def verify_token(token: str) -> dict:
    """Verify a Keycloak-issued JWT and return its claims."""
    try:
        jwks = await _get_jwks()
        # Decode header to pick the right key
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key.get("kid") == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"],
                }
                break

        if not rsa_key:
            # Key not found — refresh JWKS and retry once
            jwks = await _fetch_jwks()
            for key in jwks.get("keys", []):
                if key.get("kid") == unverified_header.get("kid"):
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"],
                    }
                    break

        if not rsa_key:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Public key not found")

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience="account",
            options={"verify_aud": False},  # Keycloak public clients may not set aud
        )
        return payload

    except JWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency: verify token, auto-provision user row, return User."""
    payload = await verify_token(credentials.credentials)

    keycloak_id: str = payload.get("sub")
    if not keycloak_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")

    user = db.query(User).filter(User.keycloak_id == keycloak_id).first()
    if not user:
        user = User(
            keycloak_id=keycloak_id,
            email=payload.get("email"),
            username=payload.get("preferred_username"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
