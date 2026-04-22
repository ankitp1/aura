# Aura Firestore Security Specification

## Data Invariants
1. A wardrobe item MUST belong to the authenticated user's subcollection.
2. A user can only access their own profile and its sub-resources.
3. Item IDs and Harvest IDs must be valid alphanumeric strings.
4. Versatility scores must be bounded between 0 and 10.

## The Dirty Dozen (Payload Test Cases)

1. **Identity Spoofing**: Attempt to create a user profile for a different UID.
2. **Shadow Field Injection**: Attempt to inject `isAdmin: true` into a user document during update.
3. **Orphaned Write**: Attempt to create a wardrobe item with `userId` matching someone else.
4. **Invalid Range**: Set `versatilityScore` to 999.
5. **ID Poisoning**: Use a 2KB string as a `wardrobeId`.
6. **Cross-Tenant List**: Attempt to list `users/victim_id/wardrobe`.
7. **Immutable Violation**: Attempt to change `createdAt` on an existing item.
8. **Malicious Image URL**: Inject a 5MB base64 string directly into a Firestore string field (size check).
9. **Anonymous Veto**: Attempt to delete a wardrobe item without being signed in.
10. **State Skipping**: Update a harvest record from `failed` to `completed` without authorization (identity check).
11. **Shadow Key**: Create a wardrobe item with an extra `pricePaid` field not in the approved schema.
12. **PII Leak**: Query for all user emails globally.

## Results Table

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
| :--- | :--- | :--- | :--- |
| Users | P | P | P |
| Wardrobe | P | P | P |
| Harvests | P | P | P |

*P = Pass (Protected)*
