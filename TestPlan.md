# Staff Wellbeing Survey Application - Comprehensive Test Plan

**Version:** 1.0  
**Date:** 2025-10-08  
**Test Environment:** Production site  
**Device:** Desktop only  
**Estimated Time:** ~3 hours

---

## Test Overview

This test plan covers all major functionality of the staff wellbeing survey application. Testers should create their own new accounts and follow each test section in order. Skip any actual payment processing (Stripe payments).

### Recording Results
For each test case, record:
- **PASS** - Feature works as expected
- **FAIL** - Feature doesn't work or throws errors
- **PARTIAL** - Feature partially works but has issues

---

## Section 1: Authentication & Onboarding (15 mins)

### Test 1.1: Sign Up
**Steps:**
1. Navigate to the production site
2. Click "Sign Up" or "Get Started"
3. Enter email address
4. Enter password (minimum 6 characters)
5. Complete personal details (first name, last name, job title)
6. Complete professional details (school/organisation name)
7. Use the school search to find and select a school OR enter custom school details
8. Submit the registration form

**Expected Outcome:**
- Account created successfully
- Redirected to email confirmation page or dashboard
- Welcome email received (check inbox/spam)

### Test 1.2: Email Confirmation
**Steps:**
1. Check email inbox for confirmation email
2. Click the confirmation link
3. Verify redirect to application

**Expected Outcome:**
- Email received within 2 minutes
- Confirmation link works
- Redirected to login or dashboard

### Test 1.3: Login
**Steps:**
1. Log out if currently logged in
2. Navigate to login page
3. Enter email and password
4. Click "Login"

**Expected Outcome:**
- Successfully logged in
- Redirected to dashboard

### Test 1.4: Forgot Password
**Steps:**
1. Log out
2. Click "Forgot Password" on login page
3. Enter email address
4. Submit request
5. Check email for password reset link
6. Click link and set new password

**Expected Outcome:**
- Reset email received
- Password successfully changed
- Can log in with new password

---

## Section 2: Dashboard & Navigation (10 mins)

### Test 2.1: Dashboard Overview
**Steps:**
1. After logging in, observe the dashboard
2. Check for:
   - Welcome message/getting started guide
   - Statistics cards (total surveys, responses, etc.)
   - Recent surveys list
   - Navigation menu

**Expected Outcome:**
- Dashboard displays correctly on desktop
- All UI elements visible and readable
- Statistics show correct data (0 for new account)
- Navigation menu accessible

### Test 2.2: Navigation
**Steps:**
1. Click through each main navigation item:
   - Dashboard
   - Surveys
   - Analysis
   - Improve (Action Plan)
   - Accredit
   - Custom Questions
   - Team
   - Profile/Settings
   - Upgrade

**Expected Outcome:**
- All pages load without errors
- Mobile-first design is clear and usable on desktop
- No broken links
- Consistent navigation across all pages

---

## Section 3: Survey Management (30 mins)

### Test 3.1: Create New Survey
**Steps:**
1. Navigate to "Surveys" page
2. Click "Create New Survey" or similar button
3. Fill in survey details:
   - Survey name/title
   - Opening date (future date)
   - Closing date (after opening date)
   - Number of staff
4. Select custom questions (if prompted)
5. Submit/create survey

**Expected Outcome:**
- Survey created successfully
- Survey appears in surveys list
- Toast notification confirms creation
- Survey status shows as "Pending" or "Draft" (not yet open)

### Test 3.2: Edit Survey
**Steps:**
1. From surveys list, click edit/pencil icon on the survey you just created
2. Modify survey details (e.g., change title, dates, or staff number)
3. Click "Save & Preview" button to save changes

**Expected Outcome:**
- Edit form pre-populated with current data
- Changes saved successfully via "Save & Preview" button
- Updated information displays in surveys list
- Button label context-aware: shows "Publish Survey" for link distribution or "Send Invitations" for email distribution

