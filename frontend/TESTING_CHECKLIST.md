# EchoAI Frontend — Black-Box Testing Checklist

Manual test cases to verify the frontend works end-to-end against a running backend.

**Prerequisites:**
- Backend running at `http://localhost:8000`
- Frontend running at `http://localhost:3000`
- A registered user account
- An admin account (`admin@echo.ai` / `nimda@123`)

---

## 1. Authentication (8 tests)

| # | Test Case | Steps | Expected Result | Pass? |
|---|-----------|-------|-----------------|-------|
| 1.1 | Login success | Go to `/login`, enter valid email + password, click Login | Redirected to `/dashboard`, navbar shows user info | [ ] |
| 1.2 | Login failure | Enter wrong password | Error toast: "Incorrect email or password" | [ ] |
| 1.3 | Login empty fields | Leave fields empty, click Login | Validation errors shown on required fields | [ ] |
| 1.4 | Signup success | Go to `/signup`, fill all fields, click Sign Up | Redirected to `/dashboard` | [ ] |
| 1.5 | Signup duplicate email | Register with an already-used email | Error: "Email already registered" | [ ] |
| 1.6 | Logout | Click logout button in sidebar | Redirected to `/login`, token cleared from localStorage | [ ] |
| 1.7 | Password toggle | Click eye icon on password field | Password text becomes visible, icon changes | [ ] |
| 1.8 | Forgot password | Go to `/forgot-password`, enter email | Success message shown | [ ] |

---

## 2. Route Protection (4 tests)

| # | Test Case | Steps | Expected Result | Pass? |
|---|-----------|-------|-----------------|-------|
| 2.1 | Unauthenticated redirect | Clear localStorage token, navigate to `/dashboard` | Redirected to `/login` | [ ] |
| 2.2 | Protected pages | Try `/interviews`, `/profile`, `/resumes` without login | All redirect to `/login` | [ ] |
| 2.3 | Admin route — non-admin | Login as regular user, navigate to `/admin` | Redirected or access denied | [ ] |
| 2.4 | Admin route — admin | Login as admin, navigate to `/admin` | Admin dashboard loads | [ ] |

---

## 3. Dashboard (3 tests)

| # | Test Case | Steps | Expected Result | Pass? |
|---|-----------|-------|-----------------|-------|
| 3.1 | Dashboard loads | Login, land on `/dashboard` | Stats cards visible (total sessions, completed, etc.) | [ ] |
| 3.2 | Recent interviews | Check "Recent Interviews" section | Shows list of past interviews (or empty state) | [ ] |
| 3.3 | Navigation | Click sidebar links (Interviews, Resume, ATS, etc.) | Each page loads without errors | [ ] |

---

## 4. Interview Workflow (8 tests)

| # | Test Case | Steps | Expected Result | Pass? |
|---|-----------|-------|-----------------|-------|
| 4.1 | Create interview | Go to `/interviews/create`, fill JD + role + level | Form accepts input, "Generate Questions" button enabled | [ ] |
| 4.2 | Generate questions | Click "Generate Questions" | Loading spinner, then AI-generated questions appear | [ ] |
| 4.3 | Start voice interview | Click "Start Interview" (voice mode) | Redirected to `/interview/[id]`, microphone access requested | [ ] |
| 4.4 | Start chat interview | Click "Start Interview" (chat mode) | Redirected to `/chat-interview/[id]`, text input visible | [ ] |
| 4.5 | Chat interaction | Type an answer and send | AI responds with next question | [ ] |
| 4.6 | End interview | Click "End Interview" button | Interview ends, redirected to report or interviews list | [ ] |
| 4.7 | View report | Go to `/interviews/[id]/report` | Overall score, metrics, strengths, improvements visible | [ ] |
| 4.8 | Interview list | Go to `/interviews` | All interviews listed with status badges | [ ] |

---

## 5. Resume Builder (6 tests)

