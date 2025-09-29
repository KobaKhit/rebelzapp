"""Add profile_picture column to users table

Revision ID: add_profile_picture
Revises: 
Create Date: 2025-09-28 18:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_profile_picture'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add profile_picture column to users table
    op.add_column('users', sa.Column('profile_picture', sa.String(500), nullable=True))


def downgrade() -> None:
    # Remove profile_picture column from users table
    op.drop_column('users', 'profile_picture')