### Test 3.3: Preview Survey
**Steps:**
1. Click the preview/eye icon for your survey OR click "Save & Preview" button when editing
2. Navigate through the survey preview
3. Observe all question types:
   - Standard wellbeing questions (rating scales)
   - Recommendation question
   - Text response questions
   - Any custom questions selected
4. Note that clicking "Save & Preview" automatically saves any changes before opening preview

**Expected Outcome:**
- Preview opens in new tab
- All questions display correctly
- Rating scales, radio buttons, and text inputs function
- Survey is clearly marked as preview (not submittable)
- If accessed via "Save & Preview" button, changes are automatically saved first

### Test 3.4: Copy Survey Link
**Steps:**
1. From surveys list, copy the survey link
2. Open the link in a new incognito/private browser window

**Expected Outcome:**
- Link copied to clipboard successfully
- Link opens the public survey form
- Survey shows as "not yet open" if before opening date

### Test 3.5: Send Survey Invitation
**Steps:**
1. Create or edit a survey with email distribution method selected
2. Click "Send Invitations" button (for email distribution)
3. Enter a test email address (your own)
4. Send the invitation
5. Alternatively, test "Publish Survey" button for link distribution method

**Expected Outcome:**
- Button label is context-aware: "Send Invitations" for email, "Publish Survey" for link distribution
- Email sent successfully for email distribution
- Toast notification confirms sending
- Email received with survey link and instructions
- Survey status updates to "Sent" after sending

### Test 3.6: Send Reminder
**Steps:**
1. For an open survey, click "Send Reminder" button
2. Confirm the reminder

**Expected Outcome:**
- Reminder sent successfully
- Confirmation message appears

### Test 3.7: Archive Survey
**Steps:**
1. Click archive button on a survey
2. Confirm archiving
3. Toggle between "Active Only" and "Show All" filter to view archived surveys

**Expected Outcome:**
- Survey moved to archived state
- Survey removed from active surveys list when "Active Only" filter is selected
- Can view archived surveys by selecting "Show All" filter
- Filter toggle is clearly visible and functional

---

## Section 4: Survey Response (Public) (20 mins)

### Test 4.1: Access Public Survey
**Steps:**
1. Use the survey link from Test 3.4 or 3.5
2. Open in incognito/private window (simulate staff member)
3. Ensure survey opening date has passed

**Expected Outcome:**
- Survey loads without requiring login
- Survey displays introduction/welcome message
- "Start Survey" or similar button visible

### Test 4.2: Complete Standard Questions
**Steps:**
1. Click to start the survey
2. Answer wellbeing questions using rating scales (1-5 or 0-10)
3. Answer the recommendation question (NPS-style)
4. Provide text responses where prompted (e.g., "What would improve your wellbeing?")

**Expected Outcome:**
- All question types render correctly
- Can select ratings easily
- Text areas accept input
- Progress indicator shows (if present)

### Test 4.3: Complete Custom Questions
**Steps:**
1. If custom questions are included, complete them:
   - Multiple choice questions
   - Text questions
   - Rating questions

**Expected Outcome:**
- Custom questions display correctly
- All input types work properly
- Required fields are enforced

### Test 4.4: Submit Survey
**Steps:**
1. Complete all required fields
2. Click "Submit" button
3. Observe confirmation page

**Expected Outcome:**
- Survey submits successfully
- Redirected to "Thank You" or completion page
- Cannot resubmit the same survey

### Test 4.5: Survey Validation
**Steps:**
1. Open a new survey link
2. Try to submit without completing required fields
3. Observe validation messages

**Expected Outcome:**
- Validation prevents submission
- Clear error messages show which fields are required
- Errors display in accessible format

---

## Section 5: Analysis & Results (25 mins)

### Test 5.1: View Analysis Dashboard
**Steps:**
1. Log back into your account
2. Navigate to "Analysis" page
3. Select a survey with responses

**Expected Outcome:**
- Analysis page loads
- Survey selector dropdown populated
- Can select survey to analyse

