"""Demo content: ``python -m app.seed``.

Creates one clearly flagged demo account with a knowledge base for
**Northwind Cloud, a fictional product**, six documentation articles, a widget,
and then asks a set of questions *through the real pipeline* so the dashboard
has genuine conversations — answered ones with sources, and unresolved ones
the documentation does not cover. No conversation row is written by hand.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.db.session import SessionLocal, init_db
from app.models import Article, Channel, Conversation, KnowledgeBase, User, WidgetConfig
from app.retrieval.index import clear_cache
from app.services.answering import answer_question

DEMO_EMAIL = "demo@resolveai.dev"
DEMO_PASSWORD = "resolveai-demo-1234"
DEMO_PUBLIC_ID = "kb_demo_northwind"

ARTICLES = [
    (
        "Getting Started",
        "Guides",
        """# Getting Started

Northwind Cloud lets you deploy web apps and APIs without managing servers.

## Create a project
Sign in to the dashboard and click **New project**. Give it a name and pick a
region. Projects group your deployments, environment variables and API keys.

## Install the CLI
Install the Northwind CLI with `npm install -g northwind-cli`, then run
`northwind login` to connect it to your account.

## Deploy your first app
From your app's folder, run `northwind deploy`. The CLI builds your app,
uploads it and prints the live URL when the deployment is ready. A first
deployment usually takes under two minutes.
""",
    ),
    (
        "Authentication",
        "Account",
        """# Authentication

## Signing in
You can sign in with your email and password. Sessions last 30 days on a
trusted device and 12 hours otherwise.

## Reset your password
To reset your password, open the sign-in page and click **Forgot password**.
Enter your account email and we will send a reset link that is valid for one
hour. For security, the link can only be used once.

## Two-factor authentication
Enable two-factor authentication under **Settings → Security**. Scan the QR
code with an authenticator app and enter the six-digit code to confirm. Keep
your recovery codes somewhere safe: they are shown only once.
""",
    ),
    (
        "API Keys",
        "Developers",
        """# API Keys

API keys let your servers call the Northwind API without a user session.

## Create an API key
Go to **Settings → API keys** and click **Create key**. Give the key a name
that says where it will be used, such as "billing worker". The full key is
shown only once, so copy it into your secret manager straight away.

## Using a key
Send the key in the `Authorization` header as `Bearer <key>`. Never put an API
key in browser code or a mobile app: anyone can read it there.

## Rotate or revoke a key
To rotate a key, create a new one, deploy it, then revoke the old key from the
same page. Revoked keys stop working immediately.
""",
    ),
    (
        "Webhooks",
        "Developers",
        """# Webhooks

Webhooks notify your server when something happens, such as a deployment
finishing or a payment failing.

## Add an endpoint
Under **Settings → Webhooks**, click **Add endpoint**, enter your HTTPS URL and
choose the events you want. Northwind sends a `POST` request with a JSON body
for each event.

## Verify signatures
Every webhook request includes an `X-Northwind-Signature` header: an
HMAC-SHA256 of the raw request body using your endpoint's signing secret.
Compute the same HMAC on your side and compare it before trusting the payload.

## Webhook returning 401
If your endpoint answers 401, it is usually rejecting the signature. Make sure
you verify the raw body exactly as received, before any JSON parsing, and that
you are using the signing secret for that specific endpoint.

## Retries
Failed deliveries are retried up to five times over one hour, with increasing
delays. You can also resend an event manually from the dashboard.
""",
    ),
    (
        "Billing FAQ",
        "Billing",
        """# Billing FAQ

## Which plans are available?
Northwind Cloud has a Free plan, a Team plan and an Enterprise plan. The Free
plan includes three projects; Team and Enterprise remove that limit.

## When am I charged?
Paid plans are billed monthly in advance on the day you upgraded. You can
download every invoice from **Settings → Billing**.

