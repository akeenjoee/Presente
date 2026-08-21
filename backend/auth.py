import os
import time
import hmac
import hashlib
import jwt
import httpx
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# DEV_MODE: Set to True for local testing without Azure Entra configuration.
DEV_MODE = False

# Secret key for generating/verifying dynamic QR code HMAC tokens.
# In production, this must be a secure random key loaded from environment variables.
QR_SECRET_KEY = os.getenv("QR_SECRET_KEY", "presente-super-secret-key-321").encode("utf-8")

# Microsoft JWKS config
MICROSOFT_JWKS_URL = "https://login.microsoftonline.com/common/discovery/v2.0/keys"
jwks_cache = {"keys": [], "expires_at": 0}

security = HTTPBearer()

async def get_microsoft_jwks() -> list:
    """
    Fetches and caches the public keys from Microsoft JWKS endpoint.
    Cache expires every 24 hours.
    """
    now = time.time()
    if jwks_cache["expires_at"] > now and jwks_cache["keys"]:
        return jwks_cache["keys"]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(MICROSOFT_JWKS_URL)
            response.raise_for_status()
            data = response.json()
            jwks_cache["keys"] = data.get("keys", [])
            jwks_cache["expires_at"] = now + 86400  # Cache for 24 hours
            return jwks_cache["keys"]
    except Exception as e:
        print(f"Error fetching Microsoft JWKS: {e}")
        # Return whatever is in cache if fetch fails
        return jwks_cache["keys"]

def generate_static_qr_token(event_id: int) -> str:
    """
    Generates a stateless, permanent QR code token for a given event,
    so users cannot guess the URL for other events.
    """
    message = f"event_static:{event_id}".encode("utf-8")
    token = hmac.new(QR_SECRET_KEY, message, hashlib.sha256).hexdigest()[:16]
    return token

def verify_static_qr_token(event_id: int, token_to_verify: str) -> bool:
    expected = generate_static_qr_token(event_id)
    return hmac.compare_digest(expected, token_to_verify)

def generate_qr_token(event_id: int, timestamp: float = None) -> tuple[str, int]:
    """
    Generates a stateless rotating QR code token for a given event.
    Returns:
        (token_hex, time_window_id)
    """
    if timestamp is None:
        timestamp = time.time()
    
    # Define a 30-second window ID
    window_id = int(timestamp // 30)
    
    # Message to sign contains event_id and the time window
    message = f"event:{event_id}:window:{window_id}".encode("utf-8")
    
    # Generate HMAC-SHA256 signature
    token = hmac.new(QR_SECRET_KEY, message, hashlib.sha256).hexdigest()
    return token, window_id

def verify_qr_token(event_id: int, token_to_verify: str) -> bool:
    """
    Verifies a rotating QR code token by checking the current time window
    and the previous time window (to account for network lag and clock drift).
    """
    now = time.time()
    current_window = int(now // 30)
    
    # Check current window and previous window (max 60-second validity)
    for window in [current_window, current_window - 1]:
        message = f"event:{event_id}:window:{window}".encode("utf-8")
        expected_token = hmac.new(QR_SECRET_KEY, message, hashlib.sha256).hexdigest()
        if hmac.compare_digest(expected_token, token_to_verify):
            return True
            
    return False

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Validates the Bearer token (JWT) from Microsoft Entra ID.
    If DEV_MODE = True, signature check is bypassed, and token claims are decoded directly
    (or a mock user is returned if token is invalid or plain text).
    """
    token = credentials.credentials

    if DEV_MODE:
        # In DEV_MODE, attempt to decode token without verifying signature,
        # or fallback to returning a mock user dict if the token isn't a valid JWT.
        try:
            # Decode payload without verifying signature
            payload = jwt.decode(token, options={"verify_signature": False})
            
            # Microsoft tokens put email in 'preferred_username', 'email', or 'upn'
            email = payload.get("preferred_username") or payload.get("email") or payload.get("upn")
            name = payload.get("name", "Dev User")
            
            return {
                "email": email or "dev.user@jemore.it",
                "name": name,
                "claims": payload
            }
        except Exception:
            # Fallback for simple testing with raw string tokens (e.g. "dev_token")
            return {
                "email": f"{token.lower()}@jemore.it" if "@" not in token else token,
                "name": token.title(),
                "claims": {}
            }

    # PRODUCTION MODE: Full JWKS validation
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token format: {e}")

    kid = unverified_header.get("kid")
    if not kid:
        raise HTTPException(status_code=401, detail="Token header missing 'kid'")

    jwks = await get_microsoft_jwks()
    
    # Find matching key in JWKS
    rsa_key = {}
    for key in jwks:
        if key.get("kid") == kid:
            rsa_key = {
                "kty": key.get("kty"),
                "kid": key.get("kid"),
                "use": key.get("use"),
                "n": key.get("n"),
                "e": key.get("e")
            }
            break

    if not rsa_key:
        raise HTTPException(status_code=401, detail="Could not find matching public key in JWKS")

    try:
        from jwt import PyJWK
        jwk = PyJWK(rsa_key)
        
        # Verify token using the fetched Microsoft RSA public key
        # In production, configure your specific client ID (Audience) and Tenant ID (Issuer)
        payload = jwt.decode(
            token,
            jwk.key,
            algorithms=["RS256"],
            options={"verify_aud": False}  # Adjust to verify aud if tenant/client IDs are configured
        )
        
        email = payload.get("preferred_username") or payload.get("email") or payload.get("upn")
        if not email:
            raise HTTPException(status_code=401, detail="Token is missing email field")
            
        return {
            "email": email,
            "name": payload.get("name", ""),
            "claims": payload
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTClaimsError as e:
        raise HTTPException(status_code=401, detail=f"Incorrect claims: {e}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {e}")
