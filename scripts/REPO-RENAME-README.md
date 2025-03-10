# Repository Rename Guide: Audio-Learning-Hub to grym-synth

This guide provides detailed instructions for cleaning up and renaming the Audio-Learning-Hub repository to grym-synth. The process includes cleaning large files, creating a new repository, updating references, and preparing for GitHub push.

## Scripts Provided

Three scripts have been created to automate this process:

1. `rename-repo.sh` - For Unix-like systems (Linux, macOS)
2. `rename-repo.bat` - For Windows systems using Command Prompt
3. `rename-repo.ps1` - For Windows systems using PowerShell (recommended for Windows users)

All scripts perform the same operations but are adapted for their respective operating systems and shells.

## Prerequisites

The scripts require the following tools to be installed:

- Git
- Basic Unix/Windows command-line tools
- For Windows: Git Bash or similar environment that provides Unix-like commands

## Step-by-Step Process

The scripts will guide you through the following steps:

### 1. Clean the Repository

- Identify large files (> 10MB) using the existing `identify-large-files.sh` script
- Move large files to an external assets directory using the existing `clean-repo.sh` script
- Verify and update the `.gitignore` file to exclude large files

### 2. Create a New Clean Repository

- Create a new directory for the grym-synth repository
- Initialize a new Git repository
- Copy all files from the current repository, excluding:
  - `.git` directory
  - Large binary files
  - Other excluded patterns from `.gitignore`

### 3. Update References

- Update project name in `package.json`
- Update repository URLs in `package.json`
- Update project name and URLs in `README.md`
- Update container names in `docker-compose.yml`
- Update import statements in TypeScript/JavaScript files
- Update references in documentation files

### 4. Prepare for GitHub Push

- Create an initial commit in the new repository
- Provide instructions for:
  - Creating a new GitHub repository
  - Configuring the local repository to use the new GitHub repository as remote
  - Pushing the local repository to GitHub

## Usage Instructions

### For Windows Users (PowerShell - Recommended)

1. Open PowerShell as Administrator
2. Navigate to your Audio-Learning-Hub repository
3. You may need to set the execution policy to run the script:
   ```
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```
4. Run the PowerShell script with the full path:
   ```
   powershell -File .\scripts\rename-repo.ps1
   ```

   Or if you're already in PowerShell, use:
   ```
   .\scripts\rename-repo.ps1
   ```

   If you get a path error, try using the absolute path:
   ```
   powershell -File "C:\Users\alex\testing-browser\audio-learning-hub\scripts\rename-repo.ps1"
   ```
5. Follow the prompts and instructions provided by the script

### For Windows Users (Command Prompt)

1. Open Command Prompt
2. Navigate to your Audio-Learning-Hub repository
3. Run the batch script with the full path:
   ```
   .\scripts\rename-repo.bat
   ```

   If you get a path error, try using the absolute path:
   ```
   "C:\Users\alex\testing-browser\audio-learning-hub\scripts\rename-repo.bat"
   ```
4. Follow the prompts and instructions provided by the script

### For Unix/Linux/macOS Users

1. Open Terminal
2. Navigate to your Audio-Learning-Hub repository
3. Make the script executable (if needed):
   ```
   chmod +x scripts/rename-repo.sh
   ```
4. Run the shell script:
   ```
   ./scripts/rename-repo.sh
   ```
5. Follow the prompts and instructions provided by the script

## Manual Steps Required

After running the script, you'll need to:

1. Create a new GitHub repository named "grym-synth"
2. Configure the local repository to use the new GitHub repository as remote
3. Push the local repository to GitHub

The script will provide detailed instructions for these steps.

## Verification

After completing the process, verify that:

1. The new repository size is significantly smaller than the original
2. All code functionality is preserved
3. All references to "Audio-Learning-Hub" have been updated to "grym-synth"
4. Large files are properly excluded and managed by the asset management system

## Troubleshooting

### Common Issues

1. **Script execution errors**
   - **PowerShell execution policy**: If you get an error about scripts being disabled, run:
     ```
     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
     ```
   - **Path issues**: Make sure you're using the correct path to the script. Try using the absolute path:
     ```
     powershell -File "C:\Users\alex\testing-browser\audio-learning-hub\scripts\rename-repo.ps1"
     ```
   - **Command not found**: If you get "command not found" errors, make sure you're in the correct directory and try using the full path to the script.

2. **Missing required commands**
   - Ensure Git is installed and available in your PATH
   - For Windows, consider installing Git for Windows which includes many Unix-like commands

3. **Large files still present in the repository**
   - Run `git ls-files --stage | grep -v ^120000` to identify large files
   - Update `.gitignore` and remove these files from Git tracking

4. **References to old name still present**
   - Use `grep -r "audio-learning-hub" .` (Unix) or `findstr /s /i /m "audio-learning-hub" *.*` (Windows) to find remaining references
   - Manually update these references

5. **Asset management system issues**
   - Verify that the asset manifest file is correctly copied to the new repository
   - Test asset retrieval functionality to ensure assets are accessible

## Additional Notes

- The script creates a new repository rather than renaming the existing one to ensure a clean history and proper size reduction
- The external assets directory (default: `../assets`) is used to store large files outside of Git
- The asset management system should be configured to point to this directory

## Support

If you encounter any issues with these scripts, please:

1. Check the troubleshooting section above
2. Review the script output for any error messages
3. Consult the repository documentation for additional guidance

## License

These scripts are provided under the same license as the main repository.