### Test 5.2: Summary Statistics
**Steps:**
1. Review summary section showing:
   - Total responses
   - Response rate
   - Average wellbeing scores
   - NPS/recommendation score

**Expected Outcome:**
- Statistics display correctly
- Numbers match expected response count
- Scores calculated accurately

### Test 5.3: Wellbeing Question Charts
**Steps:**
1. Scroll through charts for each wellbeing question
2. Observe bar charts or visualisations
3. Check data labels and legends

**Expected Outcome:**
- Each question has a corresponding chart
- Charts display response distribution (e.g., how many rated 1, 2, 3, etc.)
- Charts are readable and properly labelled
- Colours use semantic design tokens

### Test 5.4: Recommendation/NPS Analysis
**Steps:**
1. Find the recommendation score section
2. Review breakdown of promoters, passives, detractors

**Expected Outcome:**
- NPS score calculated and displayed
- Breakdown shows categories correctly
- Visual representation (chart/gauge) present

### Test 5.5: Text Responses
**Steps:**
1. Navigate to text responses section
2. Read through anonymised text responses
3. Check for filtering or search functionality

**Expected Outcome:**
- All text responses visible
- Responses are anonymous (no identifying info)
- Can filter or search if feature exists

### Test 5.6: Export Data
**Steps:**
1. Look for "Export" or "Download" button
2. Export survey results (CSV, PDF, or other format)
3. Open exported file

**Expected Outcome:**
- Export completes successfully
- File downloads to device
- Data is complete and formatted correctly

### Test 5.7: Benchmark Comparison
**Steps:**
1. Check if benchmark data is displayed
2. Compare your survey results against sector benchmarks

**Expected Outcome:**
- Benchmark data visible (if available)
- Clear comparison between your data and benchmark
- Helps identify areas of concern

### Test 5.8: Custom Questions in Analysis
**Steps:**
1. View analysis for a survey that includes custom questions
2. Navigate to the custom questions section or charts
3. Review responses to custom multiple choice and text questions

**Expected Outcome:**
- Custom question responses display correctly in analysis
- Multiple choice responses shown with charts/statistics
- Text responses displayed in text responses section
- Custom questions clearly identified and separated from standard questions

---

## Section 6: Custom Questions (20 mins)

### Test 6.1: View Custom Questions Library
**Steps:**
1. Navigate to "Custom Questions" page
2. View existing questions (if any)

**Expected Outcome:**
- Page loads successfully
- Can view list of custom questions
- Empty state displayed appropriately if no questions exist

### Test 6.2: Create Multiple Choice Question
**Steps:**
1. Click "Create Question" or similar
2. Select "Multiple Choice" question type
3. Enter question text: "Which support would benefit you most?"
4. Add options:
   - Mental health resources
   - Workload management tools
   - Professional development
   - Peer support network
5. Save question

**Expected Outcome:**
- Question created successfully
- Appears in questions library
- Options saved correctly

### Test 6.3: Create Text Question
**Steps:**
1. Create new question
2. Select "Text" question type
3. Enter question text: "What additional support would help you?"
4. Save question

**Expected Outcome:**
- Text question created
- Appears in library
- Ready to add to surveys

### Test 6.4: Edit Custom Question
**Steps:**
1. Select an existing custom question
2. Click edit/pencil icon
3. Modify question text or options
4. Save changes

**Expected Outcome:**
- Edit form pre-populated
- Changes saved successfully
- Updated question displays correctly

### Test 6.5: Delete Custom Question
**Steps:**
1. Select a custom question
2. Click delete/bin icon
3. Confirm deletion

**Expected Outcome:**
- Confirmation dialog appears
- Question deleted after confirmation
- Removed from library

### Test 6.6: Add Custom Questions to Survey
**Steps:**
1. Go to Surveys page
2. Create new survey or edit existing
3. Select custom questions to include
4. Save survey
5. Preview to verify custom questions appear

**Expected Outcome:**
- Can select multiple custom questions
- Selected questions added to survey
- Questions appear in survey preview

