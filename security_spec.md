# Angel OS v2.0.0 — Firestore Security Specification

## 1. Data Invariants
1. **Strict Owner Isolation**: A user can ONLY read, create, update, or delete `/users/{userId}` and `/users/{userId}/saves/{saveId}` where `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Zero Cross-User Listing**: Blanket `list` queries across `/users` or `/users/{userId}/saves` are completely denied (`allow list: if false`). Each client directly accesses its exact deterministic document paths (`/users/${uid}` and `/users/${uid}/saves/primary`).
3. **Parent Master Gate**: Every write or read on `/users/{userId}/saves/{saveId}` verifies that the parent `/users/{userId}` profile document exists (or exists atomically via `existsAfter` during initial OOBE batch creation) and belongs to `request.auth.uid`.
4. **Immutable Ownership & Temporal Integrity**: `uid` and `createdAt` can never be altered after creation. `createdAt` on create and `updatedAt` on create/update must equal `request.time`.
5. **Bounded Payload & Schema Strictness**: Every string has `.size()` caps matching `firebase-blueprint.json`, every array has strict `.size()` caps, and `keys().hasAll(...) && keys().hasOnly(...)` blocks any shadow/privilege fields.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Cross-User Profile Read**: User B attempts `get(/users/userA)` -> DENIED (`uid != userId`).
2. **Cross-User Save Read**: User B attempts `get(/users/userA/saves/primary)` -> DENIED.
3. **Unauthenticated Access**: `auth == null` attempts `get` or `create` on `/users/u1` -> DENIED.
4. **Unverified Email Spoof**: Signed-in user with `email_verified: false` writes `/users/u1` -> DENIED.
5. **Collection Enumeration (`list`)**: Authenticated user runs `getDocs(collection(db, 'users'))` -> DENIED (`allow list: if false`).
6. **Shadow Field Injection**: Owner creates `/users/u1` with extra field `{ isAdmin: true }` -> DENIED (`hasOnly`).
7. **Owner UID Spoofing**: User A creates `/users/userA/saves/primary` with `{ uid: 'userB' }` -> DENIED (`data.uid == request.auth.uid`).
8. **Immutable Field Tampering**: Owner updates `/users/userA` attempting to change `createdAt` or `uid` -> DENIED (`affectedKeys().hasOnly(...)`).
9. **Client Timestamp Forgery**: Owner writes `updatedAt: Timestamp(1999-01-01)` instead of `serverTimestamp()` -> DENIED (`updatedAt == request.time`).
10. **ID Poisoning**: Owner attempts write to `/users/userA/saves/../../../../etc` or 500-char ID -> DENIED (`isValidId(saveId)`).
11. **Denial-of-Wallet Oversized Array**: Owner writes 5,000 items to `installedPkgIds` (limit 600) or 1MB `displayName` -> DENIED (`.size()` cap).
12. **Orphan Save Creation**: Owner tries to create `/users/userA/saves/primary` without parent `/users/userA` existing -> DENIED (`exists` / `existsAfter` Master Gate).
