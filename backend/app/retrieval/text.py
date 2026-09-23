"""Tokenisation for keyword retrieval.

Lowercase, split on anything that is not a letter or digit, drop common
English stopwords, and strip a handful of suffixes so "resetting", "resets"
and "reset" meet in the middle. It is not a real stemmer, and it does not need
to be: support questions and support articles use the same product words.
"""

from __future__ import annotations

import re

TOKEN_RE = re.compile(r"[a-z0-9]+")

STOPWORDS = frozenset(
    """
    a about above after again against all am an and any are as at be because been
    before being below between both but by can could did do does doing down during
    each few for from further had has have having he her here hers herself him
    himself his how i if in into is it its itself just me more most my myself no
    nor not now of off on once only or other our ours ourselves out over own same
    she should so some such than that the their theirs them themselves then there
    these they this those through to too under until up very was we were what when
    where which while who whom why will with would you your yours yourself
    yourselves please thanks thank hi hello want need get got use using way
    """.split()
)

SUFFIXES = ("ingly", "edly", "ing", "ies", "ied", "ed", "es", "s")


def stem(token: str) -> str:
    for suffix in SUFFIXES:
        if token.endswith(suffix) and len(token) - len(suffix) >= 3:
            root = token[: -len(suffix)]
            if suffix in ("ies", "ied"):
                return root + "y"
            return root
    return token


def tokenize(text: str) -> list[str]:
    return [
        stem(token)
        for token in TOKEN_RE.findall(text.lower())
        if token not in STOPWORDS and len(token) > 1
    ]