---

## Section 7: Action Planning (Improve) (25 mins)

### Test 7.1: Access Action Plan
**Steps:**
1. Navigate to "Improve" page
2. View the Education Support Wellbeing Framework
3. Observe the descriptor table structure

**Expected Outcome:**
- Framework loads successfully
- All sections and descriptors visible
- Table displays clearly on desktop
- Mobile-first design evident

### Test 7.2: Understand Framework Structure
**Steps:**
1. Review the framework sections (should include areas like leadership, culture, workload, etc.)
2. Note the colour-coding by status (red, amber, green)
3. Identify priorities (P1, P2, P3)

**Expected Outcome:**
- Framework organised by logical sections
- Descriptors grouped appropriately
- Visual hierarchy clear

### Test 7.3: Update Descriptor Status
**Steps:**
1. Select a descriptor
2. Change status from default to "Red" (concern)
3. Change another to "Amber" (developing)
4. Change another to "Green" (strength)
5. Verify changes save automatically or click save

**Expected Outcome:**
- Status dropdown works smoothly
- Colours update immediately
- Changes persist after page refresh

### Test 7.4: Set Priority
**Steps:**
1. For a "Red" descriptor, set priority to "P1" (high priority)
2. For an "Amber" descriptor, set priority to "P2"
3. Leave some descriptors without priority

**Expected Outcome:**
- Can select P1, P2, P3, or None
- Priority indicators visible
- High-priority items stand out visually

### Test 7.5: Add Actions
**Steps:**
1. Click to add an action for a descriptor
2. Enter action text: "Conduct staff workload audit by end of term"
3. Save action
4. Add multiple actions to the same descriptor

**Expected Outcome:**
- Action input field appears
- Actions save successfully
- Multiple actions can be added
- Actions display under descriptor

### Test 7.6: Add Progress Notes
**Steps:**
1. Select a descriptor with actions
2. Click to add a progress note
3. Enter note: "Initial planning meeting held with SLT on [date]"
4. Add date if prompted
5. Save note

**Expected Outcome:**
- Note dialog/modal opens
- Can enter detailed notes
- Notes saved and timestamped
- Notes visible under descriptor or in notes section

### Test 7.7: Search/Filter Descriptors
**Steps:**
1. Use search bar to find specific terms (e.g., "workload", "leadership")
2. Apply filters (e.g., show only "Red" status, or "P1" priority)

**Expected Outcome:**
- Search returns relevant descriptors
- Filters narrow down results correctly
- Easy to clear filters

### Test 7.8: View Section Summary
**Steps:**
1. Navigate to section summary or progress overview
2. Review counts of red/amber/green by section

**Expected Outcome:**
- Summary provides overview of action plan status
- Shows which areas need most attention
- Helps prioritise efforts

### Test 7.9: Export Action Plan
**Steps:**
1. Click "Export" or "Download" button
2. Generate PDF of action plan
3. Open downloaded file

**Expected Outcome:**
- PDF generated successfully
- Includes all descriptor statuses, priorities, actions, and notes
- Formatted clearly for printing/sharing

### Test 7.10: Save as Template
**Steps:**
1. After configuring action plan, click "Save as Template"
2. Name the template
3. Verify template saved

**Expected Outcome:**
- Template saves successfully
- Can be reused for future action plans
- Template appears in template library

---

## Section 8: Accreditation (15 mins)

### Test 8.1: Access Accreditation Page
**Steps:**
1. Navigate to "Accredit" page
2. Review accreditation information and requirements

**Expected Outcome:**
- Page loads successfully
- Clear information about accreditation process
- Requirements listed

### Test 8.2: Submit for Accreditation
**Steps:**
1. Ensure your action plan has been completed with appropriate statuses, priorities, and actions
2. Navigate to the Accredit page
3. Review the accreditation criteria and requirements
4. Verify that your completed action plan meets the accreditation standards
5. Click submit for accreditation (submission is based on your completed action plan)

