import { spawn } from "child_process";
import { verifyEnvironment } from "./verify-environment";
import fs from "fs";
import path from "path";

interface TestResults {
  unit: boolean;
  integration: boolean;
  performance: boolean;
  warnings: string[];
  errors: string[];
}

async function runCommand(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn(command, args, { stdio: "inherit" });
    process.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

async function setup(): Promise<void> {
  console.log("Starting setup and validation process...\n");

  // Step 1: Verify Environment
  console.log("Step 1: Verifying environment...");
  const envResult = await verifyEnvironment();

  if (!envResult.success) {
    console.error(
      "Environment verification failed. Please fix the issues and try again."
    );
    process.exit(1);
  }
  console.log("Environment verification passed!\n");

  // Step 2: Create required directories
  console.log("Step 2: Setting up project structure...");
  const directories = ["logs", "dist", "coverage"];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
  console.log("Project structure setup complete!\n");

  // Step 3: Run tests
  console.log("Step 3: Running test suites...");
  const testResults: TestResults = {
    unit: false,
    integration: false,
    performance: false,
    warnings: [],
    errors: [],
  };

  // Unit Tests
  console.log("\nRunning unit tests...");
  testResults.unit = await runCommand("npm", ["run", "test:unit"]);

  if (testResults.unit) {
    console.log("Unit tests passed!");
  } else {
    console.error("Unit tests failed!");
    testResults.errors.push("Unit tests failed");
  }

  // Integration Tests
  console.log("\nRunning integration tests...");
  testResults.integration = await runCommand("npm", [
    "run",
    "test:integration",
  ]);

  if (testResults.integration) {
    console.log("Integration tests passed!");
  } else {
    console.error("Integration tests failed!");
    testResults.errors.push("Integration tests failed");
  }

  // Performance Tests
  console.log("\nRunning performance tests...");
  testResults.performance = await runCommand("npm", [
    "run",
    "test:performance",
  ]);

  if (testResults.performance) {
    console.log("Performance tests passed!");
  } else {
    console.warn("Performance tests failed or had warnings");
    testResults.warnings.push("Performance tests had issues");
  }

  // Step 4: Analyze logs
  console.log("\nStep 4: Analyzing logs...");
  const logFile = path.join("logs", "wav2vec2.log");

  if (fs.existsSync(logFile)) {
    const logs = fs.readFileSync(logFile, "utf8");
    const warnings = logs.match(/WARN/g)?.length || 0;
    const errors = logs.match(/ERROR/g)?.length || 0;

    console.log(`Found ${warnings} warnings and ${errors} errors in logs`);

    if (warnings > 0) {
      testResults.warnings.push(`${warnings} warnings in logs`);
    }
    if (errors > 0) {
      testResults.errors.push(`${errors} errors in logs`);
    }
  }

  // Final Report
  console.log("\nSetup and Validation Summary:");
  console.log("============================");
  console.log("Environment Check:", envResult.success ? "✓" : "✗");
  console.log("Unit Tests:", testResults.unit ? "✓" : "✗");
  console.log("Integration Tests:", testResults.integration ? "✓" : "✗");
  console.log("Performance Tests:", testResults.performance ? "✓" : "⚠");

  if (testResults.warnings.length > 0) {
    console.log("\nWarnings:");
    testResults.warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (testResults.errors.length > 0) {
    console.log("\nErrors:");
    testResults.errors.forEach((error) => console.log(`- ${error}`));
    process.exit(1);
  }

  console.log("\nSetup and validation complete!");
}

// Run setup if executed directly
if (require.main === module) {
  setup().catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
}

export { setup };
