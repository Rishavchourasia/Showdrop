"""
Talks to our Java Spring Boot backend over HTTP -- exactly like the React app does.

WHY call the backend instead of reading Postgres directly? The backend owns the
business rules (seat holds, optimistic locking, "you can only see YOUR bookings").
If the agent wrote to the database itself, it could bypass all of them. The
agent is just another CLIENT of the API, with the same permissions as the user.
"""
import httpx

from .config import settings


class BackendError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


_http = httpx.AsyncClient(base_url=settings.backend_url, timeout=10)


async def _request(method: str, path: str, jwt: str | None = None, json: dict | None = None):
    headers = {"Authorization": f"Bearer {jwt}"} if jwt else {}
    try:
        res = await _http.request(method, f"/api{path}", headers=headers, json=json)
    except httpx.HTTPError as e:
        raise BackendError(503, f"Booking service unreachable: {e}") from e
    if res.status_code >= 400:
        # Our backend always returns {"message": "..."} on errors (GlobalExceptionHandler).
        try:
            message = res.json().get("message", res.text)
        except ValueError:
            message = res.text
        raise BackendError(res.status_code, message)
    return res.json()


async def list_events() -> list[dict]:
    return await _request("GET", "/events")


async def get_event(event_id: int) -> dict:
    return await _request("GET", f"/events/{event_id}")


async def get_show(show_id: int) -> dict:
    return await _request("GET", f"/shows/{show_id}")


async def create_booking(jwt: str | None, show_id: int, seat_ids: list[int]) -> dict:
    return await _request("POST", "/bookings", jwt, {"showId": show_id, "seatIds": seat_ids})


async def my_bookings(jwt: str | None) -> list[dict]:
    return await _request("GET", "/bookings/me", jwt)