**Expected Outcome:**
- Accreditation submission is based on completed action plan data
- Submission successful
- Confirmation message displayed
- Status updates to show submission has been made

### Test 8.3: View Accreditation Status
**Steps:**
1. After submission, check accreditation status on the Accredit page
2. Look for pending/approved/rejected indicators

**Expected Outcome:**
- Status clearly displayed (Pending, Approved, or Rejected)
- Can track progress of accreditation application

---

## Section 9: Team Management (20 mins)

### Test 9.1: Access Team Page
**Steps:**
1. Navigate to "Team" page
2. View current team members (should just be you initially)

**Expected Outcome:**
- Team page loads
- Your profile appears as team owner/admin
- UI is clear and accessible

### Test 9.2: Invite Team Member
**Steps:**
1. Click "Invite Team Member" or similar button
2. Enter colleague's email address
3. Assign role (admin, member, viewer, etc.)
4. Send invitation

**Expected Outcome:**
- Invitation form works correctly
- Email sent successfully
- Invitation appears in pending invitations list
- Invitee receives email

### Test 9.3: View Pending Invitations
**Steps:**
1. Check pending invitations section
2. Verify invited member appears

**Expected Outcome:**
- Pending invitations listed
- Shows invitee email and role
- Option to resend or cancel invitation

### Test 9.4: Cancel Invitation
**Steps:**
1. Select a pending invitation
2. Click "Cancel" or "Remove"
3. Confirm cancellation

**Expected Outcome:**
- Invitation cancelled successfully
- Removed from pending list

### Test 9.5: Accept Invitation (requires second account)
**Steps:**
1. Log out
2. Access invitation email from Test 9.2
3. Click acceptance link
4. Create new account or log in
5. Accept team invitation

**Expected Outcome:**
- Invitation link works
- New member added to team
- New member can access shared organisation data

### Test 9.6: Manage Team Member Roles
**Steps:**
1. Log back into primary account
2. View team members list
3. Change a member's role (e.g., from Viewer to Admin)
4. Save changes

**Expected Outcome:**
- Role dropdown populated correctly
- Changes save successfully
- Member's permissions updated

### Test 9.7: Remove Team Member
**Steps:**
1. Select a team member
2. Click "Remove" or similar
3. Confirm removal

**Expected Outcome:**
- Confirmation dialog appears
- Member removed after confirmation
- Member no longer has access to organisation

---

## Section 10: Profile & Settings (15 mins)

### Test 10.1: View Profile
**Steps:**
1. Navigate to "Profile" or "Settings" page
2. Review personal information displayed

**Expected Outcome:**
- Profile page loads
- Shows name, email, job title
- Shows organisation/school details

### Test 10.2: Edit Personal Details
**Steps:**
1. Click "Edit" on personal details section
2. Update first name, last name, or job title
3. Optionally update email address
4. Save changes
5. If email was changed, check for verification email

**Expected Outcome:**
- Edit form pre-populated
- Changes save successfully
- Updated info displays immediately
- If email changed, verification email sent to new address
- Email change requires verification before becoming active

### Test 10.3: Edit Professional Details
**Steps:**
1. Edit organisation/school details
2. Update school name, phase, or other details
3. Save changes

**Expected Outcome:**
- Professional details updated
- Changes reflected across application

### Test 10.4: Change Password
**Steps:**
1. Log out of the application
2. Navigate to login page
3. Click "Forgot Password" link
4. Enter your email address
5. Check email for password reset link
6. Click link and set new password
7. Log in with new password

**Expected Outcome:**
- Password reset email received
- Reset link works correctly
- Password successfully changed
- Can log in with new password
- Note: Password change is handled via Supabase auth flow, not in Profile page

---

## Section 11: Subscription & Purchases (20 mins)

### Test 11.1: View Current Plan
**Steps:**
1. Navigate to "Upgrade" or "Subscription" page
2. Review current subscription plan
3. Check plan features and limits

**Expected Outcome:**
- Current plan clearly displayed
- Features and limitations listed
- Shows free trial status if applicable

