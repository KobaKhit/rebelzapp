"""Add group_type and managed_by_id to chat_groups

Revision ID: add_group_management_fields
Revises: add_chat_functionality
Create Date: 2025-09-28 20:05:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_group_management_fields'
down_revision = 'add_chat_functionality'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if columns already exist before adding them
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('chat_groups')]
    
    # Add group_type column if it doesn't exist
    if 'group_type' not in columns:
        op.add_column('chat_groups', sa.Column('group_type', sa.String(50), nullable=False, server_default='user_created'))
    
    # Add managed_by_id column if it doesn't exist
    if 'managed_by_id' not in columns:
        op.add_column('chat_groups', sa.Column('managed_by_id', sa.Integer(), nullable=True))
    
    # Note: SQLite doesn't support adding foreign key constraints after table creation
    # The foreign key relationship will be enforced at the application level


def downgrade() -> None:
    # Drop columns (no foreign key constraint to drop in SQLite)
    op.drop_column('chat_groups', 'managed_by_id')
    op.drop_column('chat_groups', 'group_type')
