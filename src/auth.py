"""
Authentication and authorization module for the Mergington High School API.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List
import os
import json
from pathlib import Path
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

# Security configurations
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"  # In production, use os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Path to store user data
USERS_FILE = Path(__file__).parent / "users.json"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# User models
class UserRole:
    STUDENT = "student"
    ADVISOR = "advisor"
    ADMIN = "admin"

class User(BaseModel):
    email: str
    full_name: Optional[str] = None
    disabled: Optional[bool] = False
    role: str = UserRole.STUDENT

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User store functions
def init_user_store() -> None:
    """Initialize user store if it doesn't exist"""
    if not USERS_FILE.exists():
        default_users = {
            "admin@mergington.edu": {
                "email": "admin@mergington.edu",
                "full_name": "Admin User",
                "hashed_password": pwd_context.hash("adminpassword"),
                "role": UserRole.ADMIN,
                "disabled": False
            }
        }
        with open(USERS_FILE, 'w') as f:
            json.dump(default_users, f, indent=4)

def get_users() -> Dict:
    """Get all users from the JSON file"""
    if not USERS_FILE.exists():
        init_user_store()
    with open(USERS_FILE, 'r') as f:
        return json.load(f)

def save_users(users: Dict) -> None:
    """Save users to the JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=4)

def get_user(email: str) -> Optional[UserInDB]:
    """Get a user by email"""
    users = get_users()
    if email in users:
        user_dict = users[email]
        return UserInDB(**user_dict)
    return None

def create_user(email: str, password: str, full_name: str = None, role: str = UserRole.STUDENT) -> User:
    """Create a new user"""
    users = get_users()
    if email in users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = pwd_context.hash(password)
    users[email] = {
        "email": email,
        "full_name": full_name,
        "hashed_password": hashed_password,
        "role": role,
        "disabled": False
    }
    save_users(users)
    
    return User(
        email=email,
        full_name=full_name,
        role=role
    )

# Password and authentication functions
def verify_password(plain_password, hashed_password):
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
    """Authenticate a user by email and password"""
    user = get_user(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

# Token functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """Get current user from token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = get_user(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)):
    """Get current active user"""
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Role-based access control
def has_role(required_roles: List[str]):
    """Check if user has required role"""
    async def role_checker(current_user: UserInDB = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# Initialize the user store when the module is imported
init_user_store()