### Test 11.2: View Pricing Plans
**Steps:**
1. Review available pricing tiers
2. Compare features across plans
3. Note differences between free and paid plans

**Expected Outcome:**
- All plans displayed clearly
- Features comparison easy to understand
- Pricing shown in GBP (UK)

### Test 11.3: Upgrade Plan (DO NOT COMPLETE PAYMENT)
**Steps:**
1. Click "Upgrade" on a paid plan
2. Proceed through upgrade flow
3. **STOP before entering payment details**
4. Verify Stripe checkout interface appears

**Expected Outcome:**
- Upgrade flow initiates correctly
- Stripe checkout loads
- Correct plan and pricing shown
- **DO NOT SUBMIT PAYMENT**

### Test 11.4: Enter Redemption Code
**Steps:**
1. If redemption code feature exists, click "Have a code?"
2. Enter a test code (if provided) or dummy code
3. Attempt to apply code

**Expected Outcome:**
- Code entry field works
- Invalid codes show appropriate error
- Valid codes (if tested) apply discount/upgrade

### Test 11.5: View Purchase History
**Steps:**
1. Navigate to "Purchases" or billing page
2. Review transaction history

**Expected Outcome:**
- Purchase history displayed
- Shows dates, amounts, and plan changes
- Empty state if no purchases yet

### Test 11.6: Cancel Subscription (if applicable)
**Steps:**
1. If on paid plan, navigate to Purchases or Profile page
2. Look for "Cancel Subscription" option
3. **DO NOT ACTUALLY CANCEL** - just verify option exists and location

**Expected Outcome:**
- Cancellation option available (verify location: Purchases page, Profile page, or Upgrade page)
- Clear information about what happens upon cancellation
- Option is clearly visible and accessible

### Test 11.7: Download Invoice (if applicable)
**Steps:**
1. Navigate to Purchases page
2. If purchases exist, look for download/view invoice option
3. Click to download or view invoice
4. Open downloaded file (if applicable)

**Expected Outcome:**
- Invoice download/view option clearly visible (verify if feature exists)
- If feature exists: Invoice downloads successfully and contains all required billing information
- If feature doesn't exist: Note as potential enhancement

---

## Critical Test Paths (Priority if Time Limited)

If time is limited, focus on these critical user journeys:

1. **Complete Survey Journey** (30 mins)
   - Sign up → Create survey → Preview → Send link → Complete survey as respondent → View analysis

2. **Action Planning Journey** (20 mins)
   - Login → Navigate to Improve → Update descriptor statuses → Add actions → Add notes → Export PDF

3. **Team Collaboration** (15 mins)
   - Invite team member → Accept invitation (second account) → Verify shared access

---

## Bug Reporting Format

When logging issues, please include:

**Bug ID:** [Unique number]  
**Page/Feature:** [Where it occurred]  
**Severity:** Critical / High / Medium / Low  
**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Result:** [What should happen]  
**Actual Result:** [What actually happened]  
**Screenshots:** [If applicable]  
**Browser:** [Chrome, Firefox, Safari, etc.]  
**Console Errors:** [Any error messages from browser console]

---

## Test Sign-Off

**Tester Name:** ___________________________  
**Date Completed:** ___________________________  
**Overall Result:** PASS / FAIL / PARTIAL  
**Total Issues Found:** ___________________________  
**Critical Issues:** ___________________________  
**Notes:**

---

## Notes for Tester

- **Take your time** - This is a comprehensive test, not a race
- **Think like a school administrator** - Does this make sense for senior staff in schools/colleges?
- **Mobile-first mindset** - Even though testing on desktop, consider how clear and accessible the interface is
- **Accessibility** - Note any issues with contrast, labels, or navigation
- **UK English** - Flag any US spelling or terminology
- **Log everything** - Even small UI inconsistencies are worth noting
- **Ask questions** - If something is unclear, note it as potential UX improvement

Good luck with testing! 🎯
