#!/usr/bin/env python3
"""
Create Jira issues for Beyond Burndown E2E testing tasks.
Uses Jira REST API v2 for simpler text-based descriptions.

Usage:
    python create_jira_issues_v2.py

Environment variables required:
    JIRA_URL - Your Jira instance URL (e.g., https://yoursite.atlassian.net)
    JIRA_EMAIL - Your Jira account email
    JIRA_API_TOKEN - Your Jira API token

Example:
    set JIRA_URL=https://donsalz57.atlassian.net
    set JIRA_EMAIL=your.email@example.com
    set JIRA_API_TOKEN=your-api-token
    python create_jira_issues_v2.py
"""

import os
import sys
import json
import base64
from urllib import request, error

# Configuration
PROJECT_KEY = "BB"  # Change this to your project key

# Issues to create
ISSUES = [
    {
        "summary": "Set up Playwright E2E testing infrastructure",
        "description": """Summary
=======
Set up end-to-end testing infrastructure using Playwright to test the Beyond Burndown gadget UI.

Background
==========
We need E2E tests to verify the gadget functionality works correctly across browsers and simulates real user interactions. Unit tests are in place (440 total), but we need integration/E2E tests for complete coverage.

Completed Work
==============
- Installed Playwright and configured for multi-browser testing
- Created initial E2E test suite in e2e/gadget.spec.js
- Created mock data helpers in e2e/fixtures/forge-mock.js
- Added npm scripts for running tests

Test Coverage
=============
- Gadget loading states (loading, error, success)
- Tab navigation (all 7 tabs)
- Summary bar display
- What-If panel functionality
- Export menu
- Feasibility chart
- Accessibility checks

How to Run
==========
npm run test:e2e        # Run all tests
npm run test:e2e:ui     # Interactive UI mode
npm run test:e2e:headed # Visible browser
npm run test:e2e:report # View report""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "playwright"]
    },
    {
        "summary": "Set up Forge bridge mocking for E2E tests",
        "description": """Summary
=======
Implement proper Forge bridge mocking so E2E tests can run without a live Jira connection.

Requirements
============
- Mock @forge/bridge invoke() function
- Mock view.getContext() for edit/view mode detection
- Mock view.submit() and view.close() for config panel
- Support different mock data scenarios

Acceptance Criteria
==================
- E2E tests run successfully without Jira connection
- Can simulate different data states (loading, error, empty, full data)
- Mock data is realistic and covers edge cases""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "mocking"]
    },
    {
        "summary": "Add CI/CD pipeline integration for E2E tests",
        "description": """Summary
=======
Integrate Playwright E2E tests into the CI/CD pipeline.

Requirements
============
- Run E2E tests on pull requests
- Run E2E tests before deployment
- Generate and archive test reports
- Fail build on test failures

Tasks
=====
- Create GitHub Actions workflow for E2E tests
- Configure Playwright for CI environment
- Set up artifact storage for test reports
- Add status badges to README

Acceptance Criteria
==================
- E2E tests run automatically on PRs
- Test results are visible in PR checks
- Reports are accessible for debugging failures""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "ci-cd", "github-actions"]
    },
    {
        "summary": "Create Jira integration E2E tests",
        "description": """Summary
=======
Create E2E tests that verify the gadget works correctly when integrated with Jira.

Test Scenarios
==============
- Gadget loads correctly on Jira dashboard
- JQL queries return expected data
- Config panel saves settings correctly
- Data refreshes when issues change
- Edit mode vs view mode behavior

Requirements
============
- Test against a dedicated test Jira project
- Use realistic test data
- Test error handling (invalid JQL, permissions, etc.)

Acceptance Criteria
==================
- Tests cover main Jira integration flows
- Tests are stable and not flaky
- Can run against staging environment""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "jira-integration"]
    },
    {
        "summary": "Add visual regression testing",
        "description": """Summary
=======
Implement visual regression testing to catch unintended UI changes.

Requirements
============
- Capture baseline screenshots for all views
- Compare against baselines on each test run
- Highlight visual differences
- Easy baseline update workflow

Views to Test
=============
- Feasibility chart (daily, weekly, monthly views)
- What-If panel (all scenario types)
- Compliance panel (with and without violations)
- Dependencies view (with and without cycles)
- Team health view
- Status report
- Config panel

Acceptance Criteria
==================
- Visual tests catch CSS/layout regressions
- False positives are minimized
- Baseline updates are easy to review and approve""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "visual-regression"]
    },
    {
        "summary": "Add mobile and tablet viewport E2E tests",
        "description": """Summary
=======
Add E2E tests for different viewport sizes to ensure responsive design works correctly.

Viewports to Test
=================
- Mobile (375x667 - iPhone SE)
- Mobile Large (414x896 - iPhone 11)
- Tablet (768x1024 - iPad)
- Desktop (1280x720)
- Desktop Large (1920x1080)

Requirements
============
- Test main flows on each viewport
- Verify responsive breakpoints work correctly
- Check touch interactions on mobile viewports

Acceptance Criteria
==================
- All viewports pass E2E tests
- No horizontal scrolling on mobile
- Touch targets are appropriately sized""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "responsive", "mobile"]
    }
]


