"""Create enquiry storage and durable rate limiting."""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("enquiries", sa.Column("id", sa.String(36), primary_key=True), sa.Column("name", sa.String(100), nullable=False), sa.Column("email", sa.String(254), nullable=False), sa.Column("direction", sa.String(100), nullable=False), sa.Column("message", sa.Text(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_enquiries_created_at", "enquiries", ["created_at"])
    op.create_table("rate_buckets", sa.Column("key", sa.String(80), primary_key=True), sa.Column("count", sa.Integer(), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_rate_buckets_expires_at", "rate_buckets", ["expires_at"])

def downgrade():
    op.drop_table("rate_buckets")
    op.drop_table("enquiries")
