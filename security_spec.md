# Security Specification for Mutabi' (مُتابِع)

## 1. Data Invariants
1. **User Profile Isolation**: Regular users can only read and write their own `/users/{uid}` document. Users cannot alter their `isDisabled` status or spoof identity.
2. **Admin Authority**: Only authenticated administrators (whose UID exists in `/admins/{uid}` or matches bootstrapped root admin `khalidsalah948@gmail.com`) can create/modify `/activities/{activityId}`, delete/disable users, or create `/notes/{noteId}`.
3. **Log Immutability of Ownership**: A user can only write logs where `resource.data.uid == request.auth.uid`, and the document ID must match `{uid}_{activityId}_{date}`.
4. **Disabled User Lockout**: Any user marked `isDisabled: true` is immediately blocked from creating or modifying logs, profiles, or progress.
5. **Item Progress Ownership**: A user can only record their own video watching progress (`uid == request.auth.uid`).
6. **Admin Notes Read/Update**: A user can read notes addressed to them (`toUid == request.auth.uid`) and can only update the `isRead` flag.

## 2. The Dirty Dozen Attack Payloads
1. **Payload 1 (User Privilege Escalation)**: User sends `{ isDisabled: false, role: 'admin' }` into `/users/{victimUid}`. Must be REJECTED.
2. **Payload 2 (Log Spoofing)**: User sends log with `uid: 'another_user'` into `/logs/another_user_act1_2026-11-06`. Must be REJECTED.
3. **Payload 3 (Log ID Poisoning)**: User attempts to write to `/logs/random_id` with non-matching ID formula. Must be REJECTED.
4. **Payload 4 (Negative/Abnormal Amount Attack)**: User sends `amount: -500` or `amount: 99999999` to break stats. Must be REJECTED.
5. **Payload 5 (Activity Tampering by Non-Admin)**: Standard user attempts `POST /activities/quran_memorize` with modified target. Must be REJECTED.
6. **Payload 6 (Admin Document Injection)**: Non-admin tries to write doc `/admins/{ownUid}`. Client writes to `/admins` must be completely FORBIDDEN.
7. **Payload 7 (Disabled User Attempt)**: Disabled user tries to create a new log in `/logs/`. Must be REJECTED.
8. **Payload 8 (Video Progress Hijacking)**: User writes to `/itemProgress/victimUid_video1` with `uid: victimUid`. Must be REJECTED.
9. **Payload 9 (Note Content Tampering)**: Target user tries to edit the text or author of an admin note. Must be REJECTED (only `isRead` can be updated).
10. **Payload 10 (Mass Unindexed List Query)**: Scraping `/logs` across all users without UID constraint. Must be REJECTED.
11. **Payload 11 (Huge Junk Payload)**: User attempts to inject a 100KB string in note or title. Must be REJECTED by string size bounds.
12. **Payload 12 (Foreign Note Creation)**: Standard user tries to create note in `/notes` pretending to be an instructor/admin. Must be REJECTED.
