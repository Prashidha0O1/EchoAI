"""User and UserProfile repositories"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.db.models.user import User, UserProfile
from app.db.schemas import UserCreate, UserUpdate, UserProfileUpdate
from app.core.security import get_password_hash


class UserRepository:
    """Repository for User operations"""
    
    @staticmethod
    def get(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email (case-insensitive)"""
        return db.query(User).filter(func.lower(User.email) == email.lower().strip()).first()
    
    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def create(db: Session, user: UserCreate) -> User:
        """Create a new user with profile"""
        hashed_password = get_password_hash(user.password)
        db_user = User(
            username=user.username,
            email=user.email.lower().strip(),
            hashed_password=hashed_password,
            first_name=user.first_name,
            last_name=user.last_name
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # Create empty profile for the user
        db_profile = UserProfile(user_id=db_user.id)
        db.add(db_profile)
        db.commit()
        
        return db_user
    
    @staticmethod
    def update(db: Session, user_id: int, user_update: UserUpdate) -> Optional[User]:
        """Update a user"""
        db_user = UserRepository.get(db, user_id)
        if not db_user:
            return None
        
        update_data = user_update.model_dump(exclude_unset=True)
        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
        for key, value in update_data.items():
            setattr(db_user, key, value)
        
        db.commit()
        db.refresh(db_user)
        return db_user


class UserProfileRepository:
    """Repository for UserProfile operations"""
    
    @staticmethod
    def get(db: Session, user_id: int) -> Optional[UserProfile]:
        """Get user profile by user ID"""
        return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    
    @staticmethod
    def update(
        db: Session,
        user_id: int,
        profile_update: UserProfileUpdate,
        cv_file_path: Optional[str] = None,
        cv_parsed_text: Optional[str] = None,
        profile_picture: Optional[str] = None
    ) -> Optional[UserProfile]:
        """Update a user profile"""
        db_profile = UserProfileRepository.get(db, user_id)
        if not db_profile:
            return None
        
        update_data = profile_update.model_dump(exclude_unset=True)
        
        if cv_file_path is not None:
            update_data["cv_file_path"] = cv_file_path
        if cv_parsed_text is not None:
            update_data["cv_parsed_text"] = cv_parsed_text
        if profile_picture is not None:
            update_data["profile_picture"] = profile_picture
        
        for key, value in update_data.items():
            setattr(db_profile, key, value)
        
        db.commit()
        db.refresh(db_profile)
        return db_profile
