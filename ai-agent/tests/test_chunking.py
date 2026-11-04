from app.ingest import chunk_markdown, fmt_time

DOC = """# Cancellations and refunds

## Refund timing
Refunds take 5 to 7 working days.

## Cancelling before payment
Cancel any time during checkout.
"""


def test_splits_on_sections_and_keeps_titles():
    chunks = chunk_markdown(DOC, "refunds.md")

    assert [c["section"] for c in chunks] == [
        "Cancellations and refunds > Refund timing",
        "Cancellations and refunds > Cancelling before payment",
    ]
    # Each chunk carries its own heading so it makes sense when retrieved alone.
    assert chunks[0]["text"].startswith("Cancellations and refunds > Refund timing\n")
    assert all(c["source"] == "refunds.md" for c in chunks)


def test_long_sections_are_split_by_paragraph():
    long = "# T\n## S\n" + "\n\n".join("x" * 500 for _ in range(5))
    chunks = chunk_markdown(long, "t.md")
    assert len(chunks) > 1
    assert all(len(c["text"]) < 1300 for c in chunks)


def test_times_are_shown_in_india_time():
    assert fmt_time("2026-10-14T12:30:00Z") == "Wed 14 Oct 2026, 6:00 PM IST"
