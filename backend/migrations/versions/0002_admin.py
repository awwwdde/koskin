"""CMS, image storage and revocable admin sessions."""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("enquiries", sa.Column("status", sa.String(16), nullable=False, server_default="new"))
    op.create_table("site_content", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("revision", sa.Integer(), nullable=False), sa.Column("data", sa.JSON(), nullable=False))
    op.create_table("admin_sessions", sa.Column("digest", sa.String(64), primary_key=True), sa.Column("credential", sa.String(64), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_admin_sessions_expires_at", "admin_sessions", ["expires_at"])
    op.create_table("media", sa.Column("id", sa.String(36), primary_key=True), sa.Column("data", sa.LargeBinary(), nullable=False))

def downgrade():
    op.drop_table("media")
    op.drop_table("admin_sessions")
    op.drop_table("site_content")
    op.drop_column("enquiries", "status")
