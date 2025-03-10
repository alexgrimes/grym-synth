import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { PythonBridge } from "../src/utils/pythonBridge";

interface VerificationResult {
  success: boolean;
  details: {
    nodeVersion: string;
    pythonVersion: string;
    pythonPackages: {
      name: string;
      installed: boolean;
      version?: string;
    }[];
    directories: {
      path: string;
      exists: boolean;
    }[];
  };
  errors: string[];
}

async function verifyEnvironment(): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: true,
    details: {
      nodeVersion: process.version,
      pythonVersion: "",
      pythonPackages: [],
      directories: [],
    },
    errors: [],
  };

  // Check required directories
  const requiredDirs = [
    "src/services/audio",
    "src/utils",
    "src/interfaces",
    "tests/services",
    "tests/integration",
    "tests/performance",
    "scripts",
    "logs",
  ];

  result.details.directories = await Promise.all(
    requiredDirs.map(async (dir) => ({
      path: dir,
      exists: await fs.promises
        .access(dir)
        .then(() => true)
        .catch(() => false),
    }))
  );

  // Verify Python version
  try {
    const pythonVersion = await new Promise<string>((resolve, reject) => {
      const python = spawn("python", ["--version"]);
      let version = "";

      python.stdout.on("data", (data) => {
        version += data.toString();
      });

      python.on("close", (code) => {
        if (code === 0) {
          resolve(version.trim());
        } else {
          reject(new Error("Failed to get Python version"));
        }
      });
    });

    result.details.pythonVersion = pythonVersion;
  } catch (error) {
    result.success = false;
    result.errors.push("Python not found in PATH");
  }

  // Check required Python packages
  const requiredPackages = ["torch", "transformers", "soundfile"];

  try {
    for (const pkg of requiredPackages) {
      try {
        const version = await new Promise<string>((resolve, reject) => {
          const pip = spawn("pip", ["show", pkg]);
          let output = "";

          pip.stdout.on("data", (data) => {
            output += data.toString();
          });

          pip.on("close", (code) => {
            if (code === 0) {
              const versionMatch = output.match(/Version: (.+)/);
              resolve(versionMatch ? versionMatch[1] : "unknown");
            } else {
              reject(new Error(`Package ${pkg} not found`));
            }
          });
        });

        result.details.pythonPackages.push({
          name: pkg,
          installed: true,
          version,
        });
      } catch (error) {
        result.success = false;
        result.details.pythonPackages.push({
          name: pkg,
          installed: false,
        });
        result.errors.push(`Python package ${pkg} not installed`);
      }
    }
  } catch (error) {
    result.success = false;
    result.errors.push("Failed to check Python packages");
  }

  // Verify Wav2Vec2 model can be loaded
  try {
    const bridge = new PythonBridge();
    const envCheck = await bridge.verifyEnvironment();
    if (!envCheck) {
      result.success = false;
      result.errors.push("Failed to verify Wav2Vec2 environment");
    }
  } catch (error) {
    result.success = false;
    result.errors.push("Failed to initialize Python bridge");
  }

  // Print verification results
  console.log("\nEnvironment Verification Results:");
  console.log("===============================");
  console.log(`Node.js Version: ${result.details.nodeVersion}`);
  console.log(`Python Version: ${result.details.pythonVersion}`);

  console.log("\nPython Packages:");
  result.details.pythonPackages.forEach((pkg) => {
    console.log(
      `${pkg.name}: ${pkg.installed ? "✓" : "✗"} ${pkg.version || ""}`
    );
  });

  console.log("\nRequired Directories:");
  result.details.directories.forEach((dir) => {
    console.log(`${dir.path}: ${dir.exists ? "✓" : "✗"}`);
  });

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    result.errors.forEach((error) => console.log(`- ${error}`));
  }

  console.log("\nVerification " + (result.success ? "PASSED ✓" : "FAILED ✗"));

  return result;
}

// Run verification if executed directly
if (require.main === module) {
  verifyEnvironment()
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Verification failed:", error);
      process.exit(1);
    });
}

export { verifyEnvironment, VerificationResult };