## Changing or cancelling a plan
You can upgrade at any time and the difference is prorated. If you downgrade
or cancel, the change takes effect at the end of the current billing period.
""",
    ),
    (
        "Troubleshooting",
        "Guides",
        """# Troubleshooting

## Deployment stuck on "building"
Builds time out after 15 minutes. Check the build logs in the dashboard for
the failing step; the most common cause is a missing environment variable.

## 502 errors after deploying
A 502 means your app did not start listening in time. Make sure it listens on
the port given in the `PORT` environment variable, not a hard-coded one.

## CLI says "not authenticated"
Run `northwind login` again. CLI sessions expire after 30 days.
""",
    ),
]

QUESTIONS = [
    "How do I create an API key?",
    "How can I reset my password?",
    "Why is my webhook returning 401?",
    "My deployment is stuck on building, what should I do?",
    "When am I charged for the Team plan?",
    "How do I rotate an API key?",
    "How do I verify webhook signatures?",
    "Do you support single sign-on with Okta?",
    "Can I host my database in Antarctica?",
    "What is the refund policy for annual plans?",
    "How do I enable two-factor authentication?",
    "I get a 502 after deploying",
]


async def seed(reset: bool) -> int:
    init_db()
    clear_cache()
    with SessionLocal() as db:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).one_or_none()
        if existing and not reset:
            print(f"Demo account already exists: {DEMO_EMAIL}. Re-run with --reset to rebuild it.")
            return 0
        if existing:
            db.delete(existing)
            db.commit()

        user = User(
            email=DEMO_EMAIL,
            name="Demo Account",
            password_hash=hash_password(DEMO_PASSWORD),
            is_demo=True,
        )
        db.add(user)
        db.commit()

        kb = KnowledgeBase(
            user_id=user.id,
            name="Northwind Cloud Docs",
            description="Demo content for a fictional product, used to show ResolveAI.",
            public_id=DEMO_PUBLIC_ID,
        )
        kb.widget = WidgetConfig(
            title="Northwind support",
            welcome_message="Hi! I answer questions from the Northwind Cloud docs. What do you need?",
            accent_color="#2cc6e0",
            position="bottom-right",
            allowed_domains=[],
        )
        db.add(kb)
        db.commit()
        db.refresh(kb)

        for title, category, content in ARTICLES:
            db.add(Article(knowledge_base_id=kb.id, title=title, category=category, content=content.strip()))
        db.commit()

        # Every question really goes through the pipeline (twice, from different
        # channels); only the timestamps are back-dated afterwards, so the
        # 14-day chart has a history to draw.
        channels = [Channel.WIDGET, Channel.PREVIEW, Channel.API]
        asked = QUESTIONS + QUESTIONS[::-1]
        now = datetime.now(timezone.utc)
        outcomes = []
        for index, question in enumerate(asked):
            result = await answer_question(db, kb, question, channels[index % len(channels)])
            if index < len(QUESTIONS):
                outcomes.append((question, str(result.status), [s["title"] for s in result.sources]))
            days_ago = 13 - index * 14 // len(asked)
            conversation = db.get(Conversation, result.conversation_id)
            if conversation is not None:
                conversation.created_at = now - timedelta(days=days_ago, hours=(index * 5) % 9, minutes=index * 7 % 60)
        db.commit()

    print("Demo data ready (Northwind Cloud is a fictional product).")
    print(f"  email:    {DEMO_EMAIL}")
    print(f"  password: {DEMO_PASSWORD}")
    print(f"  widget:   data-project=\"{DEMO_PUBLIC_ID}\"  →  /demo-site")
    print("  questions asked through the real pipeline:")
    for question, status, sources in outcomes:
        print(f"    [{status:10}] {question}  {sources if sources else ''}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reset", action="store_true", help="Rebuild the demo account.")
    return asyncio.run(seed(parser.parse_args().reset))


if __name__ == "__main__":
    sys.exit(main())