def get_auth_header(email: str, api_token: str) -> str:
    """Create Basic auth header for Jira API."""
    credentials = f"{email}:{api_token}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


def create_issue(jira_url: str, auth_header: str, project_key: str, issue_data: dict) -> dict:
    """Create a Jira issue using REST API v2."""
    url = f"{jira_url}/rest/api/2/issue"

    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": issue_data["summary"],
            "description": issue_data["description"],
            "issuetype": {"name": issue_data.get("issuetype", "Task")}
        }
    }

    # Add labels if provided
    if "labels" in issue_data:
        payload["fields"]["labels"] = issue_data["labels"]

    data = json.dumps(payload).encode("utf-8")

    req = request.Request(
        url,
        data=data,
        headers={
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        method="POST"
    )

    try:
        with request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return {"success": True, "key": result["key"], "id": result["id"]}
    except error.HTTPError as e:
        error_body = e.read().decode()
        return {"success": False, "error": f"{e.code}: {error_body}"}
    except error.URLError as e:
        return {"success": False, "error": str(e.reason)}


def check_project_exists(jira_url: str, auth_header: str, project_key: str) -> bool:
    """Check if the project exists and is accessible."""
    url = f"{jira_url}/rest/api/2/project/{project_key}"

    req = request.Request(
        url,
        headers={
            "Authorization": auth_header,
            "Accept": "application/json"
        },
        method="GET"
    )

    try:
        with request.urlopen(req) as response:
            return True
    except error.HTTPError:
        return False


def main():
    """Main function to create all issues."""
    # Get configuration from environment
    jira_url = os.environ.get("JIRA_URL")
    jira_email = os.environ.get("JIRA_EMAIL")
    jira_api_token = os.environ.get("JIRA_API_TOKEN")

    # Check for required environment variables
    missing = []
    if not jira_url:
        missing.append("JIRA_URL")
    if not jira_email:
        missing.append("JIRA_EMAIL")
    if not jira_api_token:
        missing.append("JIRA_API_TOKEN")

    if missing:
        print("=" * 60)
        print("ERROR: Missing required environment variables")
        print("=" * 60)
        for var in missing:
            print(f"  - {var}")
        print()
        print("Set them using (Windows CMD):")
        print('  set JIRA_URL=https://yoursite.atlassian.net')
        print('  set JIRA_EMAIL=your.email@example.com')
        print('  set JIRA_API_TOKEN=your-api-token')
        print()
        print("Or using (PowerShell):")
        print('  $env:JIRA_URL="https://yoursite.atlassian.net"')
        print('  $env:JIRA_EMAIL="your.email@example.com"')
        print('  $env:JIRA_API_TOKEN="your-api-token"')
        print()
        print("Get your API token at:")
        print("  https://id.atlassian.com/manage-profile/security/api-tokens")
        print("=" * 60)
        sys.exit(1)

    # Remove trailing slash from URL if present
    jira_url = jira_url.rstrip("/")

    # Create auth header
    auth_header = get_auth_header(jira_email, jira_api_token)

    print("=" * 60)
    print("Beyond Burndown - Jira Issue Creator")
    print("=" * 60)
    print(f"Jira URL: {jira_url}")
    print(f"Project:  {PROJECT_KEY}")
    print(f"Issues:   {len(ISSUES)}")
    print("-" * 60)

    # Check project exists
    print(f"\nChecking project {PROJECT_KEY}...")
    if not check_project_exists(jira_url, auth_header, PROJECT_KEY):
        print(f"ERROR: Project '{PROJECT_KEY}' not found or not accessible.")
        print("Check that:")
        print("  1. The project key is correct")
        print("  2. Your API token has access to this project")
        print("  3. Your Jira URL is correct")
        sys.exit(1)
    print(f"  ✓ Project {PROJECT_KEY} found")

    print("\nCreating issues...")
    print("-" * 60)

    created = []
    failed = []

    for i, issue in enumerate(ISSUES, 1):
        summary_short = issue['summary'][:45] + "..." if len(issue['summary']) > 45 else issue['summary']
        print(f"\n[{i}/{len(ISSUES)}] {summary_short}")

        result = create_issue(jira_url, auth_header, PROJECT_KEY, issue)

        if result["success"]:
            print(f"  ✓ Created: {result['key']}")
            created.append({
                "key": result["key"],
                "summary": issue["summary"],
                "url": f"{jira_url}/browse/{result['key']}"
            })
        else:
            print(f"  ✗ Failed: {result['error'][:100]}")
            failed.append(issue["summary"])

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Created: {len(created)}")
    print(f"Failed:  {len(failed)}")

    if created:
        print("\n✓ Created Issues:")
        for item in created:
            print(f"  {item['key']}: {item['summary'][:40]}")
            print(f"    {item['url']}")

    if failed:
        print("\n✗ Failed Issues:")
        for summary in failed:
            print(f"  - {summary}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("Done!")


if __name__ == "__main__":
    main()