| # | Test Case | Steps | Expected Result | Pass? |
|---|-----------|-------|-----------------|-------|
| 5.1 | Create resume | Go to `/resumes/create`, fill title + details | Resume saved, redirected to resume list | [ ] |
| 5.2 | Edit resume | Click edit on existing resume | Edit page loads with pre-filled data | [ ] |
| 5.3 | Set primary | Click "Set as Primary" on a resume | Badge shows "Primary" | [ ] |
| 5.4 | Delete resume | Click delete, confirm | Resume removed from list | [ ] |
| 5.5 | Export PDF | Click "Export PDF" | PDF downloads to browser | [ ] |
| 5.6 | Multiple resumes | Create 3 resumes, check list | All 3 appear in `/resumes` | [ ] |

---

## 6. ATS Checker (4 tests)

| # | Test Case | Steps | Expected Result | Pass? |
|---|-----------|-------|-----------------|-------|
| 6.1 | ATS check | Go to `/ats`, upload PDF + paste JD, click Check | Loading state, then score percentage shown | [ ] |
| 6.2 | Missing keywords | Check ATS results section | Missing keywords listed | [ ] |
| 6.3 | Recommendations | Check ATS results section | Recommendations displayed | [ ] |
| 6.4 | Invalid file | Upload a .txt file | Error message about file type | [ ] |

---

## 7. Profile (5 tests)

| # | Test Case | Steps | Expected Result | Pass? |
|---|-----------|-------|-----------------|-------|
| 7.1 | View profile | Go to `/profile` | Profile info displayed (name, email, bio) | [ ] |
| 7.2 | Upload CV | Upload a PDF file | CV uploaded, filename shown | [ ] |
| 7.3 | Upload picture | Upload a profile picture | Picture preview updated | [ ] |
| 7.4 | Update bio | Edit bio text, save | Bio updated on reload | [ ] |
| 7.5 | Delete CV | Click delete CV | CV removed, upload option re-appears | [ ] |

---

## 8. Leaderboard (2 tests)

| # | Test Case | Steps | Expected Result | Pass? |
|---|-----------|-------|-----------------|-------|
| 8.1 | Leaderboard loads | Go to `/leaderboard` | Table/list of ranked users visible | [ ] |
| 8.2 | Ranking data | Complete an interview with report | User appears in leaderboard | [ ] |

---

## 9. Admin Panel (4 tests)

| # | Test Case | Steps | Expected Result | Pass? |
|---|-----------|-------|-----------------|-------|
| 9.1 | Admin login | Go to `/admin/login`, login with admin credentials | Redirected to `/admin` | [ ] |
| 9.2 | Platform stats | Check admin dashboard | Total users, interviews, avg score visible | [ ] |
| 9.3 | User list | Check users section | All users listed with interview counts | [ ] |
| 9.4 | Charts | Check chart sections | Interviews per day + by type charts render | [ ] |

---

## 10. Error Handling (3 tests)

| # | Test Case | Steps | Expected Result | Pass? |
|---|-----------|-------|-----------------|-------|
| 10.1 | Network error | Stop backend, try any action | Error toast: "Network error" or similar | [ ] |
| 10.2 | Session expiry | Wait for token to expire (or manually clear), try action | Redirected to `/login` | [ ] |
| 10.3 | Non-admin on /admin/login | Login as non-admin on admin login page | "Access denied" error shown | [ ] |

---

## Summary

| Section | Total Tests | Passed | Failed |
|---------|------------|--------|--------|
| Authentication | 8 | | |
| Route Protection | 4 | | |
| Dashboard | 3 | | |
| Interview Workflow | 8 | | |
| Resume Builder | 6 | | |
| ATS Checker | 4 | | |
| Profile | 5 | | |
| Leaderboard | 2 | | |
| Admin Panel | 4 | | |
| Error Handling | 3 | | |
| **TOTAL** | **47** | | |
