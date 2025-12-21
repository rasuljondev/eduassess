# generate-students Edge Function

Creates real student users and records generation for analytics.

## Request

- Method: `POST`
- Body:

```json
{
  "center_slug": "lsl",
  "test_type": "ielts",
  "test_name": "IELTS General Test 2024",
  "count": 5
}
```

## Response

```json
{
  "center_slug": "lsl",
  "test_type": "ielts",
  "test_name": "IELTS General Test 2024",
  "users": [
    { "login": "test_ielts_ab12c", "password": "k3x9p1zq", "expiresAt": "..." }
  ]
}
```

## Notes

- `login` is code-only. Internally, the auth user email is `${login}@temp.exam.uz`.
- Requires the caller to be authenticated as `center_admin` or `superadmin`.\n

