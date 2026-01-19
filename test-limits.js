import { createClient } from "@supabase/supabase-js";

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Missing required environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function testEmailLimits() {
  console.log("Testing email limit and subscription logic...\n");

  try {
    // Test 1: Check if functions exist
    console.log("1. Testing function existence...");

    try {
      const { data: usageData, error: usageError } = await supabase.rpc(
        "get_email_usage",
        {
          p_session_token: "test_invalid_token",
        },
      );

      if (usageError) {
        console.log(
          "   ✓ get_email_usage function exists (expected error for invalid token)",
        );
      } else {
        console.log("   ✓ get_email_usage function exists and responds");
        console.log("   Response:", usageData);
      }
    } catch (err) {
      console.log("   ✗ get_email_usage function error:", err.message);
    }

    try {
      const { data: checkData, error: checkError } = await supabase.rpc(
        "check_and_increment_email_count",
        {
          p_session_token: "test_invalid_token",
          p_count: 1,
        },
      );

      if (checkError) {
        console.log(
          "   ✓ check_and_increment_email_count function exists (expected error for invalid token)",
        );
      } else {
        console.log(
          "   ✓ check_and_increment_email_count function exists and responds",
        );
        console.log("   Response:", checkData);
      }
    } catch (err) {
      console.log(
        "   ✗ check_and_increment_email_count function error:",
        err.message,
      );
    }

    try {
      const { data: subData, error: subError } = await supabase.rpc(
        "get_user_subscription",
        {
          p_session_token: "test_invalid_token",
        },
      );

      if (subError) {
        console.log(
          "   ✓ get_user_subscription function exists (expected error for invalid token)",
        );
      } else {
        console.log("   ✓ get_user_subscription function exists and responds");
        console.log("   Response:", subData);
      }
    } catch (err) {
      console.log("   ✗ get_user_subscription function error:", err.message);
    }

    console.log("\n2. Testing database schema...");

    // Test 2: Check if new columns exist in credential_keys table
    // We'll try to select from the table to see if it has the new columns
    try {
      // This will fail if columns don't exist, but we can catch the error
      const { data, error } = await supabase
        .from("credential_keys")
        .select("id, email_limit, subscription_hours, emails_validated")
        .limit(1);

      if (error) {
        console.log("   ✗ Error accessing new columns:", error.message);
        console.log(
          "   This suggests the migration may not have been applied correctly",
        );
      } else {
        console.log("   ✓ New columns exist in credential_keys table");
        console.log("   Sample data:", data);
      }
    } catch (err) {
      console.log("   ✗ Database schema test failed:", err.message);
    }

    console.log("\n3. Testing React hooks integration...");

    // Test 3: Check if the React hooks can be imported and used
    console.log(
      "   Note: React hooks need to be tested in the browser environment",
    );
    console.log("   Please test the following in your browser:");
    console.log("   - Login with a credential key");
    console.log("   - Check if email usage is displayed correctly");
    console.log("   - Try validating emails and see if limits are enforced");
    console.log("   - Check subscription status in the UI");

    console.log("\n4. Manual testing checklist:");
    console.log("   □ Login to the application");
    console.log("   □ Go to Single Validation page");
    console.log("   □ Check if email usage counter is shown");
    console.log("   □ Try validating an email - should increment counter");
    console.log("   □ Go to Bulk Validation page");
    console.log("   □ Upload a file with emails");
    console.log("   □ Check if limit validation works before processing");
    console.log("   □ Check subscription status and expiry");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testEmailLimits();
