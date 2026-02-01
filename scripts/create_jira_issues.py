#!/usr/bin/env python3
"""
Create Jira issues for Beyond Burndown E2E testing tasks.

Usage:
    python create_jira_issues.py

Environment variables required:
    JIRA_URL - Your Jira instance URL (e.g., https://yoursite.atlassian.net)
    JIRA_EMAIL - Your Jira account email
    JIRA_API_TOKEN - Your Jira API token (create at https://id.atlassian.com/manage-profile/security/api-tokens)

Example:
    export JIRA_URL="https://donsalz57.atlassian.net"
    export JIRA_EMAIL="your.email@example.com"
    export JIRA_API_TOKEN="your-api-token"
    python create_jira_issues.py
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
        "description": """h2. Summary
Set up end-to-end testing infrastructure using Playwright to test the Beyond Burndown gadget UI.

h2. Background
We need E2E tests to verify the gadget functionality works correctly across browsers and simulates real user interactions. Unit tests are in place (440 total), but we need integration/E2E tests for complete coverage.

h2. Completed Work
* Installed Playwright and configured for multi-browser testing
* Created initial E2E test suite in e2e/gadget.spec.js
* Created mock data helpers in e2e/fixtures/forge-mock.js
* Added npm scripts for running tests

h2. Test Coverage
* Gadget loading states (loading, error, success)
* Tab navigation (all 7 tabs)
* Summary bar display
* What-If panel functionality
* Export menu
* Feasibility chart
* Accessibility checks

h2. How to Run
{code:bash}
npm run test:e2e        # Run all tests
npm run test:e2e:ui     # Interactive UI mode
npm run test:e2e:headed # Visible browser
npm run test:e2e:report # View report
{code}""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "playwright"]
    },
    {
        "summary": "Set up Forge bridge mocking for E2E tests",
        "description": """h2. Summary
Implement proper Forge bridge mocking so E2E tests can run without a live Jira connection.

h2. Requirements
* Mock @forge/bridge invoke() function
* Mock view.getContext() for edit/view mode detection
* Mock view.submit() and view.close() for config panel
* Support different mock data scenarios

h2. Acceptance Criteria
* E2E tests run successfully without Jira connection
* Can simulate different data states (loading, error, empty, full data)
* Mock data is realistic and covers edge cases""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "mocking"]
    },
    {
        "summary": "Add CI/CD pipeline integration for E2E tests",
        "description": """h2. Summary
Integrate Playwright E2E tests into the CI/CD pipeline.

h2. Requirements
* Run E2E tests on pull requests
* Run E2E tests before deployment
* Generate and archive test reports
* Fail build on test failures

h2. Tasks
* Create GitHub Actions workflow for E2E tests
* Configure Playwright for CI environment
* Set up artifact storage for test reports
* Add status badges to README

h2. Acceptance Criteria
* E2E tests run automatically on PRs
* Test results are visible in PR checks
* Reports are accessible for debugging failures""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "ci-cd", "github-actions"]
    },
    {
        "summary": "Create Jira integration E2E tests",
        "description": """h2. Summary
Create E2E tests that verify the gadget works correctly when integrated with Jira.

h2. Test Scenarios
* Gadget loads correctly on Jira dashboard
* JQL queries return expected data
* Config panel saves settings correctly
* Data refreshes when issues change
* Edit mode vs view mode behavior

h2. Requirements
* Test against a dedicated test Jira project
* Use realistic test data
* Test error handling (invalid JQL, permissions, etc.)

h2. Acceptance Criteria
* Tests cover main Jira integration flows
* Tests are stable and not flaky
* Can run against staging environment""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "jira-integration"]
    },
    {
        "summary": "Add visual regression testing",
        "description": """h2. Summary
Implement visual regression testing to catch unintended UI changes.

h2. Requirements
* Capture baseline screenshots for all views
* Compare against baselines on each test run
* Highlight visual differences
* Easy baseline update workflow

h2. Views to Test
* Feasibility chart (daily, weekly, monthly views)
* What-If panel (all scenario types)
* Compliance panel (with and without violations)
* Dependencies view (with and without cycles)
* Team health view
* Status report
* Config panel

h2. Acceptance Criteria
* Visual tests catch CSS/layout regressions
* False positives are minimized
* Baseline updates are easy to review and approve""",
        "issuetype": "Task",
        "labels": ["testing", "e2e", "visual-regression"]
    },
    {
        "summary": "Add mobile and tablet viewport E2E tests",
        "description": """h2. Summary
Add E2E tests for different viewport sizes to ensure responsive design works correctly.

h2. Viewports to Test
* Mobile (375x667 - iPhone SE)
* Mobile Large (414x896 - iPhone 11)
* Tablet (768x1024 - iPad)
* Desktop (1280x720)
* Desktop Large (1920x1080)

h2. Requirements
* Test main flows on each viewport
* Verify responsive breakpoints work correctly
* Check touch interactions on mobile viewports

h2. Acceptance Criteria
* All viewports pass E2E tests
* No horizontal scrolling on mobile
* Touch targets are appropriately sized""",
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
    """Create a Jira issue."""
    url = f"{jira_url}/rest/api/3/issue"

    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": issue_data["summary"],
            "description": {
                "type": "doc",
                "version": 1,
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": issue_data["description"]
                            }
                        ]
                    }
                ]
            },
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
        print("Error: Missing required environment variables:")
        for var in missing:
            print(f"  - {var}")
        print("\nSet them using:")
        print('  export JIRA_URL="https://yoursite.atlassian.net"')
        print('  export JIRA_EMAIL="your.email@example.com"')
        print('  export JIRA_API_TOKEN="your-api-token"')
        print("\nGet your API token at: https://id.atlassian.com/manage-profile/security/api-tokens")
        sys.exit(1)

    # Remove trailing slash from URL if present
    jira_url = jira_url.rstrip("/")

    # Create auth header
    auth_header = get_auth_header(jira_email, jira_api_token)

    print(f"Creating {len(ISSUES)} issues in project {PROJECT_KEY}...")
    print(f"Jira URL: {jira_url}")
    print("-" * 50)

    created = []
    failed = []

    for issue in ISSUES:
        print(f"\nCreating: {issue['summary'][:50]}...")
        result = create_issue(jira_url, auth_header, PROJECT_KEY, issue)

        if result["success"]:
            print(f"  ✓ Created: {result['key']}")
            print(f"    URL: {jira_url}/browse/{result['key']}")
            created.append(result["key"])
        else:
            print(f"  ✗ Failed: {result['error']}")
            failed.append(issue["summary"])

    print("\n" + "=" * 50)
    print(f"Summary: {len(created)} created, {len(failed)} failed")

    if created:
        print(f"\nCreated issues:")
        for key in created:
            print(f"  - {jira_url}/browse/{key}")

    if failed:
        print(f"\nFailed issues:")
        for summary in failed:
            print(f"  - {summary}")
        sys.exit(1)


if __name__ == "__main__":
    main()
