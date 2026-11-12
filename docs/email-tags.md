---
description: "Sign in as many test users with one Mockatoo account by tagging its email, and use special tags to test edge cases such as unverified emails."
---

# Email tags

You sign in to Mockatoo with one account, but you can add a tag to its email
address to sign in as other users. Add the tag after a `+`, e.g.
`you+1@example.com`, and log in with your usual password (the one for
`you@example.com`). You don't need to sign up again.

Each tagged address is its own user. It always gets the same provider user ID
and username, and your app receives the tagged address as the user's email
(except for `+returning`, described below).

## Getting another user

Use any tag that isn't a special tag, e.g. `you+1@example.com`,
`you+2@example.com` or `you+another_user@example.com`. These users act exactly
like `you@example.com`. They only get a different provider user ID and
username, so your app sees a new user. You can create as many as your tests
need, e.g. one per test, so tests don't share state.

## Special tags

Some tags change what the provider does, so you can test edge cases, such as an
unverified email, a missing name, or a token endpoint that's down. Each provider
supports its own tags, and some tags behave differently from one provider to
another. The page for each provider lists its tags and explains what they do:

- [Google](providers/google.md)
- [Microsoft](providers/microsoft.md)
- [GitHub](providers/github.md)
- [Apple](providers/apple.md)
- [Discord](providers/discord.md)
- [LinkedIn](providers/linkedin.md)
- [X](providers/x.md)
- [Facebook](providers/facebook.md)

When you're signed in, the account page at `/` lists every special tag for the
provider you pick.

## Combining tags

Put a `.` between tags to combine them, e.g. `you+hd.unverified@example.com`.
You can also mix a special tag with an ordinary one, e.g.
`you+2.unverified@example.com`, to get a second unverified user that's separate
from `you+unverified@example.com`.

Every different address is a different user, including the same tags in
another order: `you+hd.unverified@…` and `you+unverified.hd@…` are two users.

## Same user again

`+renamed` and `+returning` are the only tags that don't make a new user. They
keep the provider user ID of the address without them, so `you+hd.renamed@…`
and `you+hd.returning@…` are both the same user as `you+hd@…`.

| Address | Email your app receives | Tests |
| --- | --- | --- |
| `you+renamed@…` | `you+renamed@…` | The user changed their email. |
| `you+returning@…` | `you@…` | The user signs in again with the same email. |

`+returning` is the one tag your app never sees in the email, because a
returning user still has the email they had before. With Google and Apple it
also changes what the provider sends on a later sign-in; see their pages.

## Apps that remove tags

If your app removes `+tags` from email addresses before it stores them, it
combines all these users into one. Turn that off in development and tests.
